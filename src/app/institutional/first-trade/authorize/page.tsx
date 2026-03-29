"use client";

/* ================================================================
   FIRST TRADE — AUTHORIZE
   /institutional/first-trade/authorize
   ================================================================
   Deliberate commercial confirmation step for the institutional
   first trade. The user reviews a compact summary — including an
   explicit indicative price snapshot — and authorizes the trade
   intent via the server-backed submitFirstTrade() action.

   HARDENED CONFIRMATION BOUNDARY:
     1. Scroll-through legal acknowledgment (must scroll to unlock)
     2. Typed confirmation phrase ("CONFIRM TRADE")
     3. Hold-to-confirm button (3-second press-and-hold)
     4. Server-backed 3-layer auth + phrase validation

   Design requirements:
     • Serious and high-trust commercial boundary
     • Typed confirmation phrase — not a single checkbox click
     • Hold-to-confirm prevents accidental submission
     • Indicative pricing shown transparently with tier label
     • Server-backed submission (fail-closed + snapshot validation)
     • Not a dense order ticket

   Reuses:
     • submitFirstTrade() server action (3-layer auth, fail-closed)
     • ReviewCard for compact summary
     • StepShell + StickyPrimaryAction for guided UX
     • useGoldPrice() for live spot oracle
   ================================================================ */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  KeyRound,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";
import { sceneStateMachine } from "@/demo/orchestration/sceneStateMachine";

import {
  ASSET_MAP,
  VAULT_JURISDICTIONS,
  DELIVERY_REGIONS,
  PLATFORM_FEE_BPS,
  FIRST_TRADE_DRAFT_DEFAULTS,
  isDeliveryStageReady,
  type FirstTradeDraft,
  type IndicativePriceSnapshot,
} from "@/lib/schemas/first-trade-draft-schema";

import { useGoldPrice, formatSpotPrice } from "@/hooks/use-gold-price";
import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";
import {
  submitFirstTrade,
  CONFIRMATION_PHRASE,
} from "@/actions/first-trade-actions";

/* ================================================================
   CONSTANTS
   ================================================================ */

/** Duration (ms) the user must hold the confirm button */
const HOLD_DURATION_MS = 3000;

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

function fmtWeight(oz: number): string {
  return oz.toLocaleString("en-US", {
    minimumFractionDigits: oz % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function FirstTradeAuthorizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  /* ── Data hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();

  /* ── Local state ── */
  const [draft, setDraft] = useState<FirstTradeDraft>(
    FIRST_TRADE_DRAFT_DEFAULTS,
  );
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsReverification, setNeedsReverification] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  /* ── Scroll-to-unlock state ── */
  const [hasScrolledLegal, setHasScrolledLegal] = useState(false);
  const legalScrollRef = useRef<HTMLDivElement>(null);

  /* ── Hold-to-confirm state ── */
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  /* ── Restore persisted draft from metadata_json + guard readiness ── */
  useEffect(() => {
    if (draftRestored) return;
    if (stateLoading) return;
    if (isDemoMode) { queueMicrotask(() => setDraftRestored(true)); return; }

    queueMicrotask(() => {
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;
        const saved = meta.__firstTradeDraft as
          | Partial<FirstTradeDraft>
          | undefined;
        if (saved && typeof saved === "object") {
          const restored = { ...FIRST_TRADE_DRAFT_DEFAULTS, ...saved };
          setDraft(restored);
          setDraftRestored(true);

          // Guard: if not delivery-ready, redirect
          if (!isDeliveryStageReady(restored)) {
            router.replace("/institutional/first-trade/delivery");
          }
          return;
        }
      }

      // No saved draft → redirect to delivery
      setDraftRestored(true);
      router.replace("/institutional/first-trade/delivery");
    });
  }, [stateLoading, onboardingState, draftRestored, isDemoMode, router]);

  /* ── Scroll detection for legal acknowledgment ── */
  useEffect(() => {
    const el = legalScrollRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      // Consider "scrolled" when within 20px of the bottom
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledLegal(true);
      }
    }

    el.addEventListener("scroll", handleScroll);
    // Check if content doesn't need scrolling (already fully visible)
    if (el.scrollHeight <= el.clientHeight + 20) {
      queueMicrotask(() => setHasScrolledLegal(true));
    }
    return () => el.removeEventListener("scroll", handleScroll);
  }, [draftRestored]);

  /* ── Derived values ── */
  const spotPrice = goldPrice?.spotPriceUsd ?? 0;
  const selectedAsset = draft.selectedAssetId
    ? ASSET_MAP.get(draft.selectedAssetId) ?? null
    : null;

  const totalWeightOz = selectedAsset
    ? selectedAsset.weightOz * draft.quantity
    : 0;
  const baseSpotValue = totalWeightOz * spotPrice;
  const assetPremium = selectedAsset
    ? baseSpotValue * (selectedAsset.premiumBps / 10_000)
    : 0;
  const platformFee = baseSpotValue * (PLATFORM_FEE_BPS / 10_000);
  const estimatedNotional = baseSpotValue + assetPremium + platformFee;

  const phraseMatches =
    confirmationInput.trim().toUpperCase() === CONFIRMATION_PHRASE;

  const canProceed = isDemoMode ? true :
    isDeliveryStageReady(draft) &&
    hasScrolledLegal &&
    phraseMatches &&
    !isSubmitting &&
    spotPrice > 0;

  /* ── Delivery display text ── */
  const selectedVault = draft.vaultJurisdiction
    ? VAULT_JURISDICTIONS.find((v) => v.code === draft.vaultJurisdiction)
    : null;
  const selectedRegion = draft.deliveryRegion
    ? DELIVERY_REGIONS.find((r) => r.code === draft.deliveryRegion)
    : null;

  function getDeliveryLabel(): string {
    if (draft.deliveryMethod === "vault_custody" && selectedVault) {
      return `Vaulted Custody — ${selectedVault.label}`;
    }
    if (draft.deliveryMethod === "secure_delivery" && selectedRegion) {
      return `Physical Delivery — ${selectedRegion.label}`;
    }
    return draft.deliveryMethod === "vault_custody"
      ? "Allocated Vaulted Custody"
      : "Armored Physical Delivery";
  }

  /* ── Build indicative price snapshot ── */
  const buildSnapshot = useMemo((): IndicativePriceSnapshot | null => {
    if (spotPrice <= 0 || !selectedAsset) return null;
    return {
      tier: "INDICATIVE",
      spotPriceUsd: spotPrice,
      totalWeightOz,
      baseSpotValueUsd: baseSpotValue,
      assetPremiumUsd: assetPremium,
      assetPremiumBps: selectedAsset.premiumBps,
      platformFeeUsd: platformFee,
      platformFeeBps: PLATFORM_FEE_BPS,
      estimatedTotalUsd: estimatedNotional,
      capturedAt: new Date().toISOString(),
    };
  }, [spotPrice, selectedAsset, totalWeightOz, baseSpotValue, assetPremium, platformFee, estimatedNotional]);

  /* ── Authorize: server-backed submission with price snapshot ── */
  const handleAuthorize = useCallback(async () => {
    if (isDemoMode) {
      // Force-advance the scene machine so act-8 starts immediately
      // instead of waiting for the silence recovery timer.
      sceneStateMachine.advanceToNextScene();
      router.push("/institutional/first-trade/success?demo=true");
      return;
    }
    if (!canProceed) return;

    // Capture a fresh snapshot at the exact moment of authorization
    if (!selectedAsset || spotPrice <= 0) return;

    const snapshot: IndicativePriceSnapshot = {
      tier: "INDICATIVE",
      spotPriceUsd: spotPrice,
      totalWeightOz,
      baseSpotValueUsd: baseSpotValue,
      assetPremiumUsd: assetPremium,
      assetPremiumBps: selectedAsset.premiumBps,
      platformFeeUsd: platformFee,
      platformFeeBps: PLATFORM_FEE_BPS,
      estimatedTotalUsd: estimatedNotional,
      capturedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setSubmitError(null);
    setNeedsReverification(false);

    try {
      await submitFirstTrade({
        indicativePriceSnapshot: snapshot,
        confirmationPhrase: confirmationInput.trim().toUpperCase(),
      });
      router.push("/institutional/first-trade/success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authorization failed";

      // Detect reverification-required: show guided re-auth prompt
      // instead of dumping a raw error string
      if (message.includes("REVERIFICATION_REQUIRED")) {
        setNeedsReverification(true);
        setSubmitError(null);
      } else {
        setSubmitError(message);
      }
      setIsSubmitting(false);
    }
  }, [canProceed, isDemoMode, router, spotPrice, selectedAsset, totalWeightOz, baseSpotValue, assetPremium, platformFee, estimatedNotional, confirmationInput]);

  /* ── Hold-to-confirm handlers ── */
  const handleHoldStart = useCallback(() => {
    if (!canProceed) return;
    holdStartRef.current = Date.now();
    setHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        // Trigger the authorization
        handleAuthorize();
      }
    }, 50);
  }, [canProceed, handleAuthorize]);

  const handleHoldEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    };
  }, []);

  /* ── Save and return later ── */
  const handleSaveAndExit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 7,
        status: "IN_PROGRESS",
        metadataJson: {
          __firstTradeDraft: draft,
          __journey: {
            stage: "FIRST_TRADE_AUTHORIZE",
            firstTradeCompleted: false,
          },
        },
      });
    } catch {
      // Best-effort save — still navigate
    }

    router.push("/institutional/get-started/welcome");
  }, [draft, saveMutation, router]);

  /* ── Loading / not yet restored ── */
  if (stateLoading || !draftRestored) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" />
        <p className="text-sm text-slate-500">Loading your progress…</p>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     DEMO MODE: Single-viewport authorization boundary
     ═══════════════════════════════════════════════════════════ */
  if (isDemoMode) {
    return (
      <div className="w-full max-w-3xl mx-auto animate-in fade-in duration-500" data-tour="review-ticket">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex h-14 w-14 items-center justify-center border-2 border-[#C6A86B]/30 bg-linear-to-b from-[#C6A86B]/15 to-transparent mb-3 shadow-[0_0_50px_rgba(198,168,107,0.12)]">
            <ShieldCheck className="h-7 w-7 text-[#C6A86B]" strokeWidth={1.2} />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mb-1">
            Authorization Boundary
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Hardened 3-gate confirmation. This is where trade intent becomes a binding commitment.
          </p>
        </div>

        {/* Authorization Card */}
        <div className="border border-slate-800/60 bg-linear-to-b from-slate-900/60 to-slate-950/60 p-5">
          {/* Trade Summary */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4">
            {[
              { l: "Asset", v: selectedAsset ? `${selectedAsset.shortName} × ${draft.quantity}` : "—" },
              { l: "Weight", v: `${fmtWeight(totalWeightOz)} troy oz` },
              { l: "Custody", v: getDeliveryLabel() },
              { l: "Intent", v: draft.transactionIntent === "ALLOCATION" ? "Allocation" : "Physical Delivery" },
            ].map((r) => (
              <div key={r.l} className="flex items-center justify-between py-1 border-b border-slate-800/30">
                <span className="text-[10px] text-slate-500">{r.l}</span>
                <span className="text-[11px] text-slate-300 font-medium">{r.v}</span>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="border-t border-slate-700/50 pt-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500">Indicative Spot Value</span>
              <span className="font-mono text-[11px] text-slate-300">{fmtUsd(baseSpotValue)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500">Premium + Fee</span>
              <span className="font-mono text-[11px] text-slate-300">{fmtUsd(assetPremium + platformFee)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#C6A86B]/20">
              <span className="text-sm text-white font-bold">Estimated Total</span>
              <span className="font-mono text-lg text-[#C6A86B] font-bold">{fmtUsd(estimatedNotional)}</span>
            </div>
          </div>

          {/* 3-Gate Status */}
          <div className="flex items-center justify-between gap-4 py-3 border-t border-slate-800/50">
            {[
              { gate: "Legal Acknowledgment", icon: "✓", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
              { gate: "Confirmation Phrase", icon: "✓", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
              { gate: "Authorization Hold", icon: "⏳", color: "text-[#C6A86B]", bg: "bg-[#C6A86B]/10 border-[#C6A86B]/30" },
            ].map((g) => (
              <div key={g.gate} className={`flex-1 flex flex-col items-center gap-1.5 py-2 border ${g.bg} rounded`}>
                <span className={`text-sm ${g.color} font-bold`}>{g.icon}</span>
                <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">{g.gate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Authorize Button */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleAuthorize}
            className="group flex items-center justify-center gap-2 px-10 py-3 bg-[#C6A86B] hover:bg-[#d4b87a] text-slate-950 font-bold text-sm rounded-lg transition-all duration-200 shadow-[0_0_30px_rgba(198,168,107,0.25)] hover:shadow-[0_0_50px_rgba(198,168,107,0.4)]"
          >
            <KeyRound className="h-4 w-4" />
            Authorize Trade
          </button>
          <span className="font-mono text-[8px] text-slate-600 uppercase tracking-widest">
            Audit-logged · Session-fresh · Fail-closed
          </span>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     PRODUCTION MODE: Full hardened confirmation boundary
     ════════════════════════════════════════════════════════ */
  return (
    <StepShell
      icon={ShieldCheck}
      headline="Confirm your first trade"
      description="Review the commercial summary below, read the legal acknowledgment, and type the confirmation phrase to authorize."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Session-fresh auth required · Audit-logged · Fail-closed server validation
          </span>
        </div>
      }
    >
      <div className="w-full space-y-5" data-tour="review-ticket">
        {/* ════════════════════════════════════════════════════════
           Transaction Summary
           ════════════════════════════════════════════════════════ */}
        <ReviewCard
          title="Transaction Summary"
          items={[
            ...(selectedAsset
              ? [
                  {
                    label: "Asset",
                    value: `${selectedAsset.shortName} × ${draft.quantity}`,
                  },
                  {
                    label: "Weight",
                    value: `${fmtWeight(totalWeightOz)} troy oz`,
                    mono: true,
                  },
                ]
              : []),
            {
              label: "Handling",
              value: getDeliveryLabel(),
            },
          ]}
        />

        {/* ════════════════════════════════════════════════════════
           Indicative Price Summary — commercial boundary
           ════════════════════════════════════════════════════════ */}
        {spotPrice > 0 && buildSnapshot && (
          <div className="rounded-xl border border-[#C6A86B]/20 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Indicative Estimate
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#C6A86B]/30 bg-[#C6A86B]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#C6A86B]">
                Indicative
              </span>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  XAU/USD Spot
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {formatSpotPrice(spotPrice)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Spot Value ({fmtWeight(totalWeightOz)} oz)
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {fmtUsd(baseSpotValue)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Asset Premium (+{selectedAsset ? (selectedAsset.premiumBps / 100).toFixed(2) : "0.00"}%)
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {fmtUsd(assetPremium)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Platform Fee (1.00%)
                </span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {fmtUsd(platformFee)}
                </span>
              </div>

              {/* Separator */}
              <div className="border-t border-slate-700/50 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300 font-semibold">
                    Estimated Total
                  </span>
                  <span className="font-mono text-white font-bold tabular-nums">
                    {fmtUsd(estimatedNotional)}
                  </span>
                </div>
              </div>
            </div>

            {/* Captured timestamp + disclaimer */}
            <div className="flex items-start gap-2 pt-1">
              <Clock className="h-3 w-3 mt-0.5 shrink-0 text-slate-600" />
              {priceLoading ? (
                <span className="text-[10px] text-slate-600 animate-pulse">
                  Syncing live spot pricing…
                </span>
              ) : (
                <span className="text-[10px] text-slate-600">
                  Based on live XAU/USD spot at {fmtTime(new Date().toISOString())}
                </span>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-slate-800/50 bg-slate-900/30 px-3 py-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#C6A86B]/60" />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                This is an <strong className="text-slate-400">indicative estimate</strong>,
                not a locked quote. Final execution price will be determined
                during the settlement phase when a binding quote is generated.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
           Institutional Support Rail
           ════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/20 p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-start gap-2">
              <Clock className="h-3 w-3 mt-0.5 shrink-0 text-slate-600" />
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Session Freshness</p>
                <p className="text-[9px] text-slate-600">Auth session must be &lt;5 minutes old</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0 text-slate-600" />
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Compliance Gate</p>
                <p className="text-[9px] text-slate-600">KYB + AML clearance verified server-side</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <KeyRound className="h-3 w-3 mt-0.5 shrink-0 text-slate-600" />
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Audit Record</p>
                <p className="text-[9px] text-slate-600">Intent, snapshot, and timestamp immutably logged</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-slate-600" />
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Escalation</p>
                <p className="text-[9px] text-slate-600">operations@aurumshield.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
           Legal Acknowledgment — scroll-to-unlock
           ════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Legal Acknowledgment
            </h3>
            {hasScrolledLegal ? (
              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-semibold uppercase tracking-widest">
                <CheckCircle2 className="h-3 w-3" />
                Read
              </span>
            ) : (
              <span className="text-[9px] text-slate-600 uppercase tracking-widest animate-pulse">
                Scroll to read ↓
              </span>
            )}
          </div>

          <div
            ref={legalScrollRef}
            className="max-h-[140px] overflow-y-auto pr-2 text-xs text-slate-400 leading-relaxed space-y-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
          >
            <p>
              By authorizing this trade intent, I confirm that I am acting in
              my capacity as an authorized representative of the institution
              identified in my onboarding profile. I acknowledge that:
            </p>
            <p>
              <strong className="text-slate-300">1. Indicative Pricing.</strong>{" "}
              The estimated total of{" "}
              <strong className="text-slate-300">
                {spotPrice > 0 ? fmtUsd(estimatedNotional) : "—"}
              </strong>{" "}
              is based on a live indicative spot price and is{" "}
              <em>not a binding quote</em>. Final execution price, logistics
              fees, and settlement details will be confirmed during the
              operational settlement phase.
            </p>
            <p>
              <strong className="text-slate-300">2. Institutional Compliance.</strong>{" "}
              This authorization is subject to institutional compliance controls,
              KYC/AML verification, and sanctions screening. The platform reserves
              the right to reject or suspend execution if any compliance gate
              fails at any point prior to settlement.
            </p>
            <p>
              <strong className="text-slate-300">3. Audit Trail.</strong>{" "}
              This authorization is cryptographically recorded for regulatory
              audit purposes. The trade intent reference, indicative pricing
              snapshot, and authorization timestamp are immutably logged.
            </p>
            <p>
              <strong className="text-slate-300">4. Irrevocability.</strong>{" "}
              Once confirmed, this trade intent cannot be unilaterally withdrawn.
              Cancellation is subject to the platform&apos;s operational policies
              and may incur costs if settlement processes have been initiated.
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
           Typed Confirmation Phrase
           ════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
          <label htmlFor="confirmation-input" className="block text-xs text-slate-400 leading-relaxed">
            To authorize this trade intent, type{" "}
            <strong className="text-white font-mono tracking-wider">
              {CONFIRMATION_PHRASE}
            </strong>{" "}
            below:
          </label>
          <input
            id="confirmation-input"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            disabled={!hasScrolledLegal || isSubmitting}
            placeholder={CONFIRMATION_PHRASE}
            autoComplete="off"
            spellCheck={false}
            className={`
              w-full px-4 py-3 rounded-lg border bg-slate-950 font-mono text-sm
              tracking-wider uppercase text-center transition-all duration-200
              placeholder:text-slate-700 placeholder:tracking-wider
              focus:outline-none focus:ring-2 focus:ring-[#C6A86B]/40
              disabled:opacity-40 disabled:cursor-not-allowed
              ${phraseMatches
                ? "border-emerald-500/40 text-emerald-400"
                : confirmationInput.length > 0
                  ? "border-amber-500/30 text-amber-400"
                  : "border-slate-700 text-slate-300"
              }
            `}
          />
          {!hasScrolledLegal && (
            <p className="text-[10px] text-slate-600 text-center">
              Please read the legal acknowledgment above before confirming.
            </p>
          )}
        </div>

        {/* ── Reverification Required — Guided Re-Auth Prompt ── */}
        {needsReverification && (
          <div className="rounded-xl border border-[#C6A86B]/30 bg-[#C6A86B]/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#C6A86B]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C6A86B]">
                Session Expired — Re-verification Required
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              For security, high-value trade authorizations require a session that is less
              than <strong className="text-slate-300">5 minutes old</strong>. Your current
              session has exceeded this window. Please re-authenticate to continue.
            </p>
            <p className="text-[10px] text-slate-500">
              Your trade details, legal acknowledgment, and confirmation phrase are preserved.
              You will return to this exact step after re-authentication.
            </p>
            <button
              onClick={() => {
                // Save current state so progress is preserved across re-auth
                saveMutation.mutate({
                  currentStep: 7,
                  status: "IN_PROGRESS",
                  metadataJson: {
                    __firstTradeDraft: draft,
                    __journey: {
                      stage: "FIRST_TRADE_AUTHORIZE",
                      firstTradeCompleted: false,
                    },
                  },
                });

                // Redirect to Clerk sign-in with return URL to this page
                window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
              }}
              className="w-full py-3 rounded-lg bg-[#C6A86B] text-slate-950 text-sm font-semibold tracking-wide hover:bg-[#d4b87a] transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="h-4 w-4" />
              Re-authenticate to Continue
            </button>
          </div>
        )}

        {/* ── Submission Error ── */}
        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/20 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
            <p className="text-[11px] text-red-400 leading-relaxed">
              {submitError}
            </p>
          </div>
        )}

        {/* ── Authorization Status ── */}
        <div className="flex items-center justify-center gap-2 text-[11px]">
          {phraseMatches && hasScrolledLegal ? (
            <span className="flex items-center gap-1.5 text-[#3fae7a] font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ready — hold the button below for 3 seconds to confirm
            </span>
          ) : !hasScrolledLegal ? (
            <span className="text-slate-500">
              Read the legal acknowledgment to proceed
            </span>
          ) : !phraseMatches && confirmationInput.length > 0 ? (
            <span className="text-amber-500/80">
              Phrase does not match — type &quot;{CONFIRMATION_PHRASE}&quot; exactly
            </span>
          ) : (
            <span className="text-slate-500">
              Type the confirmation phrase above to proceed
            </span>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Hold-to-Confirm Button + Escape Hatch
           ════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          {/* Hold-to-confirm button */}
          <button
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
            onMouseLeave={handleHoldEnd}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            disabled={!canProceed}
            className={`
              relative w-full py-4 rounded-xl font-semibold text-sm tracking-wide
              transition-all duration-200 overflow-hidden select-none
              ${canProceed
                ? "bg-[#C6A86B] text-slate-950 cursor-pointer hover:bg-[#d4b87a] active:bg-[#b89a5d]"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }
            `}
          >
            {/* Progress fill overlay */}
            {holdProgress > 0 && (
              <div
                className="absolute inset-0 bg-emerald-500/30 transition-none"
                style={{ width: `${holdProgress * 100}%` }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming…
                </>
              ) : holdProgress > 0 ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Hold to confirm… {Math.ceil((1 - holdProgress) * 3)}s
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Hold to Confirm Trade Intent
                </>
              )}
            </span>
          </button>

          {/* Save and return */}
          <button
            onClick={handleSaveAndExit}
            disabled={isSubmitting}
            className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-400 transition-colors disabled:opacity-40"
          >
            Save and return later
          </button>
        </div>
      </div>
    </StepShell>
  );
}
