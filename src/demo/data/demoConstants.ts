/* ================================================================
   DEMO CONSTANTS — Deterministic data for the 8-act cinematic demo
   
   Single source of truth for all demo-mode data across the
   institutional concierge flow. Referenced by:
     - useDemoFirstTradeDraft()
     - verification evidence workspace
     - marketplace auto-fill
     - settlement page fallback
   
   IMPORTANT: This data is always labeled as demonstration material.
   Never presented as literal fact or a real transaction.
   ================================================================ */

/** Demo entity identity */
export const DEMO_ENTITY = {
  companyName: "Meridian Capital Holdings Ltd.",
  jurisdiction: "US",
  lei: "5493001KJTIIGC8Y1R12", // Fictional LEI
  entityType: "US Corporate",
  incorporationDate: "2019-04-15",
  registeredAddress: "200 Park Avenue, Suite 1800, New York, NY 10166",
  stateOfIncorporation: "Delaware",
} as const;

/** Demo authorized representative */
export const DEMO_REPRESENTATIVE = {
  name: "James R. Whitfield",
  title: "Chief Investment Officer",
  email: "j.whitfield@meridiancap.com",
} as const;

/** Demo UBO structure */
export const DEMO_UBO_STRUCTURE = {
  parentEntity: DEMO_ENTITY.companyName,
  beneficialOwners: [
    {
      name: "James R. Whitfield",
      ownership: 42,
      jurisdiction: "US",
      pep: false,
      sanctioned: false,
      adverseMedia: false,
      role: "Founder & CIO",
      nationality: "United States",
      idDocumentType: "Passport",
      screened: true,
    },
    {
      name: "Catherine L. Dresner",
      ownership: 31,
      jurisdiction: "US",
      pep: false,
      sanctioned: false,
      adverseMedia: false,
      role: "Managing Partner",
      nationality: "United States",
      idDocumentType: "Passport",
      screened: true,
    },
    {
      name: "Whitfield Family Trust",
      ownership: 27,
      jurisdiction: "US",
      pep: false,
      sanctioned: false,
      adverseMedia: false,
      role: "Passive Trust Vehicle",
      nationality: "United States",
      idDocumentType: "Trust Deed",
      screened: true,
    },
  ],
  authorizedRepresentative: DEMO_REPRESENTATIVE.name,
} as const;

/** Demo asset selection */
export const DEMO_ASSET = {
  assetId: "lbma-400oz",
  name: "400 oz LBMA Good Delivery Bar",
  shortName: "LBMA 400oz",
  weightOz: 400,
  fineness: "≥995.0",
  premiumBps: 10,
  quantity: 1,
} as const;

/** Demo vault / delivery config */
export const DEMO_DELIVERY = {
  deliveryMethod: "vault_custody" as const,
  vaultJurisdiction: "zurich",
  vaultLabel: "Zurich — Malca-Amit Hub 1",
  deliveryRegion: null,
  transactionIntent: "ALLOCATION" as const,
} as const;

/** Demo funding config */
export const DEMO_FUNDING = {
  method: "digital_stablecoin" as const,
  walletAddress: "0x8C3d2E9b4F1A7c6D5e0B2f8A9c4D7E1F3b6A8c2D",
  network: "ethereum",
  asset: "USDC",
  treasuryOrigin: "Meridian Capital — Primary Operating Treasury",
  bankReview: "N/A — Digital rail selected",
  operationalReadiness: "READY",
} as const;

/** Demo settlement reference */
export const DEMO_SETTLEMENT_REF = "SC-DEMO-001";
export const DEMO_TRADE_REF = "FT-DEMO-001";

/**
 * Build a deterministic indicative price snapshot.
 * Uses a fixed spot price so the demo is reproducible.
 */
export function buildDemoIndicativeSnapshot(spotPriceUsd: number) {
  const totalWeightOz = DEMO_ASSET.weightOz * DEMO_ASSET.quantity;
  const baseSpotValue = totalWeightOz * spotPriceUsd;
  const assetPremium = baseSpotValue * (DEMO_ASSET.premiumBps / 10_000);
  const platformFee = baseSpotValue * (100 / 10_000); // 1% fee sweep
  const estimatedTotal = baseSpotValue + assetPremium + platformFee;

  return {
    tier: "INDICATIVE" as const,
    spotPriceUsd,
    totalWeightOz,
    baseSpotValueUsd: baseSpotValue,
    assetPremiumUsd: assetPremium,
    assetPremiumBps: DEMO_ASSET.premiumBps,
    platformFeeUsd: platformFee,
    platformFeeBps: 100,
    estimatedTotalUsd: estimatedTotal,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Build the full demo first-trade draft for sessionStorage persistence.
 */
export function buildDemoFirstTradeDraft() {
  return {
    selectedAssetId: DEMO_ASSET.assetId,
    quantity: DEMO_ASSET.quantity,
    deliveryMethod: DEMO_DELIVERY.deliveryMethod,
    vaultJurisdiction: DEMO_DELIVERY.vaultJurisdiction,
    deliveryRegion: DEMO_DELIVERY.deliveryRegion,
    transactionIntent: DEMO_DELIVERY.transactionIntent,
  };
}

/**
 * Build the full demo first-trade intent for success/settlement pages.
 */
export function buildDemoFirstTradeIntent(spotPriceUsd: number) {
  return {
    ref: DEMO_TRADE_REF,
    assetId: DEMO_ASSET.assetId,
    quantity: DEMO_ASSET.quantity,
    deliveryMethod: DEMO_DELIVERY.deliveryMethod,
    vaultJurisdiction: DEMO_DELIVERY.vaultJurisdiction,
    deliveryRegion: DEMO_DELIVERY.deliveryRegion,
    indicativeSnapshot: buildDemoIndicativeSnapshot(spotPriceUsd),
    submittedAt: new Date().toISOString(),
  };
}

/** SessionStorage key for demo draft/intent persistence */
export const DEMO_DRAFT_SS_KEY = "aurumshield:demo-draft";
export const DEMO_INTENT_SS_KEY = "aurumshield:demo-intent";

/**
 * Persist demo draft to sessionStorage so downstream pages can read it.
 */
export function persistDemoDraft(spotPriceUsd: number): void {
  if (typeof window === "undefined") return;
  const draft = buildDemoFirstTradeDraft();
  const intent = buildDemoFirstTradeIntent(spotPriceUsd);
  sessionStorage.setItem(DEMO_DRAFT_SS_KEY, JSON.stringify(draft));
  sessionStorage.setItem(DEMO_INTENT_SS_KEY, JSON.stringify(intent));
}

/* ────────────────────────────────────────────────────────────────
   SCREENING JURISDICTIONS — Global AML/Sanctions databases
   ──────────────────────────────────────────────────────────────── */

export interface ScreeningJurisdiction {
  code: string;
  label: string;
  fullName: string;
  status: "CLEAR" | "MATCH" | "PENDING";
  matchCount: number;
  screenedAt: string;
  caseStatus: "NO_MATCH" | "FALSE_POSITIVE" | "ESCALATED";
  eddRequired: boolean;
}

export const DEMO_SCREENING_JURISDICTIONS: ScreeningJurisdiction[] = [
  {
    code: "OFAC",
    label: "OFAC (US)",
    fullName: "Office of Foreign Assets Control — Specially Designated Nationals List",
    status: "CLEAR",
    matchCount: 0,
    screenedAt: "2026-03-28T14:22:01Z",
    caseStatus: "NO_MATCH",
    eddRequired: false,
  },
  {
    code: "EU",
    label: "EU Sanctions",
    fullName: "European Union Consolidated Sanctions List",
    status: "CLEAR",
    matchCount: 0,
    screenedAt: "2026-03-28T14:22:03Z",
    caseStatus: "NO_MATCH",
    eddRequired: false,
  },
  {
    code: "UN",
    label: "UN Consolidated",
    fullName: "United Nations Security Council Consolidated Sanctions List",
    status: "CLEAR",
    matchCount: 0,
    screenedAt: "2026-03-28T14:22:04Z",
    caseStatus: "NO_MATCH",
    eddRequired: false,
  },
  {
    code: "HMT",
    label: "UK HM Treasury",
    fullName: "Her Majesty's Treasury — Office of Financial Sanctions Implementation",
    status: "CLEAR",
    matchCount: 0,
    screenedAt: "2026-03-28T14:22:05Z",
    caseStatus: "NO_MATCH",
    eddRequired: false,
  },
  {
    code: "DFAT",
    label: "AU DFAT",
    fullName: "Australian Department of Foreign Affairs and Trade — Consolidated List",
    status: "CLEAR",
    matchCount: 0,
    screenedAt: "2026-03-28T14:22:06Z",
    caseStatus: "NO_MATCH",
    eddRequired: false,
  },
  {
    code: "ADVERSE",
    label: "Adverse Media",
    fullName: "Global Adverse Media Database — Dow Jones, LexisNexis, Refinitiv",
    status: "CLEAR",
    matchCount: 0,
    screenedAt: "2026-03-28T14:22:08Z",
    caseStatus: "NO_MATCH",
    eddRequired: false,
  },
  {
    code: "WALLET",
    label: "On-Chain Screening",
    fullName: "Chainalysis KYT — USDC Wallet Origin Screening",
    status: "CLEAR",
    matchCount: 0,
    screenedAt: "2026-03-28T14:22:10Z",
    caseStatus: "NO_MATCH",
    eddRequired: false,
  },
];

/* ────────────────────────────────────────────────────────────────
   CORPORATE DOCUMENT PACKAGE — 8 required KYB documents
   ──────────────────────────────────────────────────────────────── */

export interface DemoDocument {
  id: string;
  label: string;
  filename: string;
  required: boolean;
  uploaded: boolean;
  authenticityChecked: boolean;
  registryMatched: boolean;
  reviewerNotes: string;
  fileSize: string;
  uploadedAt: string;
}

export const DEMO_DOCUMENT_PACKAGE: DemoDocument[] = [
  {
    id: "cert-incorp",
    label: "Certificate of Incorporation",
    filename: "MCH_Certificate_of_Incorporation_DE.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: true,
    reviewerNotes: "Verified against Delaware Division of Corporations. File #7291034.",
    fileSize: "842 KB",
    uploadedAt: "2026-03-27T09:14:22Z",
  },
  {
    id: "articles",
    label: "Articles / LLC Agreement",
    filename: "MCH_Articles_of_Organization_Restated.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: true,
    reviewerNotes: "Consistent with SOS filing. Last amended 2024-11.",
    fileSize: "1.2 MB",
    uploadedAt: "2026-03-27T09:15:01Z",
  },
  {
    id: "reg-directors",
    label: "Register of Directors",
    filename: "MCH_Register_of_Directors_2026.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: true,
    reviewerNotes: "Three directors confirmed. Cross-referenced with annual report.",
    fileSize: "348 KB",
    uploadedAt: "2026-03-27T09:16:38Z",
  },
  {
    id: "reg-shareholders",
    label: "Register of Shareholders",
    filename: "MCH_Shareholder_Register_Q1_2026.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: false,
    reviewerNotes: "Trust structure noted — Whitfield Family Trust (27%). Enhanced review applied.",
    fileSize: "512 KB",
    uploadedAt: "2026-03-27T09:17:44Z",
  },
  {
    id: "good-standing",
    label: "Good Standing Certificate",
    filename: "MCH_Good_Standing_DE_Feb2026.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: true,
    reviewerNotes: "Current as of 2026-02-14. Valid through annual renewal.",
    fileSize: "215 KB",
    uploadedAt: "2026-03-27T09:18:12Z",
  },
  {
    id: "board-res",
    label: "Board Resolution / Trading Authority",
    filename: "MCH_Board_Resolution_Gold_Allocation_Auth.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: false,
    reviewerNotes: "Resolution authorizes gold allocation up to $5M. Signed by all directors.",
    fileSize: "678 KB",
    uploadedAt: "2026-03-27T09:19:55Z",
  },
  {
    id: "signatory-id",
    label: "Authorized Signatory Passport",
    filename: "Whitfield_JR_Passport_Scan.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: true,
    reviewerNotes: "MRZ verified. Facial match confirmed. Expiry: 2031-08.",
    fileSize: "1.9 MB",
    uploadedAt: "2026-03-27T09:20:33Z",
  },
  {
    id: "proof-address",
    label: "Proof of Business Address",
    filename: "MCH_Utility_ConEdison_Feb2026.pdf",
    required: true,
    uploaded: true,
    authenticityChecked: true,
    registryMatched: true,
    reviewerNotes: "Con Edison statement dated 2026-02-18. Address matches SOS filing.",
    fileSize: "412 KB",
    uploadedAt: "2026-03-27T09:21:07Z",
  },
];
