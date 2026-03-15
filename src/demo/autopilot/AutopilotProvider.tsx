"use client";

/* ================================================================
   AUTOPILOT PROVIDER — Self-driving demo execution engine
   
   Rules:
   1. useReducer-based state management
   2. Sequential execution: navigate → animate → speak → advance
   3. AbortController for clean cancellation
   4. No server actions triggered during demo
   5. Ghost cursor follows DOM actions
   ================================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import type {
  AutopilotState,
  AutopilotAction,
} from "./autopilotTypes";
import { INITIAL_AUTOPILOT_STATE, PHASE_ORDER } from "./autopilotTypes";
import { CHOREOGRAPHY, TOTAL_STEPS, getPhaseForStep } from "./choreography";
import {
  ghostType,
  highlightElement,
  simulateClick,
  flashBadge,
  scrollToElement,
  typeTerminalOutput,
  waitMs,
} from "./domSimulator";
import { GhostCursor, type GhostCursorHandle } from "./GhostCursor";
import { useVapiSync } from "./useVapiSync";

/* ---------- Reducer ---------- */

function autopilotReducer(
  state: AutopilotState,
  action: AutopilotAction,
): AutopilotState {
  switch (action.type) {
    case "START":
      return {
        ...INITIAL_AUTOPILOT_STATE,
        status: "navigating",
        totalSteps: action.totalSteps,
      };
    case "NAVIGATE":
      return { ...state, status: "navigating" };
    case "ANIMATE":
      return { ...state, status: "animating" };
    case "SPEAK":
      return { ...state, status: "speaking" };
    case "ADVANCE": {
      const nextIndex = state.stepIndex + 1;
      if (nextIndex >= state.totalSteps) {
        return { ...state, status: "completed", stepIndex: nextIndex };
      }
      const phase = getPhaseForStep(nextIndex);
      const phaseIndex = phase
        ? PHASE_ORDER.indexOf(phase)
        : state.currentPhaseIndex;
      return {
        ...state,
        status: "navigating",
        stepIndex: nextIndex,
        currentPhaseIndex: phaseIndex >= 0 ? phaseIndex : state.currentPhaseIndex,
      };
    }
    case "PAUSE":
      return { ...state, status: "paused" };
    case "RESUME":
      return { ...state, status: "navigating" };
    case "ABORT":
      return { ...state, status: "aborted" };
    case "COMPLETE":
      return { ...state, status: "completed" };
    case "SET_SIMULATED":
      return {
        ...state,
        simulatedState: {
          ...state.simulatedState,
          [action.key]: action.value,
        },
      };
    default:
      return state;
  }
}

/* ---------- Context Shape ---------- */

interface AutopilotContextValue {
  state: AutopilotState;
  /** Current step label */
  currentLabel: string;
  /** Current phase name */
  currentPhaseName: string;
  /** Whether the engine is actively running */
  isRunning: boolean;
  /** Start the autopilot demo */
  start: () => void;
  /** Abort the demo */
  abort: () => void;
  /** Pause the demo */
  pause: () => void;
  /** Resume the demo */
  resume: () => void;
  /** Vapi speaking indicator */
  isSpeaking: boolean;
  /** Vapi volume level */
  volumeLevel: number;
}

const AutopilotContext = createContext<AutopilotContextValue | null>(null);

export function useAutopilot(): AutopilotContextValue {
  const ctx = useContext(AutopilotContext);
  if (!ctx)
    throw new Error("useAutopilot must be used within <AutopilotProvider>");
  return ctx;
}

/* ---------- Provider ---------- */

export function AutopilotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    autopilotReducer,
    INITIAL_AUTOPILOT_STATE,
  );

  const abortRef = useRef<AbortController | null>(null);
  const cursorRef = useRef<GhostCursorHandle>(null);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);

  const {
    isSpeaking,
    speak,
    ensureCallActive,
    volumeLevel,
    stopCall,
  } = useVapiSync();

  /* ---- DOM Action Executor ---- */
  const executeDomAction = useCallback(
    async (
      action: (typeof CHOREOGRAPHY)[number]["domActions"][number],
      signal: AbortSignal,
    ) => {
      if (signal.aborted) return;

      switch (action.type) {
        case "type_text":
          // Move ghost cursor to target
          if (cursorRef.current) {
            await cursorRef.current.moveToSelector(action.selector, 500);
          }
          await ghostType(
            action.selector,
            action.text,
            action.charDelayMs ?? 50,
            signal,
          );
          break;

        case "highlight":
          if (cursorRef.current) {
            await cursorRef.current.moveToSelector(action.selector, 400);
          }
          await highlightElement(
            action.selector,
            action.durationMs ?? 2000,
            signal,
          );
          break;

        case "click":
          if (cursorRef.current) {
            const el = document.querySelector<HTMLElement>(action.selector);
            if (el) {
              const rect = el.getBoundingClientRect();
              await cursorRef.current.clickAt(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
              );
            }
          }
          await simulateClick(action.selector, signal);
          break;

        case "flash_badge":
          if (cursorRef.current) {
            await cursorRef.current.moveToSelector(action.selector, 400);
          }
          await flashBadge(
            action.selector,
            action.fromText,
            action.toText,
            action.colorClass ?? "bg-emerald-500/20 text-emerald-400",
            signal,
          );
          break;

        case "scroll_to":
          await scrollToElement(action.selector, signal);
          break;

        case "simulate_webhook":
          dispatch({
            type: "SET_SIMULATED",
            key: action.stateKey,
            value: action.stateValue,
          });
          // Brief visual pause to let UI react
          await waitMs(400, signal);
          break;

        case "set_state":
          dispatch({
            type: "SET_SIMULATED",
            key: action.stateKey,
            value: action.stateValue,
          });
          await waitMs(300, signal);
          break;

        case "type_terminal":
          if (cursorRef.current) {
            await cursorRef.current.moveToSelector(action.selector, 400);
          }
          await typeTerminalOutput(
            action.selector,
            action.lines,
            action.lineDelayMs ?? 150,
            signal,
          );
          break;

        case "wait":
          await waitMs(action.durationMs, signal);
          break;
      }
    },
    [],
  );

  /* ---- Wait for pause to be lifted ---- */
  const waitForResume = useCallback(async (signal: AbortSignal) => {
    while (pausedRef.current) {
      if (signal.aborted) return;
      await waitMs(200, signal).catch(() => {});
    }
  }, []);

  /* ---- Main Execution Loop ---- */
  const runLoop = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    dispatch({ type: "START", totalSteps: TOTAL_STEPS });

    // Attempt to start Vapi call
    try {
      await ensureCallActive(signal);
    } catch {
      // Vapi unavailable — proceed in fallback mode
    }

    // Show ghost cursor
    cursorRef.current?.show();

    for (let i = 0; i < TOTAL_STEPS; i++) {
      if (signal.aborted) break;

      // Check pause
      await waitForResume(signal).catch(() => {});
      if (signal.aborted) break;

      const step = CHOREOGRAPHY[i];

      // 1. Navigate
      dispatch({ type: "NAVIGATE" });
      const targetRoute = `${step.route}?demo=true`;
      const currentPath = window.location.pathname;
      if (currentPath !== step.route) {
        router.push(targetRoute);
        // Wait for navigation + page render
        await waitMs(step.navigationDelayMs ?? 800, signal).catch(() => {});
      }
      if (signal.aborted) break;

      // 2. Animate DOM actions
      dispatch({ type: "ANIMATE" });
      for (const action of step.domActions) {
        if (signal.aborted) break;
        await waitForResume(signal).catch(() => {});
        try {
          await executeDomAction(action, signal);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") break;
          console.warn(`[Autopilot] DOM action failed:`, err);
        }
      }
      if (signal.aborted) break;

      // 3. Speak
      dispatch({ type: "SPEAK" });
      try {
        await speak(step.vapiScript, signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") break;
        console.warn("[Autopilot] Speech failed:", err);
      }
      if (signal.aborted) break;

      // 4. Brief pause between steps
      await waitMs(600, signal).catch(() => {});

      // 5. Advance
      if (i < TOTAL_STEPS - 1) {
        dispatch({ type: "ADVANCE" });
      }
    }

    if (!signal.aborted) {
      dispatch({ type: "COMPLETE" });
    }

    // Hide ghost cursor
    cursorRef.current?.hide();

    // Stop Vapi call
    stopCall();

    runningRef.current = false;
    abortRef.current = null;
  }, [ensureCallActive, executeDomAction, router, speak, stopCall, waitForResume]);

  /* ---- Actions ---- */

  const start = useCallback(() => {
    if (runningRef.current) return;
    runLoop();
  }, [runLoop]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "ABORT" });
    cursorRef.current?.hide();
    stopCall();
    runningRef.current = false;
  }, [stopCall]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    dispatch({ type: "PAUSE" });
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    dispatch({ type: "RESUME" });
  }, []);

  const isRunning =
    state.status !== "idle" &&
    state.status !== "completed" &&
    state.status !== "aborted";

  const currentStep = CHOREOGRAPHY[state.stepIndex];
  const currentLabel = currentStep?.label ?? "";
  const currentPhaseName =
    currentStep
      ? PHASE_ORDER[state.currentPhaseIndex] ?? ""
      : "";

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const value = useMemo<AutopilotContextValue>(
    () => ({
      state,
      currentLabel,
      currentPhaseName,
      isRunning,
      start,
      abort,
      pause,
      resume,
      isSpeaking,
      volumeLevel,
    }),
    [
      state,
      currentLabel,
      currentPhaseName,
      isRunning,
      start,
      abort,
      pause,
      resume,
      isSpeaking,
      volumeLevel,
    ],
  );

  return (
    <AutopilotContext.Provider value={value}>
      {children}
      {/* Ghost cursor lives here — always mounted, visibility controlled */}
      <GhostCursor ref={cursorRef} />
    </AutopilotContext.Provider>
  );
}
