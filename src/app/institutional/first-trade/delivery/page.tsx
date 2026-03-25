"use client";

/* ================================================================
   FIRST TRADE — DELIVERY & LOGISTICS
   /institutional/first-trade/delivery
   ================================================================
   Guided delivery / custody selection for the first institutional
   trade. Answers two questions:
     1. How should the gold be handled? (vault vs physical)
     2. Where should it go? (jurisdiction or region)

   Materially simpler than the legacy VaultingLegalStructuring and
   SecureLogisticsRouting terminal panels.

   Reuses from existing architecture:
     • DeliveryMethod concept (vault_custody / secure_delivery)
     • Vault jurisdiction codes from seed-logistics-hubs.ts
     • Bailment / custody language from VaultingLegalStructuring
     • Save/restore pattern from asset/page.tsx

   Does NOT reuse from existing architecture:
     • Dense two-column VaultingLegalStructuring UI
     • localStorage-backed delivery-store.ts
     • Rate quoting, address capture, shipment hooks
     • Freight terminal layout
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Vault,
  Truck,
  Shield,
  Save,
  ShieldCheck,
  Loader2,
  MapPin,
  Globe,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { BigChoiceCard } from "@/components/institutional-flow/BigChoiceCard";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";

import {
  FIRST_TRADE_DRAFT_DEFAULTS,
  ASSET_MAP,
  VAULT_JURISDICTIONS,
  DELIVERY_REGIONS,
  isDeliveryStageReady,
  type FirstTradeDraft,
  type FirstTradeDeliveryMethod,
} from "@/lib/schemas/first-trade-draft-schema";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function FirstTradeDeliveryPage() {
  const router = useRouter();

  /* ── Data hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const hasRestoredRef = useRef(false);

  /* ── Local draft state ── */
  const [draft, setDraft] = useState<FirstTradeDraft>(
    FIRST_TRADE_DRAFT_DEFAULTS,
  );
  const [isSaving, setIsSaving] = useState(false);

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
  const selectedAsset = draft.selectedAssetId
    ? ASSET_MAP.get(draft.selectedAssetId) ?? null
    : null;

  const canProceed = isDeliveryStageReady(draft);

  const selectedVault = draft.vaultJurisdiction
    ? VAULT_JURISDICTIONS.find((v) => v.code === draft.vaultJurisdiction)
    : null;

  const selectedRegion = draft.deliveryRegion
    ? DELIVERY_REGIONS.find((r) => r.code === draft.deliveryRegion)
    : null;

  /* ── Handlers ── */
  const selectDeliveryMethod = useCallback((method: FirstTradeDeliveryMethod) => {
    setDraft((prev) => ({
      ...prev,
      deliveryMethod: method,
      // Reset sub-selections when switching method
      vaultJurisdiction: method === "vault_custody" ? prev.vaultJurisdiction : "",
      deliveryRegion: method === "secure_delivery" ? prev.deliveryRegion : "",
    }));
  }, []);

  const selectVaultJurisdiction = useCallback((code: string) => {
    setDraft((prev) => ({
      ...prev,
      vaultJurisdiction: code,
    }));
  }, []);

  const selectDeliveryRegion = useCallback((code: string) => {
    setDraft((prev) => ({
      ...prev,
      deliveryRegion: code,
    }));
  }, []);

  /* ── Continue: persist → navigate ── */
  const handleContinue = useCallback(async () => {
    if (!canProceed) return;

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

      router.push("/institutional/first-trade/review");
    } catch {
      // TanStack Query handles the error — stays on page
      setIsSaving(false);
    }
  }, [canProceed, draft, saveMutation, router]);

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
            stage: "FIRST_TRADE_DELIVERY",
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
      icon={Package}
      headline="How should your gold be handled?"
      description="Choose between sovereign vaulted custody or armored physical delivery to your designated location."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Sovereign Custody · LBMA Approved · Insured Transit
          </span>
        </div>
      }
    >
      <div className="w-full space-y-6">
        {/* ── Asset Context Banner ── */}
        {selectedAsset && (
          <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-2.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#C6A86B] shadow-[0_0_6px_rgba(198,168,107,0.5)]" />
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">
              Asset
            </span>
            <span className="font-mono text-sm text-white font-bold">
              {selectedAsset.shortName} × {draft.quantity}
            </span>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
           Section 1: Delivery Method
           ════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Handling Method
          </h2>

          <BigChoiceCard
            icon={Vault}
            title="Allocated Vaulted Custody"
            description="Fully segregated, individually serialized. Held under bailment at an LBMA-approved freeport vault. Your title, zero counterparty risk."
            selected={draft.deliveryMethod === "vault_custody"}
            badge="Recommended"
            badgeVariant="success"
            onClick={() => selectDeliveryMethod("vault_custody")}
          />

          <BigChoiceCard
            icon={Truck}
            title="Armored Physical Delivery"
            description="Insured armored transit via Brink's Global Services. Delivered directly to your designated institutional address."
            selected={draft.deliveryMethod === "secure_delivery"}
            onClick={() => selectDeliveryMethod("secure_delivery")}
          />
        </section>

        {/* ════════════════════════════════════════════════════════
           Section 2a: Vault Jurisdiction (if vault_custody)
           ════════════════════════════════════════════════════════ */}
        {draft.deliveryMethod === "vault_custody" && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Vault Jurisdiction
            </h2>

            {VAULT_JURISDICTIONS.map((vault) => (
              <BigChoiceCard
                key={vault.code}
                icon={Shield}
                title={vault.label}
                description={`Malca-Amit ${vault.name} · Freeport Zone`}
                selected={draft.vaultJurisdiction === vault.code}
                badge={vault.isRecommended ? "Preferred" : undefined}
                badgeVariant="gold"
                onClick={() => selectVaultJurisdiction(vault.code)}
              />
            ))}

            {/* Custody trust signal */}
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/50 bg-slate-900/20 px-4 py-3">
              <Shield className="h-4 w-4 mt-0.5 shrink-0 text-[#3fae7a]/60" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All vaults operate under fully allocated bailment. Your gold is
                physically segregated, individually serialized, and legally titled
                to your entity. Not commingled. Bankruptcy remote.
              </p>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
           Section 2b: Delivery Region (if secure_delivery)
           ════════════════════════════════════════════════════════ */}
        {draft.deliveryMethod === "secure_delivery" && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Delivery Region
            </h2>

            {DELIVERY_REGIONS.map((region) => (
              <BigChoiceCard
                key={region.code}
                icon={MapPin}
                title={region.label}
                description="Brink's Global Services · Armored insured transit"
                selected={draft.deliveryRegion === region.code}
                onClick={() => selectDeliveryRegion(region.code)}
              />
            ))}

            {/* Physical delivery trust signal */}
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/50 bg-slate-900/20 px-4 py-3">
              <Globe className="h-4 w-4 mt-0.5 shrink-0 text-[#C6A86B]/60" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Exact delivery address and freight quote will be finalized during
                the review stage. All shipments are insured, tracked, and require
                institutional-grade chain-of-custody documentation.
              </p>
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
           Section 3: Summary (ReviewCard)
           ════════════════════════════════════════════════════════ */}
        {canProceed && (
          <ReviewCard
            title="Delivery Summary"
            items={[
              ...(selectedAsset
                ? [
                    {
                      label: "Asset",
                      value: `${selectedAsset.shortName} × ${draft.quantity}`,
                    },
                  ]
                : []),
              {
                label: "Handling",
                value:
                  draft.deliveryMethod === "vault_custody"
                    ? "Allocated Vaulted Custody"
                    : "Armored Physical Delivery",
              },
              ...(draft.deliveryMethod === "vault_custody" && selectedVault
                ? [
                    {
                      label: "Vault",
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
            ]}
          />
        )}

        {/* ── Readiness indicator ── */}
        <div className="flex items-center justify-center gap-2 text-[11px]">
          {canProceed ? (
            <span className="text-[#3fae7a] font-semibold">
              Ready to continue
            </span>
          ) : (
            <span className="text-slate-500">
              {!draft.deliveryMethod
                ? "Choose a handling method above"
                : draft.deliveryMethod === "vault_custody" &&
                    !draft.vaultJurisdiction
                  ? "Select a vault jurisdiction"
                  : draft.deliveryMethod === "secure_delivery" &&
                      !draft.deliveryRegion
                    ? "Select a delivery region"
                    : "Complete the selections above"}
            </span>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Primary Action + Escape Hatch
           ════════════════════════════════════════════════════════ */}
        <StickyPrimaryAction
          label="Continue to Review"
          onClick={handleContinue}
          loading={isSaving}
          disabled={!canProceed || isSaving}
          icon={Save}
          secondaryLabel="Save and return later"
          secondaryOnClick={handleSaveAndExit}
        />
      </div>
    </StepShell>
  );
}
