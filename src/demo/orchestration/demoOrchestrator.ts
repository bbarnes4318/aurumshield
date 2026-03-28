/* ================================================================
   DEMO ORCHESTRATOR — Deterministic timing layer (v2)
   
   Integrates the SceneStateMachine as the central authority for
   tool call timing. All tool calls from Gemini flow through here
   before reaching the TourProvider reducer.

   Responsibilities:
     1. Route the scene state machine's pathname updates
     2. Forward tool calls through the scene machine's idempotency
     3. Handle navigate_route + queue_route_transition side effects
     4. Provide a DOM-readiness wait using MutationObserver + timeout
     5. Emit structured events for debug logging
   
   This is a singleton — components subscribe for events,
   the TourProvider feeds tool calls through processToolCall().
   ================================================================ */

import type { ConciergeToolCall } from "../concierge/conciergeTypes";
import { sceneStateMachine } from "./sceneStateMachine";

/* ---------- Types ---------- */

export type OrchestratorEvent =
  | { type: "scene:ready"; sceneId: string }
  | { type: "route:arrived"; pathname: string }
  | { type: "dom:ready"; selector: string }
  | { type: "tool:dispatched"; call: ConciergeToolCall }
  | { type: "tool:queued"; call: ConciergeToolCall; reason: string }
  | { type: "tool:blocked"; call: ConciergeToolCall; reason: string };

export type OrchestratorListener = (event: OrchestratorEvent) => void;

/* ---------- Orchestrator ---------- */

class DemoOrchestrator {
  private listeners = new Set<OrchestratorListener>();
  private currentPathname = "";

  /** Max ms to wait for DOM element before force-dispatching */
  private readonly DOM_TIMEOUT_MS = 3000;

  constructor() {
    // Wire the scene machine's dispatch back through us
    sceneStateMachine.setDispatch((call) => {
      this.executeDispatch(call);
    });
  }

  /* ── Subscription ── */

  subscribe(listener: OrchestratorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: OrchestratorEvent) {
    this.listeners.forEach((fn) => {
      try {
        fn(event);
      } catch {
        /* listener error — non-fatal */
      }
    });
  }

  /* ── Route tracking ── */

  setCurrentPathname(pathname: string) {
    this.currentPathname = pathname;
    this.emit({ type: "route:arrived", pathname });
    // Feed to scene state machine
    sceneStateMachine.setPathname(pathname);
  }

  /* ── Process a tool call from Gemini ── */

  /**
   * Process a tool call through the scene state machine.
   * The machine handles idempotency, readiness gates, and ordering.
   * The dispatch callback (set in constructor) calls executeDispatch,
   * which calls the externalDispatch provided by the TourProvider.
   */
  processToolCall(
    call: ConciergeToolCall,
    externalDispatch: (call: ConciergeToolCall) => void,
  ): void {
    // Store the external dispatch for this call chain
    this._externalDispatch = externalDispatch;

    // Route through the scene state machine for idempotency + ordering
    const dispatched = sceneStateMachine.handleToolCall(call);

    if (!dispatched) {
      this.emit({
        type: "tool:blocked",
        call,
        reason: "Scene machine blocked (idempotency or phase gate)",
      });
    }
  }

  // Temporary holder for the external dispatch during a processToolCall chain
  private _externalDispatch: ((call: ConciergeToolCall) => void) | null = null;

  /* ── Internal dispatch (called by scene machine) ── */

  private executeDispatch(call: ConciergeToolCall) {
    // For queue_route_transition, convert to delayed navigate_route
    if (call.name === "queue_route_transition") {
      const args = call.args as { route: string; delayMs?: number };
      const delayMs = args.delayMs ?? 0;
      setTimeout(() => {
        const navCall: ConciergeToolCall = {
          name: "navigate_route",
          args: { route: args.route },
        };
        this._externalDispatch?.(navCall);
        this.emit({ type: "tool:dispatched", call: navCall });
      }, delayMs);
      return;
    }

    // For highlight_element, gate on DOM readiness
    if (call.name === "highlight_element" || call.name === "pin_focus_region") {
      const selector = (call.args as { selector: string }).selector;
      if (this.isDomReady(selector)) {
        this._externalDispatch?.(call);
        this.emit({ type: "tool:dispatched", call });
      } else {
        this.emit({
          type: "tool:queued",
          call,
          reason: `Waiting for DOM: ${selector}`,
        });
        this.waitForDom(selector, () => {
          this._externalDispatch?.(call);
          this.emit({ type: "tool:dispatched", call });
        });
      }
      return;
    }

    // All other calls: dispatch immediately
    this._externalDispatch?.(call);
    this.emit({ type: "tool:dispatched", call });
  }

  /* ── DOM readiness (MutationObserver + timeout) ── */

  private isDomReady(selector: string): boolean {
    if (typeof document === "undefined") return false;
    return document.querySelector(selector) !== null;
  }

  private waitForDom(selector: string, callback: () => void) {
    if (typeof document === "undefined") return;

    // Immediate check
    if (this.isDomReady(selector)) {
      callback();
      return;
    }

    // Timeout fallback
    const timeout = setTimeout(() => {
      observer.disconnect();
      console.warn(
        `[Orchestrator] DOM timeout for ${selector} — force dispatching`,
      );
      callback();
    }, this.DOM_TIMEOUT_MS);

    // MutationObserver
    const observer = new MutationObserver(() => {
      if (this.isDomReady(selector)) {
        observer.disconnect();
        clearTimeout(timeout);
        this.emit({ type: "dom:ready", selector });
        callback();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /* ── Scene machine access ── */

  /** Start the scene state machine */
  startSceneMachine() {
    sceneStateMachine.start();
  }

  /** Get the scene machine instance for direct access */
  getSceneMachine() {
    return sceneStateMachine;
  }

  /* ── Cleanup ── */

  destroy() {
    this.listeners.clear();
    sceneStateMachine.destroy();
  }
}

/** Singleton orchestrator instance */
export const demoOrchestrator = new DemoOrchestrator();
