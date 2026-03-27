"use client";

/* ================================================================
   FUNDING — /institutional/get-started/funding
   ================================================================
   Guided Funding stage: the user selects how their institution
   will fund trades, provides the necessary details, and proceeds
   to the first-trade flow.

   One calm screen. Two cards. One form. One action.

   Reuses:
     • Dual-mode funding architecture (BankDetailsForm — types,
       NETWORKS, ASSETS, field structure)
     • BigChoiceCard (method selection)
     • ReviewCard (configured summary)
     • onboarding state persistence (useSaveOnboardingState)
     • journey stage helpers (advance to FIRST_TRADE_ASSET)

   Does NOT reuse:
     • BankDetailsForm component itself (wrong design system)
     • OnboardingWizard orchestrator
     • Legacy FormProvider / surface styling
   ================================================================ */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Building2,
  Zap,
  Clock,
  ShieldCheck,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react";

import { StepShell } from "@/components/institutional-flow/StepShell";
import { AppLogo } from "@/components/app-logo";
import { StickyPrimaryAction } from "@/components/institutional-flow/StickyPrimaryAction";
import { BigChoiceCard } from "@/components/institutional-flow/BigChoiceCard";
import { ReviewCard } from "@/components/institutional-flow/ReviewCard";

import {
  FUNDING_STAGE_DEFAULTS,
  STABLECOIN_NETWORKS,
  STABLECOIN_ASSETS,
  isFundingReady,
  deriveFundingReadinessStatus,
  type FundingStageData,
  type FundingMethod,
} from "@/lib/schemas/funding-stage-schema";
import type { FundingReadinessResult } from "@/lib/compliance/funding-readiness";
import type { WalletScreeningTruth } from "@/lib/compliance/wallet-compliance-status";

import {
  useOnboardingState,
  useSaveOnboardingState,
} from "@/hooks/use-onboarding-state";

/* ================================================================
   Types for API response
   ================================================================ */

interface FundingReadinessResponse {
  result: FundingReadinessResult;
}

/* ================================================================
   STYLED FORM FIELD — matches organization page design system
   ================================================================ */

function GuidedField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
        {required && <span className="text-[#C6A86B] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
}

const INPUT_CLASSES =
  "w-full rounded-lg border px-3.5 py-2.5 bg-slate-900/80 text-sm text-slate-300 placeholder:text-slate-600 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#C6A86B]/40 focus:border-[#C6A86B]/50 border-slate-800";

/* ================================================================
   FUNDING PAGE — Main Component
   ================================================================ */

export default function FundingPage() {
  const router = useRouter();

  /* ── State hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const saveMutation = useSaveOnboardingState();
  const hasRestoredRef = useRef(false);

  /* ── Local form state ── */
  const [fundingData, setFundingData] = useState<FundingStageData>(
    FUNDING_STAGE_DEFAULTS,
  );
  const [isSaving, setIsSaving] = useState(false);

  /* ── Organization summary for context card ── */
  const [orgName, setOrgName] = useState<string | null>(null);

  /* ── Restore form from persisted state ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (stateLoading) return;

    hasRestoredRef.current = true;

    queueMicrotask(() => {
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;

        // Restore funding fields
        const saved = meta.__funding as Partial<FundingStageData> | undefined;
        if (saved && typeof saved === "object") {
          setFundingData({
            ...FUNDING_STAGE_DEFAULTS,
            ...saved,
          });
        }

        // Extract org name for context display
        const org = meta.__organization as Record<string, unknown> | undefined;
        if (org && typeof org === "object" && org.companyName) {
          setOrgName(org.companyName as string);
        }
      }
    });
  }, [stateLoading, onboardingState]);

  /* ── Field updater ── */
  const updateField = useCallback(
    <K extends keyof FundingStageData>(key: K, value: FundingStageData[K]) => {
      setFundingData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /* ── Method selection handler ── */
  const selectMethod = useCallback(
    (method: FundingMethod) => {
      setFundingData((prev) => ({
        ...prev,
        fundingMethod: method,
        // Reset configured flag when switching
        isFundingConfigured: false,
      }));
    },
    [],
  );

  /* ── Server readiness query ── */
  const {
    data: serverReadinessData,
    refetch: refetchReadiness,
  } = useQuery<FundingReadinessResult>({
    queryKey: ["funding-readiness"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/funding-readiness");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FundingReadinessResponse = await res.json();
      return data.result;
    },
    enabled: !stateLoading,
    staleTime: 15_000,
    retry: 2,
  });

  /* ── Derived state ── */
  const method = fundingData.fundingMethod;

  /** Check if all required fields for the selected method are filled */
  const areFieldsComplete =
    method === "digital_stablecoin"
      ? fundingData.walletAddress.trim().length > 0 &&
        fundingData.walletNetwork.trim().length > 0 &&
        fundingData.stablecoinAsset.trim().length > 0
      : fundingData.bankName.trim().length > 0 &&
        fundingData.bankRoutingNumber.trim().length > 0 &&
        fundingData.bankAccountNumber.trim().length > 0 &&
        fundingData.bankSwiftCode.trim().length > 0;

  /** Build the ready-state snapshot of funding data */
  const getReadyData = useCallback((): FundingStageData => ({
    ...fundingData,
    isFundingConfigured: areFieldsComplete,
  }), [fundingData, areFieldsComplete]);

  /** Server readiness state */
  const serverReady = serverReadinessData?.serverReady ?? null;
  const readinessStatus = deriveFundingReadinessStatus(areFieldsComplete, serverReady);
  const canProceed = areFieldsComplete;

  /* ── Submit: persist → register wallet → server readiness check → advance ── */
  const handleContinue = useCallback(async () => {
    const data = getReadyData();
    if (!isFundingReady(data)) return;
    setIsSaving(true);

    try {
      // Step 1: Save the funding data
      await saveMutation.mutateAsync({
        currentStep: 5,
        status: "IN_PROGRESS",
        metadataJson: {
          __funding: data,
        },
      });

      // Step 1.5: Register wallet in compliance domain (stablecoin only)
      // Best-effort — does NOT block the flow on failure.
      if (
        data.fundingMethod === "digital_stablecoin" &&
        data.walletAddress.trim().length > 0
      ) {
        try {
          const regRes = await fetch("/api/compliance/wallets/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: data.walletAddress.trim(),
              network: data.walletNetwork,
              asset: data.stablecoinAsset,
            }),
          });
          if (!regRes.ok) {
            console.warn(
              `[FUNDING] Wallet registration returned HTTP ${regRes.status} — continuing`,
            );
          }
        } catch (regErr) {
          // Best-effort: log warning but do not block funding flow
          console.warn("[FUNDING] Wallet registration failed (non-blocking):", regErr);
        }
      }

      // Step 2: Server-authoritative readiness check
      const readinessRes = await fetch("/api/compliance/funding-readiness");
      if (!readinessRes.ok) {
        throw new Error("Failed to verify funding readiness");
      }
      const readinessBody: FundingReadinessResponse = await readinessRes.json();

      if (!readinessBody.result.serverReady) {
        // Server says not ready — refetch to update UI with blockers
        await refetchReadiness();
        setIsSaving(false);
        return;
      }

      // Step 3: Server confirmed ready — advance to first trade
      await saveMutation.mutateAsync({
        currentStep: 5,
        status: "IN_PROGRESS",
        metadataJson: {
          __funding: data,
          __journey: { stage: "FIRST_TRADE_ASSET", firstTradeCompleted: false },
        },
      });

      router.push("/institutional/first-trade/asset");
    } catch {
      // mutation error handled by TanStack Query — stays on page
      await refetchReadiness();
      setIsSaving(false);
    }
  }, [getReadyData, saveMutation, router, refetchReadiness]);

  /* ── Save and return later ── */
  const handleSaveAndExit = useCallback(async () => {
    setIsSaving(true);

    try {
      await saveMutation.mutateAsync({
        currentStep: 5,
        status: "IN_PROGRESS",
        metadataJson: {
          __funding: fundingData,
          __journey: { stage: "FUNDING", firstTradeCompleted: false },
        },
      });
    } catch {
      // Best-effort save — still navigate away
    }

    router.push("/institutional/get-started/welcome");
  }, [fundingData, saveMutation, router]);

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
      icon={<AppLogo className="h-8 w-auto" variant="dark" />}
      headline="Fund Your Account"
      description="Select how your institution will fund transactions on AurumShield. You can always update this later."
      footer={
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            256-Bit Encrypted · {walletScreeningLabel(serverReadinessData?.walletScreeningStatus ?? null, method)} · Fail-Closed Compliance
          </span>
        </div>
      }
    >
      <div className="w-full space-y-6">
        {/* ── Organization Context (if available) ── */}
        {orgName && (
          <ReviewCard
            title="Funding Entity"
            items={[{ label: "Organization", value: orgName }]}
          />
        )}

        {/* ════════════════════════════════════════════════════════
           Section 1: Funding Method Selection
           ════════════════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-[#C6A86B]" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Funding Method
            </h2>
          </div>

          <BigChoiceCard
            icon={Zap}
            title="Digital Stablecoin Bridge"
            description="USDC/USDT via institutional wallet — instant clearing access through the Goldwire settlement engine."
            selected={method === "digital_stablecoin"}
            badge="Instant"
            badgeVariant="success"
            onClick={() => selectMethod("digital_stablecoin")}
          />

          <BigChoiceCard
            icon={Building2}
            title="Correspondent Banking"
            description="Traditional fiat wire transfers — requires MSB compliance underwriting and clearing setup."
            selected={method === "legacy_wire"}
            badge="45-Day Underwriting"
            badgeVariant="warning"
            onClick={() => selectMethod("legacy_wire")}
          />
        </section>

        {/* ════════════════════════════════════════════════════════
           Section 2: Funding Details Form
           ════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-[#C6A86B]" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {method === "digital_stablecoin"
                ? "Wallet Configuration"
                : "Banking Details"}
            </h2>
          </div>

          {method === "digital_stablecoin" ? (
            /* ── Digital Stablecoin Fields ── */
            <div className="space-y-4">
              {/* Info banner */}
              <div className="flex items-start gap-2 rounded-lg border border-[#3fae7a]/20 bg-[#3fae7a]/5 px-4 py-3">
                <Zap className="h-4 w-4 mt-0.5 shrink-0 text-[#3fae7a]" />
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Phase 1 participants receive{" "}
                  <strong className="text-slate-300">
                    instant clearing access
                  </strong>{" "}
                  through the institutional stablecoin bridge. Deposits are
                  converted to allocated gold title at live spot price within the
                  Goldwire clearing engine.
                </p>
              </div>

              <GuidedField label="Stablecoin Asset" required>
                <select
                  id="funding-asset"
                  value={fundingData.stablecoinAsset}
                  onChange={(e) => updateField("stablecoinAsset", e.target.value)}
                  className={INPUT_CLASSES}
                >
                  <option value="">Select asset…</option>
                  {STABLECOIN_ASSETS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </GuidedField>

              <GuidedField label="Blockchain Network" required>
                <select
                  id="funding-network"
                  value={fundingData.walletNetwork}
                  onChange={(e) => updateField("walletNetwork", e.target.value)}
                  className={INPUT_CLASSES}
                >
                  <option value="">Select network…</option>
                  {STABLECOIN_NETWORKS.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </GuidedField>

              <GuidedField label="Institutional Wallet Address" required>
                <input
                  id="funding-wallet"
                  type="text"
                  value={fundingData.walletAddress}
                  onChange={(e) => updateField("walletAddress", e.target.value)}
                  placeholder="0x..."
                  className={`${INPUT_CLASSES} font-mono text-xs tracking-wider`}
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  Whitelisted corporate custody address. Must pass OFAC compliance
                  screening.
                </p>
              </GuidedField>
            </div>
          ) : (
            /* ── Legacy Wire Fields ── */
            <div className="space-y-4">
              {/* Warning banner */}
              <div className="flex items-start gap-2 rounded-lg border border-[#C6A86B]/20 bg-[#C6A86B]/5 px-4 py-3">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-[#C6A86B]" />
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Legacy fiat underwriting is currently pending MSB compliance
                  clearance. Expect{" "}
                  <strong className="text-[#C6A86B]">30-45 day delays</strong>{" "}
                  for USD wire approvals. For instant access, select the Digital
                  Stablecoin Bridge.
                </p>
              </div>

              <GuidedField label="Correspondent Bank Name" required>
                <input
                  id="funding-bankname"
                  type="text"
                  value={fundingData.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  placeholder="JPMorgan Chase NA"
                  className={INPUT_CLASSES}
                />
              </GuidedField>

              <div className="grid grid-cols-2 gap-3">
                <GuidedField label="ABA Routing Number" required>
                  <input
                    id="funding-routing"
                    type="text"
                    value={fundingData.bankRoutingNumber}
                    onChange={(e) =>
                      updateField("bankRoutingNumber", e.target.value)
                    }
                    placeholder="021000021"
                    className={`${INPUT_CLASSES} font-mono tabular-nums`}
                  />
                </GuidedField>

                <GuidedField label="Account Number" required>
                  <input
                    id="funding-account"
                    type="text"
                    value={fundingData.bankAccountNumber}
                    onChange={(e) =>
                      updateField("bankAccountNumber", e.target.value)
                    }
                    placeholder="••••••••1234"
                    className={`${INPUT_CLASSES} font-mono tabular-nums`}
                  />
                </GuidedField>
              </div>

              <GuidedField label="SWIFT / BIC Code" required>
                <input
                  id="funding-swift"
                  type="text"
                  value={fundingData.bankSwiftCode}
                  onChange={(e) => updateField("bankSwiftCode", e.target.value)}
                  placeholder="CHASUS33"
                  className={`${INPUT_CLASSES} font-mono uppercase tracking-wider`}
                />
              </GuidedField>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════
           Readiness Summary
           ════════════════════════════════════════════════════════ */}
        {canProceed && (
          <ReviewCard
            title="Funding Configuration"
            items={
              method === "digital_stablecoin"
                ? [
                    { label: "Method", value: "Digital Stablecoin Bridge" },
                    { label: "Asset", value: fundingData.stablecoinAsset },
                    { label: "Network", value: fundingData.walletNetwork },
                    {
                      label: "Wallet",
                      value: `${fundingData.walletAddress.slice(0, 6)}…${fundingData.walletAddress.slice(-4)}`,
                      mono: true,
                    },
                  ]
                : [
                    { label: "Method", value: "Correspondent Banking" },
                    { label: "Bank", value: fundingData.bankName },
                    {
                      label: "Routing",
                      value: fundingData.bankRoutingNumber,
                      mono: true,
                    },
                    {
                      label: "SWIFT",
                      value: fundingData.bankSwiftCode,
                      mono: true,
                    },
                  ]
            }
          />
        )}

        {/* ── Readiness indicator — three-state ── */}
        <div className="flex flex-col items-center gap-1.5 text-[11px]">
          {readinessStatus === "SERVER_READY" && (
            <span className="text-[#3fae7a] font-semibold">
              ✓ Funding verified — ready to proceed
            </span>
          )}
          {readinessStatus === "FORM_COMPLETE" && (
            <>
              <span className="text-[#C6A86B] font-semibold">
                Configuration saved — verifying readiness…
              </span>
              {serverReadinessData && !serverReadinessData.serverReady && serverReadinessData.blockers.length > 0 && (
                <div className="flex items-start gap-1.5 rounded-lg border border-[#C6A86B]/20 bg-[#C6A86B]/5 px-3 py-2 mt-1 max-w-md">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#C6A86B]" />
                  <div className="text-[10px] text-slate-400">
                    {serverReadinessData.blockers.map((b, i) => (
                      <p key={i}>{b}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {readinessStatus === "NOT_CONFIGURED" && (
            <span className="text-slate-500">
              Complete the fields above to continue
            </span>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
           Primary Action + Escape Hatch
           ════════════════════════════════════════════════════════ */}
        <StickyPrimaryAction
          label="Continue to First Trade"
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

/* ================================================================
   WALLET SCREENING LABEL — honest footer state
   ================================================================ */

function walletScreeningLabel(
  truth: WalletScreeningTruth | null,
  method: FundingMethod,
): string {
  // Wire method — no wallet screening applies
  if (method !== "digital_stablecoin") return "MSB Compliance Gated";

  if (!truth) return "OFAC Screening Pending";

  switch (truth) {
    case "SCREENING_CURRENT":
      return "OFAC Screened ✓";
    case "RISK_HIGH":
      return "OFAC Screened · Enhanced Review";
    case "NOT_REGISTERED":
    case "NEVER_SCREENED":
    case "SCREENING_STALE":
      return "OFAC Screening Pending";
    case "WALLET_PENDING_REVIEW":
      return "Wallet Under Review";
    case "SANCTIONS_FLAGGED":
    case "RISK_SEVERE":
    case "WALLET_FROZEN":
    case "WALLET_BLOCKED":
      return "OFAC Compliance Block";
    default:
      return "OFAC Screening Pending";
  }
}
