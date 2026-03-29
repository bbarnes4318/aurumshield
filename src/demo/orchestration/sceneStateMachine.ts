/* ================================================================
   SCENE STATE MACHINE — Deterministic orchestration layer

   Standalone state machine that tracks the current micro-scene
   through its lifecycle. Operates as a separate orchestration
   layer — NOT inside the TourProvider reducer.

   States:
     IDLE → PENDING → ROUTE_READY → DOM_READY → PRE_ACTIONS →
     NARRATING → LISTENING → TRANSITIONING → COMPLETE

   Guards:
     routeReady:          pathname matches scene route
     domReady:            all requiredSelectors found via MutationObserver
     transitionCommitted: exit actions complete before advancing

   Idempotency:
     Keys are scoped per scene: `sceneId:toolName:hash(args)`
     Prevents double-fire within the same micro-scene.

   Logging:
     Every state transition emits a structured console log with timing.
   ================================================================ */

import type { ConciergeToolCall } from "../concierge/conciergeTypes";
import {
  ALL_MICRO_SCENES,
  getNextMicroScene,
  type MicroScene,
} from "./microSceneDefinitions";

/* ---------- Types ---------- */

export type ScenePhase =
  | "IDLE"
  | "PENDING"
  | "ROUTE_READY"
  | "DOM_READY"
  | "PRE_ACTIONS"
  | "NARRATING"
  | "LISTENING"
  | "INTERRUPTED"       // barge-in pause
  | "TRANSITIONING"
  | "COMPLETE";

export interface SceneSnapshot {
  sceneId: string | null;
  phase: ScenePhase;
  actId: string | null;
  microSceneIndex: number;
  totalMicroScenes: number;
  routeReady: boolean;
  domReady: boolean;
  bargeInCount: number;
  elapsedMs: number;
}

export type SceneEventType =
  | "phase-change"
  | "tool-dispatched"
  | "tool-blocked"
  | "barge-in"
  | "silence-recovery"
  | "scene-complete"
  | "error";

export interface SceneEvent {
  type: SceneEventType;
  sceneId: string;
  phase: ScenePhase;
  prevPhase?: ScenePhase;
  detail?: string;
  timestamp: number;
  elapsedMs: number;
}

export type SceneEventListener = (event: SceneEvent) => void;

/* ---------- Idempotency ---------- */

function computeIdempotencyKey(
  sceneId: string,
  call: ConciergeToolCall,
): string {
  const argsStr = JSON.stringify(call.args, Object.keys(call.args).sort());
  return `${sceneId}:${call.name}:${argsStr}`;
}

/* ---------- State Machine ---------- */

export class SceneStateMachine {
  private currentScene: MicroScene | null = null;
  private phase: ScenePhase = "IDLE";
  private sceneStartTime = 0;
  private phaseStartTime = 0;
  private microSceneIndex = -1;
  private bargeInCount = 0;

  // Guards
  private routeReady = false;
  private domReady = false;
  private currentPathname = "";

  // Idempotency — scoped per scene
  private executedKeys = new Set<string>();

  // DOM observation
  private domObserver: MutationObserver | null = null;
  private domTimeout: ReturnType<typeof setTimeout> | null = null;

  // Silence recovery
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  // Event listeners
  private listeners = new Set<SceneEventListener>();

  // Dispatch callback — set by the orchestrator
  private dispatchFn: ((call: ConciergeToolCall) => void) | null = null;

  /* ── Configuration ── */

  /** Max ms to wait for DOM selectors before force-ready */
  private readonly DOM_TIMEOUT_MS = 4000;

  /* ── Public API ── */

  /** Register the dispatch function (called by orchestrator) */
  setDispatch(fn: (call: ConciergeToolCall) => void) {
    this.dispatchFn = fn;
  }

  /** Subscribe to scene events */
  subscribe(listener: SceneEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get current snapshot */
  getSnapshot(): SceneSnapshot {
    return {
      sceneId: this.currentScene?.id ?? null,
      phase: this.phase,
      actId: this.currentScene?.actId ?? null,
      microSceneIndex: this.microSceneIndex,
      totalMicroScenes: ALL_MICRO_SCENES.length,
      routeReady: this.routeReady,
      domReady: this.domReady,
      bargeInCount: this.bargeInCount,
      elapsedMs: this.sceneStartTime ? Date.now() - this.sceneStartTime : 0,
    };
  }

  /** Start the state machine from the first micro-scene */
  start() {
    this.microSceneIndex = 0;
    this.enterScene(ALL_MICRO_SCENES[0]);
  }

  /** Start from a specific micro-scene by ID */
  startFromScene(sceneId: string) {
    const idx = ALL_MICRO_SCENES.findIndex((s) => s.id === sceneId);
    if (idx === -1) {
      this.log("error", `Scene not found: ${sceneId}`);
      return;
    }
    this.microSceneIndex = idx;
    this.enterScene(ALL_MICRO_SCENES[idx]);
  }

  /** Report current pathname (called by route observer) */
  setPathname(pathname: string) {
    this.currentPathname = pathname;
    if (this.currentScene && this.phase === "PENDING") {
      this.checkRouteReady();
    }
  }

  /** Handle a tool call from Gemini — returns true if dispatched, false if blocked */
  handleToolCall(call: ConciergeToolCall): boolean {
    if (!this.currentScene) return false;

    // Idempotency check (scoped per scene)
    const key = computeIdempotencyKey(this.currentScene.id, call);
    if (this.executedKeys.has(key)) {
      this.emit({
        type: "tool-blocked",
        sceneId: this.currentScene.id,
        phase: this.phase,
        detail: `Idempotency blocked: ${call.name} (key: ${key})`,
        timestamp: Date.now(),
        elapsedMs: Date.now() - this.sceneStartTime,
      });
      console.warn(
        `[Scene:${this.currentScene.id}] Idempotency blocked: ${call.name}`,
      );
      return false;
    }

    // Record and dispatch
    this.executedKeys.add(key);

    // advance_tour_step is handled internally by the scene machine.
    // Do NOT dispatch it to the reducer from here — it would double-fire
    // (once from the AI tool call, once from exitActions).
    if (call.name === "advance_tour_step") {
      this.log("info", "advance_tour_step received from AI — advancing scene");
      this.clearSilenceTimer();
      this.advanceToNextScene();
      return true;
    }

    // All other tool calls: dispatch normally
    this.dispatchFn?.(call);

    this.emit({
      type: "tool-dispatched",
      sceneId: this.currentScene.id,
      phase: this.phase,
      detail: `${call.name} ${JSON.stringify(call.args)}`,
      timestamp: Date.now(),
      elapsedMs: Date.now() - this.sceneStartTime,
    });

    // Reset silence timer since the AI is actively sending tool calls
    this.resetSilenceTimer();

    return true;
  }

  /** Signal that the AI started speaking (enters NARRATING) */
  onSpeechStart() {
    if (this.phase === "PRE_ACTIONS" || this.phase === "DOM_READY") {
      this.setPhase("NARRATING");
    }
    this.resetSilenceTimer();
  }

  /** Signal that the AI finished a turn */
  onTurnComplete() {
    this.startSilenceTimer();
  }

  /** Handle barge-in (user interrupted the AI) */
  bargeIn() {
    if (!this.currentScene) return;
    if (
      this.currentScene.allowedInterruptions === "none" &&
      this.phase !== "NARRATING"
    ) {
      return; // Don't allow interruption in this scene
    }

    this.bargeInCount++;
    const prevPhase = this.phase;
    this.setPhase("INTERRUPTED");

    this.emit({
      type: "barge-in",
      sceneId: this.currentScene.id,
      phase: this.phase,
      prevPhase,
      detail: `Barge-in #${this.bargeInCount}`,
      timestamp: Date.now(),
      elapsedMs: Date.now() - this.sceneStartTime,
    });
  }

  /** Resume after barge-in (model responds, then continues) */
  resumeAfterBargeIn() {
    if (this.phase !== "INTERRUPTED") return;
    this.setPhase("NARRATING");
    this.resetSilenceTimer();
  }

  /** Advance to the next micro-scene */
  advanceToNextScene() {
    if (!this.currentScene) return;

    this.setPhase("TRANSITIONING");

    // Fire exit actions (skip advance_tour_step — dispatched separately below)
    for (const action of this.currentScene.exitActions) {
      if (action.name === "advance_tour_step") continue;
      const key = computeIdempotencyKey(this.currentScene.id, action);
      if (!this.executedKeys.has(key)) {
        this.executedKeys.add(key);
        this.dispatchFn?.(action);
      }
    }

    // Only advance the macro tour step if this scene's exitActions include it
    // (i.e., this is the last micro-scene in an act)
    const hasAdvance = this.currentScene.exitActions.some(
      (a) => a.name === "advance_tour_step",
    );
    if (hasAdvance) {
      this.dispatchFn?.({ name: "advance_tour_step", args: {} });
    }

    this.setPhase("COMPLETE");

    this.emit({
      type: "scene-complete",
      sceneId: this.currentScene.id,
      phase: "COMPLETE",
      detail: `Completed in ${Date.now() - this.sceneStartTime}ms`,
      timestamp: Date.now(),
      elapsedMs: Date.now() - this.sceneStartTime,
    });

    // Move to next micro-scene
    const next = getNextMicroScene(this.currentScene.id);
    if (next) {
      this.microSceneIndex++;
      this.enterScene(next);
    } else {
      this.log("info", "All micro-scenes complete");
      this.cleanup();
    }
  }

  /**
   * Fast-forward past all remaining micro-scenes until reaching a scene
   * with a different actId. Fires exit actions (including advance_tour_step)
   * along the way, but skips narration/timers. Used when the user clicks
   * a CTA that jumps ahead (e.g., Authorize button skips to Act 8).
   */
  skipToAct(targetActId: string) {
    if (!this.currentScene) return;

    this.log("info", `skipToAct: fast-forwarding from ${this.currentScene.id} to act ${targetActId}`);

    // Keep advancing until we either hit the target act or run out of scenes
    let safety = 0;
    while (this.currentScene && this.currentScene.actId !== targetActId && safety < 20) {
      safety++;
      this.cleanup(); // Clear timers/observers from current scene

      // Fire exit actions for the current scene
      for (const action of this.currentScene.exitActions) {
        if (action.name === "advance_tour_step") continue;
        this.dispatchFn?.(action);
      }

      // Dispatch advance_tour_step if this was the last scene in its act
      const hasAdvance = this.currentScene.exitActions.some(
        (a) => a.name === "advance_tour_step",
      );
      if (hasAdvance) {
        this.dispatchFn?.({ name: "advance_tour_step", args: {} });
      }

      // Move to next micro-scene
      const next = getNextMicroScene(this.currentScene.id);
      if (!next) {
        this.log("info", "skipToAct: reached end of all scenes");
        this.currentScene = null;
        this.cleanup();
        return;
      }
      this.microSceneIndex++;
      this.currentScene = next;
    }

    // Now enter the target act's first scene properly
    if (this.currentScene && this.currentScene.actId === targetActId) {
      this.log("info", `skipToAct: entering ${this.currentScene.id}`);
      this.enterScene(this.currentScene);
    }
  }

  /** Full reset */
  reset() {
    this.cleanup();
    this.currentScene = null;
    this.phase = "IDLE";
    this.microSceneIndex = -1;
    this.bargeInCount = 0;
    this.routeReady = false;
    this.domReady = false;
    this.executedKeys.clear();
  }

  /** Destroy and release all resources */
  destroy() {
    this.cleanup();
    this.listeners.clear();
    this.dispatchFn = null;
  }

  /* ── Private: Scene Lifecycle ── */

  private enterScene(scene: MicroScene) {
    this.cleanup(); // Clean previous timers/observers
    this.currentScene = scene;
    this.sceneStartTime = Date.now();
    this.phaseStartTime = Date.now();
    this.routeReady = false;
    this.domReady = false;
    this.executedKeys.clear();
    this.bargeInCount = 0;

    this.log("info", `Entering scene: ${scene.id} (act: ${scene.actId})`);
    this.setPhase("PENDING");
    this.checkRouteReady();
  }

  private checkRouteReady() {
    if (!this.currentScene) return;

    const matches = this.currentPathname.startsWith(this.currentScene.route);
    if (matches && !this.routeReady) {
      this.routeReady = true;
      this.setPhase("ROUTE_READY");
      this.checkDomReady();
    } else if (!matches) {
      // Route not yet arrived — we stay in PENDING.
      // The orchestrator will call setPathname when the route changes.
    }
  }

  private checkDomReady() {
    if (!this.currentScene) return;

    const selectors = this.currentScene.requiredSelectors;

    // No selectors required — immediately ready
    if (selectors.length === 0) {
      this.domReady = true;
      this.setPhase("DOM_READY");
      this.executePreActions();
      return;
    }

    // Check immediately
    if (this.allSelectorsPresent(selectors)) {
      this.domReady = true;
      this.setPhase("DOM_READY");
      this.executePreActions();
      return;
    }

    // MutationObserver + timeout hybrid
    this.domObserver = new MutationObserver(() => {
      if (this.allSelectorsPresent(selectors)) {
        this.domReady = true;
        this.cleanupDomObserver();
        this.setPhase("DOM_READY");
        this.executePreActions();
      }
    });

    this.domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout fallback — force ready after DOM_TIMEOUT_MS
    this.domTimeout = setTimeout(() => {
      if (!this.domReady) {
        console.warn(
          `[Scene:${this.currentScene?.id}] DOM timeout (${this.DOM_TIMEOUT_MS}ms) — force-ready. Missing: ${selectors.filter((s) => !document.querySelector(s)).join(", ")}`,
        );
        this.domReady = true;
        this.cleanupDomObserver();
        this.setPhase("DOM_READY");
        this.executePreActions();
      }
    }, this.DOM_TIMEOUT_MS);
  }

  private allSelectorsPresent(selectors: string[]): boolean {
    if (typeof document === "undefined") return false;
    return selectors.every((s) => document.querySelector(s) !== null);
  }

  private executePreActions() {
    if (!this.currentScene) return;

    this.setPhase("PRE_ACTIONS");

    for (const action of this.currentScene.preActions) {
      const key = computeIdempotencyKey(this.currentScene.id, action);
      if (!this.executedKeys.has(key)) {
        this.executedKeys.add(key);
        this.dispatchFn?.(action);
        this.emit({
          type: "tool-dispatched",
          sceneId: this.currentScene.id,
          phase: this.phase,
          detail: `Pre-action: ${action.name} ${JSON.stringify(action.args)}`,
          timestamp: Date.now(),
          elapsedMs: Date.now() - this.sceneStartTime,
        });
      }
    }

    // For auto-transition scenes (navigate waits), advance immediately
    if (this.currentScene.transitionCondition === "auto") {
      // If this is a navigation-only scene, advance once route+DOM are ready
      if (this.currentScene.silenceRecoveryMs === 0) {
        // This is a "wait-for" scene — advance after pre-actions
        setTimeout(() => this.advanceToNextScene(), 200);
      } else {
        // Auto-transition but with narration — enter narrating, advance after silence
        this.setPhase("NARRATING");
        this.startSilenceTimer();
      }
    } else {
      // tool-call or user-action transition — wait for Gemini
      this.setPhase("NARRATING");
      this.startSilenceTimer();
    }
  }

  /* ── Private: Silence Recovery ── */

  private startSilenceTimer() {
    this.clearSilenceTimer();
    if (!this.currentScene || this.currentScene.silenceRecoveryMs === 0) return;

    this.silenceTimer = setTimeout(() => {
      if (!this.currentScene) return;
      if (this.phase !== "NARRATING" && this.phase !== "LISTENING") return;

      this.emit({
        type: "silence-recovery",
        sceneId: this.currentScene.id,
        phase: this.phase,
        detail: `Silence timeout after ${this.currentScene.silenceRecoveryMs}ms`,
        timestamp: Date.now(),
        elapsedMs: Date.now() - this.sceneStartTime,
      });

      this.log(
        "info",
        `Silence recovery triggered (${this.currentScene.silenceRecoveryMs}ms)`,
      );

      // For the authorization boundary scene ONLY, pause in LISTENING first.
      // But set a secondary failsafe to force-advance after 15 more seconds
      // so the demo never hangs permanently.
      if (this.currentScene.id === "act-7-boundary") {
        this.setPhase("LISTENING");
        // Secondary failsafe — if still in LISTENING after 15s, force-advance
        this.silenceTimer = setTimeout(() => {
          if (this.currentScene?.id === "act-7-boundary" && this.phase === "LISTENING") {
            this.log("info", "Act-7-boundary secondary failsafe: force-advancing after 15s in LISTENING");
            this.advanceToNextScene();
          }
        }, 15000);
        return;
      }

      // DETERMINISTIC: Auto-advance to next scene.
      // This is the failsafe — if the AI doesn't fire advance_tour_step,
      // the scene machine forces the demo forward anyway.
      this.log("info", "Auto-advancing (deterministic failsafe)");
      this.advanceToNextScene();
    }, this.currentScene.silenceRecoveryMs);
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    this.startSilenceTimer();
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  /* ── Private: State Transition ── */

  private setPhase(newPhase: ScenePhase) {
    const prevPhase = this.phase;
    const elapsed = Date.now() - this.phaseStartTime;

    this.phase = newPhase;
    this.phaseStartTime = Date.now();

    // Structured log
    console.info(
      `[Scene:${this.currentScene?.id ?? "none"}] ${prevPhase} → ${newPhase} (${elapsed}ms)`,
    );

    this.emit({
      type: "phase-change",
      sceneId: this.currentScene?.id ?? "unknown",
      phase: newPhase,
      prevPhase,
      detail: `${prevPhase} → ${newPhase}`,
      timestamp: Date.now(),
      elapsedMs: Date.now() - this.sceneStartTime,
    });
  }

  /* ── Private: Event Emission ── */

  private emit(event: SceneEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch {
        /* listener error — non-fatal */
      }
    });
  }

  private log(level: "info" | "warn" | "error", message: string) {
    const prefix = `[Scene:${this.currentScene?.id ?? "none"}]`;
    switch (level) {
      case "info":
        console.info(`${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`);
        break;
      case "error":
        console.error(`${prefix} ${message}`);
        break;
    }
  }

  /* ── Private: Cleanup ── */

  private cleanupDomObserver() {
    this.domObserver?.disconnect();
    this.domObserver = null;
    if (this.domTimeout) {
      clearTimeout(this.domTimeout);
      this.domTimeout = null;
    }
  }

  private cleanup() {
    this.cleanupDomObserver();
    this.clearSilenceTimer();
  }
}

/** Singleton scene state machine */
export const sceneStateMachine = new SceneStateMachine();
