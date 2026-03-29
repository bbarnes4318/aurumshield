/* ================================================================
   MICRO-SCENE DEFINITIONS — Granular scene breakdown per act

   Each macro act (8 total) is decomposed into ordered micro-scenes.
   A micro-scene is the atomic unit of the demo choreography:

   - route:                where we must be
   - requiredSelectors:    what DOM must contain
   - preActions:           tool calls fired BEFORE narration begins
   - narrationBlockId:     label matching the system instruction block
   - allowedInterruptions: how the user can interrupt
   - transitionCondition:  what triggers moving to the next micro-scene
   - exitActions:          tool calls fired AFTER narration ends
   - silenceRecoveryMs:    dead-air timeout (0 = disabled)

   All routes use ?demo=true — never ?demo=active.
   ================================================================ */

import type { ConciergeToolCall } from "../concierge/conciergeTypes";

/* ---------- Types ---------- */

export type InterruptionPolicy = "none" | "qa-only" | "full";
export type TransitionCondition = "auto" | "tool-call" | "user-action";

export interface MicroScene {
  /** Unique micro-scene ID: `act-{N}-{label}` */
  id: string;
  /** Parent act ID (matches tourStep.sceneId) */
  actId: string;
  /** Required route pathname (without query params) */
  route: string;
  /** DOM selectors that must exist before narration */
  requiredSelectors: string[];
  /** Tool calls fired BEFORE narration starts */
  preActions: ConciergeToolCall[];
  /** Label matching the system instruction narration block */
  narrationBlockId: string;
  /** What kind of user interruptions are allowed */
  allowedInterruptions: InterruptionPolicy;
  /** How this micro-scene completes */
  transitionCondition: TransitionCondition;
  /** Tool calls fired AFTER narration ends */
  exitActions: ConciergeToolCall[];
  /** Dead-air silence timeout in ms (0 = disabled) */
  silenceRecoveryMs: number;
}

/* ---------- Act I — Institutional Welcome ---------- */

const act1: MicroScene[] = [
  {
    id: "act-1-welcome",
    actId: "act-1-welcome",
    route: "/institutional/get-started/welcome",
    requiredSelectors: [],
    preActions: [],
    narrationBlockId: "act-1-opening",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [{ name: "advance_tour_step", args: {} }],
    silenceRecoveryMs: 8000,
  },
];

/* ---------- Act II — Organization & Entity Setup ---------- */

const act2: MicroScene[] = [
  {
    id: "act-2-navigate",
    actId: "act-2-organization",
    route: "/institutional/get-started/organization",
    requiredSelectors: ['[data-tour="entity-form"]'],
    preActions: [
      { name: "navigate_route", args: { route: "/institutional/get-started/organization?demo=true" } },
    ],
    narrationBlockId: "act-2-wait-for-route",
    allowedInterruptions: "none",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 0,
  },
  {
    id: "act-2-entity-form",
    actId: "act-2-organization",
    route: "/institutional/get-started/organization",
    requiredSelectors: ['[data-tour="entity-form"]'],
    preActions: [
      { name: "highlight_element", args: { selector: '[data-tour="entity-form"]', durationMs: 6000 } },
      { name: "fill_form_fields", args: { fields: { companyName: "Meridian Capital Holdings Ltd.", repName: "James C. Sterling", jurisdiction: "US" } } },
    ],
    narrationBlockId: "act-2-body",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [{ name: "advance_tour_step", args: {} }],
    silenceRecoveryMs: 8000,
  },
];

/* ---------- Act III — KYB / UBO / AML Perimeter ---------- */

const act3: MicroScene[] = [
  {
    id: "act-3-navigate",
    actId: "act-3-verification",
    route: "/institutional/get-started/verification",
    requiredSelectors: ['[data-tour="compliance-checklist"]'],
    preActions: [
      { name: "navigate_route", args: { route: "/institutional/get-started/verification?demo=true" } },
    ],
    narrationBlockId: "act-3-wait-for-route",
    allowedInterruptions: "none",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 0,
  },
  {
    id: "act-3-overview",
    actId: "act-3-verification",
    route: "/institutional/get-started/verification",
    requiredSelectors: ['[data-tour="compliance-checklist"]'],
    preActions: [
      { name: "highlight_element", args: { selector: '[data-tour="compliance-checklist"]', durationMs: 5000 } },
    ],
    narrationBlockId: "act-3-opening",
    allowedInterruptions: "qa-only",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 8000,
  },
  {
    id: "act-3-documents",
    actId: "act-3-verification",
    route: "/institutional/get-started/verification",
    requiredSelectors: ['[data-tour="compliance-checklist"]'],
    preActions: [
      { name: "open_demo_panel", args: { panelId: "documents" } },
    ],
    narrationBlockId: "act-3-documents",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [
      { name: "close_demo_panel", args: { panelId: "documents" } },
      { name: "set_checklist_item_state", args: { itemKey: "entityVerificationPassed", status: "done" } },
    ],
    silenceRecoveryMs: 12000,
  },
  {
    id: "act-3-ubo",
    actId: "act-3-verification",
    route: "/institutional/get-started/verification",
    requiredSelectors: ['[data-tour="compliance-checklist"]'],
    preActions: [
      { name: "open_demo_panel", args: { panelId: "ubo" } },
    ],
    narrationBlockId: "act-3-ubo",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [
      { name: "close_demo_panel", args: { panelId: "ubo" } },
      { name: "set_checklist_item_state", args: { itemKey: "uboReviewPassed", status: "done" } },
    ],
    silenceRecoveryMs: 12000,
  },
  {
    id: "act-3-sanctions",
    actId: "act-3-verification",
    route: "/institutional/get-started/verification",
    requiredSelectors: ['[data-tour="compliance-checklist"]'],
    preActions: [
      { name: "open_demo_panel", args: { panelId: "sanctions" } },
    ],
    narrationBlockId: "act-3-sanctions",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [
      { name: "close_demo_panel", args: { panelId: "sanctions" } },
      { name: "set_checklist_item_state", args: { itemKey: "screeningPassed", status: "done" } },
    ],
    silenceRecoveryMs: 12000,
  },
  {
    id: "act-3-decision",
    actId: "act-3-verification",
    route: "/institutional/get-started/verification",
    requiredSelectors: ['[data-tour="compliance-checklist"]'],
    preActions: [
      { name: "set_checklist_item_state", args: { itemKey: "complianceReviewPassed", status: "done" } },
    ],
    narrationBlockId: "act-3-decision",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [{ name: "advance_tour_step", args: {} }],
    silenceRecoveryMs: 8000,
  },
];

/* ---------- Act IV — Funding Rail Configuration ---------- */

const act4: MicroScene[] = [
  {
    id: "act-4-navigate",
    actId: "act-4-funding",
    route: "/institutional/get-started/funding",
    requiredSelectors: ['[data-tour="funding-methods"]'],
    preActions: [
      { name: "navigate_route", args: { route: "/institutional/get-started/funding?demo=true" } },
    ],
    narrationBlockId: "act-4-wait-for-route",
    allowedInterruptions: "none",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 0,
  },
  {
    id: "act-4-selection",
    actId: "act-4-funding",
    route: "/institutional/get-started/funding",
    requiredSelectors: ['[data-tour="funding-methods"]'],
    preActions: [
      { name: "highlight_element", args: { selector: '[data-tour="funding-methods"]', durationMs: 5000 } },
    ],
    narrationBlockId: "act-4-opening",
    allowedInterruptions: "qa-only",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 8000,
  },
  {
    id: "act-4-config",
    actId: "act-4-funding",
    route: "/institutional/get-started/funding",
    requiredSelectors: ['[data-tour="funding-methods"]'],
    preActions: [
      { name: "select_card_option", args: { cardId: "digital_stablecoin" } },
      { name: "fill_form_fields", args: { fields: { "funding-asset": "USDC", "funding-network": "ethereum", "funding-wallet": "0x8C3d2E9b4F1A7c6D5e0B2f8A9c4D7E1F3b6A8c2D" } } },
    ],
    narrationBlockId: "act-4-body",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [{ name: "advance_tour_step", args: {} }],
    silenceRecoveryMs: 8000,
  },
];

/* ---------- Act V — Marketplace: The Cinematic Centerpiece ---------- */

const act5: MicroScene[] = [
  // 5.0 — Navigate to marketplace
  {
    id: "act-5-navigate",
    actId: "act-5-marketplace",
    route: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    preActions: [
      { name: "navigate_route", args: { route: "/institutional/marketplace?demo=true" } },
    ],
    narrationBlockId: "act-5-wait-for-route",
    allowedInterruptions: "none",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 0,
  },
  // 5.1 — Hero moment: let the gold imagery breathe
  {
    id: "act-5-hero",
    actId: "act-5-marketplace",
    route: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    preActions: [
      { name: "highlight_element", args: { selector: '[data-tour="cinematic-lbma-400oz"]', durationMs: 8000 } },
      { name: "set_tour_state", args: { key: "__marketplacePhase", value: "hero" } },
    ],
    narrationBlockId: "act-5-hero-moment",
    allowedInterruptions: "qa-only",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 8000,
  },
  // 5.2 — Auto-select 400oz LBMA bar
  {
    id: "act-5-asset-select",
    actId: "act-5-marketplace",
    route: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    preActions: [
      { name: "select_card_option", args: { cardId: "lbma-400oz" } },
      { name: "set_tour_state", args: { key: "__marketplacePhase", value: "asset-select" } },
    ],
    narrationBlockId: "act-5-asset-selected",
    allowedInterruptions: "qa-only",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 8000,
  },
  // 5.3 — Set custody to Zurich vaulting
  {
    id: "act-5-custody",
    actId: "act-5-marketplace",
    route: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    preActions: [
      { name: "set_tour_state", args: { key: "__marketplacePhase", value: "custody-set" } },
    ],
    narrationBlockId: "act-5-custody-delivery",
    allowedInterruptions: "qa-only",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 8000,
  },
  // 5.4 — Set settlement rail (USDT stablecoin)
  {
    id: "act-5-rail",
    actId: "act-5-marketplace",
    route: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    preActions: [
      { name: "set_tour_state", args: { key: "__marketplacePhase", value: "rail-set" } },
    ],
    narrationBlockId: "act-5-settlement-rail",
    allowedInterruptions: "qa-only",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 8000,
  },
  // 5.5 — Animate cost derivation line by line
  {
    id: "act-5-cost",
    actId: "act-5-marketplace",
    route: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    preActions: [
      { name: "set_tour_state", args: { key: "__marketplacePhase", value: "cost-animate" } },
    ],
    narrationBlockId: "act-5-cost-derivation",
    allowedInterruptions: "qa-only",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 8000,
  },
  // 5.6 — Total reveal and handoff to review
  {
    id: "act-5-total",
    actId: "act-5-marketplace",
    route: "/institutional/marketplace",
    requiredSelectors: ['[data-tour="cinematic-lbma-400oz"]'],
    preActions: [
      { name: "set_tour_state", args: { key: "__marketplacePhase", value: "total-reveal" } },
    ],
    narrationBlockId: "act-5-total-and-handoff",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [
      { name: "set_tour_state", args: { key: "__marketplacePhase", value: "complete" } },
      { name: "advance_tour_step", args: {} },
    ],
    silenceRecoveryMs: 8000,
  },
];

/* ---------- Act VI — Commercial Review ---------- */

const act6: MicroScene[] = [
  {
    id: "act-6-navigate",
    actId: "act-6-review",
    route: "/institutional/first-trade/review",
    requiredSelectors: [],
    preActions: [
      { name: "navigate_route", args: { route: "/institutional/first-trade/review?demo=true" } },
    ],
    narrationBlockId: "act-6-wait-for-route",
    allowedInterruptions: "none",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 0,
  },
  {
    id: "act-6-review",
    actId: "act-6-review",
    route: "/institutional/first-trade/review",
    requiredSelectors: [],
    preActions: [
      { name: "highlight_element", args: { selector: '[data-tour="review-summary"]', durationMs: 8000 } },
    ],
    narrationBlockId: "act-6-body",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [{ name: "advance_tour_step", args: {} }],
    silenceRecoveryMs: 8000,
  },
];

/* ---------- Act VII — Authorization Boundary (STRICT) ---------- */

const act7: MicroScene[] = [
  {
    id: "act-7-navigate",
    actId: "act-7-authorize",
    route: "/institutional/first-trade/authorize",
    requiredSelectors: ['[data-tour="review-ticket"]'],
    preActions: [
      { name: "navigate_route", args: { route: "/institutional/first-trade/authorize?demo=true" } },
    ],
    narrationBlockId: "act-7-wait-for-route",
    allowedInterruptions: "none",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 0,
  },
  {
    id: "act-7-boundary",
    actId: "act-7-authorize",
    route: "/institutional/first-trade/authorize",
    requiredSelectors: ['[data-tour="review-ticket"]'],
    preActions: [
      { name: "highlight_element", args: { selector: '[data-tour="review-ticket"]', durationMs: 10000 } },
    ],
    narrationBlockId: "act-7-body",
    allowedInterruptions: "full",
    transitionCondition: "tool-call",
    exitActions: [
      { name: "set_voice_mode", args: { mode: "paused" } },
    ],
    // STRICT: No auto-advance. 15s silence timeout (longer than default).
    // The system instruction handles the pause; we don't auto-advance here.
    silenceRecoveryMs: 15000,
  },
  {
    id: "act-7-proceed",
    actId: "act-7-authorize",
    route: "/institutional/first-trade/authorize",
    requiredSelectors: ['[data-tour="review-ticket"]'],
    preActions: [
      { name: "set_voice_mode", args: { mode: "narrating" } },
    ],
    narrationBlockId: "act-7-closing",
    allowedInterruptions: "qa-only",
    transitionCondition: "tool-call",
    exitActions: [{ name: "advance_tour_step", args: {} }],
    silenceRecoveryMs: 0,
  },
];

/* ---------- Act VIII — Success + Settlement ---------- */

const act8: MicroScene[] = [
  {
    id: "act-8-navigate",
    actId: "act-8-success",
    route: "/institutional/first-trade/success",
    requiredSelectors: [],
    preActions: [
      { name: "navigate_route", args: { route: "/institutional/first-trade/success?demo=true" } },
    ],
    narrationBlockId: "act-8-wait-for-route",
    allowedInterruptions: "none",
    transitionCondition: "auto",
    exitActions: [],
    silenceRecoveryMs: 0,
  },
  {
    id: "act-8-confirmation",
    actId: "act-8-success",
    route: "/institutional/first-trade/success",
    requiredSelectors: [],
    preActions: [
      { name: "highlight_element", args: { selector: '[data-tour="settlement-confirmation"]', durationMs: 6000 } },
      { name: "trigger_settlement_stage", args: { stage: "CASE_OPENED" } },
    ],
    narrationBlockId: "act-8-body",
    allowedInterruptions: "full",
    transitionCondition: "tool-call",
    exitActions: [
      { name: "set_voice_mode", args: { mode: "listening" } },
    ],
    silenceRecoveryMs: 10000,
  },
];

/* ---------- Exports ---------- */

/** All micro-scenes in execution order */
export const ALL_MICRO_SCENES: MicroScene[] = [
  ...act1,
  ...act2,
  ...act3,
  ...act4,
  ...act5,
  ...act6,
  ...act7,
  ...act8,
];

/** Get micro-scenes for a specific act */
export function getMicroScenesForAct(actId: string): MicroScene[] {
  return ALL_MICRO_SCENES.filter((s) => s.actId === actId);
}

/** Get a micro-scene by ID */
export function getMicroSceneById(id: string): MicroScene | null {
  return ALL_MICRO_SCENES.find((s) => s.id === id) ?? null;
}

/** Get the next micro-scene after a given ID */
export function getNextMicroScene(currentId: string): MicroScene | null {
  const idx = ALL_MICRO_SCENES.findIndex((s) => s.id === currentId);
  if (idx === -1 || idx >= ALL_MICRO_SCENES.length - 1) return null;
  return ALL_MICRO_SCENES[idx + 1];
}

/** Total micro-scene count */
export const TOTAL_MICRO_SCENES = ALL_MICRO_SCENES.length;
