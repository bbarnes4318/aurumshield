/* ================================================================
   INSCRIBE.AI ADAPTER — Forensic Document Validation
   ================================================================
   Replaces AWS Textract for document intelligence in the
   Marketplace Publish Gate. Validates:
     - Assay Reports (gold purity, weight, refiner certification)
     - Chain of Custody documents (provenance trail)

   Inscribe.ai provides AI-powered document fraud detection
   and data extraction specifically designed for financial
   and compliance documents.

   API Docs: https://docs.inscribe.ai/
   ================================================================ */

import "server-only";

/* ---------- Types ---------- */

export type DocumentType = "ASSAY_REPORT" | "CHAIN_OF_CUSTODY";

export type FraudSignal = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CONFIRMED_FRAUD";

export interface InscribeValidationResult {
  documentId: string;
  documentType: DocumentType;
  isAuthentic: boolean;
  fraudSignal: FraudSignal;
  confidenceScore: number;
  extractedData: Record<string, string | number | null>;
  validationDetails: InscribeValidationDetail[];
  processingTimeMs: number;
  timestamp: string;
}

export interface InscribeValidationDetail {
  checkName: string;
  passed: boolean;
  confidence: number;
  detail: string;
}

export interface InscribeSubmission {
  requestId: string;
  status: "processing" | "completed" | "failed";
  estimatedCompletionMs: number;
}

/* ---------- Constants ---------- */

const INSCRIBE_API_BASE = "https://api.inscribe.ai/v2";

/* ---------- Document Submission ---------- */

/**
 * Submit a document to Inscribe.ai for forensic validation.
 *
 * Used in the Marketplace Publish Gate to validate:
 * - Assay Reports: Confirms gold purity, weight, and refiner
 * - Chain of Custody: Validates provenance trail authenticity
 *
 * // TODO: API Integration — wire to live Inscribe.ai API
 */
export async function submitDocumentForValidation(
  documentUrl: string,
  documentType: DocumentType,
  organizationId: string,
): Promise<InscribeSubmission> {
  try {
    // TODO: API Integration — replace mock with live Inscribe API
    // const response = await fetch(`${INSCRIBE_API_BASE}/documents`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${process.env.INSCRIBE_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     document_url: documentUrl,
    //     document_type: documentType,
    //     metadata: { organization_id: organizationId },
    //   }),
    // });

    console.log(
      `[Inscribe] Submitting ${documentType} for org=${organizationId}`,
      `url=${documentUrl}`,
      `endpoint=${INSCRIBE_API_BASE}/documents`,
    );

    // --- Mock implementation ---
    return {
      requestId: `inscribe-${documentType.toLowerCase()}-${Date.now().toString(36)}`,
      status: "processing",
      estimatedCompletionMs: 3000,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Inscribe document submission failed: ${message}`);
  }
}

/* ---------- Validation Result Retrieval ---------- */

/**
 * Retrieve the validation result for a submitted document.
 *
 * // TODO: API Integration — wire to live Inscribe.ai API
 */
export async function getValidationResult(
  requestId: string,
): Promise<InscribeValidationResult> {
  try {
    // TODO: API Integration — replace mock with live Inscribe API
    // const response = await fetch(`${INSCRIBE_API_BASE}/documents/${requestId}`, {
    //   headers: { Authorization: `Bearer ${process.env.INSCRIBE_API_KEY}` },
    // });

    console.log(`[Inscribe] Retrieving result for request=${requestId}`);

    const isAssay = requestId.includes("assay");
    const documentType: DocumentType = isAssay ? "ASSAY_REPORT" : "CHAIN_OF_CUSTODY";

    // --- Mock: deterministic result ---
    const isFraud = requestId.endsWith("0");

    const assayData: Record<string, string | number | null> = {
      refinerName: "Metalor Technologies SA",
      refinerAccreditation: "LBMA Good Delivery",
      goldPurity: 0.9999,
      weightTroyOz: 32.15,
      assayDate: "2025-11-20",
      serialNumber: "MT-2025-88431",
    };

    const cocData: Record<string, string | number | null> = {
      originMine: "Barrick Gold - Pueblo Viejo",
      originCountry: "DO",
      refinerName: "Metalor Technologies SA",
      custodianChain: "Brink's → LBMA Vault → AurumShield",
      lastTransferDate: "2025-12-01",
    };

    const validationDetails: InscribeValidationDetail[] = [
      {
        checkName: "Document Authenticity",
        passed: !isFraud,
        confidence: isFraud ? 0.25 : 0.97,
        detail: isFraud
          ? "Document shows signs of digital manipulation"
          : "Document passes all authenticity checks",
      },
      {
        checkName: "Font Consistency",
        passed: !isFraud,
        confidence: isFraud ? 0.4 : 0.99,
        detail: isFraud
          ? "Inconsistent font metrics detected in key fields"
          : "All fonts consistent throughout document",
      },
      {
        checkName: "Metadata Integrity",
        passed: true,
        confidence: 0.95,
        detail: "Document metadata consistent with creation date",
      },
    ];

    return {
      documentId: requestId,
      documentType,
      isAuthentic: !isFraud,
      fraudSignal: isFraud ? "HIGH" : "NONE",
      confidenceScore: isFraud ? 0.3 : 0.96,
      extractedData: isAssay ? assayData : cocData,
      validationDetails,
      processingTimeMs: 2847,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Inscribe result retrieval failed: ${message}`);
  }
}

/**
 * Convenience: submit and poll for result (blocking).
 * For use in the Publish Gate synchronous validation path.
 *
 * // TODO: API Integration — implement proper async polling
 */
export async function validateDocument(
  documentUrl: string,
  documentType: DocumentType,
  organizationId: string,
): Promise<InscribeValidationResult> {
  const submission = await submitDocumentForValidation(
    documentUrl,
    documentType,
    organizationId,
  );

  // Mock: simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return getValidationResult(submission.requestId);
}
