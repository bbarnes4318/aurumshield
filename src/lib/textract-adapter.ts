/* ================================================================
   TEXTRACT ADAPTER — Document Intelligence for Provenance
   ================================================================
   Extends the existing AWS Textract service to extract provenance-
   relevant fields from uploaded documents:
     - Refiner name from Assay Reports
     - Chain of custody metadata

   This adapter wraps src/lib/services/textract-service.ts and adds
   domain-specific field extraction for the provenance verification
   pipeline (used by runProvenanceCheck in marketplace-engine.ts).

   Server-side only — must not be imported in client components.
   ================================================================ */

/* ---------- Types ---------- */

export interface AssayDocumentExtraction {
  /** Refiner name extracted from the assay report */
  refinerName: string | null;
  /** Raw text that matched the refiner extraction pattern */
  rawRefinerText: string | null;
  /** Extracted purity (e.g., "9999") */
  extractedPurity: string | null;
  /** Extracted weight in troy ounces */
  extractedWeightOz: number | null;
  /** Bar/ingot serial number if found */
  serialNumber: string | null;
  /** Date of assay if found */
  assayDate: string | null;
  /** Whether analysis succeeded */
  analysisSucceeded: boolean;
  /** Error message if analysis failed */
  analysisError: string | null;
  /** All raw text lines extracted from the document (for audit) */
  rawTextLines: string[];
}

export interface ChainOfCustodyExtraction {
  /** Name of the custodian / vault operator */
  custodianName: string | null;
  /** Vault location */
  vaultLocation: string | null;
  /** Transfer dates found in the document */
  transferDates: string[];
  /** Whether analysis succeeded */
  analysisSucceeded: boolean;
  /** Error message if analysis failed */
  analysisError: string | null;
  /** All raw text lines extracted */
  rawTextLines: string[];
}

/* ---------- Refiner Extraction Patterns ---------- */

/**
 * Common patterns for identifying refiner names in assay documents.
 * These patterns look for labels like "Refiner:", "Assayer:", "Manufacturer:", etc.
 * followed by the refiner name.
 */
const REFINER_LABEL_PATTERNS = [
  /refiner\s*[:\-–]\s*(.+)/i,
  /assayer\s*[:\-–]\s*(.+)/i,
  /manufacturer\s*[:\-–]\s*(.+)/i,
  /refinery\s*[:\-–]\s*(.+)/i,
  /produced\s+by\s*[:\-–]?\s*(.+)/i,
  /certified\s+by\s*[:\-–]?\s*(.+)/i,
  /brand\s*[:\-–]\s*(.+)/i,
  /hallmark\s*[:\-–]\s*(.+)/i,
  /smelter\s*[:\-–]\s*(.+)/i,
];

/**
 * Well-known refiner names that can be detected without labels.
 * Used as a fallback when label-based extraction fails.
 */
const KNOWN_REFINERS = [
  "Argor-Heraeus",
  "Asahi Refining",
  "Heraeus",
  "Johnson Matthey",
  "Metalor",
  "PAMP",
  "Perth Mint",
  "Rand Refinery",
  "Royal Canadian Mint",
  "Tanaka",
  "Umicore",
  "Valcambi",
];

const SERIAL_PATTERNS = [
  /serial\s*(?:no|number|#)?\s*[:\-–]?\s*([A-Z0-9\-]{4,20})/i,
  /bar\s*(?:no|number|#)?\s*[:\-–]?\s*([A-Z0-9\-]{4,20})/i,
  /ingot\s*(?:no|number|#)?\s*[:\-–]?\s*([A-Z0-9\-]{4,20})/i,
];

const DATE_PATTERNS = [
  /(?:date|dated|assay\s*date|analysis\s*date)\s*[:\-–]?\s*(\d{1,2}[\s\/\-]\w{3,9}[\s\/\-]\d{2,4})/i,
  /(?:date|dated|assay\s*date|analysis\s*date)\s*[:\-–]?\s*(\d{4}[\-\/]\d{2}[\-\/]\d{2})/i,
];

/* ---------- Extraction Logic ---------- */

/**
 * Extract the refiner name from a set of text lines.
 * Uses a two-pass approach:
 *   1. Label-based extraction (e.g., "Refiner: PAMP SA")
 *   2. Known-refiner detection (scans all lines for known names)
 */
function extractRefinerName(
  lines: string[],
): { refinerName: string | null; rawRefinerText: string | null } {
  // Pass 1: Label-based extraction
  for (const line of lines) {
    for (const pattern of REFINER_LABEL_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        const extracted = match[1].trim();
        if (extracted.length >= 3) {
          return { refinerName: extracted, rawRefinerText: line.trim() };
        }
      }
    }
  }

  // Pass 2: Known refiner name detection
  const fullText = lines.join(" ");
  for (const known of KNOWN_REFINERS) {
    if (fullText.toLowerCase().includes(known.toLowerCase())) {
      return { refinerName: known, rawRefinerText: null };
    }
  }

  return { refinerName: null, rawRefinerText: null };
}

/**
 * Extract serial number from text lines.
 */
function extractSerialNumber(lines: string[]): string | null {
  for (const line of lines) {
    for (const pattern of SERIAL_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract assay date from text lines.
 */
function extractAssayDate(lines: string[]): string | null {
  for (const line of lines) {
    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
  }
  return null;
}

/* ---------- Public API ---------- */

/**
 * Extract provenance-relevant fields from assay report text.
 *
 * This function takes raw text lines (from AWS Textract or mock data)
 * and applies domain-specific extraction patterns for:
 *   - Refiner name
 *   - Serial/bar number
 *   - Assay date
 *
 * Designed to be composable with the existing textract-service.ts
 * which handles the AWS API call and purity/weight extraction.
 *
 * @param textLines - Array of text lines extracted from the document
 * @returns Structured extraction result
 */
export function extractAssayDocumentFields(
  textLines: string[],
): AssayDocumentExtraction {
  if (!textLines || textLines.length === 0) {
    return {
      refinerName: null,
      rawRefinerText: null,
      extractedPurity: null,
      extractedWeightOz: null,
      serialNumber: null,
      assayDate: null,
      analysisSucceeded: false,
      analysisError: "No text lines provided for extraction",
      rawTextLines: [],
    };
  }

  const { refinerName, rawRefinerText } = extractRefinerName(textLines);
  const serialNumber = extractSerialNumber(textLines);
  const assayDate = extractAssayDate(textLines);

  return {
    refinerName,
    rawRefinerText,
    extractedPurity: null, // Handled by existing textract-service.ts
    extractedWeightOz: null, // Handled by existing textract-service.ts
    serialNumber,
    assayDate,
    analysisSucceeded: true,
    analysisError: null,
    rawTextLines: textLines,
  };
}

/**
 * Extract provenance-relevant fields from chain of custody documents.
 *
 * @param textLines - Array of text lines from Textract
 * @returns Structured extraction result
 */
export function extractChainOfCustodyFields(
  textLines: string[],
): ChainOfCustodyExtraction {
  if (!textLines || textLines.length === 0) {
    return {
      custodianName: null,
      vaultLocation: null,
      transferDates: [],
      analysisSucceeded: false,
      analysisError: "No text lines provided for extraction",
      rawTextLines: [],
    };
  }

  let custodianName: string | null = null;
  let vaultLocation: string | null = null;
  const transferDates: string[] = [];

  const custodianPatterns = [
    /custodian\s*[:\-–]\s*(.+)/i,
    /vault\s*operator\s*[:\-–]\s*(.+)/i,
    /storage\s*provider\s*[:\-–]\s*(.+)/i,
    /depository\s*[:\-–]\s*(.+)/i,
  ];

  const locationPatterns = [
    /vault\s*(?:location|address|facility)\s*[:\-–]\s*(.+)/i,
    /storage\s*(?:location|facility)\s*[:\-–]\s*(.+)/i,
    /located\s+(?:at|in)\s*[:\-–]?\s*(.+)/i,
  ];

  for (const line of textLines) {
    // Custodian extraction
    if (!custodianName) {
      for (const pattern of custodianPatterns) {
        const match = line.match(pattern);
        if (match?.[1]) {
          custodianName = match[1].trim();
          break;
        }
      }
    }

    // Location extraction
    if (!vaultLocation) {
      for (const pattern of locationPatterns) {
        const match = line.match(pattern);
        if (match?.[1]) {
          vaultLocation = match[1].trim();
          break;
        }
      }
    }

    // Transfer date extraction
    for (const pattern of DATE_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1]) {
        transferDates.push(match[1].trim());
      }
    }
  }

  return {
    custodianName,
    vaultLocation,
    transferDates,
    analysisSucceeded: true,
    analysisError: null,
    rawTextLines: textLines,
  };
}

/**
 * Run a mock extraction for demo purposes.
 * Returns realistic-looking extraction results using deterministic data.
 *
 * @param documentType - "ASSAY_REPORT" or "CHAIN_OF_CUSTODY"
 * @param listingId - Used for deterministic variation
 */
export function runMockExtraction(
  documentType: "ASSAY_REPORT" | "CHAIN_OF_CUSTODY",
  listingId: string,
): AssayDocumentExtraction | ChainOfCustodyExtraction {
  const lastChar = listingId.slice(-1);
  const variant = parseInt(lastChar, 10) || 0;

  if (documentType === "ASSAY_REPORT") {
    const refiners = ["PAMP SA", "Valcambi SA", "Heraeus", "Metalor Technologies SA", "Argor-Heraeus SA"];
    return {
      refinerName: refiners[variant % refiners.length],
      rawRefinerText: `Refiner: ${refiners[variant % refiners.length]}`,
      extractedPurity: "9999",
      extractedWeightOz: 100,
      serialNumber: `AU-${String(variant).padStart(6, "0")}`,
      assayDate: "2025-11-15",
      analysisSucceeded: true,
      analysisError: null,
      rawTextLines: [
        "CERTIFICATE OF ASSAY",
        `Refiner: ${refiners[variant % refiners.length]}`,
        `Serial Number: AU-${String(variant).padStart(6, "0")}`,
        "Fineness: 999.9",
        "Gross Weight: 100.000 Troy Ounces",
        `Date of Assay: 2025-11-15`,
        "This certifies that the above bar has been assayed and found to comply with LBMA Good Delivery Rules.",
      ],
    };
  }

  return {
    custodianName: "Brink's Global Services",
    vaultLocation: "Zurich Free Port, Switzerland",
    transferDates: ["2025-10-01", "2025-11-15"],
    analysisSucceeded: true,
    analysisError: null,
    rawTextLines: [
      "CHAIN OF CUSTODY CERTIFICATE",
      "Custodian: Brink's Global Services",
      "Vault Location: Zurich Free Port, Switzerland",
      "Transfer Date: 2025-10-01",
      "Received Date: 2025-11-15",
    ],
  };
}
