"use client";

/* ================================================================
   FUNDING — /institutional/get-started/funding
   ================================================================
   ZERO SCROLL. Single viewport. Two method cards. One form. One CTA.
   Voice-reactive: AI calls select_card_option + fill_form_fields.
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Wallet,
  Building2,
  Zap,
  Clock,
  ArrowRight,
  Loader2,
  Landmark,
} from "lucide-react";

import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import {
  FUNDING_STAGE_DEFAULTS,
  STABLECOIN_NETWORKS,
  STABLECOIN_ASSETS,
  isFundingReady,
  type FundingStageData,
  type FundingMethod,
} from "@/lib/schemas/funding-stage-schema";
import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

const INPUT_CLASSES =
  "w-full rounded-lg border border-slate-800/60 px-3 py-2 bg-slate-950/60 text-sm text-slate-200 placeholder:text-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#C6A86B]/20 focus:border-[#C6A86B]/40 font-mono";

export default function FundingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  const { data: onboardingState, isLoading: stateLoading } = useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const hasRestoredRef = useRef(false);

  const [fundingData, setFundingData] = useState<FundingStageData>(FUNDING_STAGE_DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);

  /* ── Restore from persisted state ── */
  useEffect(() => {
    if (hasRestoredRef.current || stateLoading) return;
    hasRestoredRef.current = true;
    if (onboardingState?.metadataJson) {
      const meta = onboardingState.metadataJson as Record<string, unknown>;
      const saved = meta.__funding as Partial<FundingStageData> | undefined;
      if (saved && typeof saved === "object") {
        setFundingData({ ...FUNDING_STAGE_DEFAULTS, ...saved });
      }
    }
  }, [stateLoading, onboardingState]);

  const method = fundingData.fundingMethod;

  const selectMethod = useCallback((m: FundingMethod) => {
    setFundingData((prev) => ({ ...prev, fundingMethod: m, isFundingConfigured: false }));
  }, []);

  const updateField = useCallback(<K extends keyof FundingStageData>(key: K, value: FundingStageData[K]) => {
    setFundingData((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ── Can proceed? ── */
  const areFieldsComplete =
    method === "digital_stablecoin"
      ? fundingData.walletAddress.trim().length > 0 &&
        fundingData.walletNetwork.trim().length > 0 &&
        fundingData.stablecoinAsset.trim().length > 0
      : fundingData.bankName.trim().length > 0 &&
        fundingData.bankRoutingNumber.trim().length > 0 &&
        fundingData.bankAccountNumber.trim().length > 0;

  const handleContinue = useCallback(async () => {
    if (isDemoMode) {
      router.push("/institutional/marketplace?demo=true");
      return;
    }
    const data = { ...fundingData, isFundingConfigured: areFieldsComplete };
    if (!isFundingReady(data)) return;
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        currentStep: 5,
        status: "IN_PROGRESS",
        metadataJson: { __funding: data },
      });
      router.push("/institutional/first-trade/asset");
    } catch {
      setIsSaving(false);
    }
  }, [isDemoMode, fundingData, areFieldsComplete, saveMutation, router]);

  if (stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)] gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-180px)] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full max-w-lg space-y-5 -mt-8">
        {/* ── Header ── */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center border border-[#C6A86B]/30 bg-[#C6A86B]/5">
            <Landmark className="h-7 w-7 text-[#C6A86B]" strokeWidth={1.2} />
          </div>
          <div>
            <div className="font-mono text-[9px] text-[#C6A86B]/60 tracking-[0.3em] uppercase mb-1">Phase 04 of 04</div>
            <h1 className="text-2xl font-heading font-bold text-white tracking-tight">
              Settlement Rail
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Configure how your institution will fund trades on the Goldwire network.
            </p>
          </div>
        </div>

        {/* ── Method Selection — two compact cards ── */}
        <div className="grid grid-cols-2 gap-3" data-tour="funding-methods">
          {/* Stablecoin */}
          <button
            type="button"
            onClick={() => selectMethod("digital_stablecoin")}
            data-card-id="digital_stablecoin"
            className={`relative text-left p-4 border transition-all duration-300 ${
              method === "digital_stablecoin"
                ? "border-[#C6A86B]/40 bg-[#C6A86B]/5"
                : "border-slate-800/40 bg-slate-900/20 hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <Wallet className={`h-5 w-5 ${method === "digital_stablecoin" ? "text-[#C6A86B]" : "text-slate-600"}`} />
              <Zap className="h-3 w-3 text-emerald-500" />
            </div>
            <div className="font-mono text-[10px] text-white font-bold uppercase tracking-wider mb-0.5">
              Stablecoin Bridge
            </div>
            <div className="font-mono text-[8px] text-slate-500 tracking-wider uppercase">
              USDC/USDT · T+0 Settlement
            </div>
          </button>

          {/* Wire */}
          <button
            type="button"
            onClick={() => selectMethod("legacy_wire")}
            data-card-id="legacy_wire"
            className={`relative text-left p-4 border transition-all duration-300 ${
              method === "legacy_wire"
                ? "border-[#C6A86B]/40 bg-[#C6A86B]/5"
                : "border-slate-800/40 bg-slate-900/20 hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <Building2 className={`h-5 w-5 ${method === "legacy_wire" ? "text-[#C6A86B]" : "text-slate-600"}`} />
              <Clock className="h-3 w-3 text-amber-500" />
            </div>
            <div className="font-mono text-[10px] text-white font-bold uppercase tracking-wider mb-0.5">
              Fedwire / RTGS
            </div>
            <div className="font-mono text-[8px] text-slate-500 tracking-wider uppercase">
              Correspondent Banking · 30-45d
            </div>
          </button>
        </div>

        {/* ── Method-specific form (compact) ── */}
        {method === "digital_stablecoin" ? (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1 block">Asset</label>
                <select
                  id="funding-asset"
                  value={fundingData.stablecoinAsset}
                  onChange={(e) => updateField("stablecoinAsset", e.target.value)}
                  className={`${INPUT_CLASSES} appearance-none text-xs`}
                >
                  <option value="">Select…</option>
                  {STABLECOIN_ASSETS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1 block">Network</label>
                <select
                  id="funding-network"
                  value={fundingData.walletNetwork}
                  onChange={(e) => updateField("walletNetwork", e.target.value)}
                  className={`${INPUT_CLASSES} appearance-none text-xs`}
                >
                  <option value="">Select…</option>
                  {STABLECOIN_NETWORKS.map((n) => (
                    <option key={n.value} value={n.value}>{n.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1 block">Wallet Address</label>
              <input
                id="funding-wallet"
                type="text"
                value={fundingData.walletAddress}
                onChange={(e) => updateField("walletAddress", e.target.value)}
                placeholder="0x..."
                className={`${INPUT_CLASSES} text-xs`}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1 block">Bank Name</label>
              <input
                type="text"
                value={fundingData.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
                placeholder="e.g. JPMorgan Chase"
                className={`${INPUT_CLASSES} text-xs`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1 block">Routing #</label>
                <input
                  type="text"
                  value={fundingData.bankRoutingNumber}
                  onChange={(e) => updateField("bankRoutingNumber", e.target.value)}
                  placeholder="ABA / Sort Code"
                  className={`${INPUT_CLASSES} text-xs`}
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1 block">Account #</label>
                <input
                  type="text"
                  value={fundingData.bankAccountNumber}
                  onChange={(e) => updateField("bankAccountNumber", e.target.value)}
                  placeholder="Account number"
                  className={`${INPUT_CLASSES} text-xs`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div className="pt-1">
          <StickyPrimaryAction
            label="Continue to First Trade"
            onClick={handleContinue}
            loading={isSaving}
            disabled={(!isDemoMode && !areFieldsComplete) || isSaving}
            icon={ArrowRight}
          />
        </div>
      </div>
    </div>
  );
}
