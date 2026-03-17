"use server";

/* ================================================================
   ASSET INGESTION ENGINE — Server Action
   ================================================================
   Processes Producer asset submissions:
     1. Zod-validated form input parsing
     2. Forensic OCR of Fire Assay PDF (AWS Textract)
     3. LBMA Good Delivery fineness assertion (>= 995.0)
     4. Cryptographic title signing via AWS KMS
     5. Atomic inventory_allocation ledger insertion

   Terminology: Offtaker (buyer), Producer (seller).
   ================================================================ */

import { z } from "zod";
import { createHash } from "crypto";
import { getPoolClient } from "@/lib/db";
import { signCertificate } from "@/lib/certificates/kms-signer";
import { canonicalDigest } from "@/lib/certificates/canonicalize";
import { analyzeAssayReport, type AssayFieldExtractionResult } from "@/lib/services/textract-service";
import { emitAuditEvent } from "@/lib/audit-logger";
import {
  sovereignAssayRecordSchema,
  transitHandoffRecordSchema,
  type SovereignAssayRecord,
  type TransitHandoffRecord,
} from "@/lib/delivery/asset-registry.types";

/* ================================================================
   TYPES
   ================================================================ */

export interface IngestAssetState {
  success: boolean;
  allocationId?: string;
  titleHash?: string;
  error?: string;
}

/* ================================================================
   ZOD SCHEMA — Form Validation
   ================================================================ */

const IngestAssetSchema = z.object({
  serialNumber: z
    .string()
    .min(1, "Serial number is required.")
    .max(64, "Serial number must be 64 characters or fewer."),
  grossWeight: z
    .string()
    .min(1, "Gross weight is required.")
    .refine(
      (v) => {
        const n = parseFloat(v);
        return !isNaN(n) && n > 0 && n <= 50_000;
      },
      { message: "Gross weight must be a positive number (max 50,000 oz)." },
    ),
  castingYear: z
    .string()
    .min(1, "Casting year is required.")
    .refine(
      (v) => {
        const y = parseInt(v, 10);
        return !isNaN(y) && y >= 1900 && y <= new Date().getFullYear() + 1;
      },
      { message: "Casting year must be a valid year (1900–present)." },
    ),
  jurisdiction: z
    .string()
    .min(1, "Vault jurisdiction is required."),
});

/* ================================================================
   LBMA FINENESS THRESHOLDS & PURITY MAPPING
   ================================================================ */

const LBMA_GOOD_DELIVERY_MINIMUM_FINENESS = 995.0;

/**
 * Map Textract-extracted AurumShield Purity code to numeric fineness.
 * Purity codes: "995" → 995.0, "999" → 999.0, "9999" → 999.9
 */
function purityCodeToFineness(code: string): number {
  switch (code) {
    case "9999": return 999.9;
    case "999":  return 999.0;
    case "995":  return 995.0;
    default: {
      const n = parseFloat(code);
      return !isNaN(n) ? n : 0;
    }
  }
}

/* ================================================================
   CANONICAL ASSET PAYLOAD — For KMS Signing
   ================================================================ */

interface AssetTitlePayload {
  serialNumber: string;
  grossWeight: number;
  fineness: number;
  jurisdiction: string;
  timestamp: string;
}

function buildCanonicalPayload(payload: AssetTitlePayload): string {
  // Deterministic key-order JSON — stable across all runtimes
  return JSON.stringify({
    serialNumber: payload.serialNumber,
    grossWeight: payload.grossWeight,
    fineness: payload.fineness,
    jurisdiction: payload.jurisdiction,
    timestamp: payload.timestamp,
  });
}

/* ================================================================
   SERVER ACTION — ingestAsset
   ================================================================ */

export async function ingestAsset(
  _prevState: IngestAssetState,
  formData: FormData,
): Promise<IngestAssetState> {
  /* ── 1. Extract & Validate Inputs ── */

  const assetForm = (formData.get("assetForm") as string | null) ?? "GOOD_DELIVERY_BULLION";
  const isRawDore = assetForm === "RAW_DORE";

  const rawInputs = {
    serialNumber: formData.get("serialNumber") as string | null,
    grossWeight: formData.get("grossWeight") as string | null,
    castingYear: formData.get("castingYear") as string | null,
    jurisdiction: formData.get("jurisdiction") as string | null,
  };

  const parsed = IngestAssetSchema.safeParse({
    serialNumber: rawInputs.serialNumber ?? "",
    grossWeight: rawInputs.grossWeight ?? "",
    castingYear: rawInputs.castingYear ?? "",
    jurisdiction: rawInputs.jurisdiction ?? "",
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation failed.";
    console.warn(`[INGESTION-ENGINE] Zod validation failed: ${firstError}`);
    return { success: false, error: firstError };
  }

  const { serialNumber, grossWeight, castingYear, jurisdiction } = parsed.data;

  /* ── Assay File Extraction ── */
  const assayFile = formData.get("assayFile") as File | null;

  /* ── RAW_DORE BYPASS: Skip Textract purity extraction entirely ── */
  let fineness: number;

  if (isRawDore) {
    // Raw Doré is unrefined mine output — it has NO static purity to extract.
    // Purity is determined AFTER refining, via the refinery intake pipeline.
    fineness = 0;

    console.log(
      `[INGESTION-ENGINE] RAW_DORE mode: Skipping Textract purity extraction ` +
        `and LBMA assertion for serial=${serialNumber}. ` +
        `Asset routed to Refinery Intake Pipeline.`,
    );
  } else {
    // GOOD_DELIVERY_BULLION: Full Textract + LBMA purity gate
    if (!assayFile || assayFile.size === 0) {
      return {
        success: false,
        error: "Fire Assay Report (PDF) is required. Upload via the dropzone.",
      };
    }

    /* ── 2. Forensic Textract Analysis (AWS) ── */

    let fileBuffer: Buffer;
    try {
      const arrayBuffer = await assayFile.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } catch {
      return {
        success: false,
        error: "Failed to read the uploaded assay file.",
      };
    }

    const textractResult = await analyzeAssayReport(fileBuffer);

    if (!textractResult.success || !textractResult.extractedPurity) {
      console.error(
        `[INGESTION-ENGINE] Textract extraction FAILED for: ${assayFile.name}`,
        textractResult.error ?? "No purity detected in document.",
      );
      return {
        success: false,
        error: textractResult.error
          ?? "Textract could not extract purity from the assay report. Ensure the document is a valid Fire Assay PDF.",
      };
    }

    fineness = purityCodeToFineness(textractResult.extractedPurity);

    console.log(
      `[INGESTION-ENGINE] Textract OCR complete for: ${assayFile.name} ` +
        `purity_code=${textractResult.extractedPurity} fineness=${fineness} ` +
        `raw="${textractResult.rawPurityText}" weight=${textractResult.extractedWeightOz ?? "N/A"}`,
    );

    /* ── LBMA Good Delivery Assertion ── */
    if (fineness < LBMA_GOOD_DELIVERY_MINIMUM_FINENESS) {
      console.error(
        `[INGESTION-ENGINE] LBMA REJECTION: fineness=${fineness} ` +
          `threshold=${LBMA_GOOD_DELIVERY_MINIMUM_FINENESS} serial=${serialNumber}`,
      );
      return {
        success: false,
        error:
          "Validation Error: Assay purity below LBMA Good Delivery threshold.",
      };
    }

    console.log(
      `[INGESTION-ENGINE] LBMA assertion PASSED: fineness=${fineness} ` +
        `(>= ${LBMA_GOOD_DELIVERY_MINIMUM_FINENESS}) serial=${serialNumber}`,
    );
  }

  /* ── 3. Cryptographic Title Minting (KMS) ── */

  const timestamp = new Date().toISOString();

  const canonicalPayload = buildCanonicalPayload({
    serialNumber,
    grossWeight: parseFloat(grossWeight),
    fineness: fineness,
    jurisdiction,
    timestamp,
  });

  let titleHash: string;
  try {
    const digest = await canonicalDigest(canonicalPayload);
    const kmsResult = await signCertificate(digest);

    // The title_hash is the hex-encoded SHA-256 of the canonical payload
    titleHash = createHash("sha256").update(canonicalPayload).digest("hex");

    console.log(
      `[INGESTION-ENGINE] KMS title signed: hash=${titleHash.slice(0, 16)}... ` +
        `alg=${kmsResult.signatureAlg} key=${kmsResult.kmsKeyId} ` +
        `serial=${serialNumber}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[INGESTION-ENGINE] KMS signing FAILED: serial=${serialNumber}`,
      message,
    );
    return {
      success: false,
      error: "Cryptographic title minting failed. Contact infrastructure team.",
    };
  }

  /* ── 4. Atomic Ledger Insertion ── */

  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO inventory_allocation
         (serial_number, gross_weight_oz, fineness, casting_year,
          vault_jurisdiction, title_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_VERIFICATION')
       RETURNING id`,
      [
        serialNumber,
        parseFloat(grossWeight),
        fineness,
        parseInt(castingYear, 10),
        jurisdiction,
        titleHash,
      ],
    );

    const allocationId = rows[0]?.id;

    if (!allocationId) {
      throw new Error("INSERT returned no id — possible constraint violation.");
    }

    await client.query("COMMIT");

    console.info(
      `[INGESTION-ENGINE] ✓ ASSET INGESTED: allocation_id=${allocationId} ` +
        `serial=${serialNumber} fineness=${fineness} ` +
        `title_hash=${titleHash.slice(0, 16)}...`,
    );

    return {
      success: true,
      allocationId,
      titleHash,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[INGESTION-ENGINE] LEDGER INSERT FAILED for serial=${serialNumber}:`,
      message,
    );

    return {
      success: false,
      error: "Ledger insertion failed. Asset was NOT recorded. Try again.",
    };
  } finally {
    client.release();
  }
}

/* ================================================================
   SERVER ACTION — parseAssayDocument
   ================================================================
   Standalone Textract parser invoked immediately when a PDF is
   dropped into the SovereignAssayGauntlet. Returns extracted
   assay fields for real-time cross-check BEFORE form submission.

   Client workflow:
     1. Producer drops PDF → client calls parseAssayDocument()
     2. Terminal UI displays extracted values
     3. Client highlights mismatches vs. manual input
     4. Full submission via submitAssetIntakeProof() includes
        BOTH the manual input AND Textract data for server-side
        forgery gate.
   ================================================================ */

export interface TextractAssayParseResult {
  success: boolean;
  /** Extracted assay fields (thickness, conductivity, assayer, serial). */
  assayFields: AssayFieldExtractionResult | null;
  /** Extracted purity code ("995", "999", "9999") */
  extractedPurity: string | null;
  /** Extracted weight in troy ounces */
  extractedWeightOz: number | null;
  /** All raw text lines for terminal-style output */
  allExtractedLines: string[];
  /** Error message if extraction failed */
  error: string | null;
}

export async function parseAssayDocument(
  formData: FormData,
): Promise<TextractAssayParseResult> {
  const file = formData.get("assayFile") as File | null;

  if (!file || file.size === 0) {
    return {
      success: false,
      assayFields: null,
      extractedPurity: null,
      extractedWeightOz: null,
      allExtractedLines: [],
      error: "No file provided for Textract analysis.",
    };
  }

  let fileBuffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
  } catch {
    return {
      success: false,
      assayFields: null,
      extractedPurity: null,
      extractedWeightOz: null,
      allExtractedLines: [],
      error: "Failed to read the uploaded assay file.",
    };
  }

  const textractResult = await analyzeAssayReport(fileBuffer);

  console.log(
    `[TEXTRACT-PARSE] Document analysis complete: ` +
      `success=${textractResult.success} ` +
      `purity=${textractResult.extractedPurity ?? "N/A"} ` +
      `weight=${textractResult.extractedWeightOz ?? "N/A"} ` +
      `thickness=${textractResult.assayFields?.ultrasonicThicknessMm ?? "N/A"} ` +
      `conductivity=${textractResult.assayFields?.conductivityIacs ?? "N/A"} ` +
      `assayer=${textractResult.assayFields?.assayerName ?? "N/A"} ` +
      `serial=${textractResult.assayFields?.serialNumber ?? "N/A"}`,
  );

  return {
    success: textractResult.success,
    assayFields: textractResult.assayFields,
    extractedPurity: textractResult.extractedPurity,
    extractedWeightOz: textractResult.extractedWeightOz,
    allExtractedLines: textractResult.allExtractedLines,
    error: textractResult.error,
  };
}

/* ================================================================
   SERVER ACTION — submitAssetIntakeProof
   ================================================================
   Processes the Sovereign Assay Gauntlet submission for a specific
   inventory listing. Validates assay + transit data, updates the
   listing with provenance flags, and emits a tamper-evident
   ASSET_ASSAY_LOGGED audit event.

   This gate MUST be passed before mintCryptographicTitle() can
   execute for Good Delivery bullion listings.
   ================================================================ */

export interface AssetIntakeProofState {
  success: boolean;
  listingId?: string;
  attestationHash?: string;
  error?: string;
}

export async function submitAssetIntakeProof(
  listingId: string,
  assayData: SovereignAssayRecord,
  transitData: TransitHandoffRecord,
  textractData: AssayFieldExtractionResult | null,
): Promise<AssetIntakeProofState> {
  /* ── 1. Input Validation ── */

  if (!listingId?.trim()) {
    return { success: false, error: "Listing ID is required." };
  }

  const assayParsed = sovereignAssayRecordSchema.safeParse(assayData);
  if (!assayParsed.success) {
    const firstError = assayParsed.error.issues[0]?.message ?? "Assay validation failed.";
    console.warn(`[INTAKE-PROOF] Assay Zod validation failed: ${firstError}`);
    return { success: false, error: firstError };
  }

  const transitParsed = transitHandoffRecordSchema.safeParse(transitData);
  if (!transitParsed.success) {
    const firstError = transitParsed.error.issues[0]?.message ?? "Transit validation failed.";
    console.warn(`[INTAKE-PROOF] Transit Zod validation failed: ${firstError}`);
    return { success: false, error: firstError };
  }

  /* ── 1b. FORGERY CROSS-CHECK (Textract vs. Manual Input) ── */

  if (textractData) {
    // CORRECTION 1: Null-safe Textract validation — if Textract couldn't
    // extract the mandatory sovereign assay values, abort with a specific
    // error instead of risking false "FORGERY" flags from JS type coercion.
    if (
      textractData.ultrasonicThicknessMm == null ||
      textractData.conductivityIacs == null
    ) {
      console.error(
        `[INTAKE-PROOF] TEXTRACT_EXTRACTION_FAILED: ` +
          `thickness=${textractData.ultrasonicThicknessMm ?? "NULL"} ` +
          `conductivity=${textractData.conductivityIacs ?? "NULL"} ` +
          `listing=${listingId}`,
      );
      throw new Error(
        "TEXTRACT_EXTRACTION_FAILED: Mandatory sovereign assay data could not be " +
          "cryptographically extracted from the provided document. " +
          "Please upload a clearer scan.",
      );
    }

    // Tolerance: 0.1 for minor rounding differences
    const thicknessDelta = Math.abs(
      assayParsed.data.ultrasonicThicknessMm - textractData.ultrasonicThicknessMm,
    );
    const conductivityDelta = Math.abs(
      assayParsed.data.conductivityIacs - textractData.conductivityIacs,
    );

    if (thicknessDelta > 0.1 || conductivityDelta > 0.1) {
      console.error(
        `[INTAKE-PROOF] FORGERY_DETECTED: ` +
          `thickness_user=${assayParsed.data.ultrasonicThicknessMm} ` +
          `thickness_textract=${textractData.ultrasonicThicknessMm} ` +
          `delta=${thicknessDelta.toFixed(3)} | ` +
          `conductivity_user=${assayParsed.data.conductivityIacs} ` +
          `conductivity_textract=${textractData.conductivityIacs} ` +
          `delta=${conductivityDelta.toFixed(3)} | ` +
          `listing=${listingId}`,
      );
      throw new Error(
        "FORGERY_DETECTED: Stated values do not match mathematical extraction.",
      );
    }

    console.info(
      `[INTAKE-PROOF] CROSS-CHECK PASSED: ` +
        `thickness_delta=${thicknessDelta.toFixed(3)} ` +
        `conductivity_delta=${conductivityDelta.toFixed(3)} ` +
        `listing=${listingId}`,
    );
  }

  /* ── 2. Hash the Assay Payload (Tamper-Evident) ── */

  const assayCanonical = JSON.stringify({
    ultrasonicThicknessMm: assayParsed.data.ultrasonicThicknessMm,
    conductivityIacs: assayParsed.data.conductivityIacs,
    assayerName: assayParsed.data.assayerName,
    documentUrl: assayParsed.data.documentUrl,
    timestamp: new Date().toISOString(),
  });

  const attestationHash = createHash("sha256").update(assayCanonical).digest("hex");

  /* ── 3. Atomic DB Update ── */

  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    // Verify listing exists
    const { rows: listingRows } = await client.query<{ id: string }>(
      `SELECT id FROM inventory_listings WHERE id = $1 FOR UPDATE`,
      [listingId],
    );

    if (listingRows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "Listing not found. Cannot apply provenance data.",
      };
    }

    // Update provenance columns (include Textract data alongside attestation)
    await client.query(
      `UPDATE inventory_listings
       SET assay_verified = TRUE,
           transit_logged = TRUE,
           assay_data = $1,
           transit_data = $2
       WHERE id = $3`,
      [
        JSON.stringify({
          ...assayParsed.data,
          attestationHash,
          textractExtraction: textractData ?? null,
        }),
        JSON.stringify(transitParsed.data),
        listingId,
      ],
    );

    await client.query("COMMIT");

    console.info(
      `[INTAKE-PROOF] ✓ PROVENANCE RECORDED: listing=${listingId} ` +
        `assay_hash=${attestationHash.slice(0, 16)}... ` +
        `carrier=${transitParsed.data.carrier} ` +
        `assayer=${assayParsed.data.assayerName}`,
    );

    /* ── 4. Audit Event (outside transaction — non-blocking) ── */

    emitAuditEvent(
      "ASSET_ASSAY_LOGGED",
      "INFO",
      {
        listingId,
        attestationHash,
        ultrasonicThicknessMm: assayParsed.data.ultrasonicThicknessMm,
        conductivityIacs: assayParsed.data.conductivityIacs,
        assayerName: assayParsed.data.assayerName,
        documentUrl: assayParsed.data.documentUrl,
        carrier: transitParsed.data.carrier,
        trackingReference: transitParsed.data.trackingReference,
        tarmacPickupAt: transitParsed.data.tarmacPickupAt,
        destinationVault: transitParsed.data.destinationVault,
      },
    );

    return {
      success: true,
      listingId,
      attestationHash,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[INTAKE-PROOF] PROVENANCE UPDATE FAILED for listing=${listingId}:`,
      message,
    );

    return {
      success: false,
      error: "Provenance update failed. Asset was NOT verified. Try again.",
    };
  } finally {
    client.release();
  }
}

/* ================================================================
   SERVER ACTION — submitDoreIntake
   ================================================================
   Processes the initial intake of a Raw Mine Doré listing.
   Sets the listing into the refinery pipeline with an estimated
   weight and target LBMA refinery. The asset is held in
   PENDING_DELIVERY until the refinery webhook fires with the
   true yield.

   This gate is the entry point for all RAW_DORE assets before
   they are routed to an LBMA refinery for fire-assay and
   recasting.
   ================================================================ */

export interface DoreIntakeResult {
  success: boolean;
  listingId?: string;
  error?: string;
}

export async function submitDoreIntake(
  listingId: string,
  estimatedWeight: number,
  refineryId: string,
): Promise<DoreIntakeResult> {
  /* ── 1. Input Validation ── */

  if (!listingId?.trim()) {
    return { success: false, error: "Listing ID is required." };
  }

  if (!estimatedWeight || estimatedWeight <= 0) {
    return { success: false, error: "Estimated weight must be a positive number." };
  }

  if (!refineryId?.trim()) {
    return { success: false, error: "Refinery ID is required." };
  }

  /* ── 2. Atomic DB Update ── */

  const client = await getPoolClient();

  try {
    await client.query("BEGIN");

    // Verify listing exists and lock for update
    const { rows: listingRows } = await client.query<{ id: string }>(
      `SELECT id FROM inventory_listings WHERE id = $1 FOR UPDATE`,
      [listingId],
    );

    if (listingRows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "Listing not found. Cannot initiate Doré intake.",
      };
    }

    // Set the listing into the refinery pipeline
    await client.query(
      `UPDATE inventory_listings
       SET form = 'RAW_DORE',
           estimated_weight_oz = $1,
           refinery_id = $2,
           refinery_status = 'PENDING_DELIVERY'
       WHERE id = $3`,
      [estimatedWeight, refineryId, listingId],
    );

    await client.query("COMMIT");

    console.info(
      `[DORE-INTAKE] ✓ DORÉ INTAKE LOGGED: listing=${listingId} ` +
        `estimated_weight_oz=${estimatedWeight} refinery=${refineryId} ` +
        `status=PENDING_DELIVERY`,
    );

    /* ── 3. Audit Event (outside transaction — non-blocking) ── */

    emitAuditEvent(
      "DORE_INTAKE_LOGGED",
      "INFO",
      {
        listingId,
        estimatedWeightOz: estimatedWeight,
        refineryId,
        refineryStatus: "PENDING_DELIVERY",
        form: "RAW_DORE",
      },
    );

    return {
      success: true,
      listingId,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[DORE-INTAKE] INTAKE UPDATE FAILED for listing=${listingId}:`,
      message,
    );

    return {
      success: false,
      error: "Doré intake update failed. Try again.",
    };
  } finally {
    client.release();
  }
}
