/* ================================================================
   ADMIN TOUR — Platform Operations Path (8 steps)

   1. Dashboard Command Surface (manual)
   2. Fee Pricing — click pricing-edit-btn
   3. Save Pricing — click pricing-save-btn
   4. Capital Controls — click sidebar-controls
   5. Toggle Control Mode — click control-mode-toggle
   6. Settlement Operations — click sidebar-settlements
   7. Audit Console — click sidebar-audit
   8. Governance Audit Record (manual)

   Click-gated: 6/8 = 75% ✓ (exceeds 60% requirement)
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const adminTour: TourDefinition = {
  id: "admin",
  name: "Admin",
  description:
    "Walk through the admin workflow: fee pricing configuration, capital controls, settlement operations oversight, and governance audit.",
  role: "admin",
  startRoute: "/dashboard?demo=true",
  previewPath: [
    "Dashboard Command Surface",
    "Edit Fee Pricing",
    "Save Pricing Config",
    "Capital Controls",
    "Toggle Control Mode",
    "Settlement Operations",
    "Audit Console",
    "Governance Record",
  ],
  steps: [
    /* ── 1. Dashboard Command Surface ── */
    {
      id: "admin-dashboard",
      title: "Admin Command Surface",
      body: "As admin, the dashboard provides full visibility across all clearing functions — capital adequacy, risk metrics, and settlement activity. This is the highest-privilege institutional view.",
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "bottom",
      next: { type: "manual" },
    },

    /* ── 2. Edit Fee Pricing — click edit button ── */
    {
      id: "admin-pricing-edit",
      title: "Fee Pricing Configuration",
      body: "Click the Edit button to modify the clearing authority's fee structure. Pricing changes affect all future settlements and are recorded in the governance audit trail.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Unauthorized or unaudited changes to the clearing fee structure.",
        },
        {
          label: "Control Mechanism",
          text: "All pricing changes are versioned and recorded in the immutable audit log.",
        },
        {
          label: "Why It Matters",
          text: "Fee transparency is a regulatory requirement for clearing authorities.",
        },
      ],
      route: "/admin/pricing?demo=true",
      target: '[data-tour="pricing-edit-btn"]',
      placement: "left",
      next: { type: "click", target: '[data-tour="pricing-edit-btn"]' },
    },

    /* ── 3. Save Pricing — click save button ── */
    {
      id: "admin-pricing-save",
      title: "Save Pricing Changes",
      body: "After reviewing the fee configuration, click Save to persist. The new pricing will apply to all subsequent clearing activations.",
      route: "/admin/pricing?demo=true",
      target: '[data-tour="pricing-save-btn"]',
      placement: "left",
      next: { type: "click", target: '[data-tour="pricing-save-btn"]' },
    },

    /* ── 4. Capital Controls — click sidebar ── */
    {
      id: "admin-controls-nav",
      title: "Capital Controls",
      body: "Navigate to capital controls to manage the hardstop limits, escalation ladder, and override policies that govern clearing capacity.",
      target: '[data-tour="sidebar-controls"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-controls"]' },
    },

    /* ── 5. Toggle Control Mode — click toggle ── */
    {
      id: "admin-control-mode",
      title: "Control Mode Toggle",
      body: "Click the control mode toggle to switch between Automatic and Manual clearing approval modes. In Manual mode, all settlement activations require explicit admin sign-off.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Uncontrolled clearing operations during periods of elevated risk.",
        },
        {
          label: "Control Mechanism",
          text: "Binary mode toggle with full audit trail of each state change.",
        },
        {
          label: "Why It Matters",
          text: "The clearing authority must have the ability to halt automatic processing when risk conditions warrant manual oversight.",
        },
      ],
      route: "/capital-controls?demo=true",
      target: '[data-tour="control-mode-toggle"]',
      placement: "bottom",
      next: { type: "click", target: '[data-tour="control-mode-toggle"]' },
    },

    /* ── 6. Settlement Operations — click sidebar ── */
    {
      id: "admin-settlements-nav",
      title: "Settlement Operations",
      body: "Navigate to settlements to monitor active clearing operations and execute administrative settlement actions.",
      target: '[data-tour="sidebar-settlements"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-settlements"]' },
    },

    /* ── 7. Audit Console — click sidebar ── */
    {
      id: "admin-audit-nav",
      title: "Governance Audit Console",
      body: "Navigate to the audit console for the complete immutable governance record of all clearing operations, capital events, and administrative actions.",
      target: '[data-tour="sidebar-audit"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-audit"]' },
    },

    /* ── 8. Governance Record ── */
    {
      id: "admin-audit",
      title: "Governance Audit Record",
      body: "The audit console captures every settlement action, capital control change, pricing modification, and administrative decision. This is the definitive governance evidence package for regulatory examination.",
      route: "/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
