"use client";

/* ================================================================
   FIRST TRADE — SUCCESS
   /institutional/first-trade/success
   ================================================================
   Terminal page of the institutional guided first-trade flow.
   Shows a calm confirmation that the first trade intent was
   recorded, displays the captured indicative price snapshot,
   and provides a clean handoff into the broader workspace.

   The __journey.firstTradeCompleted flag is already true (set by
   submitFirstTrade() on the authorize page).

   The indicative snapshot is read from __firstTradeIntent and
   displayed honestly with explicit INDICATIVE labeling.

   Design: calm, celebratory without being frivolous, institutional.
   No back navigation — completion is final.
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Clock,
  Info,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";

import { useOnboardingState } from "@/hooks/use-onboarding-state";

/* ================================================================
   Types
   ================================================================ */

interface IndicativeSnapshotData {
  tier: string;
  spotPriceUsd: number;
  totalWeightOz: number;
  baseSpotValueUsd: number;
  assetPremiumUsd: number;
  assetPremiumBps: number;
  platformFeeUsd: number;
  platformFeeBps: number;
  estimatedTotalUsd: number;
  capturedAt: string;
}

interface FirstTradeIntent {
  ref: string;
  assetId: string;
  quantity: number;
  deliveryMethod: string;
  vaultJurisdiction: string | null;
  deliveryRegion: string | null;
  indicativeSnapshot?: IndicativeSnapshotData;
  submittedAt: string;
}

/* ================================================================
   FORMATTERS
   ================================================================ */

function fmtUsd(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  const snapshot = intent?.indicativeSnapshot ?? null;

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
      headline="Trade intent confirmed"
      description="Your trade intent has been recorded. A settlement case is now open — your operations team will issue a binding quote, followed by settlement instructions and custody allocation."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Settlement case open · Binding quote pending · Support: operations@aurumshield.com
          </span>
        </div>
      }
    >
      <div className="w-full space-y-6" data-tour="settlement-confirmation">
        {/* ── Success Confirmation ── */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3fae7a]/10 border border-[#3fae7a]/20">
            <CheckCircle2 className="h-8 w-8 text-[#3fae7a]" />
          </div>
        </div>

        {/* ── Trade Reference ── */}
        {intent && (
          <ReviewCard
            title="Trade Intent Confirmation"
            items={[
              {
                label: "Reference",
                value: intent.ref,
                mono: true,
              },
              {
                label: "Confirmed",
                value: fmtTime(intent.submittedAt),
              },
              {
                label: "Status",
                value: "Trade Intent Confirmed",
              },
            ]}
          />
        )}

        {/* ── Indicative Price Snapshot ── */}
        {snapshot && (
          <div className="rounded-xl border border-[#C6A86B]/15 bg-slate-900/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Indicative Estimate at Confirmation
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#C6A86B]/30 bg-[#C6A86B]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#C6A86B]">
                Indicative
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">XAU/USD Spot</span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {fmtUsd(snapshot.spotPriceUsd)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Spot Value ({snapshot.totalWeightOz.toLocaleString("en-US", { maximumFractionDigits: 2 })} oz)
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {fmtUsd(snapshot.baseSpotValueUsd)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Asset Premium (+{(snapshot.assetPremiumBps / 100).toFixed(2)}%)
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {fmtUsd(snapshot.assetPremiumUsd)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Platform Fee ({(snapshot.platformFeeBps / 100).toFixed(2)}%)
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {fmtUsd(snapshot.platformFeeUsd)}
                </span>
              </div>

              <div className="border-t border-slate-700/50 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-semibold">
                    Estimated Total
                  </span>
                  <span className="font-mono text-white font-bold tabular-nums">
                    {fmtUsd(snapshot.estimatedTotalUsd)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <Clock className="h-3 w-3 shrink-0 text-slate-600" />
              <span className="text-[10px] text-slate-600">
                Captured {fmtTime(snapshot.capturedAt)}
              </span>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-slate-800/50 bg-slate-900/30 px-3 py-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#C6A86B]/60" />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                This was the indicative estimate at confirmation time.
                Final execution price will be determined during the settlement phase.
              </p>
            </div>
          </div>
        )}

        {/* ── Settlement Case — Live Operational Center ── */}
        {intent && (
          <a
            href={`/institutional/settlement/SC-${intent.ref.replace("FT-", "")}`}
            className="flex items-center justify-between w-full p-5 rounded-xl border border-[#C6A86B]/30 bg-[#C6A86B]/5 hover:bg-[#C6A86B]/10 hover:border-[#C6A86B]/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#C6A86B]/30 bg-[#C6A86B]/10">
                <ShieldCheck className="h-5 w-5 text-[#C6A86B]" />
              </div>
              <div>
                <p className="text-sm text-white font-semibold">
                  View Settlement Case
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Live 8-stage timeline · Settlement documents · Operations contact
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-[#C6A86B] group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}

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
