/* ================================================================
   TOUR TYPES — Structured step definitions for cinematic tours
   
   Extended for the Glass Shield cinematic engine:
   - vapiScript: Exact narration text for Vapi voice
   - actLabel: Act heading (e.g. "ACT I — THE SOVEREIGN OFFTAKER")
   - delayMs: Delay before highlighting target
   - tooltipText: On-screen subtitle mirroring voice
   ================================================================ */

import type { UserRole } from "@/lib/mock-data";

/* ---------- Role Display Mapping ---------- */

export const ROLE_DISPLAY: Record<UserRole, string> = {
  INSTITUTION_TRADER: "Institutional Trader",
  INSTITUTION_TREASURY: "Institution Treasury",
  BROKER_DEALER_API: "Broker-Dealer API",
  buyer: "Participant / Buyer",
  seller: "Participant / Seller",
  treasury: "Treasury / Capital",
  compliance: "Risk / Supervisory",
  vault_ops: "Ops / Clearing Ops",
  admin: "Admin",
  offtaker: "Offtaker",
  producer: "Producer",
  REFINERY: "LBMA Refiner",
  MINE: "Mining Operator",
  BROKER: "LBMA Broker",
  INVESTOR: "Investor",
};

/* ---------- Step Completion Types ---------- */

export interface StepCompletionClick {
  type: "click";
  /** Selector for the element that must be clicked */
  target: string;
}

export interface StepCompletionRoute {
  type: "route";
  /** Path that must be navigated to */
  path: string;
}

export interface StepCompletionElement {
  type: "element";
  /** Selector for an element that must appear in the DOM */
  target: string;
}

export interface StepCompletionManual {
  type: "manual";
}

export type StepCompletion =
  | StepCompletionClick
  | StepCompletionRoute
  | StepCompletionElement
  | StepCompletionManual;

/* ---------- Step Structure ---------- */

export interface StepStructureItem {
  label: string;
  text: string;
}

export interface TourStep {
  /** Unique step identifier */
  id: string;
  /** Step title displayed in overlay */
  title: string;
  /** 1–2 sentence body text (optional for concierge-driven tours) */
  body?: string;
  /** Alias for body — used by concierge tours */
  content?: string;
  /** Optional structured Risk/Control/Why block (for major steps) */
  structure?: StepStructureItem[];
  /** Optional route to navigate to BEFORE showing this step */
  route?: string;
  /** Optional target selector — prefer [data-tour="..."] */
  target?: string;
  /** Overlay placement relative to target */
  placement: "top" | "right" | "bottom" | "left" | "center";
  /** How this step is completed / advanced (optional for concierge tours) */
  next?: StepCompletion;
  /** Optional guard conditions */
  guards?: {
    /** Only show if this element exists in DOM */
    elementExists?: string;
    /** Only show in demo mode */
    demoOnly?: boolean;
    /** Only show for these roles */
    roles?: UserRole[];
  };

  /* ─── Concierge / Orchestration Extensions ─── */

  /** Scene ID matching the demoSceneRegistry entry */
  sceneId?: string;
  /** DOM selectors that must exist before narration begins */
  requiredSelectors?: string[];

  /* ─── Cinematic Extensions ─── */

  /** Legacy: TTS script for Vapi narrator. Not used by the Google Live concierge flow. */
  vapiScript?: string;
  /** Act heading (e.g. "ACT I — THE SOVEREIGN OFFTAKER") */
  actLabel?: string;
  /** Delay (ms) before highlighting the target (e.g. KYB wait) */
  delayMs?: number;
  /** On-screen subtitle text that mirrors the voice narration */
  tooltipText?: string;

  /** Cinematic visual config */
  cinematic?: {
    spotlightRadius?: number;
    backdropBlur?: boolean;
    transition?: "fade" | "slide-right" | "slide-left" | "slide-up";
  };
}

/* ---------- Tour Definition ---------- */

export interface TourDefinition {
  /** Tour ID — matches the role ID (buyer, seller, admin, etc.) */
  id: string;
  /** Display name for the tour */
  name: string;
  /** Description shown on demo console */
  description: string;
  /** The UserRole this tour is for (optional for concierge tours) */
  role?: UserRole;
  /** Starting route for this tour (optional — concierge tours use step[0].route) */
  startRoute?: string;
  /** Ordered list of tour steps */
  steps: TourStep[];
  /** Preview path labels shown on demo console */
  previewPath?: string[];
  /** Whether this is a cinematic (Glass Shield) tour */
  cinematic?: boolean;
  /** Whether the Gemini Live concierge is enabled for this tour */
  conciergeEnabled?: boolean;
}

/* ---------- Tour Runtime State ---------- */

export type TourStatus = "idle" | "active" | "paused" | "completed";

export interface TourState {
  tourId: string | null;
  stepIndex: number;
  status: TourStatus;
  /** CSS selector for Gemini-driven element highlighting (concierge mode) */
  highlightSelector: string | null;
  /** Whether the Gemini concierge voice agent is active */
  conciergeActive: boolean;
  /** Key-value pairs set by the concierge via set_tour_state tool calls */
  conciergeSimulated: Record<string, string | number | boolean>;
}

export const INITIAL_TOUR_STATE: TourState = {
  tourId: null,
  stepIndex: 0,
  status: "idle",
  highlightSelector: null,
  conciergeActive: false,
  conciergeSimulated: {},
};
