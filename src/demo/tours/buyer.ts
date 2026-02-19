/* ================================================================
   BUYER TOUR — Full Buy-Side Clearing Path (9 steps)

   1. Buyer Home – Transaction Console overview (manual)
   2. Browse Marketplace – click sidebar nav (click)
   3. Reserve Inventory – view reserve CTA (manual)
   4. Convert Reservation → Order – click convert CTA (click)
   5. Counterparty Verification – click verification-continue (click)
   6. Pay & Activate Clearing – click activation-pay-cta (click)
   7. Settlement Console – click settlement row (click)
   8. Clearing Certificate – click certificate-view (click)
   9. Audit Trail – navigate to audit (manual)

   Click-gated: 6/9 = 67%
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const buyerTour: TourDefinition = {
  id: "buyer",
  name: "Participant / Buyer",
  description:
    "Walk through the complete buy-side clearing workflow: marketplace browse, reservation, order conversion, counterparty verification, activation payment, settlement lifecycle, certificate issuance, and audit trail.",
  role: "buyer",
  startRoute: "/buyer?demo=true",
  previewPath: [
    "Transaction Console",
    "Browse Marketplace",
    "Reserve Inventory",
    "Convert to Order",
    "Counterparty Verification",
    "Pay & Activate",
    "Settlement Lifecycle",
    "Clearing Certificate",
    "Audit Trail",
  ],
  steps: [
    /* ── 1. Buyer Home ── */
    {
      id: "buyer-home",
      title: "Transaction Console",
      body: "The buyer console provides a unified view of your clearing operations: active transactions anchored to settlement stl-002, counterparty verification status, indemnification coverage, and portfolio summary.",
      route: "/buyer?demo=true",
      target: '[data-tour="buyer-active-transaction"]',
      placement: "bottom",
      next: { type: "manual" },
    },

    /* ── 2. Browse Marketplace (click sidebar) ── */
    {
      id: "buyer-marketplace-nav",
      title: "Browse Marketplace",
      body: "Click the Marketplace link to browse verified gold inventory. Every listing has passed a three-part evidence gate: assay report, chain of custody, and seller attestation.",
      target: '[data-tour="sidebar-marketplace"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-marketplace"]' },
    },

    /* ── 3. Reserve Inventory (manual — user reads the listing) ── */
    {
      id: "buyer-marketplace-reserve",
      title: "Reserve Eligible Inventory",
      body: "Listed inventory is vault-verified and capital-gated. The Reserve button locks a deterministic inventory position and creates bilateral exposure in the risk management system.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Unverified or under-documented inventory entering the marketplace.",
        },
        {
          label: "Control Mechanism",
          text: "Publish gate validates seller verification, evidence completeness, and capital control constraints before listing becomes visible.",
        },
        {
          label: "Why It Matters",
          text: "Inventory integrity is a precondition for settlement finality.",
        },
      ],
      route: "/marketplace?demo=true",
      target: '[data-tour="marketplace-reserve-cta"]',
      placement: "left",
      next: { type: "manual" },
    },

    /* ── 4. Convert Reservation → Order (click) ── */
    {
      id: "buyer-convert-order",
      title: "Convert Reservation to Order",
      body: "Navigate to Reservations and click 'Convert to Order' to freeze the marketplace policy snapshot and create a binding commercial commitment. This transition locks the TRI score, ECR impact, and capital adequacy state.",
      route: "/reservations?demo=true",
      target: '[data-tour="reservation-convert-cta"]',
      placement: "bottom",
      next: { type: "click", target: '[data-tour="reservation-convert-cta"]' },
    },

    /* ── 5. Counterparty Verification — click CTA ── */
    {
      id: "buyer-verification",
      title: "Counterparty Verification",
      body: "Both buyer and seller organizations pass a dual verification screen: registry match, UBO confirmation, sanctions/PEP screening, and jurisdiction-specific compliance. Click 'Open Verification Report' to review the full assessment.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Counterparty exposure to unverified or sanctioned entities.",
        },
        {
          label: "Control Mechanism",
          text: "Dual-sided KYC/KYB verification gate with sequential compliance checks.",
        },
        {
          label: "Why It Matters",
          text: "No bilateral exposure is created without passing the identity perimeter.",
        },
      ],
      route: "/buyer?demo=true",
      target: '[data-tour="verification-continue"]',
      placement: "top",
      next: { type: "click", target: '[data-tour="verification-continue"]' },
    },

    /* ── 6. Pay & Activate Clearing (click) ── */
    {
      id: "buyer-activate",
      title: "Pay & Activate Clearing",
      body: "Click 'Activate Clearing' to configure fee add-ons, review the invoice breakdown, and submit payment. Activation unlocks the settlement state machine and allows counterparties to execute clearing actions.",
      route: "/buyer?demo=true",
      target: '[data-tour="activation-pay-cta"]',
      placement: "top",
      next: { type: "click", target: '[data-tour="activation-pay-cta"]' },
    },

    /* ── 7. Settlement Console — click demo row ── */
    {
      id: "buyer-settlement-row",
      title: "Settlement Lifecycle",
      body: "The settlement console shows all clearing operations. Click the highlighted settlement to open its detail page and inspect the complete lifecycle, including the immutable escrow ledger and settlement rails visualization.",
      route: "/settlements?demo=true",
      target: '[data-tour="settlement-row-demo"]',
      placement: "bottom",
      next: { type: "click", target: '[data-tour="settlement-row-demo"]' },
    },

    /* ── 8. Clearing Certificate — click view ── */
    {
      id: "buyer-certificate",
      title: "Clearing Certificate",
      body: "Upon atomic DvP execution, the system issues a clearing certificate containing deterministic identifiers, a canonical signature hash (SHA-256), UTC timestamp, and fee structure. Click 'View Certificate' to inspect the authoritative proof of settlement finality.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Post-settlement reconciliation disputes and lack of authoritative finality proof.",
        },
        {
          label: "Control Mechanism",
          text: "Cryptographically verifiable clearing certificate with deterministic number, canonical payload serialization, and SHA-256 signature hash.",
        },
        {
          label: "Why It Matters",
          text: "The certificate is the authoritative proof of settlement finality for bilateral reconciliation, regulatory reporting, and custody transfer documentation.",
        },
      ],
      route: "/settlements/stl-001?demo=true",
      target: '[data-tour="certificate-view"]',
      placement: "top",
      next: { type: "click", target: '[data-tour="certificate-view"]' },
    },

    /* ── 9. Audit Trail (manual) ── */
    {
      id: "buyer-audit",
      title: "Audit Trail",
      body: "The Governance Command Center provides an immutable record of every settlement action, capital event, and governance decision. Filter by severity, resource type, or time range. This is the authoritative evidence package for bilateral reconciliation and regulatory reporting.",
      route: "/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
