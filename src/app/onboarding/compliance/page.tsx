"use client";

/* ================================================================
   /onboarding/compliance — Institutional Compliance Verification
   ================================================================
   KYC verification page embedded within the full app shell.
   Users see:
     1. Institutional Compliance Protocol copy
     2. "Initiate Secure Verification" → launches Persona SDK
     3. Polling /api/user/kyc-status after Persona completes
     4. APPROVED → redirect to /buyer
     5. REJECTED → in-product Compliance Case escalation

   Save-and-Resume:
     • On mount: checks saved onboarding state for existing inquiry
     • If provider_inquiry_id exists + PROVIDER_PENDING → resumes polling
     • Persona inquiryId is persisted on completion
     • "Resume Later" affordance for safe exit

   Edge Cases:
     - onCancel: resets to "Initiate" screen
     - onError: resets to "Initiate" screen
     - SDK fails to load: shows error + retry
     - State recovery: inquiry done but KYC still pending → "Review in progress"
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

/* ----------------------------------------------------------------
   Types
   ---------------------------------------------------------------- */

type ComplianceState =
  | "loading"       // Checking saved state
  | "idle"          // Show "Initiate Secure Verification" button
  | "verifying"     // Persona overlay is active
  | "polling"       // Persona completed → polling /api/user/kyc-status
  | "approved"      // KYC approved → redirecting to /buyer
  | "rejected"      // KYC rejected → show failure UI
  | "review";       // State recovery: inquiry done, awaiting backend review

/* ----------------------------------------------------------------
   Constants
   ---------------------------------------------------------------- */

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15;
const PERSONA_TEMPLATE_ID = process.env.NEXT_PUBLIC_PERSONA_TEMPLATE_ID;

/* ================================================================
   COMPONENT
   ================================================================ */

export default function CompliancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<ComplianceState>("loading");
  const [error, setError] = useState<string | null>(null);
  const personaClientRef = useRef<{ destroy: () => void } | null>(null);
  const mountedRef = useRef(true);
  const pollCountRef = useRef(0);
  const hasCheckedSavedRef = useRef(false);

  /* ── Saved state hooks ── */
  const savedStateQ = useOnboardingState();
  const saveMutation = useSaveOnboardingState();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Cleanup Persona client on unmount
  useEffect(() => {
    return () => {
      if (personaClientRef.current) {
        try { personaClientRef.current.destroy(); } catch { /* already destroyed */ }
      }
    };
  }, []);

  /* ── State recovery: check for in-progress provider inquiry ── */
  useEffect(() => {
    if (hasCheckedSavedRef.current) return;
    if (savedStateQ.isLoading) return;

    hasCheckedSavedRef.current = true;

    if (savedStateQ.data) {
      const saved = savedStateQ.data;

      // If inquiry was submitted but platform status is still pending
      if (saved.providerInquiryId && saved.status === "PROVIDER_PENDING") {
        setState("review");
        // Start polling to check if webhook has arrived
        pollKycStatus();
        return;
      }

      // If already completed, redirect
      if (saved.status === "COMPLETED") {
        router.replace("/buyer");
        return;
      }
    }

    // No saved state or IN_PROGRESS → show idle
    setState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedStateQ.isLoading, savedStateQ.data]);

  /* ── Poll /api/user/kyc-status after Persona completes ── */
  const pollKycStatus = useCallback(async () => {
    if (!user?.id) return;
    pollCountRef.current = 0;

    const poll = async () => {
      if (!mountedRef.current) return;
      pollCountRef.current++;

      try {
        const res = await fetch(
          `/api/user/kyc-status?userId=${encodeURIComponent(user.id)}`,
        );
        if (!res.ok) throw new Error("Failed to fetch KYC status");
        const data = await res.json();

        if (data.kycStatus === "APPROVED") {
          // Mark onboarding as completed
          saveMutation.mutate({
            currentStep: 4,
            status: "COMPLETED",
            statusReason: "KYC approved via provider webhook",
          });
          setState("approved");
          // Brief pause to show success state, then redirect
          setTimeout(() => {
            if (mountedRef.current) router.replace("/buyer");
          }, 1500);
          return;
        }

        if (data.kycStatus === "REJECTED") {
          saveMutation.mutate({
            currentStep: 4,
            status: "REVIEW",
            statusReason: "KYC rejected — escalated to compliance team",
          });
          setState("rejected");
          return;
        }

        // Still PENDING — keep polling
        if (pollCountRef.current < MAX_POLL_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          // Max attempts reached — show "Review in progress"
          // The provider inquiry completed but the webhook hasn't arrived yet.
          // This is the state recovery path — show transparent status.
          setState("review");
          // TODO: Phase 2 — subscribe to SSE for live updates
          // TODO: Phase 2 — trigger email/SMS notification for long delays
        }
      } catch {
        // Network error — retry if under max
        if (pollCountRef.current < MAX_POLL_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    if (state !== "review") {
      setState("polling");
    }
    poll();
  }, [user?.id, router, saveMutation, state]);

  /* ── Launch Persona Embedded Flow ── */
  const launchPersona = useCallback(async () => {
    setError(null);

    const userId = user?.id;
    if (!userId) {
      setError("Authentication required. Please sign in first.");
      return;
    }

    // Save that we're entering the verification flow
    saveMutation.mutate({
      currentStep: 4,
      status: "IN_PROGRESS",
      statusReason: "Launching Persona verification",
    });

    // ── Fallback: no Persona template configured (demo mode) ──
    if (!PERSONA_TEMPLATE_ID) {
      console.warn(
        "[AurumShield] NEXT_PUBLIC_PERSONA_TEMPLATE_ID not configured — using demo simulation",
      );
      setState("verifying");
      setTimeout(() => {
        if (!mountedRef.current) return;

        // Persist demo inquiry ID
        saveMutation.mutate({
          currentStep: 4,
          providerInquiryId: `demo-inquiry-${Date.now()}`,
          status: "PROVIDER_PENDING",
          statusReason: "Demo Persona inquiry completed, awaiting webhook",
        });

        // Simulate Persona completion → start polling
        pollKycStatus();
      }, 3000);
      return;
    }

    // ── Production: launch real Persona SDK ──
    setState("verifying");

    try {
      const Persona = await import("persona");

      // Destroy any existing client
      if (personaClientRef.current) {
        try { personaClientRef.current.destroy(); } catch { /* noop */ }
      }

      const client = new Persona.Client({
        templateId: PERSONA_TEMPLATE_ID,
        referenceId: userId, // THE GOLDEN THREAD: links Persona → webhook → PostgreSQL
        environment: "sandbox", // TODO: Switch to "production" for live
        onReady: () => {
          console.log("[AurumShield] Persona Inquiry flow is ready");
          client.open();
        },
        onComplete: ({ inquiryId, status }: { inquiryId: string; status: string }) => {
          console.log(
            `[AurumShield] Persona Inquiry completed: inquiryId=${inquiryId} status=${status}`,
          );
          if (!mountedRef.current) return;

          // Persist the provider inquiry ID for resume
          saveMutation.mutate({
            currentStep: 4,
            providerInquiryId: inquiryId,
            status: "PROVIDER_PENDING",
            statusReason: `Persona inquiry ${inquiryId} completed with status: ${status}`,
          });

          // Start polling the backend for the webhook result
          pollKycStatus();
        },
        onCancel: ({ inquiryId }: { inquiryId?: string }) => {
          console.log(
            `[AurumShield] Persona Inquiry cancelled: inquiryId=${inquiryId ?? "N/A"}`,
          );
          if (!mountedRef.current) return;

          // If we got an inquiry ID before cancellation, save it
          if (inquiryId) {
            saveMutation.mutate({
              currentStep: 4,
              providerInquiryId: inquiryId,
              status: "IN_PROGRESS",
              statusReason: "Persona inquiry cancelled by user",
            });
          }

          // EDGE CASE: Reset to "Initiate" screen — never leave blank
          setState("idle");
        },
        onError: (err: unknown) => {
          console.error("[AurumShield] Persona Inquiry error:", err);
          if (!mountedRef.current) return;
          // EDGE CASE: Reset to "Initiate" screen — never leave blank
          setState("idle");
          setError("Verification encountered an error. Please try again.");
        },
      });

      personaClientRef.current = client;
    } catch (err) {
      console.error("[AurumShield] Failed to initialize Persona SDK:", err);
      if (!mountedRef.current) return;
      setState("idle");
      setError("Failed to load verification system. Please try again.");
    }
  }, [user?.id, pollKycStatus, saveMutation]);

  /* ── Resume Later ── */
  const handleResumeLater = useCallback(() => {
    saveMutation.mutate({
      currentStep: 4,
      status: "IN_PROGRESS",
      statusReason: "User chose to resume later",
    });
    router.push("/buyer");
  }, [saveMutation, router]);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="w-full max-w-[560px]">
      <div className="rounded-xl border border-color-5/20 bg-color-1 px-8 py-10 shadow-2xl">

        {/* ── LOADING: Checking saved state ── */}
        {state === "loading" && (
          <div className="flex flex-col items-center text-center py-6">
            <Loader2 className="h-10 w-10 text-color-2 animate-spin mb-5" />
            <p className="text-sm text-color-3/40">
              Checking verification status…
            </p>
          </div>
        )}

        {/* ── REVIEW: Inquiry completed, awaiting backend ── */}
        {state === "review" && (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-color-2/10 mb-5">
              <Clock className="h-9 w-9 text-color-2" />
            </div>
            <h1 className="text-xl font-semibold text-color-3 tracking-tight mb-3">
              Review in Progress
            </h1>
            <p className="text-sm text-color-3/60 leading-relaxed max-w-md mb-2">
              Your identity verification has been submitted and is being
              processed by our compliance engine. This typically takes a few
              minutes but may take up to 24 hours for enhanced due diligence.
            </p>
            <p className="text-xs text-color-3/35 mb-6">
              You can safely close this page — we&apos;ll update your status
              automatically. The ComplianceBanner will reflect your current
              status across all pages.
            </p>
            {/* TODO: Phase 2 — SSE live status subscription */}
            {/* TODO: Phase 2 — email/SMS notification for long delays */}
            <div className="flex items-center gap-3">
              <Link
                href="/buyer"
                className="inline-flex items-center gap-2 rounded-lg bg-color-2 px-6 py-3 text-sm font-semibold text-color-1 transition-colors hover:bg-color-2/90 active:bg-color-2/80"
              >
                Continue to Dashboard
              </Link>
              <Link
                href="/compliance/case"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-color-3/40 hover:text-color-3/60 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Contact Support
              </Link>
            </div>
          </div>
        )}

        {/* ── REJECTED: Compliance Review Required ── */}
        {state === "rejected" && (
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 mb-5">
              <XCircle className="h-9 w-9 text-danger" />
            </div>
            <h1 className="text-xl font-semibold text-color-3 tracking-tight mb-3">
              Compliance Review Required
            </h1>
            <p className="text-sm text-color-3/60 leading-relaxed max-w-md mb-6">
              Our automated identity perimeter was unable to instantly clear
              your corporate credentials. Your account has been flagged for
              manual review by our compliance team. You can track the status
              of your review and submit additional documents through our
              compliance portal.
            </p>
            <Link
              href="/compliance/case"
              className="inline-flex items-center gap-2 rounded-lg bg-color-2 px-6 py-3 text-sm font-semibold text-color-1 transition-colors hover:bg-color-2/90 active:bg-color-2/80"
            >
              <MessageSquare className="h-4 w-4" />
              Contact Compliance Team
            </Link>
            <button
              type="button"
              onClick={() => { setState("idle"); setError(null); }}
              className="mt-4 text-xs text-color-3/40 hover:text-color-3/60 transition-colors underline underline-offset-2"
            >
              Retry Verification
            </button>
          </div>
        )}

        {/* ── APPROVED: Success → Redirecting ── */}
        {state === "approved" && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-5 animate-pulse">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>
            <h1 className="text-xl font-semibold text-success tracking-tight mb-2">
              Identity Verified
            </h1>
            <p className="text-sm text-color-3/50">
              Redirecting to Mission Control…
            </p>
          </div>
        )}

        {/* ── POLLING: Waiting for webhook ── */}
        {state === "polling" && (
          <div className="flex flex-col items-center text-center py-6">
            <Loader2 className="h-10 w-10 text-color-2 animate-spin mb-5" />
            <h1 className="text-lg font-semibold text-color-3 tracking-tight mb-2">
              Processing Verification
            </h1>
            <p className="text-sm text-color-3/40">
              Validating your identity credentials against our compliance engine…
            </p>
          </div>
        )}

        {/* ── VERIFYING: Persona overlay active ── */}
        {state === "verifying" && (
          <div className="flex flex-col items-center text-center py-6">
            <Loader2 className="h-10 w-10 text-color-2 animate-spin mb-5" />
            <h1 className="text-lg font-semibold text-color-3 tracking-tight mb-2">
              Verification In Progress
            </h1>
            <p className="text-sm text-color-3/40">
              Complete the identity verification in the secure overlay…
            </p>
          </div>
        )}

        {/* ── IDLE: Institutional Compliance Protocol ── */}
        {state === "idle" && (
          <div className="flex flex-col items-center text-center">
            {/* Shield icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-color-2/10 mb-5">
              <Shield className="h-9 w-9 text-color-2" />
            </div>

            {/* Headline */}
            <h1 className="text-xl font-semibold text-color-3 tracking-tight mb-2">
              Institutional Compliance Protocol
            </h1>

            {/* Body copy */}
            <p className="text-sm text-color-3/60 leading-relaxed max-w-md mb-2">
              Before accessing AurumShield&apos;s sovereign settlement engine,
              all institutional counterparties must complete a secure identity
              verification. This ensures compliance with federal KYC/KYB
              regulations and protects the integrity of the clearing network.
            </p>

            <p className="text-xs text-color-3/35 mb-6">
              Verification is powered by Persona and typically completes in
              under 2 minutes. Your biometric data is never stored on
              AurumShield servers.
            </p>

            {/* Error alert */}
            {error && (
              <div className="w-full flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger mb-5">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={launchPersona}
              className="inline-flex items-center gap-2.5 rounded-lg bg-color-2 px-7 py-3 text-sm font-semibold text-color-1 transition-all hover:bg-color-2/90 active:bg-color-2/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-color-2/50 focus-visible:ring-offset-2 focus-visible:ring-offset-color-1"
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              Initiate Secure Verification
            </button>

            {/* Resume Later */}
            <button
              type="button"
              onClick={handleResumeLater}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-color-3/30 hover:text-color-3/50 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Resume Later
            </button>

            {/* Trust footer */}
            <div className="mt-8 flex items-center gap-2 text-[10px] text-color-3/25">
              <Shield className="h-3 w-3 text-color-2/30" />
              <span>
                256-bit TLS · SOC 2 Compliant · Biometric data encrypted at rest
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
