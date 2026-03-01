/* ================================================================
   MOCK DATA — Sovereign Financial Infrastructure
   Complete fixture set for all routes.
   ================================================================ */

import type { MarketplacePolicySnapshot } from "@/lib/policy-engine";

/* ---------- Shared Types ---------- */
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type EntityStatus =
  | "active"
  | "pending"
  | "under-review"
  | "closed"
  | "suspended";

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
  {
    id: "m1",
    label: "Total Exposure",
    value: "$4.82B",
    change: 2.4,
    trend: "up",
    period: "vs. prior quarter",
  },
  {
    id: "m2",
    label: "Active Counterparties",
    value: "1,247",
    change: -1.2,
    trend: "down",
    period: "vs. prior quarter",
  },
  {
    id: "m3",
    label: "Average Risk Score",
    value: "3.7 / 10",
    change: 0.0,
    trend: "flat",
    period: "30-day average",
  },
  {
    id: "m4",
    label: "Pending Reviews",
    value: "89",
    change: 14.3,
    trend: "up",
    period: "this week",
  },
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
  type:
    | "sovereign-fund"
    | "bank"
    | "reinsurer"
    | "asset-manager"
    | "trade-finance";
  legalEntityId: string;
  incorporationDate: string;
  primaryContact: string;
  email: string;
}

export const mockCounterparties: Counterparty[] = [
  {
    id: "cp-001",
    entity: "Aurelia Sovereign Fund",
    jurisdiction: "Luxembourg",
    riskLevel: "low",
    status: "active",
    exposure: 820_000_000,
    lastReview: "2026-01-15",
    analyst: "M. Reynolds",
    type: "sovereign-fund",
    legalEntityId: "LEI-5493001KJTIIGC8Y1R12",
    incorporationDate: "1998-03-14",
    primaryContact: "Hans Müller",
    email: "hmuller@aurelia.lu",
  },
  {
    id: "cp-002",
    entity: "Nordström Reinsurance AG",
    jurisdiction: "Switzerland",
    riskLevel: "medium",
    status: "under-review",
    exposure: 1_340_000_000,
    lastReview: "2026-02-03",
    analyst: "S. Andersson",
    type: "reinsurer",
    legalEntityId: "LEI-529900HNOAA1KXQJUQ27",
    incorporationDate: "1985-07-22",
    primaryContact: "Erik Nordström",
    email: "enordstrom@nordre.ch",
  },
  {
    id: "cp-003",
    entity: "Pacific Bullion Trust",
    jurisdiction: "Singapore",
    riskLevel: "high",
    status: "pending",
    exposure: 560_000_000,
    lastReview: "2025-12-20",
    analyst: "J. Tanaka",
    type: "asset-manager",
    legalEntityId: "LEI-335800KCPBZE7EWQN842",
    incorporationDate: "2005-11-30",
    primaryContact: "Li Wei Chen",
    email: "lwchen@pacbullion.sg",
  },
  {
    id: "cp-004",
    entity: "Meridian Capital Partners",
    jurisdiction: "United Kingdom",
    riskLevel: "low",
    status: "active",
    exposure: 2_100_000_000,
    lastReview: "2026-02-10",
    analyst: "A. Clarke",
    type: "bank",
    legalEntityId: "LEI-213800MBWEIJDM5CU638",
    incorporationDate: "1972-01-09",
    primaryContact: "James Whitfield",
    email: "jwhitfield@meridian.co.uk",
  },
  {
    id: "cp-005",
    entity: "Caspian Trade Finance Ltd.",
    jurisdiction: "UAE",
    riskLevel: "critical",
    status: "suspended",
    exposure: 210_000_000,
    lastReview: "2026-01-28",
    analyst: "D. Petrov",
    type: "trade-finance",
    legalEntityId: "LEI-9845002A61FCTQILN728",
    incorporationDate: "2012-06-15",
    primaryContact: "Omar Al-Rashid",
    email: "oalrashid@caspiantf.ae",
  },
  {
    id: "cp-006",
    entity: "Fjordbank Holding ASA",
    jurisdiction: "Norway",
    riskLevel: "low",
    status: "active",
    exposure: 930_000_000,
    lastReview: "2026-02-08",
    analyst: "E. Holmgren",
    type: "bank",
    legalEntityId: "LEI-549300JZBHCM1BYHOF88",
    incorporationDate: "1991-04-02",
    primaryContact: "Ingrid Solberg",
    email: "isolberg@fjordbank.no",
  },
  {
    id: "cp-007",
    entity: "Banco del Plata S.A.",
    jurisdiction: "Argentina",
    riskLevel: "high",
    status: "under-review",
    exposure: 145_000_000,
    lastReview: "2026-01-05",
    analyst: "L. Moreno",
    type: "bank",
    legalEntityId: "LEI-222400QA4MKH0C90FC10",
    incorporationDate: "1968-09-18",
    primaryContact: "Carlos Vega",
    email: "cvega@bancoplata.ar",
  },
  {
    id: "cp-008",
    entity: "Helvetia Private Bank",
    jurisdiction: "Switzerland",
    riskLevel: "medium",
    status: "active",
    exposure: 1_780_000_000,
    lastReview: "2026-02-12",
    analyst: "K. Weber",
    type: "bank",
    legalEntityId: "LEI-529900XB3JRGQ9J4MH61",
    incorporationDate: "1956-12-01",
    primaryContact: "Anna Kessler",
    email: "akessler@helvetia-pb.ch",
  },
];

// Backward compat alias
export type TableRow = Counterparty;
export const mockTableData = mockCounterparties;

/* ---------- Transactions ---------- */
export type TransactionType =
  | "wire"
  | "swift"
  | "settlement"
  | "collateral"
  | "margin-call"
  | "dividend";
export type TransactionStatus =
  | "completed"
  | "pending"
  | "processing"
  | "failed"
  | "reversed";

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
  {
    id: "tx-001",
    reference: "WIR-2026-00184",
    type: "wire",
    counterpartyId: "cp-004",
    counterpartyName: "Meridian Capital Partners",
    amount: 125_000_000,
    currency: "USD",
    status: "completed",
    corridorId: "cor-001",
    corridorName: "US → UK",
    hubId: "hub-004",
    hubName: "New York Trading Floor",
    initiatedDate: "2026-02-14T09:30:00Z",
    settledDate: "2026-02-14T14:15:00Z",
    initiatedBy: "A. Clarke",
    description: "Quarterly capital allocation — Meridian tranche B",
  },
  {
    id: "tx-002",
    reference: "SWF-2026-00092",
    type: "swift",
    counterpartyId: "cp-001",
    counterpartyName: "Aurelia Sovereign Fund",
    amount: 48_500_000,
    currency: "EUR",
    status: "completed",
    corridorId: "cor-003",
    corridorName: "DE → LU",
    hubId: "hub-005",
    hubName: "Frankfurt Settlement Hub",
    initiatedDate: "2026-02-13T11:00:00Z",
    settledDate: "2026-02-13T16:45:00Z",
    initiatedBy: "M. Reynolds",
    description: "Fund subscription — Series IV allocation",
  },
  {
    id: "tx-003",
    reference: "STL-2026-00311",
    type: "settlement",
    counterpartyId: "cp-002",
    counterpartyName: "Nordström Reinsurance AG",
    amount: 230_000_000,
    currency: "CHF",
    status: "processing",
    corridorId: "cor-002",
    corridorName: "CH → UK",
    hubId: "hub-001",
    hubName: "London Clearing Centre",
    initiatedDate: "2026-02-15T08:00:00Z",
    settledDate: null,
    initiatedBy: "S. Andersson",
    description: "Treaty settlement — catastrophe layer 2025-Q4",
  },
  {
    id: "tx-004",
    reference: "COL-2026-00047",
    type: "collateral",
    counterpartyId: "cp-003",
    counterpartyName: "Pacific Bullion Trust",
    amount: 15_000_000,
    currency: "SGD",
    status: "pending",
    corridorId: "cor-004",
    corridorName: "SG → HK",
    hubId: "hub-003",
    hubName: "Singapore Settlement Node",
    initiatedDate: "2026-02-15T06:30:00Z",
    settledDate: null,
    initiatedBy: "J. Tanaka",
    description: "Collateral top-up — gold-backed facility margin",
  },
  {
    id: "tx-005",
    reference: "MGC-2026-00019",
    type: "margin-call",
    counterpartyId: "cp-005",
    counterpartyName: "Caspian Trade Finance Ltd.",
    amount: 8_200_000,
    currency: "USD",
    status: "failed",
    corridorId: "cor-005",
    corridorName: "AE → US",
    hubId: "hub-006",
    hubName: "Dubai Trade Gateway",
    initiatedDate: "2026-02-12T13:00:00Z",
    settledDate: null,
    initiatedBy: "D. Petrov",
    description: "Margin call — counterparty failed to post within SLA",
  },
  {
    id: "tx-006",
    reference: "DIV-2026-00008",
    type: "dividend",
    counterpartyId: "cp-006",
    counterpartyName: "Fjordbank Holding ASA",
    amount: 12_750_000,
    currency: "NOK",
    status: "completed",
    corridorId: "cor-006",
    corridorName: "NO → LU",
    hubId: "hub-005",
    hubName: "Frankfurt Settlement Hub",
    initiatedDate: "2026-02-11T10:00:00Z",
    settledDate: "2026-02-11T15:30:00Z",
    initiatedBy: "E. Holmgren",
    description: "Annual dividend distribution — preferred equity",
  },
  {
    id: "tx-007",
    reference: "WIR-2026-00185",
    type: "wire",
    counterpartyId: "cp-008",
    counterpartyName: "Helvetia Private Bank",
    amount: 340_000_000,
    currency: "CHF",
    status: "completed",
    corridorId: "cor-002",
    corridorName: "CH → UK",
    hubId: "hub-001",
    hubName: "London Clearing Centre",
    initiatedDate: "2026-02-10T14:00:00Z",
    settledDate: "2026-02-10T18:20:00Z",
    initiatedBy: "K. Weber",
    description: "Cross-border liquidity facility drawdown",
  },
  {
    id: "tx-008",
    reference: "STL-2026-00312",
    type: "settlement",
    counterpartyId: "cp-007",
    counterpartyName: "Banco del Plata S.A.",
    amount: 22_000_000,
    currency: "ARS",
    status: "reversed",
    corridorId: "cor-007",
    corridorName: "AR → US",
    hubId: "hub-004",
    hubName: "New York Trading Floor",
    initiatedDate: "2026-02-09T09:15:00Z",
    settledDate: null,
    initiatedBy: "L. Moreno",
    description: "Reversed — FX settlement mismatch on conversion date",
  },
  {
    id: "tx-009",
    reference: "COL-2026-00048",
    type: "collateral",
    counterpartyId: "cp-004",
    counterpartyName: "Meridian Capital Partners",
    amount: 75_000_000,
    currency: "GBP",
    status: "pending",
    corridorId: "cor-001",
    corridorName: "US → UK",
    hubId: "hub-004",
    hubName: "New York Trading Floor",
    initiatedDate: "2026-02-15T11:30:00Z",
    settledDate: null,
    initiatedBy: "A. Clarke",
    description: "Collateral pledge — structured product backing",
  },
  {
    id: "tx-010",
    reference: "SWF-2026-00093",
    type: "swift",
    counterpartyId: "cp-001",
    counterpartyName: "Aurelia Sovereign Fund",
    amount: 95_000_000,
    currency: "EUR",
    status: "processing",
    corridorId: "cor-003",
    corridorName: "DE → LU",
    hubId: "hub-005",
    hubName: "Frankfurt Settlement Hub",
    initiatedDate: "2026-02-15T07:45:00Z",
    settledDate: null,
    initiatedBy: "M. Reynolds",
    description: "Sovereign mandate rebalancing — Q1 2026",
  },
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
  {
    id: "cor-001",
    name: "US → UK",
    sourceCountry: "United States",
    sourceCode: "US",
    destinationCountry: "United Kingdom",
    destinationCode: "GB",
    volume: 4_200_000_000,
    transactionCount: 342,
    status: "active",
    riskLevel: "low",
    avgSettlementHours: 4.2,
  },
  {
    id: "cor-002",
    name: "CH → UK",
    sourceCountry: "Switzerland",
    sourceCode: "CH",
    destinationCountry: "United Kingdom",
    destinationCode: "GB",
    volume: 2_800_000_000,
    transactionCount: 198,
    status: "active",
    riskLevel: "low",
    avgSettlementHours: 3.8,
  },
  {
    id: "cor-003",
    name: "DE → LU",
    sourceCountry: "Germany",
    sourceCode: "DE",
    destinationCountry: "Luxembourg",
    destinationCode: "LU",
    volume: 1_950_000_000,
    transactionCount: 156,
    status: "active",
    riskLevel: "low",
    avgSettlementHours: 2.1,
  },
  {
    id: "cor-004",
    name: "SG → HK",
    sourceCountry: "Singapore",
    sourceCode: "SG",
    destinationCountry: "Hong Kong",
    destinationCode: "HK",
    volume: 890_000_000,
    transactionCount: 87,
    status: "active",
    riskLevel: "medium",
    avgSettlementHours: 5.6,
  },
  {
    id: "cor-005",
    name: "AE → US",
    sourceCountry: "United Arab Emirates",
    sourceCode: "AE",
    destinationCountry: "United States",
    destinationCode: "US",
    volume: 420_000_000,
    transactionCount: 34,
    status: "restricted",
    riskLevel: "high",
    avgSettlementHours: 8.4,
  },
  {
    id: "cor-006",
    name: "NO → LU",
    sourceCountry: "Norway",
    sourceCode: "NO",
    destinationCountry: "Luxembourg",
    destinationCode: "LU",
    volume: 680_000_000,
    transactionCount: 52,
    status: "active",
    riskLevel: "low",
    avgSettlementHours: 3.2,
  },
  {
    id: "cor-007",
    name: "AR → US",
    sourceCountry: "Argentina",
    sourceCode: "AR",
    destinationCountry: "United States",
    destinationCode: "US",
    volume: 145_000_000,
    transactionCount: 18,
    status: "restricted",
    riskLevel: "high",
    avgSettlementHours: 12.1,
  },
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
  {
    id: "hub-001",
    name: "London Clearing Centre",
    location: "Canary Wharf, London",
    country: "United Kingdom",
    type: "clearing",
    status: "operational",
    capacity: 10_000,
    utilization: 72,
    uptime: 99.97,
    connectedCorridors: 5,
  },
  {
    id: "hub-002",
    name: "Zurich Custody Vault",
    location: "Paradeplatz, Zurich",
    country: "Switzerland",
    type: "custody",
    status: "operational",
    capacity: 5_000,
    utilization: 61,
    uptime: 99.99,
    connectedCorridors: 3,
  },
  {
    id: "hub-003",
    name: "Singapore Settlement Node",
    location: "Raffles Place, Singapore",
    country: "Singapore",
    type: "settlement",
    status: "operational",
    capacity: 8_000,
    utilization: 45,
    uptime: 99.92,
    connectedCorridors: 2,
  },
  {
    id: "hub-004",
    name: "New York Trading Floor",
    location: "Wall Street, New York",
    country: "United States",
    type: "trading",
    status: "operational",
    capacity: 15_000,
    utilization: 83,
    uptime: 99.95,
    connectedCorridors: 4,
  },
  {
    id: "hub-005",
    name: "Frankfurt Settlement Hub",
    location: "Bankenviertel, Frankfurt",
    country: "Germany",
    type: "settlement",
    status: "degraded",
    capacity: 7_500,
    utilization: 88,
    uptime: 98.4,
    connectedCorridors: 3,
  },
  {
    id: "hub-006",
    name: "Dubai Trade Gateway",
    location: "DIFC, Dubai",
    country: "UAE",
    type: "trading",
    status: "maintenance",
    capacity: 3_000,
    utilization: 0,
    uptime: 95.1,
    connectedCorridors: 1,
  },
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
  {
    id: "lab-001",
    name: "Counterparty Default Probability v3",
    description:
      "Bayesian network model predicting 12-month default probability for Tier-2 counterparties using macro indicators and internal exposure data.",
    category: "model",
    status: "active",
    owner: "Risk Analytics",
    createdDate: "2025-09-15",
    lastRun: "2026-02-14",
    accuracy: 94.2,
    tags: ["credit-risk", "bayesian", "production"],
  },
  {
    id: "lab-002",
    name: "Monte Carlo Stress Scenarios",
    description:
      "10,000-path simulation engine for portfolio-level stress testing under adverse macro scenarios (rate shock, FX dislocation, commodity crash).",
    category: "simulation",
    status: "active",
    owner: "Quantitative Research",
    createdDate: "2025-06-01",
    lastRun: "2026-02-13",
    accuracy: null,
    tags: ["stress-test", "portfolio", "monte-carlo"],
  },
  {
    id: "lab-003",
    name: "Treaty Pricing Engine",
    description:
      "Prototype pricing model for excess-of-loss and quota-share reinsurance treaties using historical loss distributions.",
    category: "prototype",
    status: "review",
    owner: "Reinsurance Desk",
    createdDate: "2026-01-10",
    lastRun: "2026-02-10",
    accuracy: 87.5,
    tags: ["reinsurance", "pricing", "prototype"],
  },
  {
    id: "lab-004",
    name: "Sanctions Screening NLP",
    description:
      "Natural language processing pipeline for real-time sanctions and PEP screening across OFAC, EU, and UN consolidated lists.",
    category: "model",
    status: "active",
    owner: "Compliance Engineering",
    createdDate: "2025-03-20",
    lastRun: "2026-02-15",
    accuracy: 98.1,
    tags: ["compliance", "nlp", "sanctions"],
  },
  {
    id: "lab-005",
    name: "Settlement Latency Predictor",
    description:
      "Research into predicting cross-border settlement delays using corridor metadata, time-of-day, and intermediary bank behaviour.",
    category: "research",
    status: "draft",
    owner: "Operations Research",
    createdDate: "2026-02-01",
    lastRun: null,
    accuracy: null,
    tags: ["settlement", "latency", "research"],
  },
  {
    id: "lab-006",
    name: "ESG Exposure Heatmap",
    description:
      "Archived prototype for mapping counterparty ESG risk exposure using third-party scoring data and internal sector classification.",
    category: "prototype",
    status: "archived",
    owner: "Sustainability Office",
    createdDate: "2024-11-05",
    lastRun: "2025-08-20",
    accuracy: 72.0,
    tags: ["esg", "heatmap", "archived"],
  },
];

/* ---------- Claims ---------- */
export type ClaimType =
  | "credit-event"
  | "settlement-failure"
  | "operational"
  | "counterparty-default"
  | "regulatory";
export type ClaimStatus =
  | "open"
  | "investigating"
  | "resolved"
  | "escalated"
  | "denied";

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
  {
    id: "clm-001",
    reference: "CLM-2026-0042",
    title: "Margin call non-compliance",
    claimant: "Treasury Operations",
    counterpartyId: "cp-005",
    counterpartyName: "Caspian Trade Finance Ltd.",
    transactionId: "tx-005",
    amount: 8_200_000,
    currency: "USD",
    type: "counterparty-default",
    status: "escalated",
    filedDate: "2026-02-12",
    resolvedDate: null,
    assignee: "D. Petrov",
    description:
      "Counterparty failed to meet margin call within contractual 24-hour SLA. Collateral shortfall of $8.2M.",
    priority: "urgent",
  },
  {
    id: "clm-002",
    reference: "CLM-2026-0041",
    title: "FX settlement mismatch",
    claimant: "Settlement Desk",
    counterpartyId: "cp-007",
    counterpartyName: "Banco del Plata S.A.",
    transactionId: "tx-008",
    amount: 22_000_000,
    currency: "ARS",
    type: "settlement-failure",
    status: "investigating",
    filedDate: "2026-02-09",
    resolvedDate: null,
    assignee: "L. Moreno",
    description:
      "Currency conversion rate discrepancy on ARS/USD settlement. Transaction reversed pending investigation.",
    priority: "high",
  },
  {
    id: "clm-003",
    reference: "CLM-2026-0038",
    title: "Unauthorized exposure breach",
    claimant: "Compliance",
    counterpartyId: "cp-005",
    counterpartyName: "Caspian Trade Finance Ltd.",
    transactionId: "tx-005",
    amount: 10_000_000,
    currency: "USD",
    type: "regulatory",
    status: "open",
    filedDate: "2026-02-07",
    resolvedDate: null,
    assignee: "D. Petrov",
    description:
      "Exposure exceeded $200M threshold without Credit Committee pre-approval.",
    priority: "high",
  },
  {
    id: "clm-004",
    reference: "CLM-2026-0035",
    title: "Late settlement — treaty layer",
    claimant: "Reinsurance Operations",
    counterpartyId: "cp-002",
    counterpartyName: "Nordström Reinsurance AG",
    transactionId: "tx-003",
    amount: 3_500_000,
    currency: "CHF",
    type: "operational",
    status: "resolved",
    filedDate: "2026-01-28",
    resolvedDate: "2026-02-05",
    assignee: "S. Andersson",
    description:
      "Q4 2025 catastrophe layer settlement delivered 5 business days past contractual deadline.",
    priority: "medium",
  },
  {
    id: "clm-005",
    reference: "CLM-2026-0030",
    title: "Credit event — downgrade trigger",
    claimant: "Credit Risk",
    counterpartyId: "cp-003",
    counterpartyName: "Pacific Bullion Trust",
    transactionId: "tx-004",
    amount: 0,
    currency: "USD",
    type: "credit-event",
    status: "resolved",
    filedDate: "2026-01-15",
    resolvedDate: "2026-01-22",
    assignee: "J. Tanaka",
    description:
      "Moody's downgrade from Baa2 to Ba1 triggered credit event clause in master agreement.",
    priority: "medium",
  },
  {
    id: "clm-006",
    reference: "CLM-2026-0028",
    title: "Data feed disruption",
    claimant: "Operations",
    counterpartyId: "cp-004",
    counterpartyName: "Meridian Capital Partners",
    transactionId: "tx-001",
    amount: 0,
    currency: "GBP",
    type: "operational",
    status: "denied",
    filedDate: "2026-01-10",
    resolvedDate: "2026-01-18",
    assignee: "A. Clarke",
    description:
      "Market data feed interruption attributed to vendor, not counterparty. Claim denied.",
    priority: "low",
  },
];

/* ---------- Claim Policy Configuration ---------- */
export const CLAIM_POLICY_CONFIG = {
  CLAIM_WINDOW_DAYS: 90,
  POLICY_LIMIT_USD: 50_000_000,
  EXCLUDED_CORRIDOR_STATUSES: ["suspended"] as const,
} as const;

/* ---------- Reinsurance ---------- */
export type TreatyType =
  | "quota-share"
  | "excess-of-loss"
  | "surplus"
  | "stop-loss"
  | "facultative";

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
  {
    id: "ri-001",
    treatyName: "European Cat XL 2025",
    counterpartyId: "cp-002",
    counterpartyName: "Nordström Reinsurance AG",
    type: "excess-of-loss",
    limit: 500_000_000,
    retention: 50_000_000,
    premium: 12_500_000,
    currency: "CHF",
    inceptionDate: "2025-01-01",
    expirationDate: "2025-12-31",
    status: "pending-renewal",
    claimsRatio: 68,
  },
  {
    id: "ri-002",
    treatyName: "Global Property QS 2026",
    counterpartyId: "cp-002",
    counterpartyName: "Nordström Reinsurance AG",
    type: "quota-share",
    limit: 1_000_000_000,
    retention: 300_000_000,
    premium: 45_000_000,
    currency: "USD",
    inceptionDate: "2026-01-01",
    expirationDate: "2026-12-31",
    status: "in-force",
    claimsRatio: 12,
  },
  {
    id: "ri-003",
    treatyName: "APAC Surplus Treaty",
    counterpartyId: "cp-003",
    counterpartyName: "Pacific Bullion Trust",
    type: "surplus",
    limit: 200_000_000,
    retention: 20_000_000,
    premium: 5_800_000,
    currency: "SGD",
    inceptionDate: "2025-07-01",
    expirationDate: "2026-06-30",
    status: "in-force",
    claimsRatio: 34,
  },
  {
    id: "ri-004",
    treatyName: "Trade Credit Stop Loss",
    counterpartyId: "cp-005",
    counterpartyName: "Caspian Trade Finance Ltd.",
    type: "stop-loss",
    limit: 100_000_000,
    retention: 15_000_000,
    premium: 3_200_000,
    currency: "USD",
    inceptionDate: "2025-01-01",
    expirationDate: "2025-12-31",
    status: "terminated",
    claimsRatio: 142,
  },
  {
    id: "ri-005",
    treatyName: "UK Motor Fac 2026-001",
    counterpartyId: "cp-004",
    counterpartyName: "Meridian Capital Partners",
    type: "facultative",
    limit: 25_000_000,
    retention: 5_000_000,
    premium: 1_100_000,
    currency: "GBP",
    inceptionDate: "2026-02-01",
    expirationDate: "2027-01-31",
    status: "in-force",
    claimsRatio: 0,
  },
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
  {
    id: "pol-001",
    name: "Counterparty Exposure Limits",
    category: "risk",
    status: "active",
    version: "4.2",
    effectiveDate: "2025-07-01",
    reviewDate: "2026-07-01",
    owner: "Credit Committee",
    description:
      "Defines maximum exposure thresholds by counterparty tier, jurisdiction, and product type.",
  },
  {
    id: "pol-002",
    name: "KYC/AML Compliance Framework",
    category: "compliance",
    status: "active",
    version: "6.0",
    effectiveDate: "2025-01-01",
    reviewDate: "2026-01-01",
    owner: "Chief Compliance Officer",
    description:
      "Comprehensive KYC, AML, and sanctions screening requirements for all counterparty onboarding.",
  },
  {
    id: "pol-003",
    name: "Settlement SLA Standards",
    category: "operational",
    status: "active",
    version: "2.1",
    effectiveDate: "2025-03-15",
    reviewDate: "2026-03-15",
    owner: "Head of Operations",
    description:
      "Service level agreements for cross-border settlement timelines by corridor risk tier.",
  },
  {
    id: "pol-004",
    name: "Data Classification & Handling",
    category: "security",
    status: "under-review",
    version: "3.0-rc1",
    effectiveDate: "2026-04-01",
    reviewDate: "2027-04-01",
    owner: "CISO",
    description:
      "Classification levels (Public, Internal, Confidential, Restricted) and handling requirements.",
  },
  {
    id: "pol-005",
    name: "Reinsurance Treaty Approval",
    category: "financial",
    status: "active",
    version: "1.8",
    effectiveDate: "2024-09-01",
    reviewDate: "2025-09-01",
    owner: "Reinsurance Committee",
    description:
      "Approval workflow and risk appetite for new reinsurance treaty placements.",
  },
  {
    id: "pol-006",
    name: "Incident Response Procedure",
    category: "security",
    status: "draft",
    version: "1.0-draft",
    effectiveDate: "2026-06-01",
    reviewDate: "2027-06-01",
    owner: "CISO",
    description:
      "Procedures for identifying, containing, and recovering from cybersecurity incidents.",
  },
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
  {
    id: "role-001",
    name: "Administrator",
    description:
      "Full system access including user management, policy configuration, and audit log access.",
    userCount: 3,
    permissions: ["*"],
    createdDate: "2024-01-01",
    isSystem: true,
  },
  {
    id: "role-002",
    name: "Risk Analyst",
    description:
      "Read/write access to counterparty data, risk models, and claims. No admin access.",
    userCount: 12,
    permissions: [
      "counterparties:rw",
      "risk:rw",
      "claims:rw",
      "labs:rw",
      "transactions:r",
    ],
    createdDate: "2024-01-01",
    isSystem: true,
  },
  {
    id: "role-003",
    name: "Compliance Officer",
    description:
      "Full compliance module access, KYC/AML reviews, evidence vault, and audit trail.",
    userCount: 5,
    permissions: [
      "compliance:rw",
      "evidence:rw",
      "audit:r",
      "counterparties:r",
      "claims:r",
    ],
    createdDate: "2024-01-01",
    isSystem: true,
  },
  {
    id: "role-004",
    name: "Operations Manager",
    description:
      "Transaction processing, settlement oversight, hub monitoring, and corridor management.",
    userCount: 8,
    permissions: [
      "transactions:rw",
      "corridors:rw",
      "hubs:rw",
      "settlements:rw",
    ],
    createdDate: "2024-01-01",
    isSystem: true,
  },
  {
    id: "role-005",
    name: "Reinsurance Desk",
    description:
      "Treaty management, pricing, and reinsurance-specific claims handling.",
    userCount: 4,
    permissions: ["reinsurance:rw", "claims:rw", "counterparties:r", "labs:r"],
    createdDate: "2024-06-15",
    isSystem: false,
  },
  {
    id: "role-006",
    name: "Read-Only Viewer",
    description:
      "Read-only access across all modules. Suitable for auditors and external consultants.",
    userCount: 15,
    permissions: ["*:r"],
    createdDate: "2024-01-01",
    isSystem: true,
  },
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
  {
    id: "ev1",
    timestamp: "2026-02-15T14:32:00Z",
    action: "Risk rating upgraded",
    actor: "M. Reynolds",
    detail:
      "Aurelia Sovereign Fund upgraded from Medium to Low following satisfactory audit completion.",
    category: "review",
  },
  {
    id: "ev2",
    timestamp: "2026-02-14T11:15:00Z",
    action: "Compliance alert triggered",
    actor: "System",
    detail:
      "Caspian Trade Finance exceeded exposure threshold ($200M). Auto-flagged for review.",
    category: "alert",
  },
  {
    id: "ev3",
    timestamp: "2026-02-13T09:48:00Z",
    action: "Document submitted",
    actor: "D. Petrov",
    detail:
      "Annual compliance certificate uploaded for Caspian Trade Finance Ltd.",
    category: "update",
  },
  {
    id: "ev4",
    timestamp: "2026-02-12T16:20:00Z",
    action: "Board approval granted",
    actor: "Credit Committee",
    detail:
      "Meridian Capital Partners: $2.1B exposure limit approved for FY2026.",
    category: "approval",
  },
  {
    id: "ev5",
    timestamp: "2026-02-11T08:00:00Z",
    action: "Scheduled review initiated",
    actor: "System",
    detail:
      "Quarterly review cycle started for 23 counterparties in APAC region.",
    category: "system",
  },
];

/* ---------- Governance Audit Domain Model ---------- */

export type AuditActorRole = UserRole | "system";
export type AuditResourceType = "order" | "settlement" | "transaction" | "listing" | "claim" | "counterparty" | "reservation" | "receipt" | "CAPITAL" | "CERTIFICATE";

export type AuditAction =
  | "SESSION_CREATED"
  | "SESSION_EXPIRED"
  | "LOGIN"
  | "LOGOUT"
  | "VERIFICATION_STEP_SUBMITTED"
  | "VERIFICATION_STATUS_CHANGED"
  | "RESERVATION_CREATED"
  | "RESERVATION_EXPIRED"
  | "RESERVATION_CONVERTED"
  | "ORDER_CREATED"
  | "SETTLEMENT_OPENED"
  | "SETTLEMENT_ACTION_APPLIED"
  | "RECEIPT_GENERATED"
  | "LISTING_DRAFT_CREATED"
  | "LISTING_PUBLISHED"
  | "CLAIM_OPENED"
  | "CLAIM_DECIDED"
  | "EXPORT_REQUESTED"
  | "CAPITAL_BREACH_DETECTED"
  | "CAPITAL_CONTROL_MODE_CHANGED"
  | "CAPITAL_CONTROL_BLOCKED"
  | "CAPITAL_OVERRIDE_CREATED"
  | "CAPITAL_OVERRIDE_REVOKED"
  | "CLEARING_CERTIFICATE_ISSUED"
  | "PAYMENT_PROCESSED"
  | "FEE_ADDON_CONFIGURED"
  | "MANUAL_REVIEW_APPROVED"
  | "MANUAL_REVIEW_REJECTED";

export type AuditSeverity = "info" | "warning" | "critical";

export interface GovernanceAuditEvent {
  id: string;
  occurredAt: string;
  actorRole: AuditActorRole;
  actorUserId: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  corridorId?: string | null;
  hubId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  result: "SUCCESS" | "DENIED" | "ERROR";
  severity: AuditSeverity;
  message: string;
  metadata: Record<string, string | number | boolean | null>;
  evidenceIds?: string[];
  ledgerEntryId?: string | null;
}

/** @deprecated Use GovernanceAuditEvent. Kept for backward compat on /admin/audit. */
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

/* ---------- Governance Audit Fixtures (42 events) ---------- */

export const mockGovernanceAuditEvents: GovernanceAuditEvent[] = [
  /* ── AUTH events ── */
  { id: "ga-001", occurredAt: "2026-02-16T08:00:00Z", actorRole: "buyer", actorUserId: "user-1", action: "LOGIN", resourceType: "counterparty", resourceId: "cp-001", ip: "10.0.2.18", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "M. Reynolds authenticated successfully", metadata: { method: "MFA", sessionDuration: 43200 } },
  { id: "ga-002", occurredAt: "2026-02-16T09:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "SESSION_CREATED", resourceType: "counterparty", resourceId: "cp-004", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Admin session created for A. Reynolds", metadata: { ttl: 43200 } },
  { id: "ga-003", occurredAt: "2026-02-15T23:59:00Z", actorRole: "system", actorUserId: null, action: "SESSION_EXPIRED", resourceType: "counterparty", resourceId: "cp-003", ip: null, userAgent: null, result: "SUCCESS", severity: "info", message: "Session expired for user-3 after 12h TTL", metadata: { userId: "user-3" } },
  { id: "ga-004", occurredAt: "2026-02-16T07:45:00Z", actorRole: "compliance", actorUserId: "user-6", action: "LOGIN", resourceType: "counterparty", resourceId: "cp-004", ip: "10.0.3.10", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "S. Nielsen authenticated for compliance review", metadata: { method: "MFA" } },

  /* ── VERIFICATION events ── */
  { id: "ga-005", occurredAt: "2026-02-15T09:00:00Z", actorRole: "buyer", actorUserId: "user-1", action: "VERIFICATION_STEP_SUBMITTED", resourceType: "counterparty", resourceId: "cp-001", ip: "10.0.2.18", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "KYC identity verification step submitted by M. Reynolds", metadata: { stepId: "kyc-id-verification", track: "INDIVIDUAL_KYC" }, evidenceIds: ["e1"] },
  { id: "ga-006", occurredAt: "2026-02-15T09:30:00Z", actorRole: "compliance", actorUserId: "user-6", action: "VERIFICATION_STATUS_CHANGED", resourceType: "counterparty", resourceId: "cp-001", ip: "10.0.3.10", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Verification status changed to VERIFIED for user-1", metadata: { previousStatus: "NEEDS_REVIEW", newStatus: "VERIFIED", userId: "user-1" } },
  { id: "ga-007", occurredAt: "2026-02-14T14:00:00Z", actorRole: "buyer", actorUserId: "user-3", action: "VERIFICATION_STEP_SUBMITTED", resourceType: "counterparty", resourceId: "cp-003", ip: "10.0.4.22", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Address verification submitted by J. Tanaka", metadata: { stepId: "kyc-address", track: "INDIVIDUAL_KYC" } },
  { id: "ga-008", occurredAt: "2026-02-14T15:00:00Z", actorRole: "compliance", actorUserId: "user-6", action: "VERIFICATION_STATUS_CHANGED", resourceType: "counterparty", resourceId: "cp-003", ip: "10.0.3.10", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "DENIED", severity: "warning", message: "Verification REJECTED for user-9 — sanctions screening failed", metadata: { previousStatus: "IN_PROGRESS", newStatus: "REJECTED", userId: "user-9", reason: "SANCTIONS_MATCH" } },

  /* ── RESERVATION events ── */
  { id: "ga-009", occurredAt: "2026-02-15T10:00:00Z", actorRole: "buyer", actorUserId: "user-1", action: "RESERVATION_CREATED", resourceType: "reservation", resourceId: "res-001", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.2.18", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Reservation res-001 created: 10 oz on lst-003", metadata: { listingId: "lst-003", weightOz: 10, expiresIn: 600 } },
  { id: "ga-010", occurredAt: "2026-02-15T10:00:00Z", actorRole: "buyer", actorUserId: "user-1", action: "RESERVATION_CREATED", resourceType: "reservation", resourceId: "res-002", corridorId: "cor-001", hubId: "hub-001", ip: "10.0.2.18", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Reservation res-002 created: 15 oz on lst-007", metadata: { listingId: "lst-007", weightOz: 15, expiresIn: 600 } },
  { id: "ga-011", occurredAt: "2026-02-15T10:10:00Z", actorRole: "buyer", actorUserId: "user-1", action: "RESERVATION_CONVERTED", resourceType: "reservation", resourceId: "res-002", corridorId: "cor-001", hubId: "hub-001", ip: "10.0.2.18", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Reservation res-002 converted to order ord-001", metadata: { orderId: "ord-001", listingId: "lst-007" } },
  { id: "ga-012", occurredAt: "2026-02-14T16:00:00Z", actorRole: "system", actorUserId: null, action: "RESERVATION_EXPIRED", resourceType: "reservation", resourceId: "res-000", ip: null, userAgent: null, result: "SUCCESS", severity: "info", message: "Reservation res-000 expired after 10min TTL", metadata: { listingId: "lst-001", buyerUserId: "user-1" } },

  /* ── ORDER events ── */
  { id: "ga-013", occurredAt: "2026-02-15T10:10:00Z", actorRole: "buyer", actorUserId: "user-1", action: "ORDER_CREATED", resourceType: "order", resourceId: "ord-001", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.2.18", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Order ord-001 created: 15 oz @ $2,038.00/oz from lst-007", metadata: { listingId: "lst-007", weightOz: 15, notional: 30570, reservationId: "res-002" } },
  { id: "ga-014", occurredAt: "2026-02-14T16:00:00Z", actorRole: "buyer", actorUserId: "user-1", action: "ORDER_CREATED", resourceType: "order", resourceId: "ord-002", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.2.18", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Order ord-002 created: 25 oz @ $2,048.50/oz from lst-001", metadata: { listingId: "lst-001", weightOz: 25, notional: 51212.5, reservationId: "res-000" } },
  { id: "ga-015", occurredAt: "2026-02-16T07:00:00Z", actorRole: "buyer", actorUserId: "user-9", action: "ORDER_CREATED", resourceType: "order", resourceId: "ord-001", corridorId: "cor-005", hubId: "hub-006", ip: "10.0.5.99", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "DENIED", severity: "warning", message: "Order creation denied — user-9 verification status NOT_STARTED", metadata: { reason: "FORBIDDEN_ROLE", requiredStatus: "VERIFIED" } },

  /* ── SETTLEMENT events ── */
  { id: "ga-016", occurredAt: "2026-02-14T16:05:00Z", actorRole: "admin", actorUserId: "user-4", action: "SETTLEMENT_OPENED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Settlement stl-001 opened for ord-002 — escrow initiated", metadata: { orderId: "ord-002", notional: 51212.5, weightOz: 25, rail: "WIRE" }, ledgerEntryId: "le-001" },
  { id: "ga-017", occurredAt: "2026-02-14T16:30:00Z", actorRole: "treasury", actorUserId: "user-5", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.50", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Funds deposited $51,212.50 for stl-001", metadata: { actionType: "CONFIRM_FUNDS_FINAL", amount: 51212.5 }, ledgerEntryId: "le-002" },
  { id: "ga-018", occurredAt: "2026-02-14T17:00:00Z", actorRole: "vault_ops", actorUserId: "user-7", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.55", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Gold allocated 25 oz for stl-001", metadata: { actionType: "ALLOCATE_GOLD", weightOz: 25 }, ledgerEntryId: "le-003" },
  { id: "ga-019", occurredAt: "2026-02-14T17:15:00Z", actorRole: "compliance", actorUserId: "user-6", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.3.10", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Verification cleared for stl-001", metadata: { actionType: "CLEAR_VERIFICATION" }, ledgerEntryId: "le-004" },
  { id: "ga-020", occurredAt: "2026-02-14T17:30:00Z", actorRole: "admin", actorUserId: "user-4", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "critical", message: "Authorization granted for stl-001 — DvP ready", metadata: { actionType: "AUTHORIZE", checksStatus: "PASS" }, ledgerEntryId: "le-005" },
  { id: "ga-021", occurredAt: "2026-02-14T18:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "critical", message: "DvP EXECUTED for stl-001 — funds and gold released atomically", metadata: { actionType: "EXECUTE_DVP", fundsReleased: true, goldReleased: true }, ledgerEntryId: "le-006" },
  { id: "ga-022", occurredAt: "2026-02-15T10:10:00Z", actorRole: "admin", actorUserId: "user-4", action: "SETTLEMENT_OPENED", resourceType: "settlement", resourceId: "stl-002", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Settlement stl-002 opened for ord-001 — escrow initiated", metadata: { orderId: "ord-001", notional: 30570, weightOz: 15, rail: "RTGS" }, ledgerEntryId: "le-009" },
  { id: "ga-023", occurredAt: "2026-02-16T08:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "SETTLEMENT_OPENED", resourceType: "settlement", resourceId: "stl-003", corridorId: "cor-004", hubId: "hub-003", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Settlement stl-003 opened for ord-003 — escrow initiated", metadata: { orderId: "ord-003", notional: 102612.5, weightOz: 50, rail: "WIRE" }, ledgerEntryId: "le-012" },
  { id: "ga-024", occurredAt: "2026-02-16T06:00:00Z", actorRole: "buyer", actorUserId: "user-3", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-003", corridorId: "cor-004", hubId: "hub-003", ip: "10.0.4.22", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "DENIED", severity: "warning", message: "Settlement action denied — buyer role cannot execute AUTHORIZE", metadata: { actionType: "AUTHORIZE", reason: "FORBIDDEN_ROLE", allowedRoles: "admin" } },
  { id: "ga-025", occurredAt: "2026-02-15T16:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-002", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "ERROR", severity: "warning", message: "Settlement action failed — verification not yet cleared for AUTHORIZE", metadata: { actionType: "AUTHORIZE", errorCode: "VERIFICATION_REQUIRED" } },

  /* ── RECEIPT events ── */
  { id: "ga-026", occurredAt: "2026-02-14T18:30:00Z", actorRole: "system", actorUserId: null, action: "RECEIPT_GENERATED", resourceType: "receipt", resourceId: "ord-002", corridorId: "cor-002", hubId: "hub-001", ip: null, userAgent: null, result: "SUCCESS", severity: "info", message: "Receipt generated for order ord-002 — settlement stl-001 SETTLED", metadata: { settlementId: "stl-001", documentId: "AR-CLR-ord-002-stl-001-20260214" } },
  { id: "ga-027", occurredAt: "2026-02-14T19:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "EXPORT_REQUESTED", resourceType: "receipt", resourceId: "ord-002", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Receipt export (JSON) requested for ord-002", metadata: { format: "JSON", settlementId: "stl-001" } },

  /* ── LISTING events ── */
  { id: "ga-028", occurredAt: "2026-01-22T10:30:00Z", actorRole: "seller", actorUserId: "user-2", action: "LISTING_DRAFT_CREATED", resourceType: "listing", resourceId: "lst-001", hubId: "hub-002", ip: "10.0.2.30", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Listing draft created: LBMA Good Delivery Bar — 400 oz", metadata: { form: "bar", purity: "9999", totalWeightOz: 400 } },
  { id: "ga-029", occurredAt: "2026-01-22T10:31:00Z", actorRole: "seller", actorUserId: "user-2", action: "LISTING_PUBLISHED", resourceType: "listing", resourceId: "lst-001", hubId: "hub-002", ip: "10.0.2.30", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Listing lst-001 published to marketplace", metadata: { pricePerOz: 2048.5 }, evidenceIds: ["e2"] },
  { id: "ga-030", occurredAt: "2026-01-28T06:15:00Z", actorRole: "seller", actorUserId: "user-2", action: "LISTING_DRAFT_CREATED", resourceType: "listing", resourceId: "lst-003", hubId: "hub-004", ip: "10.0.2.30", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Listing draft created: COMEX-Eligible Gold Bar — 100 oz", metadata: { form: "bar", purity: "999", totalWeightOz: 100 } },
  { id: "ga-031", occurredAt: "2026-02-01T11:00:00Z", actorRole: "seller", actorUserId: "user-2", action: "LISTING_DRAFT_CREATED", resourceType: "listing", resourceId: "lst-005", hubId: "hub-002", ip: "10.0.2.30", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Listing draft created: PAMP Suisse Fortuna Bar — 50 oz", metadata: { form: "bar", purity: "9999", totalWeightOz: 200 } },

  /* ── CLAIM events ── */
  { id: "ga-032", occurredAt: "2026-02-12T13:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "CLAIM_OPENED", resourceType: "claim", resourceId: "clm-001", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "warning", message: "Claim opened: Margin call non-compliance against Caspian Trade Finance", metadata: { counterpartyId: "cp-005", amount: 8200000, currency: "USD", type: "counterparty-default" } },
  { id: "ga-033", occurredAt: "2026-01-18T12:00:00Z", actorRole: "compliance", actorUserId: "user-6", action: "CLAIM_DECIDED", resourceType: "claim", resourceId: "clm-006", ip: "10.0.3.10", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Claim clm-006 decided: DENIED — vendor attribution, not counterparty", metadata: { decision: "denied", counterpartyId: "cp-004" } },
  { id: "ga-034", occurredAt: "2026-02-09T10:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "CLAIM_OPENED", resourceType: "claim", resourceId: "clm-002", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "warning", message: "Claim opened: FX settlement mismatch with Banco del Plata", metadata: { counterpartyId: "cp-007", amount: 22000000, currency: "ARS" } },

  /* ── EXPORT events (additional) ── */
  { id: "ga-035", occurredAt: "2026-02-14T19:30:00Z", actorRole: "admin", actorUserId: "user-4", action: "EXPORT_REQUESTED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Settlement packet export requested for stl-001", metadata: { format: "JSON", entryCount: 7 } },
  { id: "ga-036", occurredAt: "2026-02-16T10:00:00Z", actorRole: "compliance", actorUserId: "user-6", action: "EXPORT_REQUESTED", resourceType: "settlement", resourceId: "stl-002", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.3.10", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Settlement packet export requested for stl-002 (in-progress settlement)", metadata: { format: "JSON", entryCount: 3 } },

  /* ── CRITICAL events ── */
  { id: "ga-037", occurredAt: "2026-02-14T18:00:00Z", actorRole: "admin", actorUserId: "user-4", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-001", corridorId: "cor-002", hubId: "hub-001", ip: "10.0.1.42", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "critical", message: "DvP executed — atomic delivery-versus-payment completed for stl-001", metadata: { actionType: "EXECUTE_DVP", fundsReleased: true, goldReleased: true, notional: 51212.5 }, ledgerEntryId: "le-006" },
  { id: "ga-038", occurredAt: "2026-02-15T14:30:00Z", actorRole: "compliance", actorUserId: "user-6", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-002", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.3.10", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "ERROR", severity: "critical", message: "Compliance reject — settlement stl-002 cannot proceed, verification incomplete", metadata: { actionType: "REJECT", errorCode: "COMPLIANCE_BLOCK", reason: "Buyer verification not cleared" } },

  /* ── Additional auth/session events ── */
  { id: "ga-039", occurredAt: "2026-02-16T09:15:00Z", actorRole: "vault_ops", actorUserId: "user-7", action: "LOGIN", resourceType: "counterparty", resourceId: "cp-004", ip: "10.0.1.55", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "K. Okafor authenticated for vault operations", metadata: { method: "MFA" } },
  { id: "ga-040", occurredAt: "2026-02-16T08:30:00Z", actorRole: "treasury", actorUserId: "user-5", action: "LOGIN", resourceType: "counterparty", resourceId: "cp-004", ip: "10.0.1.50", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "M. Chen authenticated for treasury operations", metadata: { method: "MFA" } },
  { id: "ga-041", occurredAt: "2026-02-15T11:00:00Z", actorRole: "treasury", actorUserId: "user-5", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-002", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.1.50", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Funds deposited $30,570.00 for stl-002", metadata: { actionType: "CONFIRM_FUNDS_FINAL", amount: 30570 }, ledgerEntryId: "le-010" },
  { id: "ga-042", occurredAt: "2026-02-15T14:00:00Z", actorRole: "vault_ops", actorUserId: "user-7", action: "SETTLEMENT_ACTION_APPLIED", resourceType: "settlement", resourceId: "stl-002", corridorId: "cor-001", hubId: "hub-004", ip: "10.0.1.55", userAgent: "Mozilla/5.0 AurumShield/3.1", result: "SUCCESS", severity: "info", message: "Gold allocated 15 oz for stl-002", metadata: { actionType: "ALLOCATE_GOLD", weightOz: 15 }, ledgerEntryId: "le-011" },
];

/** @deprecated Backward compat — maps old shape from GovernanceAuditEvent fixtures */
export const mockAuditEvents: AuditEvent[] = mockGovernanceAuditEvents.slice(0, 8).map((e) => ({
  id: e.id,
  timestamp: e.occurredAt,
  action: e.action,
  actor: e.actorUserId ?? "System",
  actorRole: e.actorRole,
  resource: e.resourceType,
  resourceId: e.resourceId,
  detail: e.message,
  ipAddress: e.ip ?? "10.0.0.1",
  category: (e.action.startsWith("LOGIN") || e.action.startsWith("SESSION") ? "auth" : e.action === "EXPORT_REQUESTED" ? "export" : "data") as AuditEvent["category"],
}));

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
  {
    id: "e1",
    title: "Annual Financial Statements FY2025",
    type: "document",
    date: "2026-01-22",
    author: "Aurelia Sovereign Fund — CFO Office",
    classification: "confidential",
    summary:
      "Audited financial statements including balance sheet, P&L, and cash flow analysis.",
    pages: 48,
  },
  {
    id: "e2",
    title: "Counterparty Risk Assessment — Q4 2025",
    type: "report",
    date: "2026-01-10",
    author: "Risk Analytics Division",
    classification: "internal",
    summary:
      "Comprehensive risk scoring across 1,247 active counterparties with Monte Carlo simulations.",
    pages: 124,
  },
  {
    id: "e3",
    title: "Regulatory Correspondence — FINMA",
    type: "correspondence",
    date: "2026-02-05",
    author: "Swiss Financial Market Supervisory Authority",
    classification: "restricted",
    summary:
      "Response to inquiry regarding cross-border reinsurance treaty exposures.",
    pages: 6,
  },
  {
    id: "e4",
    title: "Board Resolution — Credit Limit Expansion",
    type: "memo",
    date: "2026-02-12",
    author: "Credit Committee Secretariat",
    classification: "internal",
    summary:
      "Approved expansion of credit limits for three Tier-1 counterparties effective Q2 2026.",
    pages: 3,
  },
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
  completed: [
    "INITIATED",
    "COMPLIANCE_CHECK",
    "PROCESSING",
    "SETTLEMENT",
    "COMPLETED",
  ],
  pending: ["INITIATED", "PENDING_REVIEW"],
  processing: ["INITIATED", "COMPLIANCE_CHECK", "PROCESSING"],
  failed: ["INITIATED", "COMPLIANCE_CHECK", "PROCESSING", "FAILED"],
  reversed: [
    "INITIATED",
    "COMPLIANCE_CHECK",
    "PROCESSING",
    "SETTLEMENT",
    "COMPLETED",
    "REVERSED",
  ],
};

const STATE_ACTORS: Record<string, string> = {
  INITIATED: "",
  COMPLIANCE_CHECK: "Compliance Engine",
  PROCESSING: "Settlement System",
  SETTLEMENT: "Hub Operator",
  COMPLETED: "System",
  PENDING_REVIEW: "Compliance Queue",
  FAILED: "System",
  REVERSED: "Operations Desk",
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
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function getTransactionTransitions(
  tx: Transaction,
): TransactionStateTransition[] {
  const states = TRANSITION_STATES[tx.status];
  const start = new Date(tx.initiatedDate).getTime();
  const end = tx.settledDate
    ? new Date(tx.settledDate).getTime()
    : start + 24 * 3600_000;
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
    {
      band: "green",
      label: "Low Risk (TRI 1–3)",
      count: 5,
      percentage: 62.5,
      exposure: 93_750_000,
    },
    {
      band: "amber",
      label: "Elevated (TRI 4–6)",
      count: 2,
      percentage: 25.0,
      exposure: 37_500_000,
    },
    {
      band: "red",
      label: "High Risk (TRI 7–10)",
      count: 1,
      percentage: 12.5,
      exposure: 18_750_000,
    },
  ],
  asOf: "2026-02-15T21:30:00Z",
};

export const mockTRIBandsScaleUp: { bands: TRIBand[]; asOf: string } = {
  bands: [
    {
      band: "green",
      label: "Low Risk (TRI 1–3)",
      count: 42,
      percentage: 58.3,
      exposure: 303_160_000,
    },
    {
      band: "amber",
      label: "Elevated (TRI 4–6)",
      count: 22,
      percentage: 30.6,
      exposure: 159_120_000,
    },
    {
      band: "red",
      label: "High Risk (TRI 7–10)",
      count: 8,
      percentage: 11.1,
      exposure: 57_720_000,
    },
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

export const mockCorridorTiersPhase1: { tiers: CorridorTier[]; asOf: string } =
  {
    tiers: [
      {
        tier: 1,
        label: "Tier 1 — Core",
        corridorCount: 3,
        exposure: 82_500_000,
        limit: 100_000_000,
        utilization: 0.825,
      },
      {
        tier: 2,
        label: "Tier 2 — Standard",
        corridorCount: 2,
        exposure: 45_000_000,
        limit: 60_000_000,
        utilization: 0.75,
      },
      {
        tier: 3,
        label: "Tier 3 — Elevated",
        corridorCount: 1,
        exposure: 15_000_000,
        limit: 25_000_000,
        utilization: 0.6,
      },
      {
        tier: 4,
        label: "Tier 4 — Restricted",
        corridorCount: 1,
        exposure: 7_500_000,
        limit: 15_000_000,
        utilization: 0.5,
      },
    ],
    asOf: "2026-02-15T21:28:00Z",
  };

export const mockCorridorTiersScaleUp: { tiers: CorridorTier[]; asOf: string } =
  {
    tiers: [
      {
        tier: 1,
        label: "Tier 1 — Core",
        corridorCount: 5,
        exposure: 286_000_000,
        limit: 350_000_000,
        utilization: 0.817,
      },
      {
        tier: 2,
        label: "Tier 2 — Standard",
        corridorCount: 4,
        exposure: 140_400_000,
        limit: 200_000_000,
        utilization: 0.702,
      },
      {
        tier: 3,
        label: "Tier 3 — Elevated",
        corridorCount: 3,
        exposure: 62_400_000,
        limit: 120_000_000,
        utilization: 0.52,
      },
      {
        tier: 4,
        label: "Tier 4 — Restricted",
        corridorCount: 2,
        exposure: 31_200_000,
        limit: 80_000_000,
        utilization: 0.39,
      },
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

export const mockHubConcentrationPhase1: {
  hubs: HubConcentration[];
  totalHHI: number;
  asOf: string;
} = {
  hubs: [
    {
      hubId: "hub-001",
      hubName: "London Clearing Centre",
      type: "Clearing",
      exposure: 60_000_000,
      percentage: 40.0,
      hhi: 1600,
    },
    {
      hubId: "hub-004",
      hubName: "New York Trading Floor",
      type: "Trading",
      exposure: 45_000_000,
      percentage: 30.0,
      hhi: 900,
    },
    {
      hubId: "hub-002",
      hubName: "Zurich Custody Vault",
      type: "Custody",
      exposure: 22_500_000,
      percentage: 15.0,
      hhi: 225,
    },
    {
      hubId: "hub-003",
      hubName: "Singapore Settlement Node",
      type: "Settlement",
      exposure: 15_000_000,
      percentage: 10.0,
      hhi: 100,
    },
    {
      hubId: "hub-005",
      hubName: "Frankfurt Settlement Hub",
      type: "Settlement",
      exposure: 7_500_000,
      percentage: 5.0,
      hhi: 25,
    },
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

export const mockTxnByStatePhase1: {
  states: TransactionByState[];
  asOf: string;
} = {
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

export const mockBlockedTransitionsPhase1: {
  transitions: BlockedTransition[];
  asOf: string;
} = {
  transitions: [
    {
      id: "bt-001",
      reference: "MGC-2026-00019",
      counterparty: "Caspian Trade Finance Ltd.",
      reason: "Margin call SLA breach — collateral not posted within 24h",
      blockedSince: "2026-02-13T13:00:00Z",
      severity: "critical",
    },
    {
      id: "bt-002",
      reference: "STL-2026-00312",
      counterparty: "Banco del Plata S.A.",
      reason:
        "FX conversion date mismatch — settlement reversed pending manual review",
      blockedSince: "2026-02-10T09:15:00Z",
      severity: "warning",
    },
    {
      id: "bt-003",
      reference: "COL-2026-00048",
      counterparty: "Meridian Capital Partners",
      reason:
        "Structured product collateral pledge awaiting Credit Committee sign-off",
      blockedSince: "2026-02-15T11:30:00Z",
      severity: "warning",
    },
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

export const mockEvidenceValidationsPhase1: {
  validations: EvidenceValidation[];
  asOf: string;
} = {
  validations: [
    {
      id: "ev-001",
      title: "Aurelia Sovereign Fund — FY2025 Financials",
      result: "pass",
      checkedAt: "2026-02-15T20:45:00Z",
      validatedBy: "Compliance Engine v4.2",
      rule: "Document hash integrity + signature verification",
    },
    {
      id: "ev-002",
      title: "Counterparty Risk Assessment Q4",
      result: "pass",
      checkedAt: "2026-02-15T20:42:00Z",
      validatedBy: "Compliance Engine v4.2",
      rule: "Classification label present + author attribution",
    },
    {
      id: "ev-003",
      title: "FINMA Regulatory Correspondence",
      result: "warn",
      checkedAt: "2026-02-15T20:40:00Z",
      validatedBy: "Compliance Engine v4.2",
      rule: "Retention period approaching 60-day review threshold",
    },
    {
      id: "ev-004",
      title: "Credit Limit Board Resolution",
      result: "pass",
      checkedAt: "2026-02-15T20:38:00Z",
      validatedBy: "Compliance Engine v4.2",
      rule: "Multi-signatory quorum verification",
    },
    {
      id: "ev-005",
      title: "Caspian TF — Compliance Certificate",
      result: "fail",
      checkedAt: "2026-02-15T20:35:00Z",
      validatedBy: "Compliance Engine v4.2",
      rule: "Certificate expired — annual renewal past due",
    },
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

export const mockWORMStatusPhase1: {
  segments: WORMSegment[];
  totalDocuments: number;
  asOf: string;
} = {
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
  hubConcentration: {
    hubs: HubConcentration[];
    totalHHI: number;
    asOf: string;
  };
  txnByState: { states: TransactionByState[]; asOf: string };
  blockedTransitions: { transitions: BlockedTransition[]; asOf: string };
  evidenceValidations: { validations: EvidenceValidation[]; asOf: string };
  wormStatus: { segments: WORMSegment[]; totalDocuments: number; asOf: string };
}

export function getMockDashboardData(
  scenario: DashboardScenario = "phase1",
): DashboardData {
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

/* ================================================================
   MARKETPLACE — Gold Listing Domain Models
   ================================================================ */

/* ---------- Marketplace Types ---------- */
export type GoldForm = "bar" | "coin";
export type Purity = "995" | "999" | "9999";
export type ListingStatus =
  | "draft"
  | "available"
  | "reserved"
  | "allocated"
  | "sold"
  | "suspended";

export interface Listing {
  id: string;
  title: string;
  form: GoldForm;
  purity: Purity;
  vaultHubId: string;
  vaultName: string;
  jurisdiction: string;
  sellerUserId: string;
  sellerOrgId: string;
  sellerName: string;
  evidenceIds: string[];
  status: ListingStatus;
  publishedAt: string | null;
  createdAt: string;
  pricePerOz: number;
  totalWeightOz: number;
  /** Trust signal flags (derived from evidence & verification) */
  isAssayVerified?: boolean;
  isLbmaGoodDelivery?: boolean;
  isFullyInsured?: boolean;
  isSellerVerified?: boolean;
}

/* ---------- Listing Evidence ---------- */
export type ListingEvidenceType =
  | "ASSAY_REPORT"
  | "CHAIN_OF_CUSTODY"
  | "SELLER_ATTESTATION";

export interface ListingEvidenceItem {
  id: string;
  listingId: string;
  type: ListingEvidenceType;
  title: string;
  createdAt: string;
  createdBy: string;
  /** Metadata extracted by AWS Textract from the uploaded document (assay reports only). */
  extractedMetadata?: {
    /** Normalized purity code extracted from the document. */
    extractedPurity: Purity | null;
    /** Raw purity text as it appeared in the document. */
    rawPurityText: string | null;
    /** Extracted weight in troy ounces. */
    extractedWeightOz: number | null;
    /** Raw weight text as it appeared in the document. */
    rawWeightText: string | null;
    /** Refiner name extracted from the document (for LBMA Good Delivery verification). */
    extractedRefinerName: string | null;
    /** Raw refiner text as it appeared in the document. */
    rawRefinerText: string | null;
    /** Whether the Textract analysis was successful. */
    analysisSucceeded: boolean;
    /** Error message if analysis failed. */
    analysisError: string | null;
  };
}

export interface InventoryPosition {
  id: string;
  listingId: string;
  totalWeightOz: number;
  availableWeightOz: number;
  reservedWeightOz: number;
  allocatedWeightOz: number;
  /**
   * RSK-005: Total locked weight (reserved + allocated).
   * INVARIANT: lockedWeightOz === reservedWeightOz + allocatedWeightOz
   * CONSTRAINT: totalWeightOz >= lockedWeightOz >= 0
   */
  lockedWeightOz: number;
  updatedAt: string;
}

export type ReservationState = "ACTIVE" | "EXPIRED" | "CONVERTED";

export interface Reservation {
  id: string;
  listingId: string;
  buyerUserId: string;
  weightOz: number;
  pricePerOzLocked: number;
  createdAt: string;
  expiresAt: string;
  state: ReservationState;
}

export type OrderStatus =
  | "draft"
  | "pending_verification"
  | "reserved"
  | "settlement_pending"
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  listingId: string;
  reservationId: string;
  buyerUserId: string;
  sellerUserId: string;
  sellerOrgId: string;
  weightOz: number;
  pricePerOz: number;
  notional: number;
  status: OrderStatus;
  createdAt: string;
  policySnapshot?: MarketplacePolicySnapshot;
}

/* ---------- Marketplace Fixtures ---------- */

/* Deterministic mappings:
   lst-001  → cp-008 Helvetia Private Bank    → hub-002 Zurich Custody Vault
   lst-002  → cp-004 Meridian Capital Partners → hub-001 London Clearing Centre
   lst-003  → cp-004 Meridian Capital Partners → hub-004 New York Trading Floor
   lst-004  → cp-003 Pacific Bullion Trust     → hub-003 Singapore Settlement Node
   lst-005  → cp-008 Helvetia Private Bank     → hub-002 Zurich Custody Vault
   lst-006  → cp-001 Aurelia Sovereign Fund    → hub-004 New York Trading Floor
   lst-007  → cp-004 Meridian Capital Partners → hub-001 London Clearing Centre
   lst-008  → cp-002 Nordström Reinsurance AG  → hub-002 Zurich Custody Vault
   lst-009  → cp-005 Caspian Trade Finance     → hub-006 Dubai Trade Gateway (SUSPENDED)
   lst-010  → cp-003 Pacific Bullion Trust     → hub-003 Singapore Settlement Node
   lst-011  → cp-006 Fjordbank Holding ASA     → hub-005 Frankfurt Settlement Hub
   lst-012  → cp-007 Banco del Plata S.A.      → hub-004 New York Trading Floor
   lst-013  → cp-004 Meridian Capital Partners → hub-001 London Clearing Centre
   lst-014  → cp-001 Aurelia Sovereign Fund    → hub-002 Zurich Custody Vault
   lst-015  → cp-008 Helvetia Private Bank     → hub-002 Zurich Custody Vault

   Inventory consistency: available + reserved + allocated = total
   res-001 (ACTIVE 10 oz on lst-003)  → lst-003 reserved = 10
   res-002 (CONVERTED 15 oz on lst-007) → lst-007 allocated = 15 (ord-001)
   ord-002 (completed 25 oz on lst-001) → lst-001 allocated = 25 */

/* Seller mapping:
   All existing listings are owned by user-2 (A. Clarke / Meridian Capital Partners, org-002)
   This provides consistency with the seller role fixture. */
export const mockListings: Listing[] = [
  {
    id: "lst-001",
    title: "LBMA Good Delivery Bar — 400 oz",
    form: "bar",
    purity: "9999",
    vaultHubId: "hub-002",
    vaultName: "Zurich Custody Vault",
    jurisdiction: "Switzerland",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1", "e2"],
    status: "available",
    publishedAt: "2026-01-20T09:01:00Z",
    createdAt: "2026-01-20T09:00:00Z",
    pricePerOz: 2048.5,
    totalWeightOz: 400,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-002",
    title: "Krugerrand Collection — 100 × 1 oz",
    form: "coin",
    purity: "9999",
    vaultHubId: "hub-001",
    vaultName: "London Clearing Centre",
    jurisdiction: "United Kingdom",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e2"],
    status: "available",
    publishedAt: "2026-01-22T10:31:00Z",
    createdAt: "2026-01-22T10:30:00Z",
    pricePerOz: 2092.0,
    totalWeightOz: 100,
    isAssayVerified: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-003",
    title: "COMEX-Eligible Gold Bar — 100 oz",
    form: "bar",
    purity: "999",
    vaultHubId: "hub-004",
    vaultName: "New York Trading Floor",
    jurisdiction: "United States",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e2", "e4"],
    status: "available",
    publishedAt: "2026-01-25T14:01:00Z",
    createdAt: "2026-01-25T14:00:00Z",
    pricePerOz: 2035.75,
    totalWeightOz: 100,
    isAssayVerified: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-004",
    title: "Perth Mint Cast Bar — 1000 oz",
    form: "bar",
    purity: "9999",
    vaultHubId: "hub-003",
    vaultName: "Singapore Settlement Node",
    jurisdiction: "Singapore",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1", "e3"],
    status: "available",
    publishedAt: "2026-01-28T06:16:00Z",
    createdAt: "2026-01-28T06:15:00Z",
    pricePerOz: 2052.25,
    totalWeightOz: 1000,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-005",
    title: "PAMP Suisse Fortuna Bar — 50 oz",
    form: "bar",
    purity: "9999",
    vaultHubId: "hub-002",
    vaultName: "Zurich Custody Vault",
    jurisdiction: "Switzerland",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1"],
    status: "available",
    publishedAt: "2026-01-30T08:46:00Z",
    createdAt: "2026-01-30T08:45:00Z",
    pricePerOz: 2055.0,
    totalWeightOz: 50,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-006",
    title: "American Eagle Sovereign Collection — 200 × 1 oz",
    form: "coin",
    purity: "9999",
    vaultHubId: "hub-004",
    vaultName: "New York Trading Floor",
    jurisdiction: "United States",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1", "e4"],
    status: "available",
    publishedAt: "2026-02-01T11:01:00Z",
    createdAt: "2026-02-01T11:00:00Z",
    pricePerOz: 2098.0,
    totalWeightOz: 200,
    isAssayVerified: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-007",
    title: "LBMA Kilobar Portfolio — 200 oz",
    form: "bar",
    purity: "999",
    vaultHubId: "hub-001",
    vaultName: "London Clearing Centre",
    jurisdiction: "United Kingdom",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e2", "e3"],
    status: "available",
    publishedAt: "2026-02-03T09:31:00Z",
    createdAt: "2026-02-03T09:30:00Z",
    pricePerOz: 2038.0,
    totalWeightOz: 200,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-008",
    title: "Valcambi CombiBars — 50 × 1 oz",
    form: "bar",
    purity: "9999",
    vaultHubId: "hub-002",
    vaultName: "Zurich Custody Vault",
    jurisdiction: "Switzerland",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e3"],
    status: "available",
    publishedAt: "2026-02-04T13:21:00Z",
    createdAt: "2026-02-04T13:20:00Z",
    pricePerOz: 2060.5,
    totalWeightOz: 50,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-009",
    title: "Dubai Good Delivery Bar — 400 oz",
    form: "bar",
    purity: "995",
    vaultHubId: "hub-006",
    vaultName: "Dubai Trade Gateway",
    jurisdiction: "UAE",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e2"],
    status: "suspended",
    publishedAt: null,
    createdAt: "2026-02-05T07:00:00Z",
    pricePerOz: 2022.0,
    totalWeightOz: 400,
    isAssayVerified: false,
    isLbmaGoodDelivery: false,
    isFullyInsured: false,
    isSellerVerified: true,
  },
  {
    id: "lst-010",
    title: "Singapore Lion City Coins — 100 × 1 oz",
    form: "coin",
    purity: "9999",
    vaultHubId: "hub-003",
    vaultName: "Singapore Settlement Node",
    jurisdiction: "Singapore",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1", "e2"],
    status: "available",
    publishedAt: "2026-02-06T05:31:00Z",
    createdAt: "2026-02-06T05:30:00Z",
    pricePerOz: 2088.75,
    totalWeightOz: 100,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-011",
    title: "Norwegian Sovereign Reserve Bar — 500 oz",
    form: "bar",
    purity: "9999",
    vaultHubId: "hub-005",
    vaultName: "Frankfurt Settlement Hub",
    jurisdiction: "Germany",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e4"],
    status: "available",
    publishedAt: "2026-02-07T10:01:00Z",
    createdAt: "2026-02-07T10:00:00Z",
    pricePerOz: 2050.0,
    totalWeightOz: 500,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-012",
    title: "Argentine Peso Fuerte Gold Coins — 50 × 1 oz",
    form: "coin",
    purity: "999",
    vaultHubId: "hub-004",
    vaultName: "New York Trading Floor",
    jurisdiction: "United States",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e2", "e4"],
    status: "available",
    publishedAt: "2026-02-08T15:46:00Z",
    createdAt: "2026-02-08T15:45:00Z",
    pricePerOz: 2065.0,
    totalWeightOz: 50,
    isAssayVerified: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-013",
    title: "LBMA Allocated Bar — Series A — 400 oz",
    form: "bar",
    purity: "9999",
    vaultHubId: "hub-001",
    vaultName: "London Clearing Centre",
    jurisdiction: "United Kingdom",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1", "e2", "e3"],
    status: "available",
    publishedAt: "2026-02-10T08:16:00Z",
    createdAt: "2026-02-10T08:15:00Z",
    pricePerOz: 2047.25,
    totalWeightOz: 400,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-014",
    title: "Maple Leaf Collection — 50 × 1 oz",
    form: "coin",
    purity: "9999",
    vaultHubId: "hub-002",
    vaultName: "Zurich Custody Vault",
    jurisdiction: "Switzerland",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1"],
    status: "available",
    publishedAt: "2026-02-12T09:01:00Z",
    createdAt: "2026-02-12T09:00:00Z",
    pricePerOz: 2095.5,
    totalWeightOz: 50,
    isAssayVerified: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
  {
    id: "lst-015",
    title: "Helvetia Heritage Bar — 250 oz",
    form: "bar",
    purity: "9999",
    vaultHubId: "hub-002",
    vaultName: "Zurich Custody Vault",
    jurisdiction: "Switzerland",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    sellerName: "Meridian Capital Partners",
    evidenceIds: ["e1", "e4"],
    status: "available",
    publishedAt: "2026-02-14T11:31:00Z",
    createdAt: "2026-02-14T11:30:00Z",
    pricePerOz: 2054.0,
    totalWeightOz: 250,
    isAssayVerified: true,
    isLbmaGoodDelivery: true,
    isFullyInsured: true,
    isSellerVerified: true,
  },
];

export const mockInventoryPositions: InventoryPosition[] = [
  {
    id: "inv-001",
    listingId: "lst-001",
    totalWeightOz: 400,
    availableWeightOz: 375,
    reservedWeightOz: 0,
    allocatedWeightOz: 25,
    lockedWeightOz: 25,
    updatedAt: "2026-02-14T16:00:00Z",
  },
  {
    id: "inv-002",
    listingId: "lst-002",
    totalWeightOz: 100,
    availableWeightOz: 100,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-01-22T10:30:00Z",
  },
  {
    id: "inv-003",
    listingId: "lst-003",
    totalWeightOz: 100,
    availableWeightOz: 90,
    reservedWeightOz: 10,
    allocatedWeightOz: 0,
    lockedWeightOz: 10,
    updatedAt: "2026-02-16T12:00:00Z",
  },
  {
    id: "inv-004",
    listingId: "lst-004",
    totalWeightOz: 1000,
    availableWeightOz: 1000,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-01-28T06:15:00Z",
  },
  {
    id: "inv-005",
    listingId: "lst-005",
    totalWeightOz: 50,
    availableWeightOz: 50,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-01-30T08:45:00Z",
  },
  {
    id: "inv-006",
    listingId: "lst-006",
    totalWeightOz: 200,
    availableWeightOz: 200,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-01T11:00:00Z",
  },
  {
    id: "inv-007",
    listingId: "lst-007",
    totalWeightOz: 200,
    availableWeightOz: 185,
    reservedWeightOz: 0,
    allocatedWeightOz: 15,
    lockedWeightOz: 15,
    updatedAt: "2026-02-15T10:20:00Z",
  },
  {
    id: "inv-008",
    listingId: "lst-008",
    totalWeightOz: 50,
    availableWeightOz: 50,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-04T13:20:00Z",
  },
  {
    id: "inv-009",
    listingId: "lst-009",
    totalWeightOz: 400,
    availableWeightOz: 400,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-05T07:00:00Z",
  },
  {
    id: "inv-010",
    listingId: "lst-010",
    totalWeightOz: 100,
    availableWeightOz: 100,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-06T05:30:00Z",
  },
  {
    id: "inv-011",
    listingId: "lst-011",
    totalWeightOz: 500,
    availableWeightOz: 500,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-07T10:00:00Z",
  },
  {
    id: "inv-012",
    listingId: "lst-012",
    totalWeightOz: 50,
    availableWeightOz: 50,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-08T15:45:00Z",
  },
  {
    id: "inv-013",
    listingId: "lst-013",
    totalWeightOz: 400,
    availableWeightOz: 400,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-10T08:15:00Z",
  },
  {
    id: "inv-014",
    listingId: "lst-014",
    totalWeightOz: 50,
    availableWeightOz: 50,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-12T09:00:00Z",
  },
  {
    id: "inv-015",
    listingId: "lst-015",
    totalWeightOz: 250,
    availableWeightOz: 250,
    reservedWeightOz: 0,
    allocatedWeightOz: 0,
    lockedWeightOz: 0,
    updatedAt: "2026-02-14T11:30:00Z",
  },
];

/* res-001: ACTIVE reservation on lst-003 (10 oz)
   res-002: CONVERTED reservation on lst-007 (15 oz) → ord-001 */
export const mockReservations: Reservation[] = [
  {
    id: "res-001",
    listingId: "lst-003",
    buyerUserId: "user-1",
    weightOz: 10,
    pricePerOzLocked: 2035.75,
    createdAt: "2026-02-16T17:00:00Z",
    expiresAt: "2026-02-16T17:10:00Z",
    state: "ACTIVE",
  },
  {
    id: "res-002",
    listingId: "lst-007",
    buyerUserId: "user-1",
    weightOz: 15,
    pricePerOzLocked: 2038.0,
    createdAt: "2026-02-15T10:00:00Z",
    expiresAt: "2026-02-15T10:10:00Z",
    state: "CONVERTED",
  },
];

/* ord-001: pending_verification on lst-007, from res-002
   ord-002: completed on lst-001, historical reservation res-000 */
export const mockOrders: Order[] = [
  {
    id: "ord-001",
    listingId: "lst-007",
    reservationId: "res-002",
    buyerUserId: "user-1",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    weightOz: 15,
    pricePerOz: 2038.0,
    notional: 30570.0,
    status: "pending_verification",
    createdAt: "2026-02-15T10:05:00Z",
    policySnapshot: {
      triScore: 2,
      triBand: "green",
      ecrBefore: 6.0,
      ecrAfter: 6.001,
      hardstopBefore: 0.75,
      hardstopAfter: 0.7502,
      approvalTier: "auto",
      blockers: [],
      timestamp: "2026-02-15T10:05:00Z",
    },
  },
  {
    id: "ord-002",
    listingId: "lst-001",
    reservationId: "res-000",
    buyerUserId: "user-1",
    sellerUserId: "user-2",
    sellerOrgId: "org-002",
    weightOz: 25,
    pricePerOz: 2048.5,
    notional: 51212.5,
    status: "completed",
    createdAt: "2026-02-14T16:00:00Z",
    policySnapshot: {
      triScore: 2,
      triBand: "green",
      ecrBefore: 6.0,
      ecrAfter: 6.002,
      hardstopBefore: 0.75,
      hardstopAfter: 0.7506,
      approvalTier: "auto",
      blockers: [],
      timestamp: "2026-02-14T16:00:00Z",
    },
  },
];

/* ================================================================
   AUTH — Identity Perimeter Types + Fixtures
   ================================================================ */

/* ---------- Auth Types ---------- */
export type UserRole =
  | "INSTITUTION_TRADER"
  | "INSTITUTION_TREASURY"
  | "BROKER_DEALER_API"
  | "admin"
  | "compliance"
  | "vault_ops"
  // Legacy aliases — retained for backward compatibility during UI migration
  | "buyer"
  | "seller"
  | "treasury";
export type VerificationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "NEEDS_REVIEW"
  | "VERIFIED"
  | "REJECTED";
export type VerificationTrack = "INDIVIDUAL_KYC" | "BUSINESS_KYB";
export type VerificationStepStatus =
  | "LOCKED"
  | "PENDING"
  | "PROCESSING"
  | "SUBMITTED"
  | "PASSED"
  | "FAILED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Org {
  id: string;
  legalName: string;
  type: "individual" | "company";
  jurisdiction: string;
  createdAt: string;
}

export interface VerificationStep {
  id: string;
  title: string;
  status: VerificationStepStatus;
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  reasonCode?: string;
  notes?: string;
}

export interface VerificationCase {
  userId: string;
  track: VerificationTrack;
  status: VerificationStatus;
  riskTier: "LOW" | "ELEVATED" | "HIGH";
  createdAt: string;
  updatedAt: string;
  lastScreenedAt: string | null;
  nextRequiredStepId: string | null;
  steps: VerificationStep[];
  evidenceIds: string[];
  audit: {
    at: string;
    actor: string;
    action: string;
    detail: string;
  }[];
  /** Webhook IDs already processed — prevents duplicate processing. */
  processedWebhookIds: string[];
}

/* ---------- Auth Fixtures ---------- */

export const mockOrgs: Org[] = [
  {
    id: "org-001",
    legalName: "Aurelia Sovereign Fund",
    type: "company",
    jurisdiction: "Luxembourg",
    createdAt: "2024-01-15T09:00:00Z",
  },
  {
    id: "org-002",
    legalName: "Meridian Capital Partners",
    type: "company",
    jurisdiction: "United Kingdom",
    createdAt: "2024-03-20T10:00:00Z",
  },
  {
    id: "org-003",
    legalName: "Pacific Bullion Trust",
    type: "company",
    jurisdiction: "Singapore",
    createdAt: "2024-06-01T08:00:00Z",
  },
  {
    id: "org-004",
    legalName: "Reynolds Advisory",
    type: "individual",
    jurisdiction: "United States",
    createdAt: "2025-01-10T14:00:00Z",
  },
];

export const mockUsers: User[] = [
  {
    id: "user-1",
    email: "m.reynolds@aurelia.lu",
    name: "M. Reynolds",
    role: "INSTITUTION_TRADER",
    orgId: "org-001",
    verificationStatus: "VERIFIED",
    createdAt: "2024-01-15T09:00:00Z",
    lastLoginAt: "2026-02-16T08:00:00Z",
  },
  {
    id: "user-2",
    email: "a.clarke@meridian.co.uk",
    name: "A. Clarke",
    role: "INSTITUTION_TRADER",
    orgId: "org-002",
    verificationStatus: "IN_PROGRESS",
    createdAt: "2024-03-20T10:00:00Z",
    lastLoginAt: "2026-02-15T16:30:00Z",
  },
  {
    id: "user-3",
    email: "j.tanaka@pacbullion.sg",
    name: "J. Tanaka",
    role: "INSTITUTION_TRADER",
    orgId: "org-003",
    verificationStatus: "NEEDS_REVIEW",
    createdAt: "2024-06-01T08:00:00Z",
    lastLoginAt: "2026-02-14T11:00:00Z",
  },
  {
    id: "user-4",
    email: "admin@aurumshield.io",
    name: "A. Reynolds",
    role: "admin",
    orgId: "org-004",
    verificationStatus: "VERIFIED",
    createdAt: "2025-01-10T14:00:00Z",
    lastLoginAt: "2026-02-16T09:00:00Z",
  },
  {
    id: "user-9",
    email: "d.petrov@caspiantf.ae",
    name: "D. Petrov",
    role: "INSTITUTION_TRADER",
    orgId: "org-003",
    verificationStatus: "NOT_STARTED",
    createdAt: "2025-08-20T07:00:00Z",
    lastLoginAt: null,
  },
  {
    id: "user-5",
    email: "m.chen@aurumshield.io",
    name: "M. Chen",
    role: "INSTITUTION_TREASURY" as UserRole,
    orgId: "org-004",
    verificationStatus: "VERIFIED" as VerificationStatus,
    createdAt: "2025-03-15T09:00:00Z",
    lastLoginAt: "2026-02-16T08:30:00Z",
  },
  {
    id: "user-6",
    email: "s.nielsen@aurumshield.io",
    name: "S. Nielsen",
    role: "compliance" as UserRole,
    orgId: "org-004",
    verificationStatus: "VERIFIED" as VerificationStatus,
    createdAt: "2025-04-01T10:00:00Z",
    lastLoginAt: "2026-02-16T07:45:00Z",
  },
  {
    id: "user-7",
    email: "k.okafor@aurumshield.io",
    name: "K. Okafor",
    role: "vault_ops" as UserRole,
    orgId: "org-004",
    verificationStatus: "VERIFIED" as VerificationStatus,
    createdAt: "2025-05-10T11:00:00Z",
    lastLoginAt: "2026-02-16T09:15:00Z",
  },
];

/* ================================================================
   SETTLEMENT + ESCROW — Domain Models
   ================================================================ */

/* ---------- Settlement Types ---------- */
export type SettlementRail = "WIRE" | "RTGS";
export type EscrowAsset = "USD" | "XAU";

export type LedgerEntryType =
  | "ESCROW_OPENED"
  | "FUNDS_DEPOSITED"
  | "GOLD_ALLOCATED"
  | "VERIFICATION_PASSED"
  | "SETTLEMENT_AUTHORIZED"
  | "AUTHORIZATION"
  | "DVP_EXECUTED"
  | "FUNDS_RELEASED"
  | "GOLD_RELEASED"
  | "SETTLEMENT_FAILED"
  | "ESCROW_CLOSED"
  | "STATUS_CHANGED"
  | "FEE_CONFIGURED"
  | "PAYMENT_RECEIVED"
  | "ACTIVATION_COMPLETED"
  | "APPROVAL_UPDATED"
  | "JOURNAL_POSTED";

export interface LedgerEntrySnapshot {
  checksStatus: "PASS" | "WARN" | "BLOCK";
  fundsConfirmed: boolean;
  goldAllocated: boolean;
  verificationCleared: boolean;
  ecrAtAction: number;
  hardstopAtAction: number;
  blockers: string[];
  warnings: string[];
}

export interface LedgerEntry {
  id: string;
  settlementId: string;
  type: LedgerEntryType;
  timestamp: string;
  actor: "SYSTEM" | "BUYER" | "SELLER" | "OPS" | "COMPLIANCE";
  actorRole: UserRole;
  actorUserId: string;
  detail: string;
  evidenceIds?: string[];
  snapshot?: LedgerEntrySnapshot;
}

/* ---------- RSK-006: Immutable Double-Entry Clearing Ledger ---------- */

export type ClearingJournalDirection = "CREDIT" | "DEBIT";

/**
 * A single debit or credit line in a clearing journal.
 * Maps 1:1 to ledger_entries in 008_clearing_ledger.sql.
 * amount_cents is always positive; direction determines sign.
 */
export interface ClearingJournalEntry {
  id: string;
  journalId: string;
  accountCode: string;            // 'BUYER_ESCROW' | 'SELLER_PROCEEDS' | 'PLATFORM_FEE' etc.
  direction: ClearingJournalDirection;
  amountCents: number;            // strictly positive (BIGINT in DB)
  currency: string;               // 'USD'
  memo?: string;
}

/**
 * Immutable journal header — one per settlement clearing event.
 * Maps 1:1 to ledger_journals in 008_clearing_ledger.sql.
 * INVARIANT: SUM(DEBIT entries) === SUM(CREDIT entries)
 */
export interface ClearingJournal {
  id: string;
  settlementCaseId: string;
  idempotencyKey: string;         // UUID — unique per journal
  description: string;
  postedAt: string;
  createdBy: string;
  entries: ClearingJournalEntry[];
}

export type SettlementStatus =
  | "DRAFT"
  | "ESCROW_OPEN"
  | "AWAITING_FUNDS"
  | "AWAITING_GOLD"
  | "AWAITING_VERIFICATION"
  | "READY_TO_SETTLE"
  | "AUTHORIZED"
  | "PROCESSING_RAIL"    // RSK-007: Funds mid-flight, UI locked
  | "AMBIGUOUS_STATE"    // RSK-007: Timeout/partition, needs reconciliation
  | "SETTLED"
  | "REVERSED"           // RSK-007: Dispute or rollback initiated
  | "FAILED"
  | "CANCELLED";

/* ---------- Payment Receipt ---------- */
export interface PaymentReceipt {
  id: string;
  paidAtUtc: string;
  reference: string;
}

export interface SettlementCase {
  id: string;
  orderId: string;
  reservationId?: string | null;
  listingId: string;
  buyerUserId: string;
  sellerUserId: string;
  buyerOrgId: string;
  sellerOrgId: string;

  corridorId: string;
  hubId: string;       // settlement hub
  vaultHubId: string;  // custody hub

  rail: SettlementRail;
  weightOz: number;
  pricePerOzLocked: number;
  notionalUsd: number;

  status: SettlementStatus;
  openedAt: string;
  updatedAt: string;

  // deterministic "booleans" driven by rules + explicit ops actions
  fundsConfirmedFinal: boolean;
  goldAllocated: boolean;
  verificationCleared: boolean;

  // capital snapshot frozen at open
  capitalAtOpen: number;
  ecrAtOpen: number;
  hardstopUtilizationAtOpen: number;

  lastDecisionBy?: "SYSTEM" | "OPS" | "COMPLIANCE";
  lastDecisionAt?: string | null;

  /* ── Fee & Activation Gate (added for fee engine) ── */

  /** Notional in integer cents (notionalUsd * 100). */
  notionalCents: number;
  /** Settlement currency. */
  currency: string;
  /** Fee quote — recalculated dynamically until frozen on payment. */
  feeQuote?: import("./fees/fee-engine").FeeQuote;
  /** Selected add-ons for this settlement. */
  selectedAddOns: import("./fees/fee-engine").SelectedAddOn[];
  /** Payment lifecycle status. */
  paymentStatus: "unpaid" | "authorized" | "paid" | "failed" | "refunded";
  /** Payment method used. */
  paymentMethod?: "mock_card" | "wire_mock" | "invoice_mock";
  /** Payment receipt (populated after successful payment). */
  paymentReceipt?: PaymentReceipt;
  /** Activation lifecycle status — gates settlement actions. */
  activationStatus: "draft" | "awaiting_payment" | "activated";
  /** UTC timestamp of activation. */
  activatedAtUtc?: string;
  /** Whether any selected add-on requires manual approval. */
  requiresManualApproval: boolean;
  /** Manual approval status. */
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
  /**
   * RSK-006: Idempotency key for settlement clearing.
   * Maps to idempotency_key UUID UNIQUE NOT NULL in settlement_cases.
   */
  idempotencyKey?: string;
  /* ── RSK-007: Rail audit fields (009_state_machine_fix.sql) ── */
  /** Timestamp when funds were submitted to external rail */
  railSubmittedAt?: string;
  /** Timestamp when rail confirmed receipt/completion */
  railConfirmedAt?: string;
  /** External rail reference ID (Modern Treasury payment ID) */
  railReferenceId?: string;
  /** Reason for reversal (dispute details, compliance note) */
  reversalReason?: string;
  /** Timestamp of reversal */
  reversedAt?: string;
}

/* ---------- Settlement Fixtures ---------- */

/* Deterministic mapping:
   stl-001 → ord-002 (completed, lst-001) — SETTLED
     corridor cor-002 CH→UK, hub-001 London Clearing Centre, vault hub-002 Zurich Custody Vault
   stl-002 → ord-001 (pending_verification, lst-007) — AWAITING_VERIFICATION
     corridor cor-001 US→UK, hub-004 New York Trading Floor, vault hub-001 London Clearing Centre
   stl-003 → synthetic order "ord-003" — ESCROW_OPEN
     corridor cor-004 SG→HK, hub-003 Singapore Settlement Node, vault hub-003
*/

export const mockSettlements: SettlementCase[] = [
  {
    id: "stl-001",
    orderId: "ord-002",
    reservationId: "res-000",
    listingId: "lst-001",
    buyerUserId: "user-1",
    sellerUserId: "user-2",
    buyerOrgId: "org-001",
    sellerOrgId: "org-002",
    corridorId: "cor-002",
    hubId: "hub-001",
    vaultHubId: "hub-002",
    rail: "WIRE",
    weightOz: 25,
    pricePerOzLocked: 2048.5,
    notionalUsd: 51212.5,
    status: "SETTLED",
    openedAt: "2026-02-14T16:05:00Z",
    updatedAt: "2026-02-14T18:30:00Z",
    fundsConfirmedFinal: true,
    goldAllocated: true,
    verificationCleared: true,
    capitalAtOpen: 25_000_000,
    ecrAtOpen: 6.0,
    hardstopUtilizationAtOpen: 0.75,
    lastDecisionBy: "OPS",
    lastDecisionAt: "2026-02-14T18:30:00Z",
    // Fee & activation — paid + activated (frozen snapshot)
    notionalCents: 5_121_250,
    currency: "USD",
    feeQuote: {
      coreIndemnificationFeeCents: 5_000_000,
      addOnFeesCents: 0,
      vendorPassThroughCents: 0,
      totalDueCents: 5_000_000,
      declaredValueCents: 10_121_250,
      lineItems: [
        {
          code: "indemnification_fee",
          label: "Indemnification Fee (Fraud Protection)",
          type: "platform_fee",
          pricingModel: "percent",
          amountCents: 5_000_000,
          metadata: { percentBps: 100, minCents: 5_000_000, maxCents: 50_000_000 },
        },
      ],
      calculatedAtUtc: "2026-02-14T16:05:00Z",
      frozen: true,
    },
    selectedAddOns: [],
    paymentStatus: "paid",
    paymentMethod: "wire_mock",
    paymentReceipt: {
      id: "pay-001",
      paidAtUtc: "2026-02-14T16:10:00Z",
      reference: "AS-PAY-2026-000001",
    },
    activationStatus: "activated",
    activatedAtUtc: "2026-02-14T16:10:00Z",
    requiresManualApproval: false,
    approvalStatus: "not_required",
  },
  {
    id: "stl-002",
    orderId: "ord-001",
    reservationId: "res-002",
    listingId: "lst-007",
    buyerUserId: "user-1",
    sellerUserId: "user-2",
    buyerOrgId: "org-001",
    sellerOrgId: "org-002",
    corridorId: "cor-001",
    hubId: "hub-004",
    vaultHubId: "hub-001",
    rail: "RTGS",
    weightOz: 15,
    pricePerOzLocked: 2038.0,
    notionalUsd: 30570.0,
    status: "ESCROW_OPEN",
    openedAt: "2026-02-15T10:10:00Z",
    updatedAt: "2026-02-15T14:00:00Z",
    fundsConfirmedFinal: true,
    goldAllocated: true,
    verificationCleared: false,
    capitalAtOpen: 25_000_000,
    ecrAtOpen: 6.001,
    hardstopUtilizationAtOpen: 0.7502,
    lastDecisionBy: "OPS",
    lastDecisionAt: "2026-02-15T14:00:00Z",
    // Fee & activation — unpaid, awaiting payment
    notionalCents: 3_057_000,
    currency: "USD",
    selectedAddOns: [],
    paymentStatus: "unpaid",
    activationStatus: "awaiting_payment",
    requiresManualApproval: false,
    approvalStatus: "not_required",
  },
  {
    id: "stl-003",
    orderId: "ord-003",
    reservationId: null,
    listingId: "lst-004",
    buyerUserId: "user-3",
    sellerUserId: "user-2",
    buyerOrgId: "org-003",
    sellerOrgId: "org-002",
    corridorId: "cor-004",
    hubId: "hub-003",
    vaultHubId: "hub-003",
    rail: "WIRE",
    weightOz: 50,
    pricePerOzLocked: 2052.25,
    notionalUsd: 102612.5,
    status: "ESCROW_OPEN",
    openedAt: "2026-02-16T08:00:00Z",
    updatedAt: "2026-02-16T08:00:00Z",
    fundsConfirmedFinal: false,
    goldAllocated: false,
    verificationCleared: false,
    capitalAtOpen: 25_000_000,
    ecrAtOpen: 6.002,
    hardstopUtilizationAtOpen: 0.7506,
    lastDecisionBy: "SYSTEM",
    lastDecisionAt: "2026-02-16T08:00:00Z",
    // Fee & activation — draft, no payment yet
    notionalCents: 10_261_250,
    currency: "USD",
    selectedAddOns: [],
    paymentStatus: "unpaid",
    activationStatus: "draft",
    requiresManualApproval: false,
    approvalStatus: "not_required",
  },
];

export const mockLedger: LedgerEntry[] = [
  /* ── stl-001 (SETTLED) full lifecycle ── */
  { id: "le-001", settlementId: "stl-001", type: "ESCROW_OPENED", timestamp: "2026-02-14T16:05:00Z", actor: "OPS", actorRole: "admin", actorUserId: "user-4", detail: "Escrow opened for order ord-002 — 25 oz @ $2,048.50/oz" },
  { id: "le-002", settlementId: "stl-001", type: "FUNDS_DEPOSITED", timestamp: "2026-02-14T16:30:00Z", actor: "OPS", actorRole: "treasury", actorUserId: "user-5", detail: "Wire transfer $51,212.50 received — SWIFT ref WIR-2026-00190" },
  { id: "le-003", settlementId: "stl-001", type: "GOLD_ALLOCATED", timestamp: "2026-02-14T17:00:00Z", actor: "OPS", actorRole: "vault_ops", actorUserId: "user-7", detail: "25 oz allocated from inv-001 in Zurich Custody Vault (hub-002)" },
  { id: "le-004", settlementId: "stl-001", type: "VERIFICATION_PASSED", timestamp: "2026-02-14T17:15:00Z", actor: "COMPLIANCE", actorRole: "compliance", actorUserId: "user-6", detail: "Buyer verification case VERIFIED — identity perimeter cleared" },
  {
    id: "le-005", settlementId: "stl-001", type: "AUTHORIZATION", timestamp: "2026-02-14T17:30:00Z", actor: "OPS", actorRole: "admin", actorUserId: "user-4",
    detail: "AUTHORIZATION SNAPSHOT | settlementId=stl-001 orderId=ord-002 | notional=$51,212.50 weight=25oz rail=WIRE | corridorId=cor-002 settlementHubId=hub-001 vaultHubId=hub-002 | requirements=PASS | authorizedBy=user-4 role=admin authorizedAt=2026-02-14T17:30:00Z",
    snapshot: { checksStatus: "PASS", fundsConfirmed: true, goldAllocated: true, verificationCleared: true, ecrAtAction: 6.0, hardstopAtAction: 0.75, blockers: [], warnings: [] },
  },
  {
    id: "le-006", settlementId: "stl-001", type: "DVP_EXECUTED", timestamp: "2026-02-14T18:00:00Z", actor: "SYSTEM", actorRole: "admin", actorUserId: "user-4",
    detail: "DVP EXECUTED ATOMIC | fundsReleased=true goldReleased=true escrowClosed=true | fundsLeg: $51,212.50 released to seller org-002 via WIRE | goldLeg: 25oz title transferred to buyer org-001 | authorizationRef=le-005 | executedBy=user-4 role=admin executedAt=2026-02-14T18:00:00Z",
    snapshot: { checksStatus: "PASS", fundsConfirmed: true, goldAllocated: true, verificationCleared: true, ecrAtAction: 6.0, hardstopAtAction: 0.75, blockers: [], warnings: [] },
  },
  { id: "le-007", settlementId: "stl-001", type: "ESCROW_CLOSED", timestamp: "2026-02-14T18:30:00Z", actor: "OPS", actorRole: "admin", actorUserId: "user-4", detail: "Settlement completed — escrow closed" },

  /* ── stl-002 (ESCROW_OPEN — funds+gold confirmed, verification pending) ── */
  { id: "le-009", settlementId: "stl-002", type: "ESCROW_OPENED", timestamp: "2026-02-15T10:10:00Z", actor: "OPS", actorRole: "admin", actorUserId: "user-4", detail: "Escrow opened for order ord-001 — 15 oz @ $2,038.00/oz" },
  { id: "le-010", settlementId: "stl-002", type: "FUNDS_DEPOSITED", timestamp: "2026-02-15T11:00:00Z", actor: "OPS", actorRole: "treasury", actorUserId: "user-5", detail: "RTGS transfer $30,570.00 confirmed — ref RTGS-2026-00041" },
  { id: "le-011", settlementId: "stl-002", type: "GOLD_ALLOCATED", timestamp: "2026-02-15T14:00:00Z", actor: "OPS", actorRole: "vault_ops", actorUserId: "user-7", detail: "15 oz allocated from inv-007 in London Clearing Centre (hub-001)" },

  /* ── stl-003 (ESCROW_OPEN) ── */
  { id: "le-012", settlementId: "stl-003", type: "ESCROW_OPENED", timestamp: "2026-02-16T08:00:00Z", actor: "OPS", actorRole: "admin", actorUserId: "user-4", detail: "Escrow opened for order ord-003 — 50 oz @ $2,052.25/oz" },
];
