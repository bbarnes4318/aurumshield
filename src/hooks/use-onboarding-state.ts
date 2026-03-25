"use client";

/* ================================================================
   USE ONBOARDING STATE — TanStack Query hooks
   ================================================================
   Client-side hooks for reading and persisting onboarding state.
   Wraps GET/PATCH /api/compliance/state.

   Journey-aware helpers:
     useJourneyStage()        → current stage + route + phase
     useAdvanceJourneyStage() → mutation to advance to next stage
   ================================================================ */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  OnboardingState,
  PatchOnboardingState,
} from "@/lib/compliance/onboarding-state";
import {
  resolveJourneyStage,
  getRouteForStage,
  getPhaseForStage,
  isGuidedJourneyComplete,
  type InstitutionalJourneyStage,
  type InstitutionalJourneyPhase,
} from "@/lib/schemas/institutional-journey-schema";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

interface OnboardingStateResponse {
  state: OnboardingState | null;
  source?: string;
}

export interface JourneyStageInfo {
  /** Current stage, or null if user should skip to advanced workspace. */
  stage: InstitutionalJourneyStage | null;
  /** Route path for the current stage, or /institutional for advanced. */
  route: string;
  /** Phase grouping (GETTING_STARTED | FIRST_TRADE), or null. */
  phase: InstitutionalJourneyPhase | null;
  /** True when the guided journey is complete (terminal stage reached). */
  isComplete: boolean;
  /** True while the underlying onboarding state is still loading. */
  isLoading: boolean;
  /** True if the onboarding state query errored. */
  isError: boolean;
}

/* ----------------------------------------------------------------
   Query — GET /api/compliance/state
   ---------------------------------------------------------------- */

export function useOnboardingState(enabled = true) {
  return useQuery<OnboardingState | null>({
    queryKey: ["onboarding-state"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/state");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OnboardingStateResponse = await res.json();
      return data.state;
    },
    enabled,
    staleTime: 10_000, // 10s — state changes infrequently
    retry: 3, // Retry on transient failures to prevent false redirects
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}

/* ----------------------------------------------------------------
   Mutation — PATCH /api/compliance/state
   ---------------------------------------------------------------- */

export function useSaveOnboardingState() {
  const queryClient = useQueryClient();

  return useMutation<OnboardingState, Error, PatchOnboardingState>({
    mutationFn: async (patch) => {
      const res = await fetch("/api/compliance/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const data: { state: OnboardingState } = await res.json();
      return data.state;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-state"] });
    },
  });
}

/* ----------------------------------------------------------------
   Journey-Aware Hook — useJourneyStage
   ----------------------------------------------------------------
   Resolves the current guided journey stage from onboarding state.
   Handles backward compat (legacy rows with no __journey data),
   loading states, and error states.

   Returns null stage when the user should skip guided flow
   entirely (e.g. legacy COMPLETED user).
   ---------------------------------------------------------------- */

export function useJourneyStage(): JourneyStageInfo {
  const { data, isLoading, isError } = useOnboardingState();

  if (isLoading || isError) {
    return {
      stage: null,
      route: "/institutional",
      phase: null,
      isComplete: false,
      isLoading,
      isError,
    };
  }

  const stage = resolveJourneyStage(data ?? null);

  return {
    stage,
    route: stage ? getRouteForStage(stage) : "/institutional",
    phase: stage ? getPhaseForStage(stage) : null,
    isComplete: stage ? isGuidedJourneyComplete(stage) : true,
    isLoading: false,
    isError: false,
  };
}

/* ----------------------------------------------------------------
   Journey Mutation — useAdvanceJourneyStage
   ----------------------------------------------------------------
   Advances the guided journey to the next stage by persisting
   the new stage into metadata_json.__journey through the existing
   PATCH /api/compliance/state path.

   Usage:
     const advance = useAdvanceJourneyStage();
     advance.mutate("ORGANIZATION"); // explicit target stage
   ---------------------------------------------------------------- */

export function useAdvanceJourneyStage() {
  const saveMutation = useSaveOnboardingState();

  return useMutation<OnboardingState, Error, InstitutionalJourneyStage>({
    mutationFn: async (targetStage) => {
      // Build the __journey sub-object to merge into metadata_json
      const journeyMeta = {
        stage: targetStage,
        firstTradeCompleted: isGuidedJourneyComplete(targetStage),
      };

      return saveMutation.mutateAsync({
        metadataJson: {
          __journey: journeyMeta,
        },
      });
    },
  });
}
