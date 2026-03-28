/* ================================================================
   CONCIERGE TYPES — Type definitions for the Gemini Live voice agent
   
   Defines the structured tool calls that the Gemini agent can emit
   to control the tour engine in real-time.
   ================================================================ */

/* ---------- Session Status ---------- */

export type ConciergeStatus =
  | "idle"
  | "connecting"
  | "active"
  | "interrupted"
  | "error";

/* ---------- Tool Call Types ---------- */

/**
 * Advance the tour to the next step, or jump to a specific step index.
 * Emitted by Gemini when narration reaches a transition point.
 */
export interface AdvanceTourStepCall {
  name: "advance_tour_step";
  args: {
    /** Optional step index to jump to. If omitted, advances to next step. */
    stepIndex?: number;
  };
}

/**
 * Highlight a specific DOM element with the Glass Shield spotlight.
 * Emitted by Gemini to draw the viewer's attention during narration.
 */
export interface HighlightElementCall {
  name: "highlight_element";
  args: {
    /** CSS selector or data-tour attribute value for the target element */
    selector: string;
    /** Optional duration in ms before auto-clearing the highlight */
    durationMs?: number;
  };
}

/**
 * Navigate the application to a specific route.
 * Used when the agent needs to move to a different page.
 */
export interface NavigateRouteCall {
  name: "navigate_route";
  args: {
    /** The route path to navigate to */
    route: string;
  };
}

/**
 * Set arbitrary key-value state visible to the tour engine.
 * Used for triggering simulated state changes (e.g., showing a
 * compliance badge, updating a price ticker).
 */
export interface SetTourStateCall {
  name: "set_tour_state";
  args: {
    key: string;
    value: string | number | boolean;
  };
}

/** Union of all tool calls the Gemini concierge can emit */
export type ConciergeToolCall =
  | AdvanceTourStepCall
  | HighlightElementCall
  | NavigateRouteCall
  | SetTourStateCall;

/* ---------- Callback Signatures ---------- */

/** Callback fired when Gemini emits a tool call */
export type OnToolCallFn = (call: ConciergeToolCall) => void;

/** Callback fired when concierge status changes */
export type OnStatusChangeFn = (status: ConciergeStatus) => void;

import { Type, type FunctionDeclaration } from "@google/genai";

const advanceTourStep: FunctionDeclaration = {
  name: "advance_tour_step",
  description:
    "Advance the interactive tour to the next step or jump to a specific step. " +
    "Call this exactly when you finish narrating the current step and are ready " +
    "to transition the UI to the next visual state.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      stepIndex: {
        type: Type.NUMBER,
        description:
          "Optional zero-based step index to jump to. Omit to advance to the next sequential step.",
      },
    },
  },
};

const highlightElement: FunctionDeclaration = {
  name: "highlight_element",
  description:
    "Spotlight a specific UI element with a gold glow ring to draw the viewer's " +
    "attention. Use this when you are about to discuss a particular button, panel, " +
    "or data field on screen.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      selector: {
        type: Type.STRING,
        description:
          'CSS selector for the target element. Prefer data-tour attributes, e.g. \'[data-tour="settlement-amount"]\'.',
      },
      durationMs: {
        type: Type.NUMBER,
        description:
          "Duration in milliseconds before the highlight auto-clears. Defaults to 4000.",
      },
    },
    required: ["selector"],
  },
};

const navigateRoute: FunctionDeclaration = {
  name: "navigate_route",
  description:
    "Navigate the application to a different page. Use this when the tour needs " +
    "to move to a new section of the platform.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description: "The route path to navigate to, e.g. '/transactions/new'.",
      },
    },
    required: ["route"],
  },
};

const setTourState: FunctionDeclaration = {
  name: "set_tour_state",
  description:
    "Set a key-value pair in the tour's simulated state. Use this to trigger " +
    "visual state changes like showing compliance badges, updating price tickers, " +
    "or simulating webhook events.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      key: {
        type: Type.STRING,
        description: "The state key to set.",
      },
      value: {
        type: Type.STRING,
        description: "The value to set (will be parsed as string, number, or boolean).",
      },
    },
    required: ["key", "value"],
  },
};

/**
 * Function declarations sent to Gemini Live API in the session config.
 * These define what tools the agent can invoke.
 */
export const CONCIERGE_TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      advanceTourStep,
      highlightElement,
      navigateRoute,
      setTourState,
    ],
  },
];

/* ---------- System Instruction ---------- */

export const CONCIERGE_SYSTEM_INSTRUCTION =
  "You are the AurumShield Concierge — a world-class institutional gold settlement specialist " +
  "guiding ultra-high-net-worth clients through the Goldwire Settlement Network. " +
  "You speak with the measured authority of a senior private banker at a Swiss institution. " +
  "Your tone is calm, precise, and deeply knowledgeable. Never rush. Never use filler words. " +
  "Never say 'um', 'uh', 'so', 'like', or 'you know'. " +
  "\n\n" +
  "CRITICAL RULES:\n" +
  "1. You MUST call advance_tour_step when you finish narrating a step and are ready to move on.\n" +
  "2. You MUST call highlight_element BEFORE you start discussing a specific UI element.\n" +
  "3. Call navigate_route when changing pages. Always call it BEFORE narrating the new page.\n" +
  "4. Call set_tour_state to trigger simulated events (compliance checks, price updates, etc.).\n" +
  "5. Tool calls and speech happen in parallel — call tools IMMEDIATELY, do NOT wait for speech to finish.\n" +
  "6. Keep responses concise. Each step narration should be 2-4 sentences maximum.\n" +
  "7. Use precise financial terminology: 'settlement', 'execution', 'counterparty', 'custody'.\n" +
  "8. If the user asks a question, answer it, then resume the tour by calling advance_tour_step.\n";
