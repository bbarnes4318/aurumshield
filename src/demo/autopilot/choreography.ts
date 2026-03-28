/* ================================================================
   CHOREOGRAPHY — Exhaustive 6-Phase Demo Sequence
   
   Each step specifies:
   - Route to navigate to
   - Ordered DOM actions (executed sequentially)
   - Vapi TTS script (spoken AFTER all DOM actions complete)
   
   Total: ~14 steps across 6 phases.
   ================================================================ */

import { AutopilotPhase, type AutopilotStep } from "./autopilotTypes";

/* ================================================================
   PHASE 1: THE PERIMETER
   Route: /perimeter/register
   ================================================================ */

const perimeter_auth: AutopilotStep = {
  id: "perimeter-auth",
  phase: AutopilotPhase.PERIMETER,
  route: "/perimeter/register",
  label: "Biometric Authentication",
  navigationDelayMs: 1200,
  domActions: [
    {
      type: "scroll_to",
      selector: '[data-tour="perimeter-email"]',
    },
    {
      type: "type_text",
      selector: '[data-tour="perimeter-email"] input',
      text: "demo@aureuscapital.com",
      charDelayMs: 45,
    },
    {
      type: "wait",
      durationMs: 500,
    },
    {
      type: "highlight",
      selector: '[data-tour="perimeter-auth"]',
      durationMs: 2500,
    },
    {
      type: "flash_badge",
      selector: '[data-tour="perimeter-webauthn"]',
      fromText: "⬤ AWAITING BIOMETRIC",
      toText: "✓ WEBAUTHN SIGNATURE VERIFIED",
      colorClass: "bg-emerald-500/20 text-emerald-400",
    },
  ],
  vapiScript:
    "AurumShield copilot online. We begin at the perimeter. Notice the absence of passwords. Authentication is strictly biometric and hardware-bound. Phishing vectors are deterministically eliminated before a user even enters the platform.",
};

const perimeter_kyb: AutopilotStep = {
  id: "perimeter-kyb",
  phase: AutopilotPhase.PERIMETER,
  route: "/onboarding",
  label: "Entity Resolution & KYB",
  navigationDelayMs: 1200,
  domActions: [
    {
      type: "scroll_to",
      selector: '[data-tour="onboarding-lei"]',
    },
    {
      type: "type_text",
      selector: '[data-tour="onboarding-lei"] input',
      text: "529900T8BM49AURSDO55",
      charDelayMs: 40,
    },
    {
      type: "wait",
      durationMs: 800,
    },
    {
      type: "flash_badge",
      selector: '[data-tour="onboarding-status"]',
      fromText: "⬤ VERIFYING ENTITY",
      toText: "✓ VERIFF KYB: CLEAR → OPENSANCTIONS: CLEAR",
      colorClass: "bg-emerald-500/20 text-emerald-400",
    },
  ],
  vapiScript:
    "Entity resolution is fully automated. The system queries the Global LEI index and executes a zero-touch OFAC and Sanctions screen in milliseconds. Manual data entry is blocked. The entity is cleared.",
};

/* ================================================================
   PHASE 2: ORIGINATION
   Route: /producer/inventory/new
   ================================================================ */

const origination_intake: AutopilotStep = {
  id: "origination-intake",
  phase: AutopilotPhase.ORIGINATION,
  route: "/producer/inventory/new",
  label: "Fire Assay Intake",
  navigationDelayMs: 1000,
  domActions: [
    {
      type: "flash_badge",
      selector: '[data-tour="producer-upload"]',
      fromText: "Drop assay PDF here",
      toText: "⬤ ASSAY-PERU-2026-0314.pdf — PROCESSING",
      colorClass: "bg-amber-500/20 text-amber-400",
    },
    {
      type: "wait",
      durationMs: 600,
    },
    {
      type: "type_terminal",
      selector: '[data-tour="producer-textract"]',
      lines: [
        "AWS Textract — Document Analysis",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "Ultrasonic Thickness:  4.12 mm",
        "Conductivity σ:       28.4 MS/m",
        "Serial No:            DORE-PE-2026-0847",
        "Declared Weight:      2,847.30 oz",
        "Declared Fineness:    0.8715",
        "Cross-Check:          PASS (Δ < 0.1 tolerance)",
      ],
      lineDelayMs: 180,
    },
  ],
  vapiScript:
    "Shifting context to the origination portal. A Peruvian mining operator has uploaded a fire assay for raw doré. Our computer vision engine extracts the exact ultrasonic thickness and conductivity.",
};

const origination_webhook: AutopilotStep = {
  id: "origination-webhook",
  phase: AutopilotPhase.ORIGINATION,
  route: "/producer/orders",
  label: "Refinery Webhook Confirmation",
  navigationDelayMs: 1000,
  domActions: [
    {
      type: "scroll_to",
      selector: '[data-tour="producer-status"]',
    },
    {
      type: "flash_badge",
      selector: '[data-tour="producer-status"]',
      fromText: "⬤ REFINERY INTAKE",
      toText: "⬤ PROCESSING",
      colorClass: "bg-amber-500/20 text-amber-400",
    },
    {
      type: "wait",
      durationMs: 1000,
    },
    {
      type: "simulate_webhook",
      stateKey: "refineryConfirmed",
      stateValue: true,
    },
    {
      type: "flash_badge",
      selector: '[data-tour="producer-yield"]',
      fromText: "2,847.30 oz @ 0.8715",
      toText: "VERIFIED: 2,481.44 oz refined @ ≥995.0",
      colorClass: "bg-emerald-500/20 text-emerald-400",
    },
  ],
  vapiScript:
    "We do not trust the miner's declared weight. We cap severity by strictly waiting for a cryptographic webhook from an LBMA-accredited refinery to mathematically verify the exact yield. Fraud at the source is neutralized.",
};

/* ================================================================
   PHASE 3: THE MARKETPLACE
   Route: /institutional/marketplace
   ================================================================ */

const marketplace_browse: AutopilotStep = {
  id: "marketplace-browse",
  phase: AutopilotPhase.MARKETPLACE,
  route: "/institutional/marketplace",
  label: "Institutional Execution Terminal",
  navigationDelayMs: 1200,
  domActions: [
    {
      type: "scroll_to",
      selector: '[data-tour="offtaker-ticker"]',
    },
    {
      type: "highlight",
      selector: '[data-tour="offtaker-ticker"]',
      durationMs: 1500,
    },
    {
      type: "wait",
      durationMs: 500,
    },
    {
      type: "scroll_to",
      selector: '[data-tour="offtaker-apex"]',
    },
    {
      type: "highlight",
      selector: '[data-tour="offtaker-apex"]',
      durationMs: 3000,
    },
  ],
  vapiScript:
    "The doré has been refined and verified. We are now in the institutional buyer's execution terminal. The asset surfaces as a tradeable 400-ounce LBMA Good Delivery bar. Primary-market pricing, secondary-market security.",
};

/* ================================================================
   PHASE 4: THE ATOMIC SWAP
   Route: /institutional/marketplace (inline execution)
   ================================================================ */

const atomic_rail_select: AutopilotStep = {
  id: "atomic-rail-select",
  phase: AutopilotPhase.ATOMIC_SWAP,
  route: "/institutional/marketplace",
  label: "MPC Wallet Provisioning",
  navigationDelayMs: 1200,
  domActions: [
    {
      type: "scroll_to",
      selector: '[data-tour="checkout-rail"]',
    },
    {
      type: "highlight",
      selector: '[data-tour="checkout-rail"]',
      durationMs: 2000,
    },
    {
      type: "wait",
      durationMs: 500,
    },
    {
      type: "set_state",
      stateKey: "mpcWalletProvisioned",
      stateValue: true,
    },
    {
      type: "type_terminal",
      selector: '[data-tour="checkout-terminal"]',
      lines: [
        "Turnkey MPC — Wallet Provisioning",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "Sub-Org:    AurumShield Settlement STLMT-20260314-A",
        "Wallet:     settlement-STLMT-20260314-A",
        "Chain:      Ethereum (ERC-20)",
        "Address:    0x7a3b9c8f...d4e2f1a6",
        "",
        "⬤ AWAITING DEPOSIT — Polling every 5 seconds...",
      ],
      lineDelayMs: 150,
    },
  ],
  vapiScript:
    "The buyer selects stablecoin routing. Turnkey infrastructure instantly provisions a segregated MPC wallet inside an Intel SGX enclave. It is mathematically impossible to extract the private key. Title transfer is hard-locked. The system polls the Ethereum network.",
};

const atomic_confirm: AutopilotStep = {
  id: "atomic-confirm",
  phase: AutopilotPhase.ATOMIC_SWAP,
  route: "/institutional/marketplace",
  label: "Settlement Finality",
  navigationDelayMs: 500,
  domActions: [
    {
      type: "wait",
      durationMs: 2000,
    },
    {
      type: "simulate_webhook",
      stateKey: "usdtConfirmed",
      stateValue: true,
    },
    {
      type: "flash_badge",
      selector: '[data-tour="checkout-deposit"]',
      fromText: "⬤ POLLING BLOCKCHAIN",
      toText: "✓ $4,244,240.00 USDT SECURED",
      colorClass: "bg-emerald-500/20 text-emerald-400",
    },
    {
      type: "set_state",
      stateKey: "settlementState",
      stateValue: "TITLE_TRANSFER_INITIATED",
    },
  ],
  vapiScript:
    "Inbound deposit confirmed. The UI flashes emerald. Capital is secured, and the cryptographic title is atomically minted to the buyer's registry. Settlement finality is achieved.",
};

/* ================================================================
   PHASE 5: ARMORED TELEMETRY
   Route: /institutional/orders/[orderId]/logistics
   ================================================================ */

const logistics_radar: AutopilotStep = {
  id: "logistics-radar",
  phase: AutopilotPhase.LOGISTICS,
  route: "/institutional/orders/demo-order-001/logistics",
  label: "Sovereign Carrier Routing",
  navigationDelayMs: 1500,
  domActions: [
    {
      type: "set_state",
      stateKey: "logisticsRadarActive",
      stateValue: true,
    },
    {
      type: "scroll_to",
      selector: '[data-tour="logistics-map"]',
    },
    {
      type: "wait",
      durationMs: 1000,
    },
    {
      type: "type_terminal",
      selector: '[data-tour="logistics-checkpoints"]',
      lines: [
        "ARMORED LOGISTICS RADAR",
        "═══════════════════════════════════════════",
        "⬤ Malca-Amit Convoy MA-2026-0314",
        "Origin:      Valcambi SA, Balerna, CH",
        "Destination: Malca-Amit Zurich FTZ (MACH-ZRH)",
        "Carrier:     MALCA-AMIT (notional > $500,000)",
        "",
        "14:30 UTC  VAULT_EXTRACTION    Valcambi Bay 4",
        "14:47 UTC  ARMORED_TRANSIT     Convoy departed",
        "15:22 UTC  FTZ_INTAKE_PENDING  ETA 16:00 UTC",
      ],
      lineDelayMs: 200,
    },
    {
      type: "flash_badge",
      selector: '[data-tour="logistics-insurance"]',
      fromText: "INSURANCE: PENDING",
      toText: "LLOYD'S SYNDICATE 2623 — BOUND",
      colorClass: "bg-emerald-500/20 text-emerald-400",
    },
  ],
  vapiScript:
    "Capital is cleared; physical delivery initializes. Routing is algorithmic. Because the order exceeds the half-million threshold, the system deterministically selects Malca-Amit. Lloyd's of London indemnification is instantly bound. Physical correlation risk is fully modeled.",
};

/* ================================================================
   PHASE 6: TREASURY FINALITY
   Route: /institutional/settlement
   ================================================================ */

const treasury_sweep: AutopilotStep = {
  id: "treasury-sweep",
  phase: AutopilotPhase.TREASURY,
  route: "/institutional/settlement",
  label: "Ledger Sweep & Fee Extraction",
  navigationDelayMs: 1000,
  domActions: [
    {
      type: "scroll_to",
      selector: '[data-tour="treasury-sweep"]',
    },
    {
      type: "highlight",
      selector: '[data-tour="treasury-sweep"]',
      durationMs: 2500,
    },
    {
      type: "flash_badge",
      selector: '[data-tour="treasury-fee"]',
      fromText: "FEE SWEEP: PENDING",
      toText: "FEE EXTRACTED: $42,442.40 (1.0%)",
      colorClass: "bg-emerald-500/20 text-emerald-400",
    },
  ],
  vapiScript:
    "We conclude in the Treasury clearing journal. The platform deterministically extracts its one-percent execution fee. Zero manual accounting. Zero human error.",
};

const treasury_audit: AutopilotStep = {
  id: "treasury-audit",
  phase: AutopilotPhase.TREASURY,
  route: "/institutional/settlement",
  label: "Immutable Audit Trail",
  navigationDelayMs: 500,
  domActions: [
    {
      type: "scroll_to",
      selector: '[data-tour="treasury-audit"]',
    },
    {
      type: "type_terminal",
      selector: '[data-tour="treasury-audit"]',
      lines: [
        "AUDIT HASH CHAIN",
        "═══════════════════════════════════════════",
        "Event:    STATE_TRANSITION",
        "From:     FUNDS_SECURED",
        "To:       CLEARING",
        "Actor:    SYSTEM (automated)",
        "UTC:      2026-03-14T21:54:10Z",
        "",
        "Hash:     sha256:a8f3c9d1e2b4f7a6",
        "          3c5d8e9f0a1b2c3d",
        "          4e5f6a7b8c9d0e1f",
        "          2a3b4c5d6e7f8a9b",
        "",
        "Idempotency: STLMT-20260314-A:CLEARING:001",
        "Chain:       APPEND-ONLY · IMMUTABLE",
      ],
      lineDelayMs: 120,
    },
  ],
  vapiScript:
    "Finally, the audit trail. Every state transition — from the biometric signature to the Malca-Amit handoff — is permanently anchored to an immutable, append-only hash chain. Institutional buyers are completely insulated from physical supply chain risk. End of demonstration.",
};

/* ================================================================
   COMPLETE CHOREOGRAPHY — Ordered array of all steps
   ================================================================ */

export const CHOREOGRAPHY: AutopilotStep[] = [
  // Phase 1: Perimeter
  perimeter_auth,
  perimeter_kyb,
  // Phase 2: Origination
  origination_intake,
  origination_webhook,
  // Phase 3: Marketplace
  marketplace_browse,
  // Phase 4: Atomic Swap
  atomic_rail_select,
  atomic_confirm,
  // Phase 5: Logistics
  logistics_radar,
  // Phase 6: Treasury
  treasury_sweep,
  treasury_audit,
];

/** Total number of steps in the choreography */
export const TOTAL_STEPS = CHOREOGRAPHY.length;

/** Get all steps for a specific phase */
export function getStepsForPhase(phase: AutopilotPhase): AutopilotStep[] {
  return CHOREOGRAPHY.filter((s) => s.phase === phase);
}

/** Get the phase for a given step index */
export function getPhaseForStep(stepIndex: number): AutopilotPhase | null {
  const step = CHOREOGRAPHY[stepIndex];
  return step?.phase ?? null;
}
