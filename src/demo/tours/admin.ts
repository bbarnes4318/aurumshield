/* ================================================================
   ADMIN TOUR — Admin Primary Path
   
   Role assignments → Policy settings → Audit log controls →
   Evidence requirements config → Demo reset controls
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const adminTour: TourDefinition = {
  id: "admin",
  name: "Admin",
  description:
    "Walk through the admin workflow: role management, policy configuration, audit controls, capital management, and platform operations.",
  role: "admin",
  startRoute: "/dashboard?demo=true",
  previewPath: [
    "Dashboard Command Surface",
    "Admin Roles & Permissions",
    "Policy Configuration",
    "Audit Log Controls",
    "Capital Controls",
    "Intraday Monitoring",
    "Settlement Operations",
    "Supervisory Console",
    "Marketplace Oversight",
    "Platform Demo Controls",
  ],
  steps: [
    {
      id: "admin-dashboard",
      title: "Admin Command Surface",
      body: "As admin, the dashboard provides full visibility across all clearing functions. This is the highest-privilege institutional view.",
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "bottom",
      next: { type: "manual" },
    },
    {
      id: "admin-roles-nav",
      title: "Role Management",
      body: "Navigate to role management to configure user permissions and access controls.",
      target: '[data-tour="sidebar-admin-roles"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-admin-roles"]' },
    },
    {
      id: "admin-roles",
      title: "Role Assignments",
      body: "Role assignments control which users can execute settlement actions, approve overrides, and access supervisory functions. Each role maps to specific action permissions in the settlement state machine.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Unauthorized access to critical clearing functions.",
        },
        {
          label: "Control Mechanism",
          text: "Role-based action gating across settlement, capital, and governance functions.",
        },
        {
          label: "Why It Matters",
          text: "Separation of duties is a foundational governance requirement.",
        },
      ],
      route: "/admin/roles?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "admin-policies-nav",
      title: "Policy Configuration",
      body: "Navigate to policy settings to review and manage clearing authority policies.",
      target: '[data-tour="sidebar-admin-policies"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-admin-policies"]' },
    },
    {
      id: "admin-policies",
      title: "Policy Settings",
      body: "Policy settings define the operational parameters of the clearing authority: TRI thresholds, ECR limits, hardstop percentages, approval tiers, and marketplace access controls.",
      route: "/admin/policy?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "admin-audit-nav",
      title: "Audit Log Controls",
      body: "Navigate to the admin audit log for the complete governance record.",
      target: '[data-tour="sidebar-admin-audit"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-admin-audit"]' },
    },
    {
      id: "admin-audit",
      title: "Administrative Audit Trail",
      body: "The admin audit log captures all administrative actions: role changes, policy modifications, override authorizations, and system configuration changes. This is the administrative governance evidence package.",
      route: "/admin/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "admin-controls-nav",
      title: "Capital Controls Administration",
      body: "Navigate to capital controls to manage the escalation ladder and override policies.",
      target: '[data-tour="sidebar-controls"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-controls"]' },
    },
    {
      id: "admin-controls",
      title: "Capital Control Administration",
      body: "Admins manage the capital control framework: setting hardstop limits, reviewing override requests, and configuring escalation triggers. All changes are recorded in the audit trail.",
      route: "/capital-controls?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "admin-demo-console",
      title: "Demo Console & Reset",
      body: "Navigate back to the Demo Console to manage demo state, reset demo data, or switch to a different role tour.",
      route: "/demo?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
