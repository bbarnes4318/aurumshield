"use client";

/* ================================================================
   USE ONBOARDING STATE — TanStack Query hooks
   ================================================================
   Client-side hooks for reading and persisting onboarding state.
   Wraps GET/PATCH /api/compliance/state.
   ================================================================ */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  OnboardingState,
  PatchOnboardingState,
} from "@/lib/compliance/onboarding-state";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

interface OnboardingStateResponse {
  state: OnboardingState | null;
  source?: string;
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
