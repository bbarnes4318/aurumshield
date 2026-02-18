/* ================================================================
   SELLER TOUR — Participant / Seller Primary Path
   
   Inventory / availability → Upload/verify evidence pack →
   Publish clearing eligibility → Accept reservation →
   Settlement confirmation → Certificate issuance record
   ================================================================ */

import type { TourDefinition } from "../tour-engine/tourTypes";

export const sellerTour: TourDefinition = {
  id: "seller",
  name: "Participant / Seller",
  description:
    "Walk through the sell-side workflow: inventory creation, evidence packing, publish gate verification, and settlement lifecycle participation.",
  role: "seller",
  startRoute: "/dashboard?demo=true",
  previewPath: [
    "Dashboard Overview",
    "Navigate to Listings",
    "Listing Console",
    "Create New Listing",
    "Evidence Pack Requirements",
    "Publish Gate Enforcement",
    "Marketplace Visibility",
    "Reservation Acceptance",
    "Settlement Participation",
    "Certificate Record",
  ],
  steps: [
    {
      id: "seller-dashboard",
      title: "Seller Dashboard",
      body: "As a verified seller, the dashboard provides visibility into your inventory status, active settlements, and marketplace conditions.",
      route: "/dashboard?demo=true",
      target: '[data-tour="dashboard-capital"]',
      placement: "bottom",
      next: { type: "manual" },
    },
    {
      id: "seller-listings-nav",
      title: "Navigate to My Listings",
      body: "Access your listing console to manage inventory and track evidence pack status.",
      target: '[data-tour="sidebar-my-listings"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-my-listings"]' },
    },
    {
      id: "seller-listings",
      title: "Listing Console",
      body: "The listing console shows all your inventory with evidence pack status, publish gate results, and marketplace visibility. Each listing must pass a publish gate before buyers can see it.",
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
      route: "/sell/listings?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "seller-create-nav",
      title: "Create New Listing",
      body: "Navigate to the listing wizard to create inventory with certified specifications.",
      target: '[data-tour="sidebar-create-listing"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-create-listing"]' },
    },
    {
      id: "seller-create-listing",
      title: "Listing Creation Wizard",
      body: "Specify gold form, purity, weight, price, and vault location. All fields are validated against clearing authority standards before proceeding to evidence upload.",
      route: "/sell?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "seller-evidence",
      title: "Evidence Pack Requirements",
      body: "Each listing requires three evidence documents: (1) Certified Assay Report — verifies gold purity and weight, (2) Chain of Custody Certificate — proves provenance from refiner to vault, (3) Seller Attestation — legal declaration of ownership and authority to sell.",
      structure: [
        {
          label: "Risk Addressed",
          text: "Counterparty exposure to sellers with incomplete identity verification.",
        },
        {
          label: "Control Mechanism",
          text: "Publish gate validates seller verification status, evidence completeness, and capital control constraints.",
        },
        {
          label: "Why It Matters",
          text: "Inventory integrity is enforced before any buyer interaction.",
        },
      ],
      route: "/sell?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "seller-marketplace-nav",
      title: "Marketplace Visibility",
      body: "Once published, your listing becomes visible in the marketplace to all verified buyers.",
      target: '[data-tour="sidebar-marketplace"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-marketplace"]' },
    },
    {
      id: "seller-marketplace",
      title: "Published Inventory",
      body: "Your published listing is now available for reservation by verified buyers. The marketplace enforces capital adequacy gates on all reservation attempts.",
      route: "/marketplace?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
    {
      id: "seller-settlements-nav",
      title: "Settlement Participation",
      body: "Navigate to settlements to view your involvement in active clearing cases.",
      target: '[data-tour="sidebar-settlements"]',
      placement: "right",
      next: { type: "click", target: '[data-tour="sidebar-settlements"]' },
    },
    {
      id: "seller-settlements",
      title: "Settlement Confirmation",
      body: "As a seller, you participate in the settlement lifecycle as a counterparty. Settlement actions are role-gated — your view is limited to confirming gold availability and reviewing settlement status.",
      route: "/settlements?demo=true",
      placement: "center",
      next: { type: "manual" },
    },
  ],
};
