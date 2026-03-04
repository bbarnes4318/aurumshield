/* ================================================================
   RECIPIENT TOUR — Receive & Liquidate Goldwire (5 steps)

   1. Navigate to a completed transaction in the ledger
   2. Highlight the LiquidationPanel component
   3. Highlight the Live OTC Bid from Dubai partner
   4. Highlight the payout destination toggle (USD Wire vs. USDC)
   5. Highlight the "Liquidate Asset & Route Funds" CTA

   Click-gated: 1/5 = 20%
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const recipientTour: TourDefinition = {
  id: "recipient",
  name: "Recipient / Liquidate to Fiat",
  description:
    "Walk through the recipient liquidation workflow: receive a Goldwire settlement, view the live OTC bid from our Dubai partner, select your payout destination (USD Wire or USDC), and execute instant liquidation to fiat.",
  role: "seller",
  startRoute: "/transactions?demo=true",
  previewPath: [
    "Settlement Ledger",
    "Liquidation Panel",
    "Live OTC Bid",
    "Payout Destination",
    "Liquidate & Route Funds",
  ],
  steps: [
    /* ── 1. Settlement Ledger — find completed transaction ── */
    {
      id: "recipient-ledger",
      title: "Settlement Ledger",
      body: "The Settlement Ledger shows all historical clearing records. Click on a completed Goldwire to view its detail page and access the liquidation panel. Completed settlements display a green 'CLEARED' status badge.",
      route: "/transactions?demo=true",
      target: '[data-tour="settlement-row-demo"]',
      placement: "bottom",
      next: { type: "click", target: '[data-tour="settlement-row-demo"]' },
    },

    /* ── 2. Liquidation Panel ── */
    {
      id: "recipient-liquidation-panel",
      title: "Liquidation Panel",
      body: "When you receive a Goldwire, the allocated gold title appears in your Sovereign Vault. The Liquidation Panel allows you to instantly convert this gold allocation back to fiat via our institutional OTC desk partners. No physical metal handling is required.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Recipient exposure to gold price volatility after settlement.",
        },
        {
          label: "Control Mechanism",
          text: "Instant OTC liquidation with live bid pricing and deterministic payout routing.",
        },
        {
          label: "Why It Matters",
          text: "Recipients achieve fiat finality within minutes of receiving a Goldwire.",
        },
      ],
      route: "/transactions/demo-txn-1?demo=true",
      target: '[data-tour="liquidation-panel"]',
      placement: "left",
      next: { type: "manual" },
    },

    /* ── 3. Live OTC Bid ── */
    {
      id: "recipient-otc-bid",
      title: "Live OTC Bid",
      body: "Our Dubai OTC partner provides real-time institutional buy bids for allocated gold. The bid includes the live spot price, a premium/discount spread, and the net liquidation value. Pricing updates every 30 seconds during market hours.",
      route: "/transactions/demo-txn-1?demo=true",
      target: '[data-tour="otc-bid-display"]',
      placement: "top",
      next: { type: "manual" },
    },

    /* ── 4. Payout Destination Toggle ── */
    {
      id: "recipient-payout-toggle",
      title: "Payout Destination",
      body: "Select how you want to receive your liquidation proceeds. Phase 1 participants can choose between a traditional USD wire transfer or instant USDC settlement via the stablecoin bridge. USDC payouts achieve T+0 finality.",
      structure: [
        {
          label: "USD Wire",
          text: "Traditional fiat payout via correspondent banking. T+1 settlement.",
        },
        {
          label: "USDC (Stablecoin)",
          text: "Instant digital settlement to your whitelisted institutional wallet. T+0 finality.",
        },
      ],
      route: "/transactions/demo-txn-1?demo=true",
      target: '[data-tour="payout-toggle"]',
      placement: "bottom",
      next: { type: "manual" },
    },

    /* ── 5. Liquidate & Route Funds ── */
    {
      id: "recipient-liquidate-cta",
      title: "Liquidate Asset & Route Funds",
      body: "Click to execute the liquidation. The system atomically sells the gold allocation at the OTC bid price and routes the net proceeds to your selected payout destination. A liquidation certificate is issued with a SHA-256 clearing hash for audit compliance.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Delayed or failed payout routing after asset liquidation.",
        },
        {
          label: "Control Mechanism",
          text: "Atomic execution: sell + route in a single deterministic transaction.",
        },
        {
          label: "Why It Matters",
          text: "Guarantees the recipient receives fiat proceeds without counterparty settlement risk.",
        },
      ],
      route: "/transactions/demo-txn-1?demo=true",
      target: '[data-tour="liquidate-cta"]',
      placement: "top",
      next: { type: "manual" },
    },
  ],
};
