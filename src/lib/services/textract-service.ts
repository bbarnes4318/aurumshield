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
      };
    }

    const lines = extractLines(response.Blocks);
    const purityResult = extractPurity(lines);
    const weightResult = extractWeight(lines);

    return {
      success: purityResult !== null || weightResult !== null,
      extractedPurity: purityResult?.purity ?? null,
      rawPurityText: purityResult?.rawText ?? null,
      extractedWeightOz: weightResult?.weightOz ?? null,
      rawWeightText: weightResult?.rawText ?? null,
      allExtractedLines: lines,
      error: null,
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
    };
  }
}
