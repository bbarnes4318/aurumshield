/* ================================================================
   DROPBOX SIGN ADAPTER — Electronic Bill of Sale Signatures
   ================================================================
   Direct REST client for the Dropbox Sign (formerly HelloSign)
   API. Handles:

   1. Creating a signature request for Bill of Sale documents
   2. Retrieving embedded sign URLs for iFrame rendering
   3. Checking signature request status

   Auth: Basic auth with DROPBOX_SIGN_API_KEY
   API Base: https://api.hellosign.com/v3

   All functions gracefully fall back to mock data when the API
   key is absent (demo mode).
   ================================================================ */

/* ---------- Types ---------- */

/** Signer details for a signature request */
export interface SignerInfo {
  name: string;
  emailAddress: string;
  role: "buyer" | "seller";
}

/** Created signature request */
export interface SignatureRequest {
  signatureRequestId: string;
  title: string;
  subject: string;
  message: string;
  isComplete: boolean;
  signers: SignatureRequestSigner[];
  createdAt: string;
  /** Whether this is a mock/demo request */
  isMock: boolean;
}

export interface SignatureRequestSigner {
  signatureId: string;
  signerName: string;
  signerEmail: string;
  statusCode: "awaiting_signature" | "signed" | "declined";
  signedAt: string | null;
}

/** Embedded sign URL response */
export interface EmbeddedSignUrl {
  /** The URL to embed in an iFrame */
  signUrl: string;
  /** URL expiry time (UTC ISO string) */
  expiresAt: string;
  /** Signature ID this URL is for */
  signatureId: string;
}

/** Bill of Sale document data */
export interface BillOfSaleData {
  /** Listing title */
  listingTitle: string;
  /** Weight in troy ounces */
  weightOz: number;
  /** Locked price per troy ounce */
  pricePerOz: number;
  /** Total notional value */
  notionalUsd: number;
  /** Delivery method */
  deliveryMethod: "VAULT_CUSTODY" | "SECURE_DELIVERY";
  /** Order ID for reference */
  orderId: string;
  /** Listing ID for reference */
  listingId: string;
  /** Settlement date */
  settlementDate: string;
}

/* ---------- Configuration ---------- */

const DROPBOX_SIGN_API_BASE = "https://api.hellosign.com/v3";

function getApiKey(): string | null {
  if (typeof process !== "undefined" && process.env) {
    return process.env.DROPBOX_SIGN_API_KEY ?? null;
  }
  return null;
}

function getClientId(): string | null {
  if (typeof process !== "undefined" && process.env) {
    return process.env.DROPBOX_SIGN_CLIENT_ID ?? null;
  }
  return null;
}

function getAuthHeader(): string {
  const key = getApiKey();
  if (!key) throw new Error("DROPBOX_SIGN_API_KEY is not configured");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

/* ---------- Internal Helpers ---------- */

async function dropboxSignFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${DROPBOX_SIGN_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Dropbox Sign API error ${response.status}: ${response.statusText}. ${errorBody}`,
    );
  }

  return response.json() as Promise<T>;
}

/* ---------- Mock Data (Demo Mode) ---------- */

function createMockSignatureRequest(
  buyer: SignerInfo,
  seller: SignerInfo,
  billOfSale: BillOfSaleData,
): SignatureRequest {
  const now = new Date().toISOString();
  return {
    signatureRequestId: `sigr_mock_${Date.now()}`,
    title: `Bill of Sale — ${billOfSale.listingTitle}`,
    subject: `AurumShield Settlement: ${billOfSale.orderId}`,
    message: `Please review and sign the Bill of Sale for ${billOfSale.weightOz} oz gold at $${billOfSale.pricePerOz.toFixed(2)}/oz.`,
    isComplete: false,
    signers: [
      {
        signatureId: `sig_mock_buyer_${Date.now()}`,
        signerName: buyer.name,
        signerEmail: buyer.emailAddress,
        statusCode: "awaiting_signature",
        signedAt: null,
      },
      {
        signatureId: `sig_mock_seller_${Date.now() + 1}`,
        signerName: seller.name,
        signerEmail: seller.emailAddress,
        statusCode: "awaiting_signature",
        signedAt: null,
      },
    ],
    createdAt: now,
    isMock: true,
  };
}

function createMockEmbeddedSignUrl(signatureId: string): EmbeddedSignUrl {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  return {
    signUrl: `https://app.hellosign.com/editor/embeddedSign?signature_id=${signatureId}&token=mock_${Date.now()}`,
    expiresAt,
    signatureId,
  };
}

/* ---------- Bill of Sale Template ---------- */

/**
 * Generate the Bill of Sale text content.
 * This is sent as the document content for the signature request.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateBillOfSaleContent(data: BillOfSaleData): string {
  return [
    "BILL OF SALE — PRECIOUS METALS",
    "=" .repeat(50),
    "",
    `Order Reference: ${data.orderId}`,
    `Listing Reference: ${data.listingId}`,
    `Settlement Date: ${data.settlementDate}`,
    "",
    "ASSET DESCRIPTION",
    "-".repeat(30),
    `Item: ${data.listingTitle}`,
    `Weight: ${data.weightOz} Troy Ounces`,
    `Price: $${data.pricePerOz.toFixed(2)} per Troy Ounce`,
    `Total Notional Value: $${data.notionalUsd.toFixed(2)} USD`,
    "",
    "DELIVERY METHOD",
    "-".repeat(30),
    data.deliveryMethod === "VAULT_CUSTODY"
      ? "Allocated vault custody — ownership transferred on ledger"
      : "Secure armored delivery via registered mail carrier",
    "",
    "TERMS AND CONDITIONS",
    "-".repeat(30),
    "1. Seller warrants clear title and ownership of the described asset.",
    "2. Buyer acknowledges inspection of assay documentation.",
    "3. Settlement is governed by AurumShield platform terms.",
    "4. This Bill of Sale constitutes a legally binding agreement.",
    "5. Disputes shall be resolved via binding arbitration.",
    "",
    "SIGNATURES",
    "-".repeat(30),
    "Buyer: _________________________ Date: _________",
    "",
    "Seller: _________________________ Date: _________",
    "",
    `Generated by AurumShield at ${new Date().toISOString()}`,
  ].join("\n");
}

/* ---------- Public API ---------- */

/**
 * Create a Bill of Sale signature request for a gold transaction.
 *
 * In production, this creates an actual Dropbox Sign signature request
 * with embedded signing enabled via the client ID.
 *
 * Falls back to mock data when DROPBOX_SIGN_API_KEY is not configured.
 *
 * @param buyer       Buyer signer information
 * @param seller      Seller signer information
 * @param billOfSale  Bill of Sale document data
 * @returns Created signature request with signer details
 */
export async function createBillOfSale(
  buyer: SignerInfo,
  seller: SignerInfo,
  billOfSale: BillOfSaleData,
): Promise<SignatureRequest> {
  // Demo mode fallback
  if (!getApiKey()) {
    console.info(
      "[AurumShield] Dropbox Sign demo mode — returning mock signature request",
    );
    return createMockSignatureRequest(buyer, seller, billOfSale);
  }

  const clientId = getClientId();
  // TODO: In production, attach generated Bill of Sale content as a file
  // const content = generateBillOfSaleContent(billOfSale);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await dropboxSignFetch<any>(
    "/signature_request/create_embedded",
    {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        title: `Bill of Sale — ${billOfSale.listingTitle}`,
        subject: `AurumShield Settlement: ${billOfSale.orderId}`,
        message: `Please review and sign the Bill of Sale for ${billOfSale.weightOz} oz gold at $${billOfSale.pricePerOz.toFixed(2)}/oz. Total: $${billOfSale.notionalUsd.toFixed(2)}.`,
        signers: [
          {
            email_address: buyer.emailAddress,
            name: buyer.name,
            role: "Buyer",
            order: 0,
          },
          {
            email_address: seller.emailAddress,
            name: seller.name,
            role: "Seller",
            order: 1,
          },
        ],
        // Use test mode when not in production
        test_mode: process.env.NODE_ENV !== "production" ? 1 : 0,
      }),
    },
  );

  const sr = response.signature_request;

  return {
    signatureRequestId: sr.signature_request_id,
    title: sr.title,
    subject: sr.subject,
    message: sr.message ?? "",
    isComplete: sr.is_complete ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signers: (sr.signatures ?? []).map((s: any) => ({
      signatureId: s.signature_id,
      signerName: s.signer_name,
      signerEmail: s.signer_email_address,
      statusCode: s.status_code ?? "awaiting_signature",
      signedAt: s.signed_at ?? null,
    })),
    createdAt: sr.created_at
      ? new Date(sr.created_at * 1000).toISOString()
      : new Date().toISOString(),
    isMock: false,
  };
}

/**
 * Get the embedded sign URL for a specific signer.
 *
 * This URL is loaded in an iFrame to provide the embedded signing
 * experience. URLs expire after 1 hour and must be regenerated.
 *
 * @param signatureId  The signature_id of the signer
 * @returns Embedded sign URL object with expiry
 */
export async function getEmbeddedSignUrl(
  signatureId: string,
): Promise<EmbeddedSignUrl> {
  if (!getApiKey()) {
    console.info(
      "[AurumShield] Dropbox Sign demo mode — returning mock embedded sign URL",
    );
    return createMockEmbeddedSignUrl(signatureId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await dropboxSignFetch<any>(
    `/embedded/sign_url/${signatureId}`,
  );

  const embedded = response.embedded;
  return {
    signUrl: embedded.sign_url,
    expiresAt: embedded.expires_at
      ? new Date(embedded.expires_at * 1000).toISOString()
      : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    signatureId,
  };
}

/**
 * Check the status of a signature request.
 *
 * @param signatureRequestId  The signature_request_id to check
 * @returns Updated signature request with current signer statuses
 */
export async function getSignatureRequestStatus(
  signatureRequestId: string,
): Promise<SignatureRequest> {
  if (!getApiKey()) {
    return {
      signatureRequestId,
      title: "Bill of Sale (mock)",
      subject: "AurumShield Settlement",
      message: "",
      isComplete: false,
      signers: [],
      createdAt: new Date().toISOString(),
      isMock: true,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await dropboxSignFetch<any>(
    `/signature_request/${signatureRequestId}`,
  );

  const sr = response.signature_request;

  return {
    signatureRequestId: sr.signature_request_id,
    title: sr.title,
    subject: sr.subject,
    message: sr.message ?? "",
    isComplete: sr.is_complete ?? false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signers: (sr.signatures ?? []).map((s: any) => ({
      signatureId: s.signature_id,
      signerName: s.signer_name,
      signerEmail: s.signer_email_address,
      statusCode: s.status_code ?? "awaiting_signature",
      signedAt: s.signed_at ?? null,
    })),
    createdAt: sr.created_at
      ? new Date(sr.created_at * 1000).toISOString()
      : new Date().toISOString(),
    isMock: false,
  };
}
