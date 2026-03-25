"use client";

/* ================================================================
   FIRST TRADE — SUCCESS
   /institutional/first-trade/success
   ================================================================
   Terminal page of the institutional guided first-trade flow.
   Shows a calm confirmation that the first trade intent was
   recorded, explains what happens next, and provides a clean
   handoff into the broader institutional workspace.

   This is the point where the user's guided journey is complete.
   The __journey.firstTradeCompleted flag is already true (set by
   submitFirstTrade() on the authorize page).

   Design: calm, celebratory without being frivolous, institutional.
   No back navigation — completion is final.
   No secondary escape hatch — this is the terminal step.
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";

import { useOnboardingState } from "@/hooks/use-onboarding-state";

/* ================================================================
   Types
   ================================================================ */

interface FirstTradeIntent {
  ref: string;
  assetId: string;
  quantity: number;
  deliveryMethod: string;
  vaultJurisdiction: string | null;
  deliveryRegion: string | null;
  submittedAt: string;
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function FirstTradeSuccessPage() {
  /* ── Data hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const hasRestoredRef = useRef(false);

  /* ── Local state ── */
  const [intent, setIntent] = useState<FirstTradeIntent | null>(null);

  /* ── Restore trade intent from metadata_json ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (stateLoading) return;
    hasRestoredRef.current = true;

    queueMicrotask(() => {
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;
        const saved = meta.__firstTradeIntent as
          | FirstTradeIntent
          | undefined;
        if (saved && typeof saved === "object" && saved.ref) {
          setIntent(saved);
        }
      }
    });
  }, [stateLoading, onboardingState]);

  /* ── Loading state ── */
  if (stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <StepShell
      icon={CheckCircle2}
      headline="Your first trade has been initiated"
      description="Your institutional gold transaction intent has been recorded and is now being processed."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            AurumShield · Sovereign Custody · Institutional Grade
          </span>
        </div>
      }
    >
      <div className="w-full space-y-6">
        {/* ── Success Confirmation ── */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3fae7a]/10 border border-[#3fae7a]/20">
            <CheckCircle2 className="h-8 w-8 text-[#3fae7a]" />
          </div>
        </div>

        {/* ── Trade Reference ── */}
        {intent && (
          <ReviewCard
            title="Trade Intent Reference"
            items={[
              {
                label: "Reference",
                value: intent.ref,
                mono: true,
              },
              {
                label: "Submitted",
                value: new Date(intent.submittedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              },
              {
                label: "Status",
                value: "Intent Recorded",
              },
            ]}
          />
        )}

        {/* ── What Happens Next ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            What happens next
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C6A86B]/10 border border-[#C6A86B]/20 text-[10px] font-bold text-[#C6A86B]">
                1
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Quote & Price Lock</strong> — Your
                designated trader will lock in the execution price based on
                live market conditions.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C6A86B]/10 border border-[#C6A86B]/20 text-[10px] font-bold text-[#C6A86B]">
                2
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Settlement</strong> — Funding
                instructions will be provided. Wire transfer or stablecoin
                settlement rails are available.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C6A86B]/10 border border-[#C6A86B]/20 text-[10px] font-bold text-[#C6A86B]">
                3
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">
                  {intent?.deliveryMethod === "vault_custody"
                    ? "Custody Allocation"
                    : "Delivery & Logistics"}
                </strong>{" "}
                — {intent?.deliveryMethod === "vault_custody"
                  ? "Your gold will be allocated, serialized, and placed under bailment at the designated vault facility."
                  : "Brink's Global Services will coordinate armored insured delivery to your designated address."}
              </p>
            </div>
          </div>
        </div>

        {/* ── Workspace Access ── */}
        <div className="flex items-start gap-2.5 rounded-lg border border-[#3fae7a]/20 bg-[#3fae7a]/5 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-[#3fae7a]" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your guided onboarding is <strong className="text-[#3fae7a]">complete</strong>.
            You now have full access to the institutional workspace, including
            the marketplace, trade blotter, and compliance dashboard.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════
           Primary Action — Enter Workspace
           ════════════════════════════════════════════════════════ */}
        <StickyPrimaryAction
          label="Enter Institutional Workspace"
          href="/institutional"
          icon={ArrowRight}
        />
      </div>
    </StepShell>
  );
}
