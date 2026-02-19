/* ================================================================
   SELLER TOUR — Sell-Side Clearing Workflow (8 steps)

   1. Seller Console — listing overview (manual)
   2. Publish Listing — click listing-publish-btn (click)
   3. Navigate Marketplace — click sidebar (click)
   4. Accept Reservation — click accept-reservation CTA (click)
   5. Open Settlement — click settlement row (click)
   6. Settlement Detail & Ledger (manual)
   7. Clearing Certificate — click certificate-view (click)
   8. Audit Trail (manual)

   Click-gated: 5/8 = 62.5%
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const sellerTour: TourDefinition = {
  id: "seller",
  name: "Participant / Seller",
  description:
    "Walk through the sell-side clearing workflow: listing management, publish gate verification, reservation acceptance, marketplace visibility, settlement lifecycle participation, and certificate issuance.",
  role: "seller",
  startRoute: "/seller?demo=true",
  previewPath: [
    "Seller Console",
    "Publish Listing",
    "Marketplace Visibility",
    "Accept Reservation",
    "Open Settlement",
    "Settlement Ledger",
    "Clearing Certificate",
    "Audit Trail",
  ],
  steps: [
    /* ── 1. Seller Home ── */
    {
      id: "seller-home",
      title: "Listing & Settlement Console",
      body: "The seller console shows your listing inventory with evidence pack status, incoming reservations from verified buyers, and settlement participation overview. All data is deterministically seeded.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Unverified or under-documented inventory entering the marketplace.",
        },
        {
          label: "Control Mechanism",
          text: "Three-part evidence pack requirement: assay report, chain of custody, and seller attestation.",
        },
        {
          label: "Why It Matters",
          text: "The clearing authority cannot guarantee delivery without verified provenance.",
        },
      ],
      route: "/seller?demo=true",
      target: '[data-tour="seller-listings"]',
      placement: "bottom",
      next: { type: "manual" },
    },

    /* ── 2. Publish Listing — click CTA ── */
    {
      id: "seller-publish",
      title: "Publish Listing",
      body: "Click the Publish button to submit your listing through the publish gate. The gate validates seller verification status, evidence completeness, and capital control constraints before making inventory visible to buyers.",
      route: "/seller?demo=true",
      target: '[data-tour="listing-publish-btn"]',
      placement: "top",
      next: { type: "click", target: '[data-tour="listing-publish-btn"]' },
    },

    /* ── 3. Navigate to Marketplace — click sidebar ── */
    {
      id: "seller-marketplace-nav",
      title: "Marketplace Visibility",
      body: "Once published, your listing becomes visible in the marketplace to all verified buyers. Click the Marketplace link to verify your published inventory appears correctly.",
      target: '[data-tour="sidebar-marketplace"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-marketplace"]' },
    },

    /* ── 4. Accept Reservation — click CTA ── */
    {
      id: "seller-accept-reservation",
      title: "Accept Incoming Reservation",
      body: "Navigate back to your seller console to view incoming reservations. The reservation panel shows the verified buyer's order details. Click 'Open Settlement' to accept and begin the clearing process.",
      route: "/seller?demo=true",
      target: '[data-tour="seller-open-settlement-cta"]',
      placement: "top",
      next: { type: "click", target: '[data-tour="seller-open-settlement-cta"]' },
    },

    /* ── 5. Open Settlement — click settlement row ── */
    {
      id: "seller-settlement-row",
      title: "Settlement Console",
      body: "The settlement console shows all clearing operations you are involved in. Click the highlighted settlement to view the full lifecycle detail and ledger.",
      route: "/settlements?demo=true",
      target: '[data-tour="settlement-row-demo"]',
      placement: "bottom",
      next: { type: "click", target: '[data-tour="settlement-row-demo"]' },
    },

    /* ── 6. Settlement Detail & Ledger (manual) ── */
    {
      id: "seller-settlement-detail",
      title: "Settlement Lifecycle & Ledger",
      body: "The settlement detail shows the complete lifecycle with append-only ledger entries and settlement rails visualization. As a seller, your view provides full transparency into the clearing process — settlement actions are role-gated to operations staff.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Settlement failure from incomplete or out-of-sequence lifecycle transitions.",
        },
        {
          label: "Control Mechanism",
          text: "Deterministic state machine with role-gated transitions and append-only ledger.",
        },
        {
          label: "Why It Matters",
          text: "Atomic delivery-versus-payment eliminates settlement failure modes inherent in sequential bilateral transfers.",
        },
      ],
      target: '[data-tour="settlement-ledger"]',
      placement: "top",
      next: { type: "manual" },
    },

    /* ── 7. Clearing Certificate — click view ── */
    {
      id: "seller-certificate",
      title: "Clearing Certificate",
      body: "Upon settlement finality, both buyer and seller receive access to the clearing certificate — SHA-256 signature hash, UTC issuance timestamp, and deterministic certificate number. Click 'View Certificate' to inspect the authoritative proof of atomic DvP execution.",
      route: "/settlements/stl-001?demo=true",
      target: '[data-tour="certificate-view"]',
      placement: "top",
      next: { type: "click", target: '[data-tour="certificate-view"]' },
    },

    /* ── 8. Audit Trail (manual) ── */
    {
      id: "seller-audit",
      title: "Audit Trail",
      body: "The Governance Command Center provides an immutable record of every settlement action, capital event, and governance decision. This is the authoritative evidence package for bilateral reconciliation and regulatory reporting.",
      route: "/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
