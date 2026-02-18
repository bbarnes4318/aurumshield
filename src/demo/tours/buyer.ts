/* ================================================================
   BUYER TOUR — Participant / Buyer Primary Path
   
   Overview of market state → Browse eligible inventory →
   Initiate reservation → Review settlement rails →
   Confirm allocation → View certificate issuance →
   Audit proof / finality check
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const buyerTour: TourDefinition = {
  id: "buyer",
  name: "Participant / Buyer",
  description:
    "Walk through the complete buy-side workflow: from market overview through reservation, order creation, settlement tracking, and certificate issuance.",
  role: "buyer",
  startRoute: "/dashboard?demo=true",
  previewPath: [
    "Dashboard Overview",
    "Capital Adequacy Review",
    "Browse Marketplace",
    "View Listing Detail",
    "Create Reservation",
    "Review Reservation",
    "Convert to Order",
    "Settlement Tracking",
    "Settlement Lifecycle & Timeline",
    "Clearing Certificate Issuance",
    "Audit Trail Review",
  ],
  steps: [
    {
      id: "buyer-dashboard",
      title: "Risk Dashboard Overview",
      body: "The dashboard provides a unified operational view of AurumShield's clearing infrastructure. All metrics are computed from real-time settlement and position state.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Fragmented operational awareness across clearing functions.",
        },
        {
          label: "Control Mechanism",
          text: "Consolidates capital adequacy, risk distribution, and evidence health into a single institutional command surface.",
        },
        {
          label: "Why It Matters",
          text: "Systemic risk management requires unified observability for timely decision-making.",
        },
      ],
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "bottom",
      next: { type: "manual" },
    },
    {
      id: "buyer-capital-overview",
      title: "Capital Adequacy Metrics",
      body: "Capital Base, Active Exposure, ECR, and Hardstop Utilization are computed deterministically from the active position book. These metrics gate all downstream trading activity.",
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "bottom",
      next: { type: "manual" },
    },
    {
      id: "buyer-nav-marketplace",
      title: "Navigate to Marketplace",
      body: "The marketplace shows all eligible listings published by verified sellers. Each listing has passed evidence and capital control gates before becoming visible.",
      route: "/dashboard?demo=true",
      target: '[data-tour="sidebar-marketplace"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-marketplace"]' },
    },
    {
      id: "buyer-marketplace-browse",
      title: "Browse Eligible Inventory",
      body: "Listed inventory has been verified through a three-part evidence pack: assay report, chain of custody, and seller attestation. Only verified sellers with complete evidence appear here.",
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
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "buyer-reservation-nav",
      title: "View Reservations",
      body: "Reservations lock bilateral exposure into the capital-aware perimeter. Navigate to the reservations view to see active and completed reservations.",
      target: '[data-tour="sidebar-reservations"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-reservations"]' },
    },
    {
      id: "buyer-reservations",
      title: "Reservation Management",
      body: "Each reservation represents a locked position against a listing. Policy gates enforce TRI scoring, ECR impact, and hardstop utilization thresholds before conversion to an order.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Bilateral counterparty exposure prior to clearing.",
        },
        {
          label: "Control Mechanism",
          text: "Reservation-to-order conversion enforces policy gates including TRI scoring, ECR impact, and hardstop thresholds.",
        },
        {
          label: "Why It Matters",
          text: "No exposure is created without passing the capital adequacy perimeter.",
        },
      ],
      route: "/reservations?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "buyer-orders-nav",
      title: "View Orders",
      body: "Navigate to the orders view to see confirmed orders with their policy snapshots frozen at time of conversion.",
      target: '[data-tour="sidebar-orders"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-orders"]' },
    },
    {
      id: "buyer-orders",
      title: "Order Confirmation",
      body: "Each order contains a frozen policy snapshot capturing the capital adequacy state at the moment of conversion. This snapshot is preserved for regulatory examination.",
      route: "/orders?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "buyer-settlement-nav",
      title: "Settlement Tracking",
      body: "Navigate to settlements to track the deterministic lifecycle of your order through the clearing pipeline.",
      target: '[data-tour="sidebar-settlements"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-settlements"]' },
    },
    {
      id: "buyer-settlements",
      title: "Settlement Lifecycle",
      body: "The settlement follows a deterministic state machine: escrow open → funds confirmation → gold allocation → verification clearance → authorization → atomic DvP execution. Each transition is role-gated.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Settlement failure from incomplete or out-of-sequence lifecycle transitions.",
        },
        {
          label: "Control Mechanism",
          text: "Deterministic state machine with role-gated transitions and append-only ledger entries.",
        },
        {
          label: "Why It Matters",
          text: "Atomic delivery-versus-payment eliminates settlement failure modes inherent in sequential bilateral transfers.",
        },
      ],
      route: "/settlements?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "buyer-settlement-detail",
      title: "Settlement Lifecycle & Timeline",
      body: "The settlement detail page shows the complete lifecycle: escrow open → funds confirmation → gold allocation → verification → authorization → atomic DvP execution. Each transition is recorded in the append-only ledger with actor identity and frozen snapshots.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Settlement failure from incomplete or out-of-sequence lifecycle transitions.",
        },
        {
          label: "Control Mechanism",
          text: "Deterministic state machine with role-gated transitions, append-only ledger, and atomic DvP.",
        },
        {
          label: "Why It Matters",
          text: "Atomic delivery-versus-payment eliminates settlement failure modes inherent in sequential bilateral transfers.",
        },
      ],
      route: "/settlements?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "buyer-certificate",
      title: "Clearing Certificate Issuance",
      body: "Upon atomic DvP execution, the system issues a clearing certificate containing deterministic identifiers, a canonical signature hash, settlement details, and fee structure. The certificate is the authoritative proof of settlement finality — the single most important artifact in the clearing lifecycle.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Post-settlement reconciliation disputes and lack of authoritative finality proof.",
        },
        {
          label: "Control Mechanism",
          text: "Cryptographically verifiable clearing certificate issued automatically upon DvP execution. Deterministic certificate number, canonical payload serialization, and SHA-256 signature hash.",
        },
        {
          label: "Why It Matters",
          text: "The certificate is the authoritative proof of settlement finality for bilateral reconciliation, regulatory reporting, and custody transfer documentation.",
        },
      ],
      route: "/settlements?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "buyer-audit-nav",
      title: "Audit Trail",
      body: "Navigate to the audit console to verify the immutable governance record of your settlement.",
      target: '[data-tour="sidebar-audit"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-audit"]' },
    },
    {
      id: "buyer-audit",
      title: "Settlement Audit Record",
      body: "The audit console provides an immutable record of every settlement action, capital event, and governance decision. This is the authoritative evidence package for bilateral reconciliation and regulatory reporting.",
      route: "/audit?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
