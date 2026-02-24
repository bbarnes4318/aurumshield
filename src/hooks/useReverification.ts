"use client";

/* ================================================================
   useReverification — Step-Up Authentication Hook
   ================================================================
   Wraps sensitive server actions with Clerk's re-auth flow. When
   a server action returns REVERIFICATION_REQUIRED, the hook
   prompts re-authentication and retries the action.

   In demo mode (Clerk not configured), reverification is a no-op
   and the action executes immediately.

   Usage:
     const { execute, isReverifying } = useReverification();

     const handleLockPrice = async () => {
       const result = await execute(() => serverCreateQuote(input));
       if (result.ok) { ... }
     };
   ================================================================ */

import { useState, useCallback, useRef } from "react";

/* ── Types ── */

export interface ReverificationResult<T> {
  ok: true;
  data: T;
}

export interface ReverificationError {
  ok: false;
  error: string;
  /** True if the user dismissed the re-auth prompt */
  dismissed?: boolean;
}

export type ReverificationOutcome<T> =
  | ReverificationResult<T>
  | ReverificationError;

/** Shape returned by server actions that require step-up auth */
export interface StepUpResponse<T = unknown> {
  error?: string;
  data?: T;
}

/* ── Clerk availability check ── */

function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return !!key && key !== "YOUR_PUBLISHABLE_KEY" && key.startsWith("pk_");
}

/* ── Hook ── */

/**
 * Step-up authentication hook.
 *
 * Wraps an async action. If the action fails with
 * `REVERIFICATION_REQUIRED`, opens Clerk's re-auth modal
 * and retries the action once re-auth succeeds.
 *
 * In demo mode, re-verification is skipped entirely.
 */
export function useReverification() {
  const [isReverifying, setIsReverifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRetry = useRef<(() => Promise<unknown>) | null>(null);

  /**
   * Execute an async action with step-up auth support.
   *
   * @param action  The async function to execute (e.g. server action call)
   * @returns       ReverificationOutcome with the action's result or error
   */
  const execute = useCallback(
    async <T>(action: () => Promise<StepUpResponse<T>>): Promise<ReverificationOutcome<T>> => {
      setError(null);

      try {
        const result = await action();

        // If server says reverification is required
        if (result.error === "REVERIFICATION_REQUIRED") {
          if (!isClerkConfigured()) {
            // Demo mode — skip reverification, retry immediately
            const retryResult = await action();
            if (retryResult.error) {
              setError(retryResult.error);
              return { ok: false, error: retryResult.error };
            }
            return { ok: true, data: retryResult.data as T };
          }

          // Clerk mode — trigger re-auth
          setIsReverifying(true);

          try {
            // Dynamic import to avoid breaking when Clerk isn't installed
            const clerk = await import("@clerk/nextjs");
            const clerkInstance = (clerk as unknown as { default?: { openSignIn?: (opts: Record<string, unknown>) => void } }).default;

            // Store the retry so it can be called after re-auth
            return new Promise<ReverificationOutcome<T>>((resolve) => {
              pendingRetry.current = async () => {
                try {
                  const retryResult = await action();
                  if (retryResult.error) {
                    setError(retryResult.error);
                    resolve({ ok: false, error: retryResult.error });
                  } else {
                    resolve({ ok: true, data: retryResult.data as T });
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Re-verification retry failed";
                  setError(msg);
                  resolve({ ok: false, error: msg });
                } finally {
                  setIsReverifying(false);
                  pendingRetry.current = null;
                }
              };

              // Attempt to open Clerk's sign-in modal for re-auth
              if (clerkInstance?.openSignIn) {
                clerkInstance.openSignIn({
                  afterSignInUrl: window.location.href,
                });
              }

              // Set a timeout — if user doesn't re-auth within 2 minutes, resolve as dismissed
              setTimeout(() => {
                if (pendingRetry.current) {
                  pendingRetry.current = null;
                  setIsReverifying(false);
                  resolve({ ok: false, error: "Re-verification timed out", dismissed: true });
                }
              }, 120_000);
            });
          } catch {
            setIsReverifying(false);
            // Clerk import failed — fall back to direct retry
            const retryResult = await action();
            if (retryResult.error) {
              setError(retryResult.error);
              return { ok: false, error: retryResult.error };
            }
            return { ok: true, data: retryResult.data as T };
          }
        }

        // Success — no reverification needed
        if (result.error) {
          setError(result.error);
          return { ok: false, error: result.error };
        }

        return { ok: true, data: result.data as T };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Action failed";
        setError(msg);
        return { ok: false, error: msg };
      }
    },
    [],
  );

  /**
   * Call after successful re-authentication to retry the pending action.
   * This is typically called from a Clerk auth callback.
   */
  const completeReverification = useCallback(async () => {
    if (pendingRetry.current) {
      await pendingRetry.current();
    }
  }, []);

  return {
    execute,
    isReverifying,
    error,
    completeReverification,
  };
}
