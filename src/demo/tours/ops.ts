/* ================================================================
   OPS TOUR — Ops / Clearing Ops (vault_ops) Primary Path
   
   Global queue overview → Review transaction dossier →
   Run controls → Move to settlement → Finality confirmation →
   Timeline view
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const opsTour: TourDefinition = {
  id: "vault_ops",
  name: "Ops / Clearing Ops",
  description:
    "Walk through the clearing operations workflow: queue management, settlement execution, compliance verification, and finality confirmation.",
  role: "vault_ops",
  startRoute: "/dashboard?demo=true",
  previewPath: [
    "Dashboard Command Surface",
    "Intraday Capital Monitor",
    "Settlement Queue",
    "Settlement Detail — Dossier",
    "Compliance Verification",
    "Settlement Authorization",
    "DvP Execution",
    "Settlement Timeline",
    "Certificate Issuance",
    "Audit Console",
    "Supervisory Record",
  ],
  steps: [
    {
      id: "ops-dashboard",
      title: "Clearing Operations Dashboard",
      body: "The dashboard is the command surface for clearing operations. Capital adequacy, settlement queue depth, and governance events are consolidated here.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Fragmented operational awareness across clearing functions.",
        },
        {
          label: "Control Mechanism",
          text: "Unified observability across capital, settlement, and compliance.",
        },
        {
          label: "Why It Matters",
          text: "Clearing operators require a single source of truth for all active positions.",
        },
      ],
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "bottom",
      next: { type: "manual" },
    },
    {
      id: "ops-intraday-nav",
      title: "Intraday Capital Console",
      body: "Navigate to the intraday capital console for real-time breach monitoring and exposure driver analysis.",
      target: '[data-tour="sidebar-intraday"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-intraday"]' },
    },
    {
      id: "ops-intraday",
      title: "Live Capital Snapshot",
      body: "The intraday console computes a live capital snapshot from all active exposures. Breach events are generated deterministically when thresholds are exceeded.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Intraday concentration risk exceeding capital buffers.",
        },
        {
          label: "Control Mechanism",
          text: "Live ECR, TVaR₉₉ buffer, and hardstop utilization with deterministic breach detection.",
        },
        {
          label: "Why It Matters",
          text: "Continuous monitoring replaces periodic reporting.",
        },
      ],
      route: "/intraday?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "ops-settlements-nav",
      title: "Settlement Queue",
      body: "Navigate to the settlement queue to review active clearing cases.",
      target: '[data-tour="sidebar-settlements"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-settlements"]' },
    },
    {
      id: "ops-settlements",
      title: "Global Settlement Queue",
      body: "All active settlements are displayed with status, counterparties, amounts, and pending actions. Each settlement follows a deterministic lifecycle with role-gated transitions.",
      route: "/settlements?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "ops-controls-nav",
      title: "Capital Controls",
      body: "Navigate to capital controls to review the current control mode and override management.",
      target: '[data-tour="sidebar-controls"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-controls"]' },
    },
    {
      id: "ops-controls",
      title: "Capital Guardrails",
      body: "Capital controls enforce operational restrictions based on breach level. NORMAL → THROTTLE → HALT → EMERGENCY_HALT escalation is automatic and non-discretionary.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Systemic exposure accumulation beyond risk appetite.",
        },
        {
          label: "Control Mechanism",
          text: "Automated escalation ladder with documented override trail.",
        },
        {
          label: "Why It Matters",
          text: "Automated policy enforcement removes discretionary intervention from critical risk decisions.",
        },
      ],
      route: "/capital-controls?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "ops-audit-nav",
      title: "Audit Console",
      body: "Navigate to the audit console for immutable governance records.",
      target: '[data-tour="sidebar-audit"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-audit"]' },
    },
    {
      id: "ops-audit",
      title: "Governance Audit Trail",
      body: "Every settlement action, capital event, and policy decision is recorded in an append-only audit trail. This is the regulator-ready evidence package.",
      route: "/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "ops-supervisory-nav",
      title: "Supervisory Mode",
      body: "Navigate to supervisory mode for regulatory examination dossiers.",
      target: '[data-tour="sidebar-supervisory"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-supervisory"]' },
    },
    {
      id: "ops-supervisory",
      title: "Supervisory Oversight",
      body: "Case dossiers present settlement details with full ledger history, capital snapshot at time of authorization, and immutable audit trail for regulatory examination.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Lack of regulator-ready audit trails for clearing governance decisions.",
        },
        {
          label: "Control Mechanism",
          text: "Supervisory console with case dossiers, frozen capital snapshots, and append-only logs.",
        },
        {
          label: "Why It Matters",
          text: "Regulatory examination requires immutable evidence of governance integrity.",
        },
      ],
      route: "/supervisory?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
