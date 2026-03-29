"use client";

/* ================================================================
   FIRST TRADE — REVIEW
   /institutional/first-trade/review
   ================================================================
   Guided review of the first-trade draft before authorization.
   The user sees a calm, transparent summary of:
     1. What asset they selected
     2. How it will be handled or delivered
     3. What funding is intended
     4. Estimated transaction costs (honest — not finalized quotes)

   Materially simpler than the 1,202-line marketplace terminal.
   Uses the guided-flow component system throughout.

   Reuses from existing architecture:
     • FirstTradeDraft schema + readiness guards
     • useGoldPrice() for live spot pricing
     • ReviewCard for key-value summary
     • Save/restore pattern from asset/delivery pages

   Does NOT pretend:
     • Pricing is quote-locked
     • Freight/logistics quotes are finalized
     • Settlement rails are fully wired
   ================================================================ */

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  ShieldCheck,
  Loader2,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";

import {
  ASSET_MAP,
  VAULT_JURISDICTIONS,
  DELIVERY_REGIONS,
  PLATFORM_FEE_BPS,
  FIRST_TRADE_DRAFT_DEFAULTS,
  isDeliveryStageReady,
  type FirstTradeDraft,
} from "@/lib/schemas/first-trade-draft-schema";

import { useGoldPrice, formatSpotPrice } from "@/hooks/use-gold-price";
import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

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

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function FirstTradeReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoMode = searchParams.get("demo") === "true";

  /* ── Data hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();

  /* ── Local draft state ── */
  const [draft, setDraft] = useState<FirstTradeDraft>(
    FIRST_TRADE_DRAFT_DEFAULTS,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  /* ── Restore persisted draft from metadata_json + guard readiness ── */
  useEffect(() => {
    if (draftRestored) return;
    if (stateLoading) return;
    if (isDemoMode) { queueMicrotask(() => setDraftRestored(true)); return; } // Demo: skip draft guard

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

  const canProceed = isDeliveryStageReady(draft) && spotPrice > 0;

  /* ── Delivery display text ── */
  const selectedVault = draft.vaultJurisdiction
    ? VAULT_JURISDICTIONS.find((v) => v.code === draft.vaultJurisdiction)
    : null;
  const selectedRegion = draft.deliveryRegion
    ? DELIVERY_REGIONS.find((r) => r.code === draft.deliveryRegion)
    : null;

  /* ── Continue: persist → navigate to authorize ── */
  const handleContinue = useCallback(async () => {
    if (isDemoMode) {
      router.push("/institutional/first-trade/authorize?demo=true");
      return;
    }
    if (!canProceed) return;

    setIsSaving(true);

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

      router.push("/institutional/first-trade/authorize");
    } catch {
      // TanStack Query handles the error — stays on page
      setIsSaving(false);
    }
  }, [canProceed, isDemoMode, draft, saveMutation, router]);

  /* ── Save and return later ── */
  const handleSaveAndExit = useCallback(async () => {
    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 7,
        status: "IN_PROGRESS",
        metadataJson: {
          __firstTradeDraft: draft,
          __journey: {
            stage: "FIRST_TRADE_REVIEW",
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

  return (
    <StepShell
      icon={ClipboardList}
      headline="Review your first trade"
      description="Review your selections below. The next step is authorization — after that, a settlement case is opened and your operations team generates a binding quote."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Pricing is indicative until quote-lock · No funds move until settlement · Support: operations@aurumshield.com
          </span>
        </div>
      }
    >
      <div className="w-full space-y-5" data-tour="review-summary">
        {/* ── Live Spot Price Context ── */}
        <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-2.5">
          {priceLoading ? (
            <span className="font-mono text-xs text-slate-600 animate-pulse">
              Syncing live pricing…
            </span>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
                XAU/USD
              </span>
              <span className="font-mono text-sm text-white font-bold tabular-nums">
                {formatSpotPrice(spotPrice)}
              </span>
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Section 1: Asset Summary
           ════════════════════════════════════════════════════════ */}
        {selectedAsset && (
          <ReviewCard
            title="Asset"
            items={[
              {
                label: "Product",
                value: selectedAsset.name,
              },
              {
                label: "Quantity",
                value: `${draft.quantity} ${draft.quantity === 1 ? "bar" : "bars"}`,
              },
              {
                label: "Total Weight",
                value: `${fmtWeight(totalWeightOz)} troy oz`,
                mono: true,
              },
              {
                label: "Fineness",
                value: selectedAsset.fineness,
              },
            ]}
          />
        )}

        {/* ════════════════════════════════════════════════════════
           Section 2: Delivery / Custody
           ════════════════════════════════════════════════════════ */}
        <ReviewCard
          title="Delivery & Custody"
          items={[
            {
              label: "Handling Method",
              value:
                draft.deliveryMethod === "vault_custody"
                  ? "Allocated Vaulted Custody"
                  : "Armored Physical Delivery",
            },
            ...(draft.deliveryMethod === "vault_custody" && selectedVault
              ? [
                  {
                    label: "Vault Facility",
                    value: `Malca-Amit ${selectedVault.name}`,
                  },
                  {
                    label: "Jurisdiction",
                    value: selectedVault.label,
                  },
                ]
              : []),
            ...(draft.deliveryMethod === "secure_delivery" && selectedRegion
              ? [
                  {
                    label: "Destination Region",
                    value: selectedRegion.label,
                  },
                ]
              : []),
            {
              label: "Transaction Intent",
              value:
                draft.transactionIntent === "ALLOCATION"
                  ? "Allocated Vaulting"
                  : "Physical Delivery",
            },
          ]}
        />

        {/* ════════════════════════════════════════════════════════
           Section 3: Transaction Estimate
           ════════════════════════════════════════════════════════ */}
        {spotPrice > 0 && (
          <ReviewCard
            title="Indicative Transaction Estimate"
            items={[
              {
                label: "Spot Value",
                value: fmtUsd(baseSpotValue),
                mono: true,
              },
              {
                label: `Asset Premium (+${selectedAsset ? (selectedAsset.premiumBps / 100).toFixed(2) : "0.00"}%)`,
                value: fmtUsd(assetPremium),
                mono: true,
              },
              {
                label: "Platform Fee (1.00%)",
                value: fmtUsd(platformFee),
                mono: true,
              },
              {
                label: "Estimated Total",
                value: fmtUsd(estimatedNotional),
                mono: true,
              },
            ]}
          />
        )}

        {/* ════════════════════════════════════════════════════════
           Execution Readiness Panel
           ════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Execution Readiness
          </h3>
          <div className="space-y-2">
            {/* Pricing state */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-[11px] text-slate-500">Pricing State</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#C6A86B]">
                <Clock className="h-3 w-3" />
                Indicative — Not Locked
              </span>
            </div>
            {/* Settlement rail */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-[11px] text-slate-500">Settlement Rail</span>
              <span className="text-[11px] text-slate-400">
                Configured at execution
              </span>
            </div>
            {/* Delivery/custody config */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
              <span className="text-[11px] text-slate-500">Delivery / Custody</span>
              {isDeliveryStageReady(draft) ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  Complete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Incomplete
                </span>
              )}
            </div>
            {/* What becomes binding */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[11px] text-slate-500">What Becomes Binding</span>
              <span className="text-[11px] text-slate-400">
                Trade intent — not final price
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-slate-800/50 bg-slate-900/20 px-3 py-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-600" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Authorization records your trade intent at an indicative price.
              Price becomes <strong className="text-slate-400">locked</strong> only
              when your operations team generates a binding quote during the
              settlement phase.
            </p>
          </div>
        </div>

        {/* ── Honest Disclaimers ── */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/50 bg-slate-900/20 px-4 py-3">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-[#C6A86B]/60" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pricing shown is <strong className="text-slate-400">indicative</strong> based
              on live spot. Final execution price will be determined at
              quote-lock, which occurs during the settlement phase.
            </p>
          </div>

          {draft.deliveryMethod === "secure_delivery" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/50 bg-slate-900/20 px-4 py-3">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-[#C6A86B]/60" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Exact delivery address and freight quote will be finalized
                during the operational settlement phase. All shipments are
                insured and handled by Brink&apos;s Global Services.
              </p>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Post-Authorization Process
           ════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            What Happens After Authorization
          </h3>
          <div className="space-y-2">
            {[
              {
                step: "1",
                title: "Settlement case opened",
                detail: "Immediate — your trade intent is recorded and a case reference is generated.",
              },
              {
                step: "2",
                title: "Binding quote issued",
                detail: "Within 1 business day — operations locks the execution price and sends settlement instructions.",
              },
              {
                step: "3",
                title: "Funds received and verified",
                detail: "Depends on rail — Fedwire same-day, stablecoin within minutes. AML re-screening occurs.",
              },
              {
                step: "4",
                title: "Custody allocation or dispatch",
                detail: "1–3 business days — asset is allocated at vault or dispatched via Brink's.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-3 py-2 border-b border-slate-800/30 last:border-0"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900">
                  <span className="font-mono text-[9px] text-slate-400 font-bold">
                    {item.step}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-300 font-semibold">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600">
            Questions at any stage? Contact <strong className="text-slate-500">operations@aurumshield.com</strong>
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════
           Primary Action + Escape Hatch
           ════════════════════════════════════════════════════════ */}
        <StickyPrimaryAction
          label="Proceed to Authorization"
          onClick={handleContinue}
          loading={isSaving}
          disabled={(!isDemoMode && !canProceed) || isSaving}
          icon={ShieldCheck}
          secondaryLabel="Save and return later"
          secondaryOnClick={handleSaveAndExit}
        />
      </div>
    </StepShell>
  );
}
