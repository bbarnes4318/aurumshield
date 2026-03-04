/* ================================================================
   SENDER TOUR — Execute Goldwire Settlement (5 steps)

   1. Navigate to Execute Goldwire wizard
   2. Highlight Target Entity selection (Step 1)
   3. Highlight Settlement Parameters (Step 2) — USD + Gold calc
   4. Highlight Review & Sign (Step 3)
   5. Highlight "Sign & Execute Goldwire" CTA

   Click-gated: 1/5 = 20%
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const senderTour: TourDefinition = {
  id: "sender",
  name: "Sender / Execute Goldwire",
  description:
    "Walk through the complete Goldwire execution workflow: select a beneficiary entity, define settlement parameters with live gold weight calculation, review the execution certificate, and sign the cryptographic authorization.",
  role: "buyer",
  startRoute: "/transactions/new?demo=true",
  previewPath: [
    "Execute Goldwire Wizard",
    "Target Entity Selection",
    "Settlement Parameters",
    "Review Execution Certificate",
    "Sign & Execute",
  ],
  steps: [
    /* ── 1. Wizard Landing ── */
    {
      id: "sender-wizard-start",
      title: "Execute Goldwire",
      body: "The Goldwire wizard guides corporate treasuries through a 3-step settlement process. A Goldwire is an instant title transfer of vaulted gold used to settle a B2B fiat obligation — no physical metal movement required.",
      route: "/transactions/new?demo=true",
      placement: "center",
      next: { type: "manual" },
    },

    /* ── 2. Target Entity (Step 1) ── */
    {
      id: "sender-target-entity",
      title: "Step 1 — Target Entity",
      body: "Select the counterparty corporate treasury that will receive the Goldwire. The entity card displays the beneficiary's risk rating, LEI, jurisdiction, and KYC verification status. Only entities that have passed OFAC and sanctions screening are available.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Settlement to unverified or sanctioned counterparties.",
        },
        {
          label: "Control Mechanism",
          text: "Pre-screened entity address book with risk badges and LEI verification.",
        },
        {
          label: "Why It Matters",
          text: "Counterparty integrity is a precondition for settlement finality.",
        },
      ],
      route: "/transactions/new?demo=true",
      target: '[id="w-cp"]',
      placement: "bottom",
      next: { type: "manual" },
    },

    /* ── 3. Settlement Parameters (Step 2) ── */
    {
      id: "sender-settlement-params",
      title: "Step 2 — Settlement Parameters",
      body: "Enter the USD fiat amount you wish to settle. The system dynamically calculates the required gold ounces based on the live spot price. The 1.0% Network Execution Fee is displayed in real-time along with the total treasury debit.",
      structure: [
        {
          label: "Gold Calculation",
          text: "USD amount ÷ live spot price = required gold ounces (title transfer weight).",
        },
        {
          label: "Fee Structure",
          text: "1.0% flat Network Execution Fee applied on the settlement value.",
        },
        {
          label: "Why It Matters",
          text: "Full transparency into cost and gold allocation before execution.",
        },
      ],
      route: "/transactions/new?demo=true",
      target: '[id="w-fiat"]',
      placement: "bottom",
      next: { type: "manual" },
    },

    /* ── 4. Review & Sign (Step 3) ── */
    {
      id: "sender-review",
      title: "Step 3 — Review Execution Certificate",
      body: "The Goldwire Execution Certificate summarizes all parameters: beneficiary entity, settlement value, calculated gold allocation, spot price, network fee, and total debit. Enter a unique Wire Reference Code that will be embedded in the SHA-256 clearing certificate.",
      route: "/transactions/new?demo=true",
      target: '[id="w-ref"]',
      placement: "top",
      next: { type: "manual" },
    },

    /* ── 5. Sign & Execute ── */
    {
      id: "sender-execute",
      title: "Sign & Execute Goldwire",
      body: "The final authorization step. Clicking 'Sign & Execute Goldwire' initiates the deterministic title transfer of allocated gold within the Malca-Amit sovereign vault network. Settlement achieves T+0 finality — no physical metal movement occurs.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Unauthorized or un-audited settlement execution.",
        },
        {
          label: "Control Mechanism",
          text: "Cryptographic signing with biometric authorization and immutable audit record.",
        },
        {
          label: "Why It Matters",
          text: "The signature is the authoritative proof of settlement intent for regulatory reporting.",
        },
      ],
      route: "/transactions/new?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
