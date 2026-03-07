"use client";

import { useReducer, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Zap,
  Scale,
  DollarSign,
  Clock,
  Landmark,
  Coins,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { useCounterparties } from "@/hooks/use-mock-queries";
import { LoadingState } from "@/components/ui/state-views";

import {
  wizardSchema,
  wizardReducer,
  STATE_TO_STEP,
  STEP1_FIELDS,
  STEP2_FIELDS,
  STEP3_FIELDS,
  STEP4_FIELDS,
  type WizardFormData,
  type WizardMachineState,
} from "./wizard-schema";
import { StepParties } from "./step-parties";
import { StepCompliance } from "./step-compliance";
import { StepFunding } from "./step-funding";
import { StepReview } from "./step-review";

/* ================================================================
   EXECUTE GOLDWIRE — 4-Step Settlement Wizard
   ================================================================ */

const STEP_LABELS = [
  "Counterparty & Asset",
  "Compliance Verification",
  "Funding Route",
  "Cryptographic Sign-Off",
];

/* ── Mock spot price ── */
const MOCK_GOLD_SPOT_USD = 2_342.5;
const NETWORK_FEE_RATE = 0.01;

/* ── Step Indicator (Compliance Ladder) ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center w-full">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-200",
                  isActive
                    ? "bg-gold text-bg shadow-[0_0_12px_rgba(198,168,107,0.25)]"
                    : isDone
                      ? "bg-gold/20 text-gold"
                      : "bg-surface-3 text-text-faint"
                )}
              >
                {isDone ? "✓" : step}
              </div>
              <span
                className={cn(
                  "hidden lg:inline text-xs whitespace-nowrap transition-colors",
                  isActive ? "text-text font-semibold" : isDone ? "text-gold/70" : "text-text-faint"
                )}
              >
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className="flex-1 mx-3">
                <div
                  className={cn(
                    "h-px w-full transition-colors",
                    step < current ? "bg-gold/40" : "bg-border"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Settlement Ledger (Sticky Right Panel) ── */
function SettlementLedger({
  amount,
  fundingRoute,
}: {
  amount: number;
  fundingRoute: string | undefined;
}) {
  const goldOz = amount > 0 ? amount / MOCK_GOLD_SPOT_USD : 0;
  const fee = amount > 0 ? amount * NETWORK_FEE_RATE : 0;

  function fmt(n: number): string {
    return n > 0
      ? `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—";
  }

  const routeLabel =
    fundingRoute === "fedwire"
      ? "Fedwire FBO"
      : fundingRoute === "stablecoin"
        ? "USDC/USDT MPC Bridge"
        : "Not selected";

  const RouteIcon = fundingRoute === "stablecoin" ? Coins : Landmark;

  return (
    <aside className="rounded-lg border border-border bg-surface-1 overflow-hidden">
      <div className="bg-gold/[0.05] border-b border-gold/15 px-5 py-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-gold" />
        <span className="text-xs font-bold text-gold uppercase tracking-widest">
          Settlement Ledger
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {/* Notional Value */}
        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
            <DollarSign className="h-3 w-3" />
            Notional Value
          </div>
          <p className="text-lg font-bold font-mono tabular-nums text-text">
            {fmt(amount)}
          </p>
        </div>

        {/* Vault Allocation */}
        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
            <Scale className="h-3 w-3" />
            Vault Allocation
          </div>
          <p className="text-lg font-bold font-mono tabular-nums text-text">
            {goldOz > 0 ? goldOz.toFixed(4) : "—"}{" "}
            <span className="text-xs text-text-faint font-normal">oz t</span>
          </p>
          {amount > 0 && (
            <p className="text-[11px] text-text-faint mt-0.5 font-mono">
              @ ${MOCK_GOLD_SPOT_USD.toLocaleString("en-US", { minimumFractionDigits: 2 })} /oz
            </p>
          )}
        </div>

        {/* Execution Fee */}
        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
            <Zap className="h-3 w-3" />
            T-Zero Execution Fee
          </div>
          <p className="text-lg font-bold font-mono tabular-nums text-gold">
            {fmt(fee)}
          </p>
          <p className="text-[11px] text-text-faint mt-0.5">1.0% flat on settlement value</p>
        </div>

        {/* Funding Route */}
        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
            <Route className="h-3 w-3" />
            Funding Route
          </div>
          <div className="flex items-center gap-2">
            <RouteIcon
              className={cn(
                "h-4 w-4",
                fundingRoute ? "text-gold" : "text-text-faint"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                fundingRoute ? "text-text" : "text-text-faint"
              )}
            >
              {routeLabel}
            </span>
          </div>
        </div>

        {/* Settlement Time */}
        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
            <Clock className="h-3 w-3" />
            Estimated Settlement
          </div>
          <p className="text-sm font-semibold text-emerald-400">
            Immediate upon funding confirmation
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function ExecuteGoldwirePage() {
  const router = useRouter();
  const cpQ = useCounterparties();

  const [machineState, dispatch] = useReducer(wizardReducer, "TARGET" as WizardMachineState);
  const [isExecuting, setIsExecuting] = useState(false);

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      beneficiaryEntityId: "",
      fiatSettlementAmount: undefined,
      memo: "",
      fundingRoute: undefined,
      referenceCode: "",
    },
    mode: "onTouched",
  });

  const activeStep = STATE_TO_STEP[machineState];
  const watched = form.watch();

  /* --- Resolve beneficiary --- */
  const selectedCp = useMemo(
    () => cpQ.data?.find((c) => c.id === watched.beneficiaryEntityId),
    [cpQ.data, watched.beneficiaryEntityId]
  );

  const beneficiaryName = selectedCp?.entity ?? "—";
  const fiatAmount =
    Number.isFinite(watched.fiatSettlementAmount) && (watched.fiatSettlementAmount ?? 0) > 0
      ? watched.fiatSettlementAmount!
      : 0;

  /* --- Navigation handlers --- */
  const handleNext = useCallback(async () => {
    if (activeStep === 1) {
      const ok = await form.trigger([...STEP1_FIELDS, ...STEP2_FIELDS]);
      if (ok) dispatch({ type: "VALIDATE_TARGET" });
    } else if (activeStep === 2) {
      // Compliance auto-passes — advance immediately
      dispatch({ type: "VALIDATE_COMPLIANCE" });
    } else if (activeStep === 3) {
      const ok = await form.trigger(STEP3_FIELDS);
      if (ok) dispatch({ type: "VALIDATE_FUNDING" });
    }
  }, [activeStep, form]);

  const handleBack = useCallback(() => {
    if (activeStep === 2) dispatch({ type: "EDIT", target: "TARGET" });
    else if (activeStep === 3) dispatch({ type: "EDIT", target: "COMPLIANCE" });
    else if (activeStep === 4) dispatch({ type: "EDIT", target: "FUNDING" });
  }, [activeStep]);

  const handleExecute = useCallback(async () => {
    const ok = await form.trigger(STEP4_FIELDS);
    if (!ok) return;

    setIsExecuting(true);

    const payload = {
      beneficiary: beneficiaryName,
      beneficiaryEntityId: watched.beneficiaryEntityId,
      fiatSettlementAmount: watched.fiatSettlementAmount,
      fundingRoute: watched.fundingRoute,
      memo: watched.memo,
      referenceCode: watched.referenceCode,
      timestamp: new Date().toISOString(),
    };

    // TODO: POST to /api/goldwire/execute
    console.log("═══ GOLDWIRE EXECUTION ═══");
    console.log(JSON.stringify(payload, null, 2));
    console.log("══════════════════════════");

    setTimeout(() => router.push("/transactions"), 800);
  }, [form, beneficiaryName, watched, router]);

  /* --- Loading gate --- */
  if (cpQ.isLoading) {
    return <LoadingState message="Loading counterparty data…" />;
  }

  const counterparties = cpQ.data ?? [];

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Treasury Desk
        </Link>
      </div>

      <PageHeader
        title="Execute Goldwire"
        description={`Step ${activeStep} of 4 — ${STEP_LABELS[activeStep - 1]}`}
      />

      {/* Step Indicator */}
      <div className="flex items-center justify-between mt-1 mb-6">
        <StepIndicator current={activeStep} total={4} />
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gold/70 shrink-0 ml-4">
          <Zap className="h-3 w-3" />
          <span className="font-mono uppercase tracking-widest">T+0 Settlement</span>
        </div>
      </div>

      {/* 2-Column Layout: Form + Settlement Ledger */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Active Step */}
        <div className="card-base p-6">
          {activeStep === 1 && (
            <StepParties form={form} counterparties={counterparties} />
          )}
          {activeStep === 2 && (
            <StepCompliance
              beneficiaryName={beneficiaryName}
              amount={fiatAmount}
            />
          )}
          {activeStep === 3 && (
            <StepFunding form={form} />
          )}
          {activeStep === 4 && (
            <StepReview
              form={form}
              beneficiaryName={beneficiaryName}
              isExecuting={isExecuting}
              onExecute={handleExecute}
            />
          )}

          {/* Navigation — Steps 1, 2, 3 */}
          {activeStep < 4 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              {activeStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed"
              >
                {activeStep === 3
                  ? "Proceed to Sign-Off"
                  : activeStep === 2
                    ? "Continue to Funding"
                    : "Next"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 4 — back link */}
          {activeStep === 4 && (
            <div className="mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Funding Route
              </button>
            </div>
          )}
        </div>

        {/* Right: Settlement Ledger (sticky) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <SettlementLedger
            amount={fiatAmount}
            fundingRoute={watched.fundingRoute}
          />
        </div>
      </div>
    </>
  );
}
