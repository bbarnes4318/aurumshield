/* ================================================================
   MOCK DATA — Sovereign Financial Infrastructure
   Complete fixture set for all routes.
   ================================================================ */

/* ---------- Shared Types ---------- */
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type EntityStatus = "active" | "pending" | "under-review" | "closed" | "suspended";

/* ---------- Metrics ---------- */
export interface Metric {
  id: string;
  label: string;
  value: string;
  change: number;
  trend: "up" | "down" | "flat";
  period: string;
}

export const mockMetrics: Metric[] = [
  { id: "m1", label: "Total Exposure", value: "$4.82B", change: 2.4, trend: "up", period: "vs. prior quarter" },
  { id: "m2", label: "Active Counterparties", value: "1,247", change: -1.2, trend: "down", period: "vs. prior quarter" },
  { id: "m3", label: "Average Risk Score", value: "3.7 / 10", change: 0.0, trend: "flat", period: "30-day average" },
  { id: "m4", label: "Pending Reviews", value: "89", change: 14.3, trend: "up", period: "this week" },
];

/* ---------- Counterparties ---------- */
export interface Counterparty {
  id: string;
  entity: string;
  jurisdiction: string;
  riskLevel: RiskLevel;
  status: EntityStatus;
  exposure: number;
  lastReview: string;
  analyst: string;
  type: "sovereign-fund" | "bank" | "reinsurer" | "asset-manager" | "trade-finance";
  legalEntityId: string;
  incorporationDate: string;
  primaryContact: string;
  email: string;
}

export const mockCounterparties: Counterparty[] = [
  { id: "cp-001", entity: "Aurelia Sovereign Fund", jurisdiction: "Luxembourg", riskLevel: "low", status: "active", exposure: 820_000_000, lastReview: "2026-01-15", analyst: "M. Reynolds", type: "sovereign-fund", legalEntityId: "LEI-5493001KJTIIGC8Y1R12", incorporationDate: "1998-03-14", primaryContact: "Hans Müller", email: "hmuller@aurelia.lu" },
  { id: "cp-002", entity: "Nordström Reinsurance AG", jurisdiction: "Switzerland", riskLevel: "medium", status: "under-review", exposure: 1_340_000_000, lastReview: "2026-02-03", analyst: "S. Andersson", type: "reinsurer", legalEntityId: "LEI-529900HNOAA1KXQJUQ27", incorporationDate: "1985-07-22", primaryContact: "Erik Nordström", email: "enordstrom@nordre.ch" },
  { id: "cp-003", entity: "Pacific Bullion Trust", jurisdiction: "Singapore", riskLevel: "high", status: "pending", exposure: 560_000_000, lastReview: "2025-12-20", analyst: "J. Tanaka", type: "asset-manager", legalEntityId: "LEI-335800KCPBZE7EWQN842", incorporationDate: "2005-11-30", primaryContact: "Li Wei Chen", email: "lwchen@pacbullion.sg" },
  { id: "cp-004", entity: "Meridian Capital Partners", jurisdiction: "United Kingdom", riskLevel: "low", status: "active", exposure: 2_100_000_000, lastReview: "2026-02-10", analyst: "A. Clarke", type: "bank", legalEntityId: "LEI-213800MBWEIJDM5CU638", incorporationDate: "1972-01-09", primaryContact: "James Whitfield", email: "jwhitfield@meridian.co.uk" },
  { id: "cp-005", entity: "Caspian Trade Finance Ltd.", jurisdiction: "UAE", riskLevel: "critical", status: "suspended", exposure: 210_000_000, lastReview: "2026-01-28", analyst: "D. Petrov", type: "trade-finance", legalEntityId: "LEI-9845002A61FCTQILN728", incorporationDate: "2012-06-15", primaryContact: "Omar Al-Rashid", email: "oalrashid@caspiantf.ae" },
  { id: "cp-006", entity: "Fjordbank Holding ASA", jurisdiction: "Norway", riskLevel: "low", status: "active", exposure: 930_000_000, lastReview: "2026-02-08", analyst: "E. Holmgren", type: "bank", legalEntityId: "LEI-549300JZBHCM1BYHOF88", incorporationDate: "1991-04-02", primaryContact: "Ingrid Solberg", email: "isolberg@fjordbank.no" },
  { id: "cp-007", entity: "Banco del Plata S.A.", jurisdiction: "Argentina", riskLevel: "high", status: "under-review", exposure: 145_000_000, lastReview: "2026-01-05", analyst: "L. Moreno", type: "bank", legalEntityId: "LEI-222400QA4MKH0C90FC10", incorporationDate: "1968-09-18", primaryContact: "Carlos Vega", email: "cvega@bancoplata.ar" },
  { id: "cp-008", entity: "Helvetia Private Bank", jurisdiction: "Switzerland", riskLevel: "medium", status: "active", exposure: 1_780_000_000, lastReview: "2026-02-12", analyst: "K. Weber", type: "bank", legalEntityId: "LEI-529900XB3JRGQ9J4MH61", incorporationDate: "1956-12-01", primaryContact: "Anna Kessler", email: "akessler@helvetia-pb.ch" },
];

// Backward compat alias
export type TableRow = Counterparty;
export const mockTableData = mockCounterparties;

/* ---------- Transactions ---------- */
export type TransactionType = "wire" | "swift" | "settlement" | "collateral" | "margin-call" | "dividend";
export type TransactionStatus = "completed" | "pending" | "processing" | "failed" | "reversed";

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  corridorId: string;
  corridorName: string;
  hubId: string;
  hubName: string;
  initiatedDate: string;
  settledDate: string | null;
  initiatedBy: string;
  description: string;
}

/* Deterministic corridor → hub mapping:
   cor-001 US→UK  → hub-004 New York Trading Floor
   cor-002 CH→UK  → hub-001 London Clearing Centre
   cor-003 DE→LU  → hub-005 Frankfurt Settlement Hub
   cor-004 SG→HK  → hub-003 Singapore Settlement Node
   cor-005 AE→US  → hub-006 Dubai Trade Gateway
   cor-006 NO→LU  → hub-005 Frankfurt Settlement Hub
   cor-007 AR→US  → hub-004 New York Trading Floor */
export const mockTransactions: Transaction[] = [
  { id: "tx-001", reference: "WIR-2026-00184", type: "wire", counterpartyId: "cp-004", counterpartyName: "Meridian Capital Partners", amount: 125_000_000, currency: "USD", status: "completed", corridorId: "cor-001", corridorName: "US → UK", hubId: "hub-004", hubName: "New York Trading Floor", initiatedDate: "2026-02-14T09:30:00Z", settledDate: "2026-02-14T14:15:00Z", initiatedBy: "A. Clarke", description: "Quarterly capital allocation — Meridian tranche B" },
  { id: "tx-002", reference: "SWF-2026-00092", type: "swift", counterpartyId: "cp-001", counterpartyName: "Aurelia Sovereign Fund", amount: 48_500_000, currency: "EUR", status: "completed", corridorId: "cor-003", corridorName: "DE → LU", hubId: "hub-005", hubName: "Frankfurt Settlement Hub", initiatedDate: "2026-02-13T11:00:00Z", settledDate: "2026-02-13T16:45:00Z", initiatedBy: "M. Reynolds", description: "Fund subscription — Series IV allocation" },
  { id: "tx-003", reference: "STL-2026-00311", type: "settlement", counterpartyId: "cp-002", counterpartyName: "Nordström Reinsurance AG", amount: 230_000_000, currency: "CHF", status: "processing", corridorId: "cor-002", corridorName: "CH → UK", hubId: "hub-001", hubName: "London Clearing Centre", initiatedDate: "2026-02-15T08:00:00Z", settledDate: null, initiatedBy: "S. Andersson", description: "Treaty settlement — catastrophe layer 2025-Q4" },
  { id: "tx-004", reference: "COL-2026-00047", type: "collateral", counterpartyId: "cp-003", counterpartyName: "Pacific Bullion Trust", amount: 15_000_000, currency: "SGD", status: "pending", corridorId: "cor-004", corridorName: "SG → HK", hubId: "hub-003", hubName: "Singapore Settlement Node", initiatedDate: "2026-02-15T06:30:00Z", settledDate: null, initiatedBy: "J. Tanaka", description: "Collateral top-up — gold-backed facility margin" },
  { id: "tx-005", reference: "MGC-2026-00019", type: "margin-call", counterpartyId: "cp-005", counterpartyName: "Caspian Trade Finance Ltd.", amount: 8_200_000, currency: "USD", status: "failed", corridorId: "cor-005", corridorName: "AE → US", hubId: "hub-006", hubName: "Dubai Trade Gateway", initiatedDate: "2026-02-12T13:00:00Z", settledDate: null, initiatedBy: "D. Petrov", description: "Margin call — counterparty failed to post within SLA" },
  { id: "tx-006", reference: "DIV-2026-00008", type: "dividend", counterpartyId: "cp-006", counterpartyName: "Fjordbank Holding ASA", amount: 12_750_000, currency: "NOK", status: "completed", corridorId: "cor-006", corridorName: "NO → LU", hubId: "hub-005", hubName: "Frankfurt Settlement Hub", initiatedDate: "2026-02-11T10:00:00Z", settledDate: "2026-02-11T15:30:00Z", initiatedBy: "E. Holmgren", description: "Annual dividend distribution — preferred equity" },
  { id: "tx-007", reference: "WIR-2026-00185", type: "wire", counterpartyId: "cp-008", counterpartyName: "Helvetia Private Bank", amount: 340_000_000, currency: "CHF", status: "completed", corridorId: "cor-002", corridorName: "CH → UK", hubId: "hub-001", hubName: "London Clearing Centre", initiatedDate: "2026-02-10T14:00:00Z", settledDate: "2026-02-10T18:20:00Z", initiatedBy: "K. Weber", description: "Cross-border liquidity facility drawdown" },
  { id: "tx-008", reference: "STL-2026-00312", type: "settlement", counterpartyId: "cp-007", counterpartyName: "Banco del Plata S.A.", amount: 22_000_000, currency: "ARS", status: "reversed", corridorId: "cor-007", corridorName: "AR → US", hubId: "hub-004", hubName: "New York Trading Floor", initiatedDate: "2026-02-09T09:15:00Z", settledDate: null, initiatedBy: "L. Moreno", description: "Reversed — FX settlement mismatch on conversion date" },
  { id: "tx-009", reference: "COL-2026-00048", type: "collateral", counterpartyId: "cp-004", counterpartyName: "Meridian Capital Partners", amount: 75_000_000, currency: "GBP", status: "pending", corridorId: "cor-001", corridorName: "US → UK", hubId: "hub-004", hubName: "New York Trading Floor", initiatedDate: "2026-02-15T11:30:00Z", settledDate: null, initiatedBy: "A. Clarke", description: "Collateral pledge — structured product backing" },
  { id: "tx-010", reference: "SWF-2026-00093", type: "swift", counterpartyId: "cp-001", counterpartyName: "Aurelia Sovereign Fund", amount: 95_000_000, currency: "EUR", status: "processing", corridorId: "cor-003", corridorName: "DE → LU", hubId: "hub-005", hubName: "Frankfurt Settlement Hub", initiatedDate: "2026-02-15T07:45:00Z", settledDate: null, initiatedBy: "M. Reynolds", description: "Sovereign mandate rebalancing — Q1 2026" },
];



/* ---------- Corridors ---------- */
export interface Corridor {
  id: string;
  name: string;
  sourceCountry: string;
  sourceCode: string;
  destinationCountry: string;
  destinationCode: string;
  volume: number;
  transactionCount: number;
  status: "active" | "restricted" | "suspended";
  riskLevel: RiskLevel;
  avgSettlementHours: number;
}

export const mockCorridors: Corridor[] = [
  { id: "cor-001", name: "US → UK", sourceCountry: "United States", sourceCode: "US", destinationCountry: "United Kingdom", destinationCode: "GB", volume: 4_200_000_000, transactionCount: 342, status: "active", riskLevel: "low", avgSettlementHours: 4.2 },
  { id: "cor-002", name: "CH → UK", sourceCountry: "Switzerland", sourceCode: "CH", destinationCountry: "United Kingdom", destinationCode: "GB", volume: 2_800_000_000, transactionCount: 198, status: "active", riskLevel: "low", avgSettlementHours: 3.8 },
  { id: "cor-003", name: "DE → LU", sourceCountry: "Germany", sourceCode: "DE", destinationCountry: "Luxembourg", destinationCode: "LU", volume: 1_950_000_000, transactionCount: 156, status: "active", riskLevel: "low", avgSettlementHours: 2.1 },
  { id: "cor-004", name: "SG → HK", sourceCountry: "Singapore", sourceCode: "SG", destinationCountry: "Hong Kong", destinationCode: "HK", volume: 890_000_000, transactionCount: 87, status: "active", riskLevel: "medium", avgSettlementHours: 5.6 },
  { id: "cor-005", name: "AE → US", sourceCountry: "United Arab Emirates", sourceCode: "AE", destinationCountry: "United States", destinationCode: "US", volume: 420_000_000, transactionCount: 34, status: "restricted", riskLevel: "high", avgSettlementHours: 8.4 },
  { id: "cor-006", name: "NO → LU", sourceCountry: "Norway", sourceCode: "NO", destinationCountry: "Luxembourg", destinationCode: "LU", volume: 680_000_000, transactionCount: 52, status: "active", riskLevel: "low", avgSettlementHours: 3.2 },
  { id: "cor-007", name: "AR → US", sourceCountry: "Argentina", sourceCode: "AR", destinationCountry: "United States", destinationCode: "US", volume: 145_000_000, transactionCount: 18, status: "restricted", riskLevel: "high", avgSettlementHours: 12.1 },
];

/* ---------- Hubs ---------- */
export type HubType = "clearing" | "custody" | "settlement" | "trading";

export interface Hub {
  id: string;
  name: string;
  location: string;
  country: string;
  type: HubType;
  status: "operational" | "degraded" | "maintenance" | "offline";
  capacity: number;
  utilization: number;
  uptime: number;
  connectedCorridors: number;
}

export const mockHubs: Hub[] = [
  { id: "hub-001", name: "London Clearing Centre", location: "Canary Wharf, London", country: "United Kingdom", type: "clearing", status: "operational", capacity: 10_000, utilization: 72, uptime: 99.97, connectedCorridors: 5 },
  { id: "hub-002", name: "Zurich Custody Vault", location: "Paradeplatz, Zurich", country: "Switzerland", type: "custody", status: "operational", capacity: 5_000, utilization: 61, uptime: 99.99, connectedCorridors: 3 },
  { id: "hub-003", name: "Singapore Settlement Node", location: "Raffles Place, Singapore", country: "Singapore", type: "settlement", status: "operational", capacity: 8_000, utilization: 45, uptime: 99.92, connectedCorridors: 2 },
  { id: "hub-004", name: "New York Trading Floor", location: "Wall Street, New York", country: "United States", type: "trading", status: "operational", capacity: 15_000, utilization: 83, uptime: 99.95, connectedCorridors: 4 },
  { id: "hub-005", name: "Frankfurt Settlement Hub", location: "Bankenviertel, Frankfurt", country: "Germany", type: "settlement", status: "degraded", capacity: 7_500, utilization: 88, uptime: 98.40, connectedCorridors: 3 },
  { id: "hub-006", name: "Dubai Trade Gateway", location: "DIFC, Dubai", country: "UAE", type: "trading", status: "maintenance", capacity: 3_000, utilization: 0, uptime: 95.10, connectedCorridors: 1 },
];

/* ---------- Labs ---------- */
export type LabCategory = "model" | "simulation" | "prototype" | "research";
export type LabStatus = "active" | "archived" | "draft" | "review";

export interface Lab {
  id: string;
  name: string;
  description: string;
  category: LabCategory;
  status: LabStatus;
  owner: string;
  createdDate: string;
  lastRun: string | null;
  accuracy: number | null;
  tags: string[];
}

export const mockLabs: Lab[] = [
  { id: "lab-001", name: "Counterparty Default Probability v3", description: "Bayesian network model predicting 12-month default probability for Tier-2 counterparties using macro indicators and internal exposure data.", category: "model", status: "active", owner: "Risk Analytics", createdDate: "2025-09-15", lastRun: "2026-02-14", accuracy: 94.2, tags: ["credit-risk", "bayesian", "production"] },
  { id: "lab-002", name: "Monte Carlo Stress Scenarios", description: "10,000-path simulation engine for portfolio-level stress testing under adverse macro scenarios (rate shock, FX dislocation, commodity crash).", category: "simulation", status: "active", owner: "Quantitative Research", createdDate: "2025-06-01", lastRun: "2026-02-13", accuracy: null, tags: ["stress-test", "portfolio", "monte-carlo"] },
  { id: "lab-003", name: "Treaty Pricing Engine", description: "Prototype pricing model for excess-of-loss and quota-share reinsurance treaties using historical loss distributions.", category: "prototype", status: "review", owner: "Reinsurance Desk", createdDate: "2026-01-10", lastRun: "2026-02-10", accuracy: 87.5, tags: ["reinsurance", "pricing", "prototype"] },
  { id: "lab-004", name: "Sanctions Screening NLP", description: "Natural language processing pipeline for real-time sanctions and PEP screening across OFAC, EU, and UN consolidated lists.", category: "model", status: "active", owner: "Compliance Engineering", createdDate: "2025-03-20", lastRun: "2026-02-15", accuracy: 98.1, tags: ["compliance", "nlp", "sanctions"] },
  { id: "lab-005", name: "Settlement Latency Predictor", description: "Research into predicting cross-border settlement delays using corridor metadata, time-of-day, and intermediary bank behaviour.", category: "research", status: "draft", owner: "Operations Research", createdDate: "2026-02-01", lastRun: null, accuracy: null, tags: ["settlement", "latency", "research"] },
  { id: "lab-006", name: "ESG Exposure Heatmap", description: "Archived prototype for mapping counterparty ESG risk exposure using third-party scoring data and internal sector classification.", category: "prototype", status: "archived", owner: "Sustainability Office", createdDate: "2024-11-05", lastRun: "2025-08-20", accuracy: 72.0, tags: ["esg", "heatmap", "archived"] },
];

/* ---------- Claims ---------- */
export type ClaimType = "credit-event" | "settlement-failure" | "operational" | "counterparty-default" | "regulatory";
export type ClaimStatus = "open" | "investigating" | "resolved" | "escalated" | "denied";

export interface Claim {
  id: string;
  reference: string;
  title: string;
  claimant: string;
  counterpartyId: string;
  counterpartyName: string;
  transactionId: string | null;
  amount: number;
  currency: string;
  type: ClaimType;
  status: ClaimStatus;
  filedDate: string;
  resolvedDate: string | null;
  assignee: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
}

/* Deterministic claim → transaction linkage:
   clm-001 → tx-005 (Caspian margin call, failed)
   clm-002 → tx-008 (Banco del Plata settlement, reversed)
   clm-003 → tx-005 (Caspian regulatory, same underlying)
   clm-004 → tx-003 (Nordström settlement, processing)
   clm-005 → tx-004 (Pacific Bullion collateral, pending)
   clm-006 → tx-001 (Meridian wire, completed) */
export const mockClaims: Claim[] = [
  { id: "clm-001", reference: "CLM-2026-0042", title: "Margin call non-compliance", claimant: "Treasury Operations", counterpartyId: "cp-005", counterpartyName: "Caspian Trade Finance Ltd.", transactionId: "tx-005", amount: 8_200_000, currency: "USD", type: "counterparty-default", status: "escalated", filedDate: "2026-02-12", resolvedDate: null, assignee: "D. Petrov", description: "Counterparty failed to meet margin call within contractual 24-hour SLA. Collateral shortfall of $8.2M.", priority: "urgent" },
  { id: "clm-002", reference: "CLM-2026-0041", title: "FX settlement mismatch", claimant: "Settlement Desk", counterpartyId: "cp-007", counterpartyName: "Banco del Plata S.A.", transactionId: "tx-008", amount: 22_000_000, currency: "ARS", type: "settlement-failure", status: "investigating", filedDate: "2026-02-09", resolvedDate: null, assignee: "L. Moreno", description: "Currency conversion rate discrepancy on ARS/USD settlement. Transaction reversed pending investigation.", priority: "high" },
  { id: "clm-003", reference: "CLM-2026-0038", title: "Unauthorized exposure breach", claimant: "Compliance", counterpartyId: "cp-005", counterpartyName: "Caspian Trade Finance Ltd.", transactionId: "tx-005", amount: 10_000_000, currency: "USD", type: "regulatory", status: "open", filedDate: "2026-02-07", resolvedDate: null, assignee: "D. Petrov", description: "Exposure exceeded $200M threshold without Credit Committee pre-approval.", priority: "high" },
  { id: "clm-004", reference: "CLM-2026-0035", title: "Late settlement — treaty layer", claimant: "Reinsurance Operations", counterpartyId: "cp-002", counterpartyName: "Nordström Reinsurance AG", transactionId: "tx-003", amount: 3_500_000, currency: "CHF", type: "operational", status: "resolved", filedDate: "2026-01-28", resolvedDate: "2026-02-05", assignee: "S. Andersson", description: "Q4 2025 catastrophe layer settlement delivered 5 business days past contractual deadline.", priority: "medium" },
  { id: "clm-005", reference: "CLM-2026-0030", title: "Credit event — downgrade trigger", claimant: "Credit Risk", counterpartyId: "cp-003", counterpartyName: "Pacific Bullion Trust", transactionId: "tx-004", amount: 0, currency: "USD", type: "credit-event", status: "resolved", filedDate: "2026-01-15", resolvedDate: "2026-01-22", assignee: "J. Tanaka", description: "Moody's downgrade from Baa2 to Ba1 triggered credit event clause in master agreement.", priority: "medium" },
  { id: "clm-006", reference: "CLM-2026-0028", title: "Data feed disruption", claimant: "Operations", counterpartyId: "cp-004", counterpartyName: "Meridian Capital Partners", transactionId: "tx-001", amount: 0, currency: "GBP", type: "operational", status: "denied", filedDate: "2026-01-10", resolvedDate: "2026-01-18", assignee: "A. Clarke", description: "Market data feed interruption attributed to vendor, not counterparty. Claim denied.", priority: "low" },
];

/* ---------- Claim Policy Configuration ---------- */
export const CLAIM_POLICY_CONFIG = {
  CLAIM_WINDOW_DAYS: 90,
  POLICY_LIMIT_USD: 50_000_000,
  EXCLUDED_CORRIDOR_STATUSES: ["suspended"] as const,
} as const;

/* ---------- Reinsurance ---------- */
export type TreatyType = "quota-share" | "excess-of-loss" | "surplus" | "stop-loss" | "facultative";

export interface ReinsuranceTreaty {
  id: string;
  treatyName: string;
  counterpartyId: string;
  counterpartyName: string;
  type: TreatyType;
  limit: number;
  retention: number;
  premium: number;
  currency: string;
  inceptionDate: string;
  expirationDate: string;
  status: "in-force" | "expired" | "pending-renewal" | "terminated";
  claimsRatio: number;
}

export const mockReinsurance: ReinsuranceTreaty[] = [
  { id: "ri-001", treatyName: "European Cat XL 2025", counterpartyId: "cp-002", counterpartyName: "Nordström Reinsurance AG", type: "excess-of-loss", limit: 500_000_000, retention: 50_000_000, premium: 12_500_000, currency: "CHF", inceptionDate: "2025-01-01", expirationDate: "2025-12-31", status: "pending-renewal", claimsRatio: 68 },
  { id: "ri-002", treatyName: "Global Property QS 2026", counterpartyId: "cp-002", counterpartyName: "Nordström Reinsurance AG", type: "quota-share", limit: 1_000_000_000, retention: 300_000_000, premium: 45_000_000, currency: "USD", inceptionDate: "2026-01-01", expirationDate: "2026-12-31", status: "in-force", claimsRatio: 12 },
  { id: "ri-003", treatyName: "APAC Surplus Treaty", counterpartyId: "cp-003", counterpartyName: "Pacific Bullion Trust", type: "surplus", limit: 200_000_000, retention: 20_000_000, premium: 5_800_000, currency: "SGD", inceptionDate: "2025-07-01", expirationDate: "2026-06-30", status: "in-force", claimsRatio: 34 },
  { id: "ri-004", treatyName: "Trade Credit Stop Loss", counterpartyId: "cp-005", counterpartyName: "Caspian Trade Finance Ltd.", type: "stop-loss", limit: 100_000_000, retention: 15_000_000, premium: 3_200_000, currency: "USD", inceptionDate: "2025-01-01", expirationDate: "2025-12-31", status: "terminated", claimsRatio: 142 },
  { id: "ri-005", treatyName: "UK Motor Fac 2026-001", counterpartyId: "cp-004", counterpartyName: "Meridian Capital Partners", type: "facultative", limit: 25_000_000, retention: 5_000_000, premium: 1_100_000, currency: "GBP", inceptionDate: "2026-02-01", expirationDate: "2027-01-31", status: "in-force", claimsRatio: 0 },
];

/* ---------- Admin: Policies ---------- */
export interface Policy {
  id: string;
  name: string;
  category: "risk" | "compliance" | "operational" | "security" | "financial";
  status: "active" | "draft" | "under-review" | "deprecated";
  version: string;
  effectiveDate: string;
  reviewDate: string;
  owner: string;
  description: string;
}

export const mockPolicies: Policy[] = [
  { id: "pol-001", name: "Counterparty Exposure Limits", category: "risk", status: "active", version: "4.2", effectiveDate: "2025-07-01", reviewDate: "2026-07-01", owner: "Credit Committee", description: "Defines maximum exposure thresholds by counterparty tier, jurisdiction, and product type." },
  { id: "pol-002", name: "KYC/AML Compliance Framework", category: "compliance", status: "active", version: "6.0", effectiveDate: "2025-01-01", reviewDate: "2026-01-01", owner: "Chief Compliance Officer", description: "Comprehensive KYC, AML, and sanctions screening requirements for all counterparty onboarding." },
  { id: "pol-003", name: "Settlement SLA Standards", category: "operational", status: "active", version: "2.1", effectiveDate: "2025-03-15", reviewDate: "2026-03-15", owner: "Head of Operations", description: "Service level agreements for cross-border settlement timelines by corridor risk tier." },
  { id: "pol-004", name: "Data Classification & Handling", category: "security", status: "under-review", version: "3.0-rc1", effectiveDate: "2026-04-01", reviewDate: "2027-04-01", owner: "CISO", description: "Classification levels (Public, Internal, Confidential, Restricted) and handling requirements." },
  { id: "pol-005", name: "Reinsurance Treaty Approval", category: "financial", status: "active", version: "1.8", effectiveDate: "2024-09-01", reviewDate: "2025-09-01", owner: "Reinsurance Committee", description: "Approval workflow and risk appetite for new reinsurance treaty placements." },
  { id: "pol-006", name: "Incident Response Procedure", category: "security", status: "draft", version: "1.0-draft", effectiveDate: "2026-06-01", reviewDate: "2027-06-01", owner: "CISO", description: "Procedures for identifying, containing, and recovering from cybersecurity incidents." },
];

/* ---------- Admin: Roles ---------- */
export interface Role {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: string[];
  createdDate: string;
  isSystem: boolean;
}

export const mockRoles: Role[] = [
  { id: "role-001", name: "Administrator", description: "Full system access including user management, policy configuration, and audit log access.", userCount: 3, permissions: ["*"], createdDate: "2024-01-01", isSystem: true },
  { id: "role-002", name: "Risk Analyst", description: "Read/write access to counterparty data, risk models, and claims. No admin access.", userCount: 12, permissions: ["counterparties:rw", "risk:rw", "claims:rw", "labs:rw", "transactions:r"], createdDate: "2024-01-01", isSystem: true },
  { id: "role-003", name: "Compliance Officer", description: "Full compliance module access, KYC/AML reviews, evidence vault, and audit trail.", userCount: 5, permissions: ["compliance:rw", "evidence:rw", "audit:r", "counterparties:r", "claims:r"], createdDate: "2024-01-01", isSystem: true },
  { id: "role-004", name: "Operations Manager", description: "Transaction processing, settlement oversight, hub monitoring, and corridor management.", userCount: 8, permissions: ["transactions:rw", "corridors:rw", "hubs:rw", "settlements:rw"], createdDate: "2024-01-01", isSystem: true },
  { id: "role-005", name: "Reinsurance Desk", description: "Treaty management, pricing, and reinsurance-specific claims handling.", userCount: 4, permissions: ["reinsurance:rw", "claims:rw", "counterparties:r", "labs:r"], createdDate: "2024-06-15", isSystem: false },
  { id: "role-006", name: "Read-Only Viewer", description: "Read-only access across all modules. Suitable for auditors and external consultants.", userCount: 15, permissions: ["*:r"], createdDate: "2024-01-01", isSystem: true },
];

/* ---------- Timeline Events ---------- */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
  category: "review" | "approval" | "alert" | "update" | "system";
}

export const mockTimeline: TimelineEvent[] = [
  { id: "ev1", timestamp: "2026-02-15T14:32:00Z", action: "Risk rating upgraded", actor: "M. Reynolds", detail: "Aurelia Sovereign Fund upgraded from Medium to Low following satisfactory audit completion.", category: "review" },
  { id: "ev2", timestamp: "2026-02-14T11:15:00Z", action: "Compliance alert triggered", actor: "System", detail: "Caspian Trade Finance exceeded exposure threshold ($200M). Auto-flagged for review.", category: "alert" },
  { id: "ev3", timestamp: "2026-02-13T09:48:00Z", action: "Document submitted", actor: "D. Petrov", detail: "Annual compliance certificate uploaded for Caspian Trade Finance Ltd.", category: "update" },
  { id: "ev4", timestamp: "2026-02-12T16:20:00Z", action: "Board approval granted", actor: "Credit Committee", detail: "Meridian Capital Partners: $2.1B exposure limit approved for FY2026.", category: "approval" },
  { id: "ev5", timestamp: "2026-02-11T08:00:00Z", action: "Scheduled review initiated", actor: "System", detail: "Quarterly review cycle started for 23 counterparties in APAC region.", category: "system" },
];

/* ---------- Audit Events (Admin) ---------- */
export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorRole: string;
  resource: string;
  resourceId: string;
  detail: string;
  ipAddress: string;
  category: "auth" | "data" | "config" | "export" | "system";
}

export const mockAuditEvents: AuditEvent[] = [
  { id: "audit-001", timestamp: "2026-02-15T15:02:00Z", action: "Login", actor: "A. Reynolds", actorRole: "Administrator", resource: "Session", resourceId: "sess-4821", detail: "Successful MFA login from authorized IP range.", ipAddress: "10.0.1.42", category: "auth" },
  { id: "audit-002", timestamp: "2026-02-15T14:45:00Z", action: "Counterparty Updated", actor: "M. Reynolds", actorRole: "Risk Analyst", resource: "Counterparty", resourceId: "cp-001", detail: "Risk level changed from 'medium' to 'low' for Aurelia Sovereign Fund.", ipAddress: "10.0.2.18", category: "data" },
  { id: "audit-003", timestamp: "2026-02-15T14:30:00Z", action: "Report Exported", actor: "S. Andersson", actorRole: "Risk Analyst", resource: "Report", resourceId: "rpt-quarterly-2025q4", detail: "Exported counterparty risk assessment Q4 2025 as PDF.", ipAddress: "10.0.2.22", category: "export" },
  { id: "audit-004", timestamp: "2026-02-15T13:15:00Z", action: "Policy Updated", actor: "A. Reynolds", actorRole: "Administrator", resource: "Policy", resourceId: "pol-004", detail: "Data Classification & Handling policy updated to version 3.0-rc1.", ipAddress: "10.0.1.42", category: "config" },
  { id: "audit-005", timestamp: "2026-02-15T12:00:00Z", action: "Role Assigned", actor: "A. Reynolds", actorRole: "Administrator", resource: "User", resourceId: "usr-029", detail: "User J. Tanaka assigned role 'Risk Analyst'.", ipAddress: "10.0.1.42", category: "config" },
  { id: "audit-006", timestamp: "2026-02-15T11:30:00Z", action: "Claim Filed", actor: "D. Petrov", actorRole: "Risk Analyst", resource: "Claim", resourceId: "clm-001", detail: "New claim filed: Margin call non-compliance against Caspian Trade Finance Ltd.", ipAddress: "10.0.2.35", category: "data" },
  { id: "audit-007", timestamp: "2026-02-15T10:00:00Z", action: "System Backup", actor: "System", actorRole: "System", resource: "Database", resourceId: "db-primary", detail: "Automated daily backup completed successfully. 2.4 GB compressed.", ipAddress: "10.0.0.1", category: "system" },
  { id: "audit-008", timestamp: "2026-02-15T08:00:00Z", action: "Hub Status Change", actor: "System", actorRole: "System", resource: "Hub", resourceId: "hub-005", detail: "Frankfurt Settlement Hub status changed to 'degraded' — high utilization (88%).", ipAddress: "10.0.0.1", category: "system" },
];

/* ---------- Evidence Items ---------- */
export interface EvidenceItem {
  id: string;
  title: string;
  type: "document" | "report" | "correspondence" | "filing" | "memo";
  date: string;
  author: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  summary: string;
  pages: number;
}

export const mockEvidence: EvidenceItem[] = [
  { id: "e1", title: "Annual Financial Statements FY2025", type: "document", date: "2026-01-22", author: "Aurelia Sovereign Fund — CFO Office", classification: "confidential", summary: "Audited financial statements including balance sheet, P&L, and cash flow analysis.", pages: 48 },
  { id: "e2", title: "Counterparty Risk Assessment — Q4 2025", type: "report", date: "2026-01-10", author: "Risk Analytics Division", classification: "internal", summary: "Comprehensive risk scoring across 1,247 active counterparties with Monte Carlo simulations.", pages: 124 },
  { id: "e3", title: "Regulatory Correspondence — FINMA", type: "correspondence", date: "2026-02-05", author: "Swiss Financial Market Supervisory Authority", classification: "restricted", summary: "Response to inquiry regarding cross-border reinsurance treaty exposures.", pages: 6 },
  { id: "e4", title: "Board Resolution — Credit Limit Expansion", type: "memo", date: "2026-02-12", author: "Credit Committee Secretariat", classification: "internal", summary: "Approved expansion of credit limits for three Tier-1 counterparties effective Q2 2026.", pages: 3 },
];

/* ---------- Transaction State Transitions (deterministic) ---------- */
export interface TransactionStateTransition {
  state: string;
  timestamp: string;
  actor: string;
  evidenceHash: string;
  detail: string;
}

const TRANSITION_STATES: Record<TransactionStatus, string[]> = {
  completed: ["INITIATED", "COMPLIANCE_CHECK", "PROCESSING", "SETTLEMENT", "COMPLETED"],
  pending: ["INITIATED", "PENDING_REVIEW"],
  processing: ["INITIATED", "COMPLIANCE_CHECK", "PROCESSING"],
  failed: ["INITIATED", "COMPLIANCE_CHECK", "PROCESSING", "FAILED"],
  reversed: ["INITIATED", "COMPLIANCE_CHECK", "PROCESSING", "SETTLEMENT", "COMPLETED", "REVERSED"],
};

const STATE_ACTORS: Record<string, string> = {
  INITIATED: "", COMPLIANCE_CHECK: "Compliance Engine", PROCESSING: "Settlement System",
  SETTLEMENT: "Hub Operator", COMPLETED: "System", PENDING_REVIEW: "Compliance Queue",
  FAILED: "System", REVERSED: "Operations Desk",
};

const STATE_DETAILS: Record<string, string> = {
  INITIATED: "Transaction submitted for processing.",
  COMPLIANCE_CHECK: "Automated KYC/AML and sanctions screening completed.",
  PROCESSING: "Funds transfer initiated through settlement network.",
  SETTLEMENT: "Settlement instruction accepted by hub operator.",
  COMPLETED: "Funds credited to beneficiary account.",
  PENDING_REVIEW: "Queued for manual compliance review.",
  FAILED: "Processing failed — counterparty SLA breach or system error.",
  REVERSED: "Transaction reversed by operations desk.",
};

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function getTransactionTransitions(tx: Transaction): TransactionStateTransition[] {
  const states = TRANSITION_STATES[tx.status];
  const start = new Date(tx.initiatedDate).getTime();
  const end = tx.settledDate ? new Date(tx.settledDate).getTime() : start + 24 * 3600_000;
  const step = states.length > 1 ? (end - start) / (states.length - 1) : 0;

  return states.map((state, i) => ({
    state,
    timestamp: new Date(start + step * i).toISOString(),
    actor: state === "INITIATED" ? tx.initiatedBy : STATE_ACTORS[state],
    evidenceHash: fnv1a(`${tx.id}:${state}:${i}`),
    detail: STATE_DETAILS[state],
  }));
}

/* ================================================================
   DASHBOARD — AurumShield Phase 1 Data
   ================================================================ */

/* ---------- Scenario Definitions ---------- */
export type DashboardScenario = "phase1" | "scaleUp";

/* ---------- Capital Adequacy ---------- */
export interface DashboardCapital {
  capitalBase: number;
  activeExposure: number;
  ecr: number;
  expectedLoss: number;
  var95: number;
  tvar99: number;
  var99: number;
  bufferVsTvar99: number;
  hardstopLimit: number;
  hardstopUtilization: number;
  hardstopStatus: "green" | "amber" | "red";
  asOf: string;
}

export const mockCapitalPhase1: DashboardCapital = {
  capitalBase: 25_000_000,
  activeExposure: 150_000_000,
  ecr: 6.0,
  expectedLoss: 9_500_000,
  var95: 12_400_000,
  tvar99: 18_200_000,
  var99: 14_800_000,
  bufferVsTvar99: 6_800_000,
  hardstopLimit: 200_000_000,
  hardstopUtilization: 0.75,
  hardstopStatus: "green",
  asOf: "2026-02-15T21:30:00Z",
};

export const mockCapitalScaleUp: DashboardCapital = {
  capitalBase: 100_000_000,
  activeExposure: 520_000_000,
  ecr: 5.2,
  expectedLoss: 39_800_000,
  var95: 52_200_000,
  tvar99: 78_400_000,
  var99: 62_100_000,
  bufferVsTvar99: 21_600_000,
  hardstopLimit: 750_000_000,
  hardstopUtilization: 0.693,
  hardstopStatus: "green",
  asOf: "2026-02-15T21:30:00Z",
};

/* ---------- TRI Band Distribution ---------- */
export interface TRIBand {
  band: "green" | "amber" | "red";
  label: string;
  count: number;
  percentage: number;
  exposure: number;
}

export const mockTRIBandsPhase1: { bands: TRIBand[]; asOf: string } = {
  bands: [
    { band: "green", label: "Low Risk (TRI 1–3)", count: 5, percentage: 62.5, exposure: 93_750_000 },
    { band: "amber", label: "Elevated (TRI 4–6)", count: 2, percentage: 25.0, exposure: 37_500_000 },
    { band: "red", label: "High Risk (TRI 7–10)", count: 1, percentage: 12.5, exposure: 18_750_000 },
  ],
  asOf: "2026-02-15T21:30:00Z",
};

export const mockTRIBandsScaleUp: { bands: TRIBand[]; asOf: string } = {
  bands: [
    { band: "green", label: "Low Risk (TRI 1–3)", count: 42, percentage: 58.3, exposure: 303_160_000 },
    { band: "amber", label: "Elevated (TRI 4–6)", count: 22, percentage: 30.6, exposure: 159_120_000 },
    { band: "red", label: "High Risk (TRI 7–10)", count: 8, percentage: 11.1, exposure: 57_720_000 },
  ],
  asOf: "2026-02-15T21:30:00Z",
};

/* ---------- Corridor Tier Exposure ---------- */
export interface CorridorTier {
  tier: number;
  label: string;
  corridorCount: number;
  exposure: number;
  limit: number;
  utilization: number;
}

export const mockCorridorTiersPhase1: { tiers: CorridorTier[]; asOf: string } = {
  tiers: [
    { tier: 1, label: "Tier 1 — Core", corridorCount: 3, exposure: 82_500_000, limit: 100_000_000, utilization: 0.825 },
    { tier: 2, label: "Tier 2 — Standard", corridorCount: 2, exposure: 45_000_000, limit: 60_000_000, utilization: 0.75 },
    { tier: 3, label: "Tier 3 — Elevated", corridorCount: 1, exposure: 15_000_000, limit: 25_000_000, utilization: 0.60 },
    { tier: 4, label: "Tier 4 — Restricted", corridorCount: 1, exposure: 7_500_000, limit: 15_000_000, utilization: 0.50 },
  ],
  asOf: "2026-02-15T21:28:00Z",
};

export const mockCorridorTiersScaleUp: { tiers: CorridorTier[]; asOf: string } = {
  tiers: [
    { tier: 1, label: "Tier 1 — Core", corridorCount: 5, exposure: 286_000_000, limit: 350_000_000, utilization: 0.817 },
    { tier: 2, label: "Tier 2 — Standard", corridorCount: 4, exposure: 140_400_000, limit: 200_000_000, utilization: 0.702 },
    { tier: 3, label: "Tier 3 — Elevated", corridorCount: 3, exposure: 62_400_000, limit: 120_000_000, utilization: 0.52 },
    { tier: 4, label: "Tier 4 — Restricted", corridorCount: 2, exposure: 31_200_000, limit: 80_000_000, utilization: 0.39 },
  ],
  asOf: "2026-02-15T21:28:00Z",
};

/* ---------- Hub Concentration ---------- */
export interface HubConcentration {
  hubId: string;
  hubName: string;
  type: string;
  exposure: number;
  percentage: number;
  hhi: number;
}

export const mockHubConcentrationPhase1: { hubs: HubConcentration[]; totalHHI: number; asOf: string } = {
  hubs: [
    { hubId: "hub-001", hubName: "London Clearing Centre", type: "Clearing", exposure: 60_000_000, percentage: 40.0, hhi: 1600 },
    { hubId: "hub-004", hubName: "New York Trading Floor", type: "Trading", exposure: 45_000_000, percentage: 30.0, hhi: 900 },
    { hubId: "hub-002", hubName: "Zurich Custody Vault", type: "Custody", exposure: 22_500_000, percentage: 15.0, hhi: 225 },
    { hubId: "hub-003", hubName: "Singapore Settlement Node", type: "Settlement", exposure: 15_000_000, percentage: 10.0, hhi: 100 },
    { hubId: "hub-005", hubName: "Frankfurt Settlement Hub", type: "Settlement", exposure: 7_500_000, percentage: 5.0, hhi: 25 },
  ],
  totalHHI: 2850,
  asOf: "2026-02-15T21:25:00Z",
};

/* ---------- Transactions by State ---------- */
export interface TransactionByState {
  state: "completed" | "pending" | "processing" | "failed" | "reversed";
  count: number;
  volume: number;
}

export const mockTxnByStatePhase1: { states: TransactionByState[]; asOf: string } = {
  states: [
    { state: "completed", count: 4, volume: 526_250_000 },
    { state: "processing", count: 2, volume: 325_000_000 },
    { state: "pending", count: 2, volume: 90_000_000 },
    { state: "failed", count: 1, volume: 8_200_000 },
    { state: "reversed", count: 1, volume: 22_000_000 },
  ],
  asOf: "2026-02-15T21:30:00Z",
};

/* ---------- Blocked Transitions ---------- */
export interface BlockedTransition {
  id: string;
  reference: string;
  counterparty: string;
  reason: string;
  blockedSince: string;
  severity: "warning" | "critical";
}

export const mockBlockedTransitionsPhase1: { transitions: BlockedTransition[]; asOf: string } = {
  transitions: [
    { id: "bt-001", reference: "MGC-2026-00019", counterparty: "Caspian Trade Finance Ltd.", reason: "Margin call SLA breach — collateral not posted within 24h", blockedSince: "2026-02-13T13:00:00Z", severity: "critical" },
    { id: "bt-002", reference: "STL-2026-00312", counterparty: "Banco del Plata S.A.", reason: "FX conversion date mismatch — settlement reversed pending manual review", blockedSince: "2026-02-10T09:15:00Z", severity: "warning" },
    { id: "bt-003", reference: "COL-2026-00048", counterparty: "Meridian Capital Partners", reason: "Structured product collateral pledge awaiting Credit Committee sign-off", blockedSince: "2026-02-15T11:30:00Z", severity: "warning" },
  ],
  asOf: "2026-02-15T21:30:00Z",
};

/* ---------- Evidence Validations ---------- */
export interface EvidenceValidation {
  id: string;
  title: string;
  result: "pass" | "warn" | "fail";
  checkedAt: string;
  validatedBy: string;
  rule: string;
}

export const mockEvidenceValidationsPhase1: { validations: EvidenceValidation[]; asOf: string } = {
  validations: [
    { id: "ev-001", title: "Aurelia Sovereign Fund — FY2025 Financials", result: "pass", checkedAt: "2026-02-15T20:45:00Z", validatedBy: "Compliance Engine v4.2", rule: "Document hash integrity + signature verification" },
    { id: "ev-002", title: "Counterparty Risk Assessment Q4", result: "pass", checkedAt: "2026-02-15T20:42:00Z", validatedBy: "Compliance Engine v4.2", rule: "Classification label present + author attribution" },
    { id: "ev-003", title: "FINMA Regulatory Correspondence", result: "warn", checkedAt: "2026-02-15T20:40:00Z", validatedBy: "Compliance Engine v4.2", rule: "Retention period approaching 60-day review threshold" },
    { id: "ev-004", title: "Credit Limit Board Resolution", result: "pass", checkedAt: "2026-02-15T20:38:00Z", validatedBy: "Compliance Engine v4.2", rule: "Multi-signatory quorum verification" },
    { id: "ev-005", title: "Caspian TF — Compliance Certificate", result: "fail", checkedAt: "2026-02-15T20:35:00Z", validatedBy: "Compliance Engine v4.2", rule: "Certificate expired — annual renewal past due" },
  ],
  asOf: "2026-02-15T21:00:00Z",
};

/* ---------- WORM Storage Status ---------- */
export interface WORMSegment {
  label: string;
  count: number;
  percentage: number;
  status: "stored" | "verified" | "quarantined" | "pending";
}

export const mockWORMStatusPhase1: { segments: WORMSegment[]; totalDocuments: number; asOf: string } = {
  segments: [
    { label: "Verified", count: 842, percentage: 68.2, status: "verified" },
    { label: "Stored", count: 312, percentage: 25.3, status: "stored" },
    { label: "Pending", count: 58, percentage: 4.7, status: "pending" },
    { label: "Quarantined", count: 22, percentage: 1.8, status: "quarantined" },
  ],
  totalDocuments: 1234,
  asOf: "2026-02-15T21:15:00Z",
};

/* ---------- Combined Dashboard Payload ---------- */
export interface DashboardData {
  scenario: DashboardScenario;
  capital: DashboardCapital;
  triBands: { bands: TRIBand[]; asOf: string };
  corridorTiers: { tiers: CorridorTier[]; asOf: string };
  hubConcentration: { hubs: HubConcentration[]; totalHHI: number; asOf: string };
  txnByState: { states: TransactionByState[]; asOf: string };
  blockedTransitions: { transitions: BlockedTransition[]; asOf: string };
  evidenceValidations: { validations: EvidenceValidation[]; asOf: string };
  wormStatus: { segments: WORMSegment[]; totalDocuments: number; asOf: string };
}

export function getMockDashboardData(scenario: DashboardScenario = "phase1"): DashboardData {
  if (scenario === "scaleUp") {
    return {
      scenario: "scaleUp",
      capital: mockCapitalScaleUp,
      triBands: mockTRIBandsScaleUp,
      corridorTiers: mockCorridorTiersScaleUp,
      hubConcentration: mockHubConcentrationPhase1, // same structure, reuse
      txnByState: mockTxnByStatePhase1,
      blockedTransitions: mockBlockedTransitionsPhase1,
      evidenceValidations: mockEvidenceValidationsPhase1,
      wormStatus: mockWORMStatusPhase1,
    };
  }
  return {
    scenario: "phase1",
    capital: mockCapitalPhase1,
    triBands: mockTRIBandsPhase1,
    corridorTiers: mockCorridorTiersPhase1,
    hubConcentration: mockHubConcentrationPhase1,
    txnByState: mockTxnByStatePhase1,
    blockedTransitions: mockBlockedTransitionsPhase1,
    evidenceValidations: mockEvidenceValidationsPhase1,
    wormStatus: mockWORMStatusPhase1,
  };
}
