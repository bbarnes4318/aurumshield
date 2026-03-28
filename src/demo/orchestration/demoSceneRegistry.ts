/* ================================================================
   DEMO SCENE REGISTRY — Static 8-act definition map (v2)
   
   Each scene defines:
   - route pattern (used for readiness gating)
   - required DOM selectors (must exist before narration)
   - grounded Q&A topics (what the agent can discuss)
   - transition target (next scene)
   - micro-scene IDs for granular orchestration
   
   Updated to include the new data-tour selectors on review
   and success pages, and to reference micro-scene IDs.
   ================================================================ */

import { getMicroScenesForAct } from "./microSceneDefinitions";

export interface DemoScene {
  /** Unique scene identifier matching tourStep.sceneId */
  id: string;
  /** Act number for display */
  actNumber: number;
  /** Display label */
  label: string;
  /** Route path pattern (without query params) */
  routePattern: string;
  /** DOM selectors that must exist before the agent starts narrating */
  requiredSelectors: string[];
  /** Topics the agent is allowed to discuss in Q&A during this scene */
  groundedTopics: string[];
  /** Next scene ID (null for final scene) */
  nextSceneId: string | null;
  /** Micro-scene IDs for this act (ordered) */
  microSceneIds: string[];
}

export const SCENE_REGISTRY: Record<string, DemoScene> = {
  "act-1-welcome": {
    id: "act-1-welcome",
    actNumber: 1,
    label: "Institutional Welcome",
    routePattern: "/institutional/get-started/welcome",
    requiredSelectors: [],
    groundedTopics: [
      "AurumShield platform overview",
      "institutional onboarding process",
      "what the demo will cover",
      "allocated gold custody",
      "settlement architecture",
    ],
    nextSceneId: "act-2-organization",
    microSceneIds: getMicroScenesForAct("act-1-welcome").map((s) => s.id),
  },

  "act-2-organization": {
    id: "act-2-organization",
    actNumber: 2,
    label: "Organization & Entity Setup",
    routePattern: "/institutional/get-started/organization",
    requiredSelectors: ['[data-tour="entity-form"]'],
    groundedTopics: [
      "entity types supported",
      "jurisdiction requirements",
      "LEI and company identity",
      "authorized signatory requirements",
      "onshore vs offshore structures",
    ],
    nextSceneId: "act-3-verification",
    microSceneIds: getMicroScenesForAct("act-2-organization").map((s) => s.id),
  },

  "act-3-verification": {
    id: "act-3-verification",
    actNumber: 3,
    label: "KYB / UBO / AML Perimeter",
    routePattern: "/institutional/get-started/verification",
    requiredSelectors: ['[data-tour="compliance-checklist"]'],
    groundedTopics: [
      "KYB verification process",
      "beneficial ownership review",
      "OFAC sanctions screening",
      "AML risk assessment",
      "source of funds requirements",
      "document verification",
      "compliance timeline",
      "what gets screened",
    ],
    nextSceneId: "act-4-funding",
    microSceneIds: getMicroScenesForAct("act-3-verification").map((s) => s.id),
  },

  "act-4-funding": {
    id: "act-4-funding",
    actNumber: 4,
    label: "Funding Rail Configuration",
    routePattern: "/institutional/get-started/funding",
    requiredSelectors: ['[data-tour="funding-methods"]'],
    groundedTopics: [
      "stablecoin bridge",
      "USDC vs USDT",
      "Fedwire settlement",
      "settlement timing T+0 vs legacy",
      "wallet screening",
      "funding source compliance",
    ],
    nextSceneId: "act-5-marketplace",
    microSceneIds: getMicroScenesForAct("act-4-funding").map((s) => s.id),
  },

  "act-5-marketplace": {
    id: "act-5-marketplace",
    actNumber: 5,
    label: "Execution Terminal — Visual Centerpiece",
    routePattern: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    groundedTopics: [
      "LBMA Good Delivery standard",
      "bar weight and fineness",
      "vault custody options",
      "physical delivery logistics",
      "cost derivation",
      "platform fee structure",
      "insurance coverage",
      "allocated vs unallocated",
      "principal dealing model",
      "deterministic handling path",
      "visible cost transparency",
      "confidence before execution",
    ],
    nextSceneId: "act-6-review",
    microSceneIds: getMicroScenesForAct("act-5-marketplace").map((s) => s.id),
  },

  "act-6-review": {
    id: "act-6-review",
    actNumber: 6,
    label: "Commercial Review",
    routePattern: "/institutional/first-trade/review",
    requiredSelectors: ['[data-tour="review-summary"]'],
    groundedTopics: [
      "indicative vs binding pricing",
      "execution readiness",
      "what happens after authorization",
      "settlement case lifecycle",
      "post-trade operations",
    ],
    nextSceneId: "act-7-authorize",
    microSceneIds: getMicroScenesForAct("act-6-review").map((s) => s.id),
  },

  "act-7-authorize": {
    id: "act-7-authorize",
    actNumber: 7,
    label: "Authorization Boundary",
    routePattern: "/institutional/first-trade/authorize",
    requiredSelectors: ['[data-tour="review-ticket"]'],
    groundedTopics: [
      "legal acknowledgment",
      "typed confirmation process",
      "hold-to-confirm security",
      "session freshness requirements",
      "audit trail",
      "trade intent vs binding execution",
    ],
    nextSceneId: "act-8-success",
    microSceneIds: getMicroScenesForAct("act-7-authorize").map((s) => s.id),
  },

  "act-8-success": {
    id: "act-8-success",
    actNumber: 8,
    label: "Success & Settlement — The Proof Surface",
    routePattern: "/institutional/first-trade/success",
    requiredSelectors: ['[data-tour="settlement-confirmation"]'],
    groundedTopics: [
      "settlement case stages",
      "binding quote issuance",
      "custody allocation",
      "proof of ownership",
      "settlement timeline",
      "operations contact",
      "what happens next",
      "SHA-256 clearing certificate",
      "operational depth of settlement center",
    ],
    nextSceneId: null,
    microSceneIds: getMicroScenesForAct("act-8-success").map((s) => s.id),
  },
};

/** Ordered array of scenes for sequential access */
export const SCENE_ORDER = [
  "act-1-welcome",
  "act-2-organization",
  "act-3-verification",
  "act-4-funding",
  "act-5-marketplace",
  "act-6-review",
  "act-7-authorize",
  "act-8-success",
] as const;

/** Get scene by step index */
export function getSceneByIndex(index: number): DemoScene | null {
  const id = SCENE_ORDER[index];
  return id ? SCENE_REGISTRY[id] ?? null : null;
}

/** Get scene by route pathname */
export function getSceneByRoute(pathname: string): DemoScene | null {
  return Object.values(SCENE_REGISTRY).find(
    (s) => pathname.startsWith(s.routePattern),
  ) ?? null;
}
