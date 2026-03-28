/* ================================================================
   USE-DEMO-SCENE-SYNC — Route/scene alignment hook
   
   Observes pathname + tourState.stepIndex, validates alignment
   with the scene registry, and feeds route arrival events to
   the orchestrator.
   
   DOM readiness uses useSyncExternalStore to avoid calling setState
   directly inside useEffect (which triggers cascading renders).
   ================================================================ */

"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { getSceneByIndex, getSceneByRoute, type DemoScene } from "./demoSceneRegistry";
import { demoOrchestrator } from "./demoOrchestrator";

export interface DemoSceneSyncState {
  /** Current scene from the registry (based on step index) */
  expectedScene: DemoScene | null;
  /** Scene matching the current route */
  routeScene: DemoScene | null;
  /** Whether the route matches the expected scene */
  isRouteReady: boolean;
  /** Whether all required DOM selectors exist */
  isDomReady: boolean;
  /** Whether both route and DOM are ready */
  isSceneReady: boolean;
}

/* ── Tiny external store for DOM readiness ── */

type DomReadySubscriber = () => void;

let _domReady = false;
const _subscribers = new Set<DomReadySubscriber>();

function setDomReady(value: boolean) {
  if (_domReady === value) return;
  _domReady = value;
  _subscribers.forEach((fn) => fn());
}

function subscribeDomReady(onStoreChange: () => void) {
  _subscribers.add(onStoreChange);
  return () => {
    _subscribers.delete(onStoreChange);
  };
}

function getSnapshotDomReady() {
  return _domReady;
}

function getServerSnapshotDomReady() {
  return false;
}

/* ── Hook ── */

export function useDemoSceneSync(
  stepIndex: number,
  isActive: boolean,
): DemoSceneSyncState {
  const pathname = usePathname();

  const isDomReady = useSyncExternalStore(
    subscribeDomReady,
    getSnapshotDomReady,
    getServerSnapshotDomReady,
  );

  const expectedScene = useMemo(
    () => (isActive ? getSceneByIndex(stepIndex) : null),
    [stepIndex, isActive],
  );

  const routeScene = useMemo(
    () => (isActive ? getSceneByRoute(pathname) : null),
    [pathname, isActive],
  );

  const isRouteReady = !!(
    expectedScene &&
    routeScene &&
    expectedScene.id === routeScene.id
  );

  // Feed pathname to orchestrator
  useEffect(() => {
    if (isActive) {
      demoOrchestrator.setCurrentPathname(pathname);
    }
  }, [pathname, isActive]);

  // Check DOM readiness for required selectors
  // Uses the external store (setDomReady) so no setState-in-effect violation
  useEffect(() => {
    if (!isActive || !expectedScene || !isRouteReady) {
      setDomReady(false);
      return;
    }

    const selectors = expectedScene.requiredSelectors;
    if (selectors.length === 0) {
      setDomReady(true);
      return;
    }

    // Check immediately
    const allPresent = selectors.every(
      (s) => document.querySelector(s) !== null,
    );
    if (allPresent) {
      setDomReady(true);
      return;
    }

    // Not ready yet — observe for DOM changes
    setDomReady(false);
    const observer = new MutationObserver(() => {
      const ready = selectors.every(
        (s) => document.querySelector(s) !== null,
      );
      if (ready) {
        setDomReady(true);
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      observer.disconnect();
      setDomReady(true); // Force ready after timeout
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [isActive, expectedScene, isRouteReady]);

  const isSceneReady = isRouteReady && isDomReady;

  return {
    expectedScene,
    routeScene,
    isRouteReady,
    isDomReady,
    isSceneReady,
  };
}
