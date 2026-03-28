/* ================================================================
   CONCIERGE TYPES — Type definitions for the Gemini Live voice agent
   
   Defines the structured tool calls that the Gemini agent can emit
   to control the tour engine in real-time.
   
   EXPANDED: 18 total tool calls for the 8-act cinematic demo.
   ================================================================ */

/* ---------- Session Status ---------- */

export type ConciergeStatus =
  | "idle"
  | "connecting"
  | "active"
  | "interrupted"
  | "error";

/* ---------- Tool Call Types ---------- */

/** Advance the tour to the next step, or jump to a specific step index. */
export interface AdvanceTourStepCall {
  name: "advance_tour_step";
  args: { stepIndex?: number };
}

/** Highlight a specific DOM element with the Glass Shield spotlight. */
export interface HighlightElementCall {
  name: "highlight_element";
  args: { selector: string; durationMs?: number };
}

/** Navigate the application to a specific route. */
export interface NavigateRouteCall {
  name: "navigate_route";
  args: { route: string };
}

/** Set arbitrary key-value state visible to the tour engine. */
export interface SetTourStateCall {
  name: "set_tour_state";
  args: { key: string; value: string | number | boolean };
}

/** Auto-populate form inputs during org/funding steps. */
export interface FillFormFieldsCall {
  name: "fill_form_fields";
  args: { fields: Record<string, string> };
}

/** Select an asset card, funding card, or any choice element. */
export interface SelectCardOptionCall {
  name: "select_card_option";
  args: { cardId: string };
}

/** Flip a compliance milestone checklist item state. */
export interface SetChecklistItemStateCall {
  name: "set_checklist_item_state";
  args: { itemKey: string; status: "done" | "active" | "pending" };
}

/** Open a verification evidence panel by ID. */
export interface OpenDemoPanelCall {
  name: "open_demo_panel";
  args: { panelId: string };
}

/** Close a verification evidence panel by ID. */
export interface CloseDemoPanelCall {
  name: "close_demo_panel";
  args: { panelId: string };
}

/** Animate a document/screening card into view. */
export interface RevealEvidenceItemCall {
  name: "reveal_evidence_item";
  args: { itemId: string; delay?: number };
}

/** Trigger a count-up animation on a metric element. */
export interface AnimateMetricCall {
  name: "animate_metric";
  args: { metricId: string; from: number; to: number; durationMs?: number };
}

/** Pre-stage a navigation through the orchestrator. */
export interface QueueRouteTransitionCall {
  name: "queue_route_transition";
  args: { route: string; delayMs?: number };
}

/** Switch voice mode between narrating, listening, or paused. */
export interface SetVoiceModeCall {
  name: "set_voice_mode";
  args: { mode: "narrating" | "listening" | "paused" };
}

/** Lock highlight to a region during extended narration. */
export interface PinFocusRegionCall {
  name: "pin_focus_region";
  args: { selector: string };
}

/** Begin an animated number counter on a target element. */
export interface StartCountupCall {
  name: "start_countup";
  args: { targetId: string; endValue: number; suffix?: string };
}

/** Set the review page to a specific display state. */
export interface TriggerReviewStateCall {
  name: "trigger_review_state";
  args: { state: "loading" | "populated" | "ready" };
}

/** Advance the settlement case visual to a pipeline stage. */
export interface TriggerSettlementStageCall {
  name: "trigger_settlement_stage";
  args: { stage: string };
}

/** Push a subtitle line synchronized with narration. */
export interface SyncSubtitleBlockCall {
  name: "sync_subtitle_block";
  args: { text: string; durationMs?: number };
}

/** Union of all tool calls the Gemini concierge can emit */
export type ConciergeToolCall =
  | AdvanceTourStepCall
  | HighlightElementCall
  | NavigateRouteCall
  | SetTourStateCall
  | FillFormFieldsCall
  | SelectCardOptionCall
  | SetChecklistItemStateCall
  | OpenDemoPanelCall
  | CloseDemoPanelCall
  | RevealEvidenceItemCall
  | AnimateMetricCall
  | QueueRouteTransitionCall
  | SetVoiceModeCall
  | PinFocusRegionCall
  | StartCountupCall
  | TriggerReviewStateCall
  | TriggerSettlementStageCall
  | SyncSubtitleBlockCall;

/* ---------- Callback Signatures ---------- */

export type OnToolCallFn = (call: ConciergeToolCall) => void;
export type OnStatusChangeFn = (status: ConciergeStatus) => void;

/* ---------- Gemini Function Declarations ---------- */

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
    "to move to a new section of the platform. Always use ?demo=true.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description: "The route path to navigate to, e.g. '/institutional/get-started/organization?demo=true'.",
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

const fillFormFields: FunctionDeclaration = {
  name: "fill_form_fields",
  description:
    "Auto-populate form input fields with demonstration data. Used during " +
    "organization setup and funding configuration steps.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fields: {
        type: Type.OBJECT,
        description:
          "Key-value map of field IDs to values. Keys are input element IDs.",
        properties: {},
      },
    },
    required: ["fields"],
  },
};

const selectCardOption: FunctionDeclaration = {
  name: "select_card_option",
  description:
    "Select a specific card option in the UI, such as an asset tier card, " +
    "a funding method card, or a delivery option.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      cardId: {
        type: Type.STRING,
        description:
          'ID of the card to select. e.g. "lbma-400oz", "digital_stablecoin", "VAULT".',
      },
    },
    required: ["cardId"],
  },
};

const setChecklistItemState: FunctionDeclaration = {
  name: "set_checklist_item_state",
  description:
    "Set the visual state of a compliance checklist item in the verification screen.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemKey: {
        type: Type.STRING,
        description:
          'Key of the checklist item. e.g. "entityVerificationPassed", "uboReviewPassed".',
      },
      status: {
        type: Type.STRING,
        description: 'Target status: "done", "active", or "pending".',
      },
    },
    required: ["itemKey", "status"],
  },
};

const openDemoPanel: FunctionDeclaration = {
  name: "open_demo_panel",
  description:
    "Open a demo evidence panel overlay. Used to show KYB documents, " +
    "UBO structures, sanctions screening, or source of funds review panels.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      panelId: {
        type: Type.STRING,
        description:
          'Panel identifier: "documents", "ubo", "sanctions", "source-of-funds", "compliance-decision".',
      },
    },
    required: ["panelId"],
  },
};

const closeDemoPanel: FunctionDeclaration = {
  name: "close_demo_panel",
  description: "Close an open demo evidence panel.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      panelId: {
        type: Type.STRING,
        description: "Panel identifier to close.",
      },
    },
    required: ["panelId"],
  },
};

const revealEvidenceItem: FunctionDeclaration = {
  name: "reveal_evidence_item",
  description:
    "Animate a specific evidence item into view within an open panel. " +
    "Used for progressive disclosure of compliance evidence.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemId: {
        type: Type.STRING,
        description: "ID of the evidence item to reveal.",
      },
      delay: {
        type: Type.NUMBER,
        description: "Optional delay in milliseconds before revealing.",
      },
    },
    required: ["itemId"],
  },
};

const animateMetric: FunctionDeclaration = {
  name: "animate_metric",
  description:
    "Trigger a count-up animation on a financial metric display. " +
    "Used to animate cost derivation rows.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      metricId: {
        type: Type.STRING,
        description: "ID of the metric element to animate.",
      },
      from: {
        type: Type.NUMBER,
        description: "Starting value.",
      },
      to: {
        type: Type.NUMBER,
        description: "Target value.",
      },
      durationMs: {
        type: Type.NUMBER,
        description: "Animation duration in ms. Defaults to 1500.",
      },
    },
    required: ["metricId", "from", "to"],
  },
};

const queueRouteTransition: FunctionDeclaration = {
  name: "queue_route_transition",
  description:
    "Pre-stage a route navigation through the orchestrator. The transition " +
    "will be delayed and coordinated to avoid narration/UI drift.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      route: {
        type: Type.STRING,
        description: "The route to navigate to.",
      },
      delayMs: {
        type: Type.NUMBER,
        description: "Delay before navigation in ms. Defaults to 0.",
      },
    },
    required: ["route"],
  },
};

const setVoiceMode: FunctionDeclaration = {
  name: "set_voice_mode",
  description:
    "Signal the UI about the agent's current speaking mode. " +
    "Use 'paused' before critical user interactions like legal scroll or typed confirmation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: {
        type: Type.STRING,
        description: '"narrating", "listening", or "paused".',
      },
    },
    required: ["mode"],
  },
};

const pinFocusRegion: FunctionDeclaration = {
  name: "pin_focus_region",
  description:
    "Lock the highlight spotlight to a display region during extended narration. " +
    "Unlike highlight_element which auto-clears, this persists until explicitly changed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      selector: {
        type: Type.STRING,
        description: "CSS selector for the region to pin.",
      },
    },
    required: ["selector"],
  },
};

const startCountup: FunctionDeclaration = {
  name: "start_countup",
  description:
    "Begin an animated number counter on a target element, used for " +
    "displaying financial totals with visual impact.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetId: {
        type: Type.STRING,
        description: "ID of the element to animate.",
      },
      endValue: {
        type: Type.NUMBER,
        description: "Final numeric value.",
      },
      suffix: {
        type: Type.STRING,
        description: 'Optional suffix like "USD" or "%".',
      },
    },
    required: ["targetId", "endValue"],
  },
};

const triggerReviewState: FunctionDeclaration = {
  name: "trigger_review_state",
  description:
    "Set the first-trade review page to a specific display state to " +
    "coordinate visual flow with narration.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      state: {
        type: Type.STRING,
        description: '"loading", "populated", or "ready".',
      },
    },
    required: ["state"],
  },
};

const triggerSettlementStage: FunctionDeclaration = {
  name: "trigger_settlement_stage",
  description:
    "Advance the settlement case visualization to a specific pipeline stage.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      stage: {
        type: Type.STRING,
        description:
          'Settlement stage identifier, e.g. "CASE_OPENED", "QUOTE_ISSUED", "FUNDS_VERIFIED", "CUSTODY_ALLOCATED".',
      },
    },
    required: ["stage"],
  },
};

const syncSubtitleBlock: FunctionDeclaration = {
  name: "sync_subtitle_block",
  description:
    "Push a subtitle line synchronized with the current narration point. " +
    "Used for precise subtitle control during critical moments.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: {
        type: Type.STRING,
        description: "Subtitle text to display.",
      },
      durationMs: {
        type: Type.NUMBER,
        description: "How long to show the subtitle in ms. Defaults to 4000.",
      },
    },
    required: ["text"],
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
      fillFormFields,
      selectCardOption,
      setChecklistItemState,
      openDemoPanel,
      closeDemoPanel,
      revealEvidenceItem,
      animateMetric,
      queueRouteTransition,
      setVoiceMode,
      pinFocusRegion,
      startCountup,
      triggerReviewState,
      triggerSettlementStage,
      syncSubtitleBlock,
    ],
  },
];

/* ---------- System Instruction ---------- */

import { buildConciergeSystemInstruction } from "../tours/institutional-concierge";

/**
 * The full system instruction for the Gemini Live agent.
 * Built from the choreography file — contains verbatim scripts and
 * exact tool call sequences for each of the 8 demo acts.
 */
export const CONCIERGE_SYSTEM_INSTRUCTION = buildConciergeSystemInstruction();
