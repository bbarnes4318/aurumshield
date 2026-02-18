/* ================================================================
   RISK TOUR — Risk / Supervisory (compliance) Primary Path
   
   Exposure overview → Policy + hardstops →
   Review exception / breach → Approve / deny →
   Audit trail + immutable log
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const riskTour: TourDefinition = {
  id: "compliance",
  name: "Risk / Supervisory",
  description:
    "Walk through the risk oversight workflow: exposure monitoring, policy enforcement, breach escalation, and regulatory examination preparation.",
  role: "compliance",
  startRoute: "/dashboard?demo=true",
  previewPath: [
    "Dashboard Risk Overview",
    "Risk Distribution Analysis",
    "Intraday Exposure Console",
    "Hardstop Thresholds",
    "Capital Controls & Breaches",
    "Settlement Verification",
    "Supervisory Case Dossier",
    "Audit Trail Review",
    "Compliance Reporting",
  ],
  steps: [
    {
      id: "risk-dashboard",
      title: "Risk Oversight Dashboard",
      body: "The risk dashboard consolidates capital adequacy, counterparty risk distribution, and evidence health into a supervisory control surface.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Fragmented risk awareness across siloed clearing subsystems.",
        },
        {
          label: "Control Mechanism",
          text: "Unified risk surface with TRI band distribution, corridor exposure, and hub concentration metrics.",
        },
        {
          label: "Why It Matters",
          text: "Risk officers require consolidated visibility to identify concentration and breach conditions.",
        },
      ],
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-risk"]',
      placement: "bottom",
      next: { type: "manual" },
    },
    {
      id: "risk-evidence",
      title: "Evidence Health Monitor",
      body: "The evidence health panel shows automated compliance engine validation results and WORM storage status. Evidence integrity is a prerequisite for settlement execution.",
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-evidence"]',
      placement: "top",
      next: { type: "manual" },
    },
    {
      id: "risk-intraday-nav",
      title: "Intraday Exposure Analysis",
      body: "Navigate to the intraday console for detailed exposure driver analysis and breach monitoring.",
      target: '[data-tour="sidebar-intraday"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-intraday"]' },
    },
    {
      id: "risk-intraday",
      title: "Exposure Drivers & Breach Detection",
      body: "The intraday console ranks top exposure drivers by concentration. Breach levels (CLEAR → CAUTION → BREACH) are triggered deterministically when utilization exceeds charter thresholds.",
      route: "/intraday?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "risk-controls-nav",
      title: "Capital Controls Review",
      body: "Navigate to capital controls to review escalation ladder and active overrides.",
      target: '[data-tour="sidebar-controls"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-controls"]' },
    },
    {
      id: "risk-controls",
      title: "Breach Handling & Control Mode",
      body: "Capital controls escalate automatically: NORMAL → THROTTLE (reservations slowed) → HALT (settlements blocked) → EMERGENCY_HALT (marketplace suspended). Overrides require documented authorization with time-limited scope.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Discretionary override abuse without documented authorization.",
        },
        {
          label: "Control Mechanism",
          text: "Non-discretionary escalation ladder with auditable exception trail.",
        },
        {
          label: "Why It Matters",
          text: "Automated enforcement removes human discretion from critical risk decisions.",
        },
      ],
      route: "/capital-controls?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "risk-supervisory-nav",
      title: "Supervisory Console",
      body: "Navigate to the supervisory console for regulatory-grade case examination.",
      target: '[data-tour="sidebar-supervisory"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-supervisory"]' },
    },
    {
      id: "risk-supervisory",
      title: "Regulatory Examination Dossier",
      body: "Each supervisory case presents settlement details, full ledger history, capital snapshot frozen at authorization time, and an immutable audit trail. This is the evidence package for regulatory examination.",
      route: "/supervisory?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "risk-audit-nav",
      title: "Audit Trail",
      body: "Navigate to the audit console for the complete governance record.",
      target: '[data-tour="sidebar-audit"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-audit"]' },
    },
    {
      id: "risk-audit",
      title: "Immutable Governance Log",
      body: "Every settlement authorization, capital event, and policy override is recorded in an append-only audit trail. This demonstrates that every settlement was authorized under documented conditions.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Opacity in settlement authorization and capital state at time of execution.",
        },
        {
          label: "Control Mechanism",
          text: "Append-only audit trail with frozen capital snapshots.",
        },
        {
          label: "Why It Matters",
          text: "Regulatory examination requires immutable evidence of governance integrity.",
        },
      ],
      route: "/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
