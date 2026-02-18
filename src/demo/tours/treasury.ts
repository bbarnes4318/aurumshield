/* ================================================================
   TREASURY TOUR — Treasury / Capital Primary Path
   
   Capital base → ECR → Hardstop thresholds →
   Breach handling & controls → Approve capital allocation
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const treasuryTour: TourDefinition = {
  id: "treasury",
  name: "Treasury / Capital",
  description:
    "Walk through the treasury workflow: capital adequacy monitoring, ECR management, hardstop thresholds, breach handling, and settlement fund confirmation.",
  role: "treasury",
  startRoute: "/dashboard?demo=true",
  previewPath: [
    "Dashboard Capital Overview",
    "Capital Base & ECR",
    "Intraday Capital Console",
    "Exposure Driver Analysis",
    "Hardstop Threshold Management",
    "Breach Escalation Review",
    "Capital Controls Mode",
    "Settlement Fund Confirmation",
    "Audit Trail",
  ],
  steps: [
    {
      id: "treasury-dashboard",
      title: "Capital Overview",
      body: "The dashboard provides the treasury view of AurumShield's capital position. Capital Base, ECR, and Hardstop Utilization are the primary treasury metrics.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Unmonitored accumulation of gross exposure relative to available capital base.",
        },
        {
          label: "Control Mechanism",
          text: "Real-time capital adequacy computation from all active positions.",
        },
        {
          label: "Why It Matters",
          text: "Treasury must maintain continuous awareness of capital utilization against charter thresholds.",
        },
      ],
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "bottom",
      next: { type: "manual" },
    },
    {
      id: "treasury-intraday-card",
      title: "Intraday Capital Card",
      body: "The compact intraday card shows the current breach level, control mode, ECR, and hardstop utilization at a glance. This is the treasury's real-time status indicator.",
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-intraday-card"]',
      placement: "top",
      next: { type: "manual" },
    },
    {
      id: "treasury-intraday-nav",
      title: "Full Intraday Console",
      body: "Navigate to the intraday capital console for the complete capital position view with exposure driver breakdown.",
      target: '[data-tour="sidebar-intraday"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-intraday"]' },
    },
    {
      id: "treasury-intraday",
      title: "Capital Adequacy Console",
      body: "The full intraday console shows Gross Exposure, ECR ratio, TVaR₉₉ buffer, and hardstop utilization. Top exposure drivers are ranked by concentration risk. Breach events are generated when thresholds are exceeded.",
      route: "/intraday?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "treasury-controls-nav",
      title: "Capital Controls",
      body: "Navigate to capital controls to review threshold management and the current control mode.",
      target: '[data-tour="sidebar-controls"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-controls"]' },
    },
    {
      id: "treasury-controls",
      title: "Threshold & Breach Management",
      body: "Capital controls define the escalation ladder: NORMAL → THROTTLE → HALT → EMERGENCY_HALT. Treasury manages hardstop limits and reviews override requests. Each override creates an auditable exception record.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Systemic exposure accumulation beyond risk appetite.",
        },
        {
          label: "Control Mechanism",
          text: "Non-discretionary escalation with documented override authorization.",
        },
        {
          label: "Why It Matters",
          text: "Treasury is the last line of defense before systemic exposure breaches capital buffers.",
        },
      ],
      route: "/capital-controls?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "treasury-settlements-nav",
      title: "Settlement Fund Confirmation",
      body: "Navigate to settlements to review treasury's role in confirming funds for settlement execution.",
      target: '[data-tour="sidebar-settlements"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-settlements"]' },
    },
    {
      id: "treasury-settlements",
      title: "Funds Confirmation Role",
      body: "Treasury confirms that settlement funds have been received and are available for escrow. This is a required step before gold allocation can proceed. The CONFIRM_FUNDS_FINAL action is restricted to the treasury role.",
      route: "/settlements?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "treasury-audit-nav",
      title: "Audit Trail",
      body: "Navigate to the audit console to review all treasury actions in the governance record.",
      target: '[data-tour="sidebar-audit"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-audit"]' },
    },
    {
      id: "treasury-audit",
      title: "Treasury Governance Record",
      body: "All fund confirmations, capital events, and override decisions are recorded in the append-only audit trail. This provides regulatory evidence of treasury governance.",
      route: "/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
