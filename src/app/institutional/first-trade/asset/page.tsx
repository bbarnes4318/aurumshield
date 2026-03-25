"use client";

/* ================================================================
   FIRST TRADE — ASSET SELECTION
   /institutional/first-trade/asset
   ================================================================
   Guided asset selection for the institutional first trade.
   Answers three questions:
     1. What asset are you procuring?
     2. Roughly how many units?
     3. Allocation (vaulting) or physical delivery?

   Materially simpler than the 1,202-line marketplace terminal.
   Uses the guided-flow component system throughout.

   Reuses from marketplace:
     • ASSET_CATALOG data (via first-trade-draft-schema)
     • useGoldPrice() for live spot price
     • checkTransactionLimits() for fail-closed enforcement

   Does NOT reuse from marketplace:
     • Execution terminal UI
     • Quote lock state machine
     • Freight quoting / physical address
     • Settlement rail selection
     • Session-storage-only persistence
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Vault,
  Truck,
  Save,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { BigChoiceCard } from "@/components/institutional-flow/BigChoiceCard";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";

import {
  FIRST_TRADE_ASSETS,
  ASSET_MAP,
  FIRST_TRADE_DRAFT_DEFAULTS,
  PLATFORM_FEE_BPS,
  isAssetStageReady,
  type FirstTradeDraft,
  type TransactionIntent,
} from "@/lib/schemas/first-trade-draft-schema";

import { useGoldPrice, formatSpotPrice } from "@/hooks/use-gold-price";
import { checkTransactionLimits } from "@/lib/transaction-limits";

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

export default function FirstTradeAssetPage() {
  const router = useRouter();

  /* ── Data hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const { data: goldPrice, isLoading: priceLoading } = useGoldPrice();
  const hasRestoredRef = useRef(false);

  /* ── Local draft state ── */
  const [draft, setDraft] = useState<FirstTradeDraft>(
    FIRST_TRADE_DRAFT_DEFAULTS,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [limitBlocked, setLimitBlocked] = useState(false);

  /* ── Restore persisted draft from metadata_json ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (stateLoading) return;
    hasRestoredRef.current = true;

    queueMicrotask(() => {
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;
        const saved = meta.__firstTradeDraft as Partial<FirstTradeDraft> | undefined;
        if (saved && typeof saved === "object") {
          setDraft({
            ...FIRST_TRADE_DRAFT_DEFAULTS,
            ...saved,
          });
        }
      }
    });
  }, [stateLoading, onboardingState]);

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

  const canProceed = isAssetStageReady(draft) && spotPrice > 0;

  /* ── Handlers ── */
  const selectAsset = useCallback((assetId: string) => {
    setDraft((prev) => ({
      ...prev,
      selectedAssetId: assetId,
      quantity: 1,
    }));
    setLimitWarning(null);
    setLimitBlocked(false);
  }, []);

  const updateQuantity = useCallback((qty: number) => {
    setDraft((prev) => ({
      ...prev,
      quantity: Math.max(1, qty),
    }));
    setLimitWarning(null);
    setLimitBlocked(false);
  }, []);

  const selectIntent = useCallback((intent: TransactionIntent) => {
    setDraft((prev) => ({
      ...prev,
      transactionIntent: intent,
    }));
  }, []);

  /* ── Continue: validate limits → persist → navigate ── */
  const handleContinue = useCallback(async () => {
    if (!canProceed) return;

    // Fail-closed: enforce transaction limits
    const amountCents = Math.round(estimatedNotional * 100);
    const limitCheck = checkTransactionLimits(amountCents);

    if (!limitCheck.allowed) {
      setLimitWarning(limitCheck.reason);
      setLimitBlocked(true);
      return;
    }

    if (limitCheck.requiresReview) {
      setLimitWarning(limitCheck.reason);
      setLimitBlocked(false);
      // Allow to continue — review will be enforced at authorization stage
    } else {
      setLimitWarning(null);
      setLimitBlocked(false);
    }

    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 6,
        status: "IN_PROGRESS",
        metadataJson: {
          __firstTradeDraft: draft,
          __journey: {
            stage: "FIRST_TRADE_DELIVERY",
            firstTradeCompleted: false,
          },
        },
      });

      router.push("/institutional/first-trade/delivery");
    } catch {
      // TanStack Query handles the error — stays on page
      setIsSaving(false);
    }
  }, [canProceed, estimatedNotional, draft, saveMutation, router]);

  /* ── Save and return later ── */
  const handleSaveAndExit = useCallback(async () => {
    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 6,
        status: "IN_PROGRESS",
        metadataJson: {
          __firstTradeDraft: draft,
          __journey: {
            stage: "FIRST_TRADE_ASSET",
            firstTradeCompleted: false,
          },
        },
      });
    } catch {
      // Best-effort save — still navigate
    }

    router.push("/institutional/get-started/welcome");
  }, [draft, saveMutation, router]);

  /* ── Loading state ── */
  if (stateLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" />
        <p className="text-sm text-slate-500">Loading your progress…</p>
      </div>
    );
  }

  return (
    <StepShell
      icon={ShoppingBag}
      headline="What would you like to procure?"
      description="Select the gold product and quantity for your first institutional transaction."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Live Pricing · Fail-Closed Limits · Sovereign Custody
          </span>
        </div>
      }
    >
      <div className="w-full space-y-6">
        {/* ── Live Spot Price Banner ── */}
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
              {goldPrice && (
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    goldPrice.change24h >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {goldPrice.change24h >= 0 ? "+" : ""}
                  {goldPrice.change24h} ({goldPrice.changePct24h}%)
                </span>
              )}
            </>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Section 1: Asset Selection
           ════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Select Product
          </h2>

          {FIRST_TRADE_ASSETS.map((asset) => {
            const pricePerBar =
              spotPrice > 0
                ? spotPrice * (1 + asset.premiumBps / 10_000) * asset.weightOz
                : 0;

            return (
              <BigChoiceCard
                key={asset.id}
                icon={ShoppingBag}
                title={asset.name}
                description={`${fmtWeight(asset.weightOz)} oz · ${asset.fineness} fineness${spotPrice > 0 ? ` · ${fmtUsd(pricePerBar, 0)}/bar` : ""}`}
                selected={draft.selectedAssetId === asset.id}
                badge={asset.isApex ? "Flagship" : undefined}
                badgeVariant={asset.isApex ? "gold" : "gold"}
                onClick={() => selectAsset(asset.id)}
              />
            );
          })}
        </section>

        {/* ════════════════════════════════════════════════════════
           Section 2: Quantity (visible only after asset selected)
           ════════════════════════════════════════════════════════ */}
        {selectedAsset && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Quantity
            </h2>

            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-3">
              <button
                type="button"
                onClick={() => updateQuantity(draft.quantity - 1)}
                disabled={draft.quantity <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-white font-mono text-sm hover:border-slate-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                −
              </button>

              <input
                type="number"
                min={1}
                value={draft.quantity}
                onChange={(e) =>
                  updateQuantity(parseInt(e.target.value) || 1)
                }
                className="h-8 w-16 rounded-lg border border-slate-700 bg-slate-950 text-center font-mono text-sm text-white tabular-nums focus:border-[#C6A86B] focus:outline-none focus:ring-1 focus:ring-[#C6A86B]/30"
              />

              <button
                type="button"
                onClick={() => updateQuantity(draft.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-white font-mono text-sm hover:border-slate-600 transition-colors"
              >
                +
              </button>

              <div className="ml-2 text-left">
                <p className="font-mono text-xs text-slate-300 font-semibold">
                  {draft.quantity} × {selectedAsset.shortName}
                </p>
                <p className="font-mono text-[10px] text-slate-600">
                  {fmtWeight(totalWeightOz)} troy oz total
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
           Section 3: Transaction Intent (visible after quantity)
           ════════════════════════════════════════════════════════ */}
        {selectedAsset && draft.quantity >= 1 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Transaction Type
            </h2>

            <BigChoiceCard
              icon={Vault}
              title="Allocated Vaulting"
              description="Sovereign freeport custody at an LBMA-approved vault. Full title allocation."
              selected={draft.transactionIntent === "ALLOCATION"}
              badge="Recommended"
              badgeVariant="success"
              onClick={() => selectIntent("ALLOCATION")}
            />

            <BigChoiceCard
              icon={Truck}
              title="Physical Delivery"
              description="Armored insured transit via Brink's. Delivered to your designated address."
              selected={draft.transactionIntent === "PHYSICAL_DELIVERY"}
              onClick={() => selectIntent("PHYSICAL_DELIVERY")}
            />
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
           Section 4: Estimate Summary (ReviewCard)
           ════════════════════════════════════════════════════════ */}
        {canProceed && (
          <ReviewCard
            title="Estimated Transaction"
            items={[
              {
                label: "Product",
                value: `${selectedAsset!.shortName} × ${draft.quantity}`,
              },
              {
                label: "Total Weight",
                value: `${fmtWeight(totalWeightOz)} troy oz`,
                mono: true,
              },
              {
                label: "Spot Value",
                value: fmtUsd(baseSpotValue),
                mono: true,
              },
              {
                label: `Asset Premium (+${(selectedAsset!.premiumBps / 100).toFixed(2)}%)`,
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
              {
                label: "Intent",
                value:
                  draft.transactionIntent === "ALLOCATION"
                    ? "Allocated Vaulting"
                    : "Physical Delivery",
              },
            ]}
          />
        )}

        {/* ── Limit Warning ── */}
        {limitWarning && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${
              limitBlocked
                ? "border-red-500/40 bg-red-950/20"
                : "border-[#C6A86B]/30 bg-[#C6A86B]/5"
            }`}
          >
            <AlertTriangle
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                limitBlocked ? "text-red-400" : "text-[#C6A86B]"
              }`}
            />
            <p
              className={`text-[11px] leading-relaxed ${
                limitBlocked ? "text-red-400" : "text-slate-400"
              }`}
            >
              {limitWarning}
            </p>
          </div>
        )}

        {/* ── Readiness indicator ── */}
        <div className="flex items-center justify-center gap-2 text-[11px]">
          {canProceed ? (
            <span className="text-[#3fae7a] font-semibold">
              Ready to continue
            </span>
          ) : (
            <span className="text-slate-500">
              {!selectedAsset
                ? "Select a product above"
                : !draft.transactionIntent
                  ? "Choose allocation or physical delivery"
                  : "Loading pricing…"}
            </span>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Primary Action + Escape Hatch
           ════════════════════════════════════════════════════════ */}
        <StickyPrimaryAction
          label="Continue to Delivery"
          onClick={handleContinue}
          loading={isSaving}
          disabled={!canProceed || isSaving || limitBlocked}
          icon={Save}
          secondaryLabel="Save and return later"
          secondaryOnClick={handleSaveAndExit}
        />
      </div>
    </StepShell>
  );
}
