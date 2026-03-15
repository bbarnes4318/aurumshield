/* ================================================================
   AWS TEXTRACT SERVICE — Assay Report Document Analysis

   Analyzes uploaded assay report documents (PDF/Image) to extract
   key metallurgical data: purity percentage and weight.

   Security:
   - AWS credentials read exclusively from process.env
   - Never hardcoded, never cached in memory beyond SDK lifecycle
   ================================================================ */

import {
  TextractClient,
  AnalyzeDocumentCommand,
  type Block,
  type AnalyzeDocumentCommandInput,
} from "@aws-sdk/client-textract";
import type { Purity } from "../mock-data";

/* ---------- Types ---------- */

/** Structured result from Textract analysis of an assay report. */
export interface AssayExtractionResult {
  /** Whether the extraction successfully identified purity and/or weight. */
  success: boolean;
  /** Extracted purity as a normalized AurumShield Purity code ("995" | "999" | "9999"), or null if not found. */
  extractedPurity: Purity | null;
  /** Raw purity string as it appeared in the document (e.g. "99.99%", ".9999"). */
  rawPurityText: string | null;
  /** Extracted weight in troy ounces, or null if not found. */
  extractedWeightOz: number | null;
  /** Raw weight string as it appeared in the document. */
  rawWeightText: string | null;
  /** All extracted text lines for debugging / audit trail. */
  allExtractedLines: string[];
  /** Any errors encountered during extraction. */
  error: string | null;
  /** Extended assay field extraction results (thickness, conductivity, assayer, serial). */
  assayFields: AssayFieldExtractionResult | null;
}

/**
 * Extended extraction result for sovereign assay cross-check fields.
 * These are the values compared against the Producer's manual input
 * to detect provenance forgery.
 */
export interface AssayFieldExtractionResult {
  /** Ultrasonic thickness in millimeters, or null if not found. */
  ultrasonicThicknessMm: number | null;
  /** Raw thickness string as it appeared in the document. */
  rawThicknessText: string | null;
  /** Electrical conductivity in % IACS, or null if not found. */
  conductivityIacs: number | null;
  /** Raw conductivity string as it appeared in the document. */
  rawConductivityText: string | null;
  /** Assayer / certifier name, or null if not found. */
  assayerName: string | null;
  /** Raw assayer text as it appeared in the document. */
  rawAssayerText: string | null;
  /** Bar / ingot serial number, or null if not found. */
  serialNumber: string | null;
  /** Raw serial text as it appeared in the document. */
  rawSerialText: string | null;
}

/* ---------- Constants ---------- */

/**
 * Purity normalization map.
 * Assay reports express purity in various formats. This maps common
 * representations to the canonical AurumShield Purity codes.
 */
const PURITY_PATTERNS: { pattern: RegExp; purity: Purity }[] = [
  // ".9999", "99.99%", "99.99", "999.9‰", "9999"
  { pattern: /(?:^|\s)\.?9999\s*%?/i, purity: "9999" },
  { pattern: /99\.99\s*%?/i, purity: "9999" },
  { pattern: /999\.9\s*‰/i, purity: "9999" },
  { pattern: /four\s*nines/i, purity: "9999" },

  // ".999", "99.9%", "99.9", "999‰"
  { pattern: /(?:^|\s)\.?999(?!\d)\s*%?/i, purity: "999" },
  { pattern: /99\.9(?!\d)\s*%?/i, purity: "999" },
  { pattern: /999(?!\d)\s*‰/i, purity: "999" },
  { pattern: /three\s*nines/i, purity: "999" },

  // ".995", "99.5%", "99.5", "995‰"
  { pattern: /(?:^|\s)\.?995\s*%?/i, purity: "995" },
  { pattern: /99\.5\s*%?/i, purity: "995" },
  { pattern: /995\s*‰/i, purity: "995" },
];

/**
 * Weight extraction pattern.
 * Matches numeric values followed by weight-related keywords.
 * Examples: "400 oz", "100 troy ounces", "1000 ounces"
 */
const WEIGHT_PATTERN = /(\d+(?:[.,]\d+)?)\s*(?:troy\s*)?(?:oz|ounces?|ozt)/i;

/* ---------- Assay Field Extraction Patterns ---------- */

/**
 * Ultrasonic thickness pattern.
 * Matches numeric values near thickness-related labels.
 * Examples: "Thickness: 35.2mm", "Ultrasonic: 25.400 mm", "UT Gauge: 31.75mm"
 */
const THICKNESS_PATTERNS: RegExp[] = [
  /(?:ultrasonic|thickness|ut\s*gauge|ut)\s*[:\-–]?\s*(\d+(?:\.\d+)?)\s*mm/i,
  /(\d+(?:\.\d+)?)\s*mm\s*(?:thickness|ultrasonic)/i,
  /thickness\s*(?:\(mm\))?\s*[:\-–]?\s*(\d+(?:\.\d+)?)/i,
];

/**
 * Conductivity (% IACS) pattern.
 * Matches numeric values near conductivity-related labels.
 * Examples: "Conductivity: 72.50% IACS", "IACS: 72.5", "Electrical Conductivity 71.80 %IACS"
 */
const CONDUCTIVITY_PATTERNS: RegExp[] = [
  /(?:conductivity|cond\.?)\s*[:\-–]?\s*(\d+(?:\.\d+)?)\s*%?\s*IACS/i,
  /IACS\s*[:\-–]?\s*(\d+(?:\.\d+)?)\s*%?/i,
  /(\d+(?:\.\d+)?)\s*%\s*IACS/i,
  /(?:conductivity|cond\.?)\s*(?:\(%\s*IACS\))?\s*[:\-–]?\s*(\d+(?:\.\d+)?)/i,
];

/**
 * Assayer / certifier name pattern.
 * Matches labels like "Assayer:", "Certified by:", "Assayed by:".
 */
const ASSAYER_PATTERNS: RegExp[] = [
  /(?:assayer|assayed\s+by|certified\s+by|certifier)\s*[:\-–]\s*(.+)/i,
  /(?:signature|analyst)\s*[:\-–]\s*(.+)/i,
];

/**
 * Serial number pattern.
 * Matches labels like "Serial Number:", "Bar No:", "Ingot #:".
 */
const SERIAL_PATTERNS: RegExp[] = [
  /(?:serial|bar|ingot)\s*(?:no|number|#|num)?\.?\s*[:\-–]?\s*([A-Z0-9][A-Z0-9\-]{3,19})/i,
];

/* ---------- Client Initialization ---------- */

/**
 * Creates a TextractClient configured for the runtime environment.
 *
 * - **Local dev**: Uses explicit credentials from AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars.
 * - **ECS Fargate**: Uses the IAM Task Role automatically (SDK credential chain).
 *   The task role `aurumshield-ecs-task-role` already has textract:AnalyzeDocument permission.
 *
 * AWS_REGION is always required (set in both .env.local and ECS task definition).
 */
function createTextractClient(): TextractClient {
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error(
      "AWS_REGION environment variable is not set. " +
        "Required for Textract API calls.",
    );
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // If explicit credentials are provided (local dev), use them.
  // Otherwise fall back to SDK default credential chain (ECS task role).
  if (accessKeyId && secretAccessKey) {
    return new TextractClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  // ECS Fargate: SDK auto-discovers credentials from the task role
  return new TextractClient({ region });
}

/* ---------- Text Extraction Helpers ---------- */

/**
 * Extract all LINE-type text blocks from Textract response blocks.
 * Filters to only LINE blocks for cleaner text extraction.
 */
function extractLines(blocks: Block[]): string[] {
  return blocks
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text!.trim());
}

/**
 * Attempt to extract a Purity value from an array of text lines.
 * Searches through all lines looking for purity-related patterns.
 * Returns the first match found, prioritizing higher purity values.
 */
function extractPurity(
  lines: string[],
): { purity: Purity; rawText: string } | null {
  const fullText = lines.join(" ");

  // Try each pattern against the full text
  for (const { pattern, purity } of PURITY_PATTERNS) {
    const match = pattern.exec(fullText);
    if (match) {
      return { purity, rawText: match[0].trim() };
    }
  }

  // Also try individual lines for more targeted matching
  for (const line of lines) {
    for (const { pattern, purity } of PURITY_PATTERNS) {
      const match = pattern.exec(line);
      if (match) {
        return { purity, rawText: match[0].trim() };
      }
    }
  }

  return null;
}

/**
 * Attempt to extract a weight value (in troy ounces) from text lines.
 */
function extractWeight(
  lines: string[],
): { weightOz: number; rawText: string } | null {
  const fullText = lines.join(" ");

  const match = WEIGHT_PATTERN.exec(fullText);
  if (match) {
    const numStr = match[1].replace(",", "");
    const weightOz = parseFloat(numStr);
    if (!isNaN(weightOz) && weightOz > 0) {
      return { weightOz, rawText: match[0].trim() };
    }
  }

  // Also try individual lines
  for (const line of lines) {
    const lineMatch = WEIGHT_PATTERN.exec(line);
    if (lineMatch) {
      const numStr = lineMatch[1].replace(",", "");
      const weightOz = parseFloat(numStr);
      if (!isNaN(weightOz) && weightOz > 0) {
        return { weightOz, rawText: lineMatch[0].trim() };
      }
    }
  }

  return null;
}

/* ---------- Assay Field Extraction Helpers ---------- */

/**
 * Extract ultrasonic thickness (mm) from text lines.
 */
function extractThickness(
  lines: string[],
): { thicknessMm: number; rawText: string } | null {
  const fullText = lines.join(" ");
  for (const pattern of THICKNESS_PATTERNS) {
    const match = pattern.exec(fullText);
    if (match?.[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) {
        return { thicknessMm: val, rawText: match[0].trim() };
      }
    }
  }
  for (const line of lines) {
    for (const pattern of THICKNESS_PATTERNS) {
      const match = pattern.exec(line);
      if (match?.[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0) {
          return { thicknessMm: val, rawText: match[0].trim() };
        }
      }
    }
  }
  return null;
}

/**
 * Extract conductivity (% IACS) from text lines.
 */
function extractConductivity(
  lines: string[],
): { conductivityIacs: number; rawText: string } | null {
  const fullText = lines.join(" ");
  for (const pattern of CONDUCTIVITY_PATTERNS) {
    const match = pattern.exec(fullText);
    if (match?.[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val) && val > 0) {
        return { conductivityIacs: val, rawText: match[0].trim() };
      }
    }
  }
  for (const line of lines) {
    for (const pattern of CONDUCTIVITY_PATTERNS) {
      const match = pattern.exec(line);
      if (match?.[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0) {
          return { conductivityIacs: val, rawText: match[0].trim() };
        }
      }
    }
  }
  return null;
}

/**
 * Extract assayer / certifier name from text lines.
 */
function extractAssayerName(
  lines: string[],
): { assayerName: string; rawText: string } | null {
  for (const line of lines) {
    for (const pattern of ASSAYER_PATTERNS) {
      const match = pattern.exec(line);
      if (match?.[1]) {
        const name = match[1].trim();
        if (name.length >= 2) {
          return { assayerName: name, rawText: line.trim() };
        }
      }
    }
  }
  return null;
}

/**
 * Extract serial number from text lines.
 */
function extractSerialNumber(
  lines: string[],
): { serialNumber: string; rawText: string } | null {
  for (const line of lines) {
    for (const pattern of SERIAL_PATTERNS) {
      const match = pattern.exec(line);
      if (match?.[1]) {
        return { serialNumber: match[1].trim(), rawText: line.trim() };
      }
    }
  }
  return null;
}

/**
 * Extract all sovereign assay cross-check fields from text lines.
 * This is a pure function — it operates on pre-extracted text lines
 * and does not call AWS Textract directly.
 *
 * Used by both analyzeAssayReport() (internal) and can be called
 * directly for unit testing or re-processing cached text.
 */
export function extractAssayFields(
  lines: string[],
): AssayFieldExtractionResult {
  const thicknessResult = extractThickness(lines);
  const conductivityResult = extractConductivity(lines);
  const assayerResult = extractAssayerName(lines);
  const serialResult = extractSerialNumber(lines);

  return {
    ultrasonicThicknessMm: thicknessResult?.thicknessMm ?? null,
    rawThicknessText: thicknessResult?.rawText ?? null,
    conductivityIacs: conductivityResult?.conductivityIacs ?? null,
    rawConductivityText: conductivityResult?.rawText ?? null,
    assayerName: assayerResult?.assayerName ?? null,
    rawAssayerText: assayerResult?.rawText ?? null,
    serialNumber: serialResult?.serialNumber ?? null,
    rawSerialText: serialResult?.rawText ?? null,
  };
}

/* ---------- Main Export ---------- */

/**
 * Analyze an assay report document using AWS Textract.
 *
 * Sends the document buffer to Textract's AnalyzeDocument API with
 * FORMS feature detection, then parses the response to extract
 * purity and weight metadata.
 *
 * @param fileBuffer - Raw bytes of the PDF or image document
 * @returns Structured extraction result with normalized purity and weight
 */
export async function analyzeAssayReport(
  fileBuffer: Buffer,
): Promise<AssayExtractionResult> {
  try {
    const client = createTextractClient();

    const input: AnalyzeDocumentCommandInput = {
      Document: {
        Bytes: fileBuffer,
      },
      FeatureTypes: ["FORMS", "TABLES"],
    };

    const command = new AnalyzeDocumentCommand(input);
    const response = await client.send(command);

    if (!response.Blocks || response.Blocks.length === 0) {
      return {
        success: false,
        extractedPurity: null,
        rawPurityText: null,
        extractedWeightOz: null,
        rawWeightText: null,
        allExtractedLines: [],
        error: "Textract returned no blocks — document may be empty or unreadable",
        assayFields: null,
      };
    }

    const lines = extractLines(response.Blocks);
    const purityResult = extractPurity(lines);
    const weightResult = extractWeight(lines);
    const assayFields = extractAssayFields(lines);

    return {
      success: purityResult !== null || weightResult !== null,
      extractedPurity: purityResult?.purity ?? null,
      rawPurityText: purityResult?.rawText ?? null,
      extractedWeightOz: weightResult?.weightOz ?? null,
      rawWeightText: weightResult?.rawText ?? null,
      allExtractedLines: lines,
      error: null,
      assayFields,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[AurumShield] Textract analysis failed:", message);

    return {
      success: false,
      extractedPurity: null,
      rawPurityText: null,
      extractedWeightOz: null,
      rawWeightText: null,
      allExtractedLines: [],
      error: `Textract analysis failed: ${message}`,
      assayFields: null,
    };
  }
}
