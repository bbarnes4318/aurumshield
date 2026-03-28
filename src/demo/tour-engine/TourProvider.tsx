/* ================================================================
   TOUR PROVIDER — State machine + context for tour runtime
   
   Manages: current step, navigation (next/back/jump), route 
   transitions, target resolution with retry. State persisted to 
   sessionStorage and synced with URL params.
   
   Concierge Mode: Integrates the Gemini Live voice agent via
   useConciergeVoice. Tool calls from the AI agent (advance_tour_step,
   highlight_element, navigate_route, set_tour_state) dispatch directly
   into the reducer for instant UI updates.
   
   Exposes: startTour, nextStep, prevStep, jumpToStep, 
   pauseTour, resumeTour, exitTour, restartTour, concierge.
   ================================================================ */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type {
  TourState,
  TourStep,
  TourDefinition,
  TourStatus,
} from "./tourTypes";
import { INITIAL_TOUR_STATE } from "./tourTypes";
import { getTourForRole } from "../tours";
import { useConciergeVoice } from "../concierge/useConciergeVoice";
import type { ConciergeToolCall, ConciergeStatus } from "../concierge/conciergeTypes";

/* ---------- Context Shape ---------- */

interface ConciergeControls {
  /** Current concierge session status */
  status: ConciergeStatus;
  /** Start the voice concierge session (requests mic permission) */
  startSession: () => Promise<void>;
  /** End the voice concierge session */
  endSession: () => void;
  /** Whether the AI agent is currently speaking */
  isSpeaking: boolean;
  /** Volume level for waveform display (0-1) */
  volumeLevel: number;
  /** Real-time transcript of what the AI is saying */
  activeTranscript: string;
  /** True if voice failed and UI should show manual 'Click to continue' */
  fallbackMode: boolean;
  /** Re-attempt voice connection after failure */
  retrySession: () => Promise<void>;
}

interface TourContextValue {
  /** Current tour state */
  state: TourState;
  /** Current tour definition (null if no tour active) */
  tour: TourDefinition | null;
  /** Current step definition (null if no tour active) */
  currentStep: TourStep | null;
  /** Total steps in current tour */
  totalSteps: number;
  /** Start a tour by role ID */
  startTour: (roleId: string) => void;
  /** Advance to next step */
  nextStep: () => void;
  /** Go back to previous step */
  prevStep: () => void;
  /** Jump to a specific step index */
  jumpToStep: (index: number) => void;
  /** Pause the tour */
  pauseTour: () => void;
  /** Resume the tour */
  resumeTour: () => void;
  /** Exit the tour entirely */
  exitTour: () => void;
  /** Restart the current tour from step 0 */
  restartTour: () => void;
  /** Mark current step as completed (used by click/element observers) */
  completeCurrentStep: () => void;
  /** Gemini Live voice concierge controls */
  concierge: ConciergeControls;
}

const TourContext = createContext<TourContextValue | null>(null);

/* ---------- Hook ---------- */

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within <TourProvider>");
  return ctx;
}

/* ---------- Reducer ---------- */

type TourAction =
  | { type: "START"; tourId: string; stepIndex?: number }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "JUMP"; index: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "EXIT" }
  | { type: "COMPLETE" }
  | { type: "SET_HIGHLIGHT"; selector: string | null }
  | { type: "SET_CONCIERGE_ACTIVE"; active: boolean }
  | { type: "SET_SIMULATED"; key: string; value: string | number | boolean }
  | { type: "TOOL_CALL"; call: ConciergeToolCall };

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case "START":
      return {
        ...INITIAL_TOUR_STATE,
        tourId: action.tourId,
        stepIndex: action.stepIndex ?? 0,
        status: "active",
      };
    case "NEXT":
      return { ...state, stepIndex: state.stepIndex + 1 };
    case "PREV":
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case "JUMP":
      return { ...state, stepIndex: action.index };
    case "PAUSE":
      return { ...state, status: "paused" };
    case "RESUME":
      return { ...state, status: "active" };
    case "EXIT":
      return INITIAL_TOUR_STATE;
    case "COMPLETE":
      return { ...state, status: "completed" };
    case "SET_HIGHLIGHT":
      return { ...state, highlightSelector: action.selector };
    case "SET_CONCIERGE_ACTIVE":
      return { ...state, conciergeActive: action.active };
    case "SET_SIMULATED":
      return {
        ...state,
        conciergeSimulated: {
          ...state.conciergeSimulated,
          [action.key]: action.value,
        },
      };

    /* ── Tool Call Dispatch — the critical path for instant UI updates ── */
    case "TOOL_CALL": {
      const { call } = action;
      switch (call.name) {
        case "advance_tour_step":
          if (typeof call.args.stepIndex === "number") {
            return { ...state, stepIndex: call.args.stepIndex };
          }
          return { ...state, stepIndex: state.stepIndex + 1 };

        case "highlight_element":
          return { ...state, highlightSelector: call.args.selector };

        case "set_tour_state":
          return {
            ...state,
            conciergeSimulated: {
              ...state.conciergeSimulated,
              [call.args.key]: call.args.value,
            },
          };

        case "navigate_route":
          // Route navigation is handled as a side effect, not in the reducer.
          // The TOOL_CALL handler in the provider component handles router.push.
          return state;

        default:
          return state;
      }
    }

    default:
      return state;
  }
}

/* ---------- Persistence Keys ---------- */

const SS_KEY = "aurumshield:tour-state";

function loadPersistedState(): TourState {
  if (typeof window === "undefined") return INITIAL_TOUR_STATE;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return INITIAL_TOUR_STATE;
    const parsed = JSON.parse(raw) as TourState;
    if (parsed.tourId && typeof parsed.stepIndex === "number") {
      return parsed;
    }
  } catch {
    // Ignore corrupt state
  }
  return INITIAL_TOUR_STATE;
}

function persistState(state: TourState): void {
  if (typeof window === "undefined") return;
  if (state.status === "idle") {
    sessionStorage.removeItem(SS_KEY);
  } else {
    sessionStorage.setItem(SS_KEY, JSON.stringify(state));
  }
}

/* ---------- Provider ---------- */

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize from sessionStorage or URL
  const initialState = useMemo(() => {
    const persisted = loadPersistedState();
    // URL params take priority if present
    const urlTour = searchParams.get("tour");
    const urlStep = searchParams.get("step");
    if (urlTour) {
      return {
        ...INITIAL_TOUR_STATE,
        tourId: urlTour,
        stepIndex: urlStep ? parseInt(urlStep, 10) : persisted.stepIndex,
        status: "active" as TourStatus,
      };
    }
    return persisted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [state, dispatch] = useReducer(tourReducer, initialState);
  const navigatingRef = useRef(false);

  // Resolve current tour & step
  const tour = state.tourId ? (getTourForRole(state.tourId) ?? null) : null;
  const totalSteps = tour?.steps.length ?? 0;
  const currentStep =
    tour && state.stepIndex >= 0 && state.stepIndex < totalSteps
      ? tour.steps[state.stepIndex]
      : null;

  /* ── Gemini Live Concierge Integration ── */

  const handleToolCall = useCallback(
    (call: ConciergeToolCall) => {
      console.info(`[Tour] Concierge tool call: ${call.name}`, call.args);

      // Dispatch to reducer for instant state update
      dispatch({ type: "TOOL_CALL", call });

      // Handle navigate_route as a side effect (can't be done in reducer)
      if (call.name === "navigate_route") {
        const route = call.args.route;
        const separator = route.includes("?") ? "&" : "?";
        const url = route.includes("demo=true")
          ? route
          : `${route}${separator}demo=true`;
        router.push(url);
      }

      // Auto-clear highlight after duration
      if (call.name === "highlight_element") {
        const durationMs = call.args.durationMs ?? 4000;
        setTimeout(() => {
          dispatch({ type: "SET_HIGHLIGHT", selector: null });
        }, durationMs);
      }
    },
    [router],
  );

  const conciergeVoice = useConciergeVoice(handleToolCall);

  // Track concierge active state
  useEffect(() => {
    dispatch({
      type: "SET_CONCIERGE_ACTIVE",
      active: conciergeVoice.status === "active",
    });
  }, [conciergeVoice.status]);

  // Detect tour completion
  useEffect(() => {
    if (tour && state.stepIndex >= totalSteps && state.status === "active") {
      dispatch({ type: "COMPLETE" });
      console.info(`[Tour] Completed: ${tour.id}`);
    }
  }, [tour, state.stepIndex, totalSteps, state.status]);

  // Persist state changes
  useEffect(() => {
    persistState(state);
  }, [state]);

  // Handle route navigation for current step
  useEffect(() => {
    if (!currentStep?.route || state.status !== "active") return;
    const targetPath = currentStep.route.split("?")[0];
    if (pathname !== targetPath && !navigatingRef.current) {
      navigatingRef.current = true;
      const separator = currentStep.route.includes("?") ? "&" : "?";
      const url = currentStep.route.includes("demo=true")
        ? currentStep.route
        : `${currentStep.route}${separator}demo=true`;
      router.push(url);
    }
    // Reset navigation flag when we arrive at the correct route
    if (pathname === targetPath && navigatingRef.current) {
      navigatingRef.current = false;
    }
  }, [currentStep, pathname, router, state.status]);

  /* ---------- Actions ---------- */

  const startTour = useCallback(
    (roleId: string) => {
      const tourDef = getTourForRole(roleId);
      if (!tourDef) {
        console.warn(`[Tour] No tour found for role: ${roleId}`);
        return;
      }
      console.info(`[Tour] Started: ${roleId}`);
      dispatch({ type: "START", tourId: roleId });
      // Navigate to start route
      const separator = tourDef.startRoute.includes("?") ? "&" : "?";
      const url = tourDef.startRoute.includes("demo=true")
        ? tourDef.startRoute
        : `${tourDef.startRoute}${separator}demo=true`;
      router.push(url);
    },
    [router],
  );

  const nextStep = useCallback(() => {
    if (!tour || state.stepIndex >= totalSteps - 1) {
      dispatch({ type: "COMPLETE" });
      return;
    }
    const nextIdx = state.stepIndex + 1;
    console.info(`[Tour] Step: ${tour.steps[nextIdx]?.id ?? "end"}`);
    dispatch({ type: "NEXT" });
  }, [tour, state.stepIndex, totalSteps]);

  const prevStep = useCallback(() => {
    if (state.stepIndex <= 0) return;
    dispatch({ type: "PREV" });
  }, [state.stepIndex]);

  const jumpToStep = useCallback(
    (index: number) => {
      if (!tour || index < 0 || index >= totalSteps) return;
      console.info(`[Tour] Jump to step: ${tour.steps[index].id}`);
      dispatch({ type: "JUMP", index });
    },
    [tour, totalSteps],
  );

  const pauseTour = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resumeTour = useCallback(() => dispatch({ type: "RESUME" }), []);
  const exitTour = useCallback(() => {
    console.info("[Tour] Exited");
    dispatch({ type: "EXIT" });
    // End concierge session if active
    if (conciergeVoice.status === "active") {
      conciergeVoice.endSession();
    }
  }, [conciergeVoice]);

  const restartTour = useCallback(() => {
    if (!state.tourId) return;
    console.info(`[Tour] Restarted: ${state.tourId}`);
    dispatch({ type: "START", tourId: state.tourId, stepIndex: 0 });
  }, [state.tourId]);

  const completeCurrentStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  // Log current step on change
  useEffect(() => {
    if (currentStep && state.status === "active") {
      console.info(`[Tour] Step: ${currentStep.id}`);
    }
  }, [currentStep, state.status]);

  const concierge: ConciergeControls = useMemo(
    () => ({
      status: conciergeVoice.status,
      startSession: conciergeVoice.startSession,
      endSession: conciergeVoice.endSession,
      isSpeaking: conciergeVoice.isSpeaking,
      volumeLevel: conciergeVoice.volumeLevel,
      activeTranscript: conciergeVoice.activeTranscript,
      fallbackMode: conciergeVoice.fallbackMode,
      retrySession: conciergeVoice.retrySession,
    }),
    [conciergeVoice],
  );

  const value = useMemo<TourContextValue>(
    () => ({
      state,
      tour,
      currentStep,
      totalSteps,
      startTour,
      nextStep,
      prevStep,
      jumpToStep,
      pauseTour,
      resumeTour,
      exitTour,
      restartTour,
      completeCurrentStep,
      concierge,
    }),
    [
      state,
      tour,
      currentStep,
      totalSteps,
      startTour,
      nextStep,
      prevStep,
      jumpToStep,
      pauseTour,
      resumeTour,
      exitTour,
      restartTour,
      completeCurrentStep,
      concierge,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}
