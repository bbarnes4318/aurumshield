/* ================================================================
   CINEMATIC TOUR — 3-Act, 11-Step Narrative-Driven Demo
   
   Act 1: The Sovereign Offtaker (Steps 1–7)
     1. The Gate (Org Select)
     2a. Identity Scan (KYB - launch verification)
     2b. Terminal Checks (KYB - watch automated checks)
     2c. Enter Marketplace (KYB - proceed)
     3. The Marketplace
     4. Delivery Versus Payment
     5. Transit Radar
   Act 2: The Institutional Producer (Steps 6–7)
     6. The Pivot (Accreditation)
     7. The Assay Gauntlet
   Act 3: Absolute Truth (Steps 8–9)
     8. Central Command (Dashboard)
     9. The Immutable Audit
   
   Fix 5: Expanded KYB choreography with identity scan,
   terminal checks, and enter marketplace sub-steps.
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const cinematicTour: TourDefinition = {
  id: "cinematic",
  name: "Cinematic Demo — The Sovereign Allocation",
  description:
    "A tightly controlled, narrative-driven experience across the Offtaker Portal, Producer Portal, and Global Dashboard. Eleven steps. Three acts. Zero dead ends.",
  role: "offtaker",
  startRoute: "/institutional/get-started/welcome?demo=true",
  cinematic: true,
  previewPath: [
    "The Gate",
    "Identity Scan",
    "Terminal Checks",
    "Enter Marketplace",
    "Marketplace",
    "DVP Escrow",
    "Transit Radar",
    "Producer Pivot",
    "Assay Gauntlet",
    "Global Dashboard",
    "Immutable Audit",
  ],
  steps: [
    /* ══════════════════════════════════════════════════════════
       ACT 1: THE SOVEREIGN OFFTAKER — The Buyer Journey
       ══════════════════════════════════════════════════════════ */

    /* ── Step 1: The Gate ── */
    {
      id: "cinematic-gate",
      title: "The Gate",
      body: "You are the Chief Investment Officer for a sovereign wealth fund. We are executing a fifty-million-dollar physical gold allocation.",
      actLabel: "ACT I — THE SOVEREIGN OFFTAKER",
      route: "/institutional/get-started/welcome?demo=true",
      target: '[data-tour="cinematic-org-register"]',
      placement: "right",
      next: {
        type: "click",
        target: '[data-tour="cinematic-org-register"]',
      },
      vapiScript:
        "Welcome to AurumShield. You are acting as the Chief Investment Officer for a sovereign wealth fund. We are executing a fifty-million-dollar physical gold allocation. Click 'Establish Corporate Custody' to initiate the cryptographic handshake.",
      tooltipText:
        "Welcome to AurumShield. You are acting as the Chief Investment Officer for a sovereign wealth fund. We are executing a fifty-million-dollar physical gold allocation. Click 'Establish Corporate Custody' to initiate the cryptographic handshake.",
    },

    /* ── Step 2a: Identity Scan (Fix 5) ── */
    {
      id: "cinematic-kyb-scan",
      title: "Identity Verification",
      body: "Before entering the marketplace, your corporate identity must be cryptographically verified. Launch the secure identity scan to begin the KYB flow.",
      actLabel: "ACT I — THE SOVEREIGN OFFTAKER",
      route: "/institutional/get-started/verification?demo=true",
      target: '[data-tour="cinematic-kyb-launch-scan"]',
      placement: "right",
      delayMs: 2000,
      next: {
        type: "click",
        target: '[data-tour="cinematic-kyb-launch-scan"]',
      },
      vapiScript:
        "Your corporate identity must be cryptographically verified before entering the marketplace. Click 'Launch Secure Identity Scan' to initiate the deterministic KYB verification.",
      tooltipText:
        "Your corporate identity must be cryptographically verified before entering the marketplace. Click 'Launch Secure Identity Scan' to initiate the deterministic KYB verification.",
    },

    /* ── Step 2b: Terminal Checks (Fix 5) ── */
    {
      id: "cinematic-kyb-checks",
      title: "Automated Verification",
      body: "Watch the terminal execute automated compliance checks. UBO verification, sanctions screening, and source-of-funds analysis running in real-time.",
      actLabel: "ACT I — THE SOVEREIGN OFFTAKER",
      route: "/institutional/get-started/verification?demo=true",
      target: '[data-tour="cinematic-kyb-terminal"]',
      placement: "right",
      delayMs: 1500,
      next: {
        type: "element",
        target: '[data-tour="cinematic-kyb-checks-complete"]',
      },
      vapiScript:
        "Notice the complete elimination of manual brokerage. Your corporate identity, UBOs, and Source of Funds are verified deterministically against global watchlists. Watch the checks execute in real-time.",
      tooltipText:
        "Notice the complete elimination of manual brokerage. Your corporate identity, UBOs, and Source of Funds are verified deterministically against global watchlists. Watch the checks execute in real-time.",
    },

    /* ── Step 2c: Enter Marketplace (Fix 5) ── */
    {
      id: "cinematic-kyb-enter",
      title: "Verification Complete",
      body: "All checks have passed. Your entity is cleared. Enter the institutional marketplace.",
      actLabel: "ACT I — THE SOVEREIGN OFFTAKER",
      route: "/institutional/get-started/verification?demo=true",
      target: '[data-tour="cinematic-kyb-enter"]',
      placement: "right",
      next: {
        type: "click",
        target: '[data-tour="cinematic-kyb-enter"]',
      },
      vapiScript:
        "All verification checks have passed. Your entity is cleared for institutional marketplace access. Click 'Enter Marketplace' to proceed.",
      tooltipText:
        "All verification checks have passed. Your entity is cleared for institutional marketplace access. Click 'Enter Marketplace' to proceed.",
    },

    /* ── Step 3: The Marketplace ── */
    {
      id: "cinematic-marketplace",
      title: "The Marketplace",
      body: "This is the institutional liquidity nexus. No retail premiums. No paper derivatives. LBMA-approved four-hundred-ounce bars.",
      actLabel: "ACT I — THE SOVEREIGN OFFTAKER",
      route: "/institutional/marketplace?demo=true",
      target: '[data-tour="cinematic-lbma-400oz"]',
      placement: "left",
      next: {
        type: "click",
        target: '[data-tour="cinematic-lbma-400oz"]',
      },
      vapiScript:
        "This is the institutional liquidity nexus. No retail premiums. No paper derivatives. We are securing LBMA-approved four-hundred-ounce bars. Select the institutional tranche.",
      tooltipText:
        "This is the institutional liquidity nexus. No retail premiums. No paper derivatives. We are securing LBMA-approved four-hundred-ounce bars. Select the institutional tranche.",
    },

    /* ── Step 4: Delivery & Checkout ── */
    {
      id: "cinematic-dvp",
      title: "Delivery Versus Payment",
      body: "Your capital is locked in a secure atomic swap. It will not clear to the supplier until the physical asset's serial numbers are mathematically verified in the vault.",
      actLabel: "ACT I — THE SOVEREIGN OFFTAKER",
      route: "/institutional/first-trade/asset?demo=true",
      target: '[data-tour="cinematic-dvp-confirm"]',
      placement: "left",
      next: {
        type: "click",
        target: '[data-tour="cinematic-dvp-confirm"]',
      },
      vapiScript:
        "Delivery versus Payment. Your capital is locked in a secure atomic swap. It will not clear to the supplier until the physical asset's serial numbers are mathematically verified in the vault. Confirm the execution.",
      tooltipText:
        "Delivery versus Payment. Your capital is locked in a secure atomic swap. It will not clear to the supplier until the physical asset's serial numbers are mathematically verified in the vault. Confirm the execution.",
    },

    /* ── Step 5: Transit Radar ── */
    {
      id: "cinematic-transit",
      title: "Transit Radar",
      body: "Capital deployed. The asset is in armored transit via Brink's global logistics. Wrapped in a Lloyd's of London Specie Insurance policy.",
      actLabel: "ACT I — THE SOVEREIGN OFFTAKER",
      route: "/institutional/orders/demo-order-001/logistics?demo=true",
      target: '[data-tour="cinematic-transit-map"]',
      placement: "left",
      next: { type: "manual" },
      vapiScript:
        "Capital deployed. The asset is currently in armored transit via Brink's global logistics. Wrapped in a massive Lloyd's of London Specie Insurance policy. Zero counterparty risk. Absolute title.",
      tooltipText:
        "Capital deployed. The asset is currently in armored transit via Brink's global logistics. Wrapped in a massive Lloyd's of London Specie Insurance policy. Zero counterparty risk. Absolute title.",
    },

    /* ══════════════════════════════════════════════════════════
       ACT 2: THE INSTITUTIONAL PRODUCER — The Supplier Journey
       ══════════════════════════════════════════════════════════ */

    /* ── Step 6: The Pivot ── */
    {
      id: "cinematic-producer-pivot",
      title: "The Pivot",
      body: "Switching command to the Producer Portal. We are now a tier-one mining operation submitting cryptographic proof of ethical extraction.",
      actLabel: "ACT II — THE INSTITUTIONAL PRODUCER",
      route: "/producer/accreditation?demo=true",
      target: '[data-tour="cinematic-mine-provenance"]',
      placement: "right",
      next: {
        type: "click",
        target: '[data-tour="cinematic-mine-provenance"]',
      },
      vapiScript:
        "Switching command to the Producer Portal. We are now a tier-one mining operation. To supply AurumShield, you must submit unassailable cryptographic proof of ethical extraction. Submit your provenance data.",
      tooltipText:
        "Switching command to the Producer Portal. We are now a tier-one mining operation. To supply AurumShield, you must submit unassailable cryptographic proof of ethical extraction. Submit your provenance data.",
    },

    /* ── Step 7: Minting & Assay ── */
    {
      id: "cinematic-assay",
      title: "The Assay Gauntlet",
      body: "Before your Doré bars hit the ledger, they must survive the Assay Gauntlet. Ultrasonic and electrical conductivity scanners eradicate the threat of tungsten adulteration.",
      actLabel: "ACT II — THE INSTITUTIONAL PRODUCER",
      route: "/producer/inventory/new?demo=true",
      target: '[data-tour="cinematic-assay-gauntlet"]',
      placement: "left",
      next: { type: "manual" },
      vapiScript:
        "Before your Doré bars hit the ledger, they must survive the Assay Gauntlet. Ultrasonic and electrical conductivity scanners eradicate the threat of tungsten adulteration. The asset is pure.",
      tooltipText:
        "Before your Doré bars hit the ledger, they must survive the Assay Gauntlet. Ultrasonic and electrical conductivity scanners eradicate the threat of tungsten adulteration. The asset is pure.",
    },

    /* ══════════════════════════════════════════════════════════
       ACT 3: ABSOLUTE TRUTH — The Dashboard & Ledger
       ══════════════════════════════════════════════════════════ */

    /* ── Step 8: The Global Dashboard ── */
    {
      id: "cinematic-dashboard",
      title: "Central Command",
      body: "Real-time telemetry of every ounce, every dollar, and every transit route across the globe.",
      actLabel: "ACT III — ABSOLUTE TRUTH",
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "left",
      next: { type: "manual" },
      vapiScript:
        "Welcome to the central command. Real-time telemetry of every ounce, every dollar, and every transit route across the globe.",
      tooltipText:
        "Welcome to the central command. Real-time telemetry of every ounce, every dollar, and every transit route across the globe.",
    },

    /* ── Step 9: The Immutable Audit ── */
    {
      id: "cinematic-audit",
      title: "The Immutable Audit",
      body: "Trust is a liability. AurumShield relies on cryptographic verification and independent third-party auditing.",
      actLabel: "ACT III — ABSOLUTE TRUTH",
      route: "/audit/ledger?demo=true",
      target: '[data-tour="cinematic-receipt-row"]',
      placement: "left",
      next: { type: "manual" },
      vapiScript:
        "Trust is a liability. AurumShield relies on cryptographic verification and independent third-party auditing. Every serial number, every ounce, mathematically proven and bankruptcy-remote.",
      tooltipText:
        "Trust is a liability. AurumShield relies on cryptographic verification and independent third-party auditing. Every serial number, every ounce, mathematically proven and bankruptcy-remote.",
    },
  ],
};
