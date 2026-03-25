"use client";

/* ================================================================
   FIRST TRADE — AUTHORIZE
   /institutional/first-trade/authorize
   ================================================================
   Deliberate confirmation step for the institutional first trade.
   The user reviews a compact summary and explicitly authorizes
   the trade intent via the server-backed submitFirstTrade() action.

   Design requirements:
     • Serious and high-trust, not cluttered
     • One clear action: "Authorize First Trade"
     • Legal acknowledgment required before proceeding
     • Server-backed submission (fail-closed)
     • Not a dense order ticket

   Reuses:
     • submitFirstTrade() server action (fail-closed, auth-enforced)
     • ReviewCard for compact summary
     • StepShell + StickyPrimaryAction for guided UX

   Does NOT reuse:
     • DualAuthGate (too complex for first-trade guided flow)
     • WebAuthnModal (reserved for operational settlement)
     • Full marketplace execution terminal
   ================================================================ */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
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

import { useGoldPrice } from "@/hooks/use-gold-price";
import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";
import { submitFirstTrade } from "@/actions/first-trade-actions";

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

export default function FirstTradeAuthorizePage() {
  const router = useRouter();

  /* ── Data hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const { data: goldPrice } = useGoldPrice();

  /* ── Local state ── */
  const [draft, setDraft] = useState<FirstTradeDraft>(
    FIRST_TRADE_DRAFT_DEFAULTS,
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  /* ── Restore persisted draft from metadata_json + guard readiness ── */
  useEffect(() => {
    if (draftRestored) return;
    if (stateLoading) return;

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
  }, [stateLoading, onboardingState, draftRestored, router]);

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

  const canProceed =
    isDeliveryStageReady(draft) && acknowledged && !isSubmitting;

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

  /* ── Authorize: server-backed submission ── */
  const handleAuthorize = useCallback(async () => {
    if (!canProceed) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitFirstTrade();
      router.push("/institutional/first-trade/success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authorization failed";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  }, [canProceed, router]);

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

  return (
    <StepShell
      icon={ShieldCheck}
      headline="Authorize your first trade"
      description="Review and confirm to initiate your first institutional gold transaction."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Server-Backed · Fail-Closed · Audit Logged
          </span>
        </div>
      }
    >
      <div className="w-full space-y-5">
        {/* ════════════════════════════════════════════════════════
           Compact Summary
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
            ...(spotPrice > 0
              ? [
                  {
                    label: "Estimated Total",
                    value: `${fmtUsd(estimatedNotional)} (indicative)`,
                    mono: true,
                  },
                ]
              : []),
          ]}
        />

        {/* ════════════════════════════════════════════════════════
           Legal Acknowledgment
           ════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-900 accent-[#C6A86B] shrink-0"
            />
            <span className="text-xs text-slate-400 leading-relaxed">
              I acknowledge that this initiates a first trade intent for my
              institution. Final execution pricing, logistics quotes, and
              settlement details will be confirmed during the operational
              settlement phase. This action records my authorization and
              is subject to institutional compliance controls.
            </span>
          </label>
        </div>

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
          {acknowledged ? (
            <span className="flex items-center gap-1.5 text-[#3fae7a] font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ready to authorize
            </span>
          ) : (
            <span className="text-slate-500">
              Please acknowledge the terms above to proceed
            </span>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Primary Action + Escape Hatch
           ════════════════════════════════════════════════════════ */}
        <StickyPrimaryAction
          label={isSubmitting ? "Authorizing…" : "Authorize First Trade"}
          onClick={handleAuthorize}
          loading={isSubmitting}
          disabled={!canProceed}
          icon={ShieldCheck}
          secondaryLabel="Save and return later"
          secondaryOnClick={handleSaveAndExit}
        />
      </div>
    </StepShell>
  );
}
