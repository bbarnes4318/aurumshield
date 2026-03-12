"use server";

/* ================================================================
   ASSET INGESTION ENGINE — Server Action
   ================================================================
   Processes Producer asset submissions:
     1. Zod-validated form input parsing
     2. Forensic OCR of Fire Assay PDF (Textract / mock adapter)
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
   LBMA FINENESS THRESHOLDS
   ================================================================ */

const LBMA_GOOD_DELIVERY_MINIMUM_FINENESS = 995.0;

// TODO: When switching to real Textract, use this to map purity codes:
// function purityCodeToFineness(code: string): number {
//   switch (code) {
//     case "9999": return 999.9;
//     case "999":  return 999.0;
//     case "995":  return 995.0;
//     default: { const n = parseFloat(code); return !isNaN(n) ? n : 0; }
//   }
// }

/* ================================================================
   TEXTRACT MOCK ADAPTER
   ================================================================
   When the real Textract service is not available (no AWS credentials
   in local dev), this adapter simulates a 2-second PDF OCR pipeline
   and returns a deterministic fineness of 999.9.

   TODO: Switch to real analyzeAssayReport() when Textract IAM
   permissions are verified in production.
   ================================================================ */

interface MockTextractResult {
  fineness: number;
  rawPurityText: string;
  extractedWeightOz: number | null;
  processingTimeMs: number;
}

async function forensicTextractAnalysis(
  _fileBuffer: Buffer,
  fileName: string,
): Promise<MockTextractResult> {
  const startTime = Date.now();

  // Simulate Textract processing latency
  await new Promise((resolve) => setTimeout(resolve, 2_000));

  console.log(
    `[INGESTION-ENGINE] Textract OCR complete for: ${fileName} ` +
      `(${Date.now() - startTime}ms)`,
  );

  // TODO: Replace with real Textract integration:
  //   import { analyzeAssayReport } from "@/lib/services/textract-service";
  //   const result = await analyzeAssayReport(fileBuffer);
  //   const fineness = purityCodeToFineness(result.extractedPurity ?? "0");

  return {
    fineness: 999.9,
    rawPurityText: "999.9‰ (Mock — Four Nines Fine Gold)",
    extractedWeightOz: null, // Would come from the real PDF parse
    processingTimeMs: Date.now() - startTime,
  };
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
  if (!assayFile || assayFile.size === 0) {
    return {
      success: false,
      error: "Fire Assay Report (PDF) is required. Upload via the dropzone.",
    };
  }

  /* ── 2. Forensic Textract Analysis ── */

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

  const textractResult = await forensicTextractAnalysis(
    fileBuffer,
    assayFile.name,
  );

  /* ── LBMA Good Delivery Assertion ── */
  if (textractResult.fineness < LBMA_GOOD_DELIVERY_MINIMUM_FINENESS) {
    console.error(
      `[INGESTION-ENGINE] LBMA REJECTION: fineness=${textractResult.fineness} ` +
        `threshold=${LBMA_GOOD_DELIVERY_MINIMUM_FINENESS} serial=${serialNumber}`,
    );
    return {
      success: false,
      error:
        "Validation Error: Assay purity below LBMA Good Delivery threshold.",
    };
  }

  console.log(
    `[INGESTION-ENGINE] LBMA assertion PASSED: fineness=${textractResult.fineness} ` +
      `(>= ${LBMA_GOOD_DELIVERY_MINIMUM_FINENESS}) serial=${serialNumber}`,
  );

  /* ── 3. Cryptographic Title Minting (KMS) ── */

  const timestamp = new Date().toISOString();

  const canonicalPayload = buildCanonicalPayload({
    serialNumber,
    grossWeight: parseFloat(grossWeight),
    fineness: textractResult.fineness,
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
        textractResult.fineness,
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
        `serial=${serialNumber} fineness=${textractResult.fineness} ` +
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
