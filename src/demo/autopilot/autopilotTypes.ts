/* ================================================================
   AUTOPILOT TYPES — State machine & choreography definitions
   for the Zero-Touch Automated Demo Engine
   
   Rules:
   1. All phases are sequential — no branching.
   2. DomActions execute in array order within each step.
   3. Vapi script fires AFTER all DomActions complete.
   4. The engine waits for Vapi speech to finish before ADVANCE.
   ================================================================ */

/* ---------- Phases ---------- */

export enum AutopilotPhase {
  PERIMETER = "PERIMETER",
  ORIGINATION = "ORIGINATION",
  MARKETPLACE = "MARKETPLACE",
  ATOMIC_SWAP = "ATOMIC_SWAP",
  LOGISTICS = "LOGISTICS",
  TREASURY = "TREASURY",
}

export const PHASE_LABELS: Record<AutopilotPhase, string> = {
  [AutopilotPhase.PERIMETER]: "Perimeter Authentication",
  [AutopilotPhase.ORIGINATION]: "Doré Origination",
  [AutopilotPhase.MARKETPLACE]: "Institutional Marketplace",
  [AutopilotPhase.ATOMIC_SWAP]: "Atomic DvP Execution",
  [AutopilotPhase.LOGISTICS]: "Armored Logistics Telemetry",
  [AutopilotPhase.TREASURY]: "Treasury Finality",
};

export const PHASE_ORDER: AutopilotPhase[] = [
  AutopilotPhase.PERIMETER,
  AutopilotPhase.ORIGINATION,
  AutopilotPhase.MARKETPLACE,
  AutopilotPhase.ATOMIC_SWAP,
  AutopilotPhase.LOGISTICS,
  AutopilotPhase.TREASURY,
];

/* ---------- DOM Action Types ---------- */

export interface DomActionTypeText {
  type: "type_text";
  selector: string;
  text: string;
  charDelayMs?: number;
}

export interface DomActionHighlight {
  type: "highlight";
  selector: string;
  durationMs?: number;
}

export interface DomActionClick {
  type: "click";
  selector: string;
}

export interface DomActionFlashBadge {
  type: "flash_badge";
  selector: string;
  fromText: string;
  toText: string;
  colorClass?: string;
}

export interface DomActionScrollTo {
  type: "scroll_to";
  selector: string;
}

export interface DomActionSimulateWebhook {
  type: "simulate_webhook";
  /** Key in AutopilotState.simulatedState to mutate */
  stateKey: string;
  /** Value to set */
  stateValue: unknown;
}

export interface DomActionSetState {
  type: "set_state";
  stateKey: string;
  stateValue: unknown;
}

export interface DomActionTypeTerminal {
  type: "type_terminal";
  selector: string;
  lines: string[];
  lineDelayMs?: number;
}

export interface DomActionWait {
  type: "wait";
  durationMs: number;
}

export type DomAction =
  | DomActionTypeText
  | DomActionHighlight
  | DomActionClick
  | DomActionFlashBadge
  | DomActionScrollTo
  | DomActionSimulateWebhook
  | DomActionSetState
  | DomActionTypeTerminal
  | DomActionWait;

/* ---------- Step Definition ---------- */

export interface AutopilotStep {
  /** Unique step identifier */
  id: string;
  /** Phase this step belongs to */
  phase: AutopilotPhase;
  /** Next.js route to navigate to (without ?demo=true suffix) */
  route: string;
  /** Exact TTS string for the Vapi voice agent */
  vapiScript: string;
  /** Ordered list of DOM mutations to execute before speaking */
  domActions: DomAction[];
  /** Optional delay (ms) after navigation before executing DOM actions */
  navigationDelayMs?: number;
  /** Optional human-readable label for the overlay */
  label?: string;
}

/* ---------- Engine State ---------- */

export type AutopilotStatus =
  | "idle"
  | "navigating"
  | "animating"
  | "speaking"
  | "waiting"
  | "paused"
  | "completed"
  | "aborted";

export interface AutopilotState {
  status: AutopilotStatus;
  currentPhaseIndex: number;
  stepIndex: number;
  totalSteps: number;
  /** Client-side simulated state — webhook responses, badge states, etc. */
  simulatedState: Record<string, unknown>;
}

export const INITIAL_AUTOPILOT_STATE: AutopilotState = {
  status: "idle",
  currentPhaseIndex: 0,
  stepIndex: 0,
  totalSteps: 0,
  simulatedState: {},
};

/* ---------- Reducer Actions ---------- */

export type AutopilotAction =
  | { type: "START"; totalSteps: number }
  | { type: "NAVIGATE" }
  | { type: "ANIMATE" }
  | { type: "SPEAK" }
  | { type: "ADVANCE" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "ABORT" }
  | { type: "COMPLETE" }
  | { type: "SET_SIMULATED"; key: string; value: unknown };
