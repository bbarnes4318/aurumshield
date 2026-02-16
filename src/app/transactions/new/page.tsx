"use client";

import { useReducer, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { useCounterparties, useCorridors, useHubs, useDashboardData } from "@/hooks/use-mock-queries";
import { LoadingState } from "@/components/ui/state-views";

import {
  wizardSchema,
  wizardReducer,
  STATE_TO_STEP,
  STEP1_FIELDS,
  STEP2_FIELDS,
  STEP4_FIELDS,
  type WizardFormData,
  type WizardMachineState,
} from "./wizard-schema";
import {
  computeTRI,
  validateCapital,
  checkBlockers,
  hasBlockLevel,
  determineApproval,
  runComplianceChecks,
  type TRIResult,
  type CapitalValidation,
  type ApprovalResult,
  type PolicyBlocker,
  type ComplianceCheck,
  type PolicySnapshot,
} from "./wizard-policy-engine";
import { StepParties } from "./step-parties";
import { StepCorridor } from "./step-corridor";
import { StepCompliance } from "./step-compliance";
import { StepReview } from "./step-review";
import { PolicyPanel } from "./policy-panel";

/* ================================================================ */

const STEP_LABELS = ["Parties & Amount", "Corridor & Hub", "Compliance", "Review & Create"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              isActive ? "bg-gold text-bg" : isDone ? "bg-gold/20 text-gold" : "bg-surface-3 text-text-faint"
            )}>
              {step}
            </div>
            <span className={cn("hidden sm:inline text-xs transition-colors", isActive ? "text-text font-medium" : "text-text-faint")}>
              {STEP_LABELS[i]}
            </span>
            {i < total - 1 && <div className="mx-1 h-px w-4 bg-border sm:w-8" />}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================ */

function fmtAmt(n: number, ccy: string) {
  if (n >= 1e9) return `${ccy} ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${ccy} ${(n / 1e6).toFixed(1)}M`;
  return `${ccy} ${n.toLocaleString("en-US")}`;
}

/* ================================================================ */

export default function NewTransactionPage() {
  const router = useRouter();
  const cpQ = useCounterparties();
  const corQ = useCorridors();
  const hubQ = useHubs();
  const dashQ = useDashboardData("phase1");

  const [machineState, dispatch] = useReducer(wizardReducer, "DRAFT" as WizardMachineState);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: { type: "wire", counterpartyId: "", currency: "USD", corridorId: "", hubId: "", description: "" },
    mode: "onTouched",
  });

  const activeStep = STATE_TO_STEP[machineState];
  const watched = form.watch();

  /* --- Resolve entities --- */
  const selectedCp = useMemo(() => cpQ.data?.find((c) => c.id === watched.counterpartyId), [cpQ.data, watched.counterpartyId]);
  const selectedCor = useMemo(() => corQ.data?.find((c) => c.id === watched.corridorId), [corQ.data, watched.corridorId]);
  const selectedHub = useMemo(() => hubQ.data?.find((h) => h.id === watched.hubId), [hubQ.data, watched.hubId]);
  const capital = dashQ.data?.capital;

  const amount = Number.isFinite(watched.amount) ? watched.amount : 0;

  /* --- Policy engine computations --- */
  const tri: TRIResult | null = useMemo(() => {
    if (!selectedCp || !selectedCor || !capital) return null;
    return computeTRI(selectedCp, selectedCor, amount, capital);
  }, [selectedCp, selectedCor, amount, capital]);

  const capVal: CapitalValidation | null = useMemo(() => {
    if (!capital) return null;
    return validateCapital(amount, capital);
  }, [amount, capital]);

  const blockers: PolicyBlocker[] = useMemo(() => {
    if (!capital) return [];
    return checkBlockers(selectedCp, selectedCor, selectedHub, tri, amount, capital);
  }, [selectedCp, selectedCor, selectedHub, tri, amount, capital]);

  const approval: ApprovalResult | null = useMemo(() => {
    if (!tri) return null;
    return determineApproval(tri.score, amount);
  }, [tri, amount]);

  const complianceChecks: ComplianceCheck[] = useMemo(() => {
    if (!selectedCp || !selectedCor || !selectedHub || !tri || !capVal) return [];
    return runComplianceChecks(selectedCp, selectedCor, selectedHub, tri, capVal);
  }, [selectedCp, selectedCor, selectedHub, tri, capVal]);

  const blockersExist = hasBlockLevel(blockers);

  /* --- Summary object --- */
  const summary = useMemo(() => ({
    counterparty: selectedCp?.entity ?? "—",
    type: watched.type,
    amount: amount > 0 ? fmtAmt(amount, watched.currency) : "—",
    currency: watched.currency,
    corridor: selectedCor?.name ?? "—",
    hub: selectedHub?.name ?? "—",
  }), [selectedCp, selectedCor, selectedHub, amount, watched.type, watched.currency]);

  /* --- Navigation handlers --- */
  const handleNext = useCallback(async () => {
    if (activeStep === 1) {
      const ok = await form.trigger(STEP1_FIELDS);
      if (ok) dispatch({ type: "VALIDATE_PARTIES" });
    } else if (activeStep === 2) {
      const ok = await form.trigger(STEP2_FIELDS);
      if (ok && !blockersExist) dispatch({ type: "VALIDATE_CORRIDOR" });
    } else if (activeStep === 3) {
      if (!blockersExist) dispatch({ type: "PASS_COMPLIANCE" });
    }
  }, [activeStep, form, blockersExist]);

  const handleBack = useCallback(() => {
    if (activeStep === 2) dispatch({ type: "EDIT", target: "DRAFT" });
    else if (activeStep === 3) dispatch({ type: "EDIT", target: "PARTIES_VALID" });
    else if (activeStep === 4) dispatch({ type: "EDIT", target: "PARTIES_VALID" }); // back to corridor via PARTIES_VALID → step 2
  }, [activeStep]);

  const handleCreate = useCallback(async () => {
    const ok = await form.trigger(STEP4_FIELDS);
    if (!ok) return;
    dispatch({ type: "VALIDATE_REVIEW" });
    setIsCreating(true);

    const snapshot: PolicySnapshot = {
      inputs: { counterparty: summary.counterparty, corridor: summary.corridor, hub: summary.hub, amount, currency: watched.currency, type: watched.type, description: watched.description },
      tri: tri!,
      capital: { currentECR: capVal!.currentECR, postTxnECR: capVal!.postTxnECR, currentHardstopUtil: capVal!.currentHardstopUtil, postTxnHardstopUtil: capVal!.postTxnHardstopUtil },
      approval: approval!,
      blockers,
      timestamp: new Date().toISOString(),
    };

    console.log("═══ POLICY SNAPSHOT ═══");
    console.log(JSON.stringify(snapshot, null, 2));
    console.log("═══════════════════════");

    setTimeout(() => router.push("/transactions"), 600);
  }, [form, summary, amount, watched, tri, capVal, approval, blockers, router]);

  /* --- Loading gate --- */
  if (cpQ.isLoading || corQ.isLoading || hubQ.isLoading || dashQ.isLoading) {
    return <LoadingState message="Loading wizard data…" />;
  }

  const counterparties = cpQ.data ?? [];
  const corridors = corQ.data ?? [];
  const hubs = hubQ.data ?? [];

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/transactions" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <PageHeader title="New Transaction" description={`Step ${activeStep} of 4 — ${STEP_LABELS[activeStep - 1]}`} />

      <StepIndicator current={activeStep} total={4} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-4">
        {/* Left: Step Content */}
        <div className="card-base p-6">
          {activeStep === 1 && <StepParties form={form} counterparties={counterparties} />}
          {activeStep === 2 && <StepCorridor form={form} corridors={corridors} hubs={hubs} />}
          {activeStep === 3 && (
            <StepCompliance
              checks={complianceChecks}
              hasBlockers={blockersExist}
              summary={summary}
              onEditParties={() => dispatch({ type: "EDIT", target: "DRAFT" })}
              onEditCorridor={() => dispatch({ type: "EDIT", target: "PARTIES_VALID" })}
            />
          )}
          {activeStep === 4 && tri && capVal && approval && (
            <StepReview form={form} summary={summary} tri={tri} capVal={capVal} approval={approval} blockers={blockers} isCreating={isCreating} onCreate={handleCreate} />
          )}

          {/* Navigation */}
          {activeStep < 4 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              {activeStep > 1 ? (
                <button type="button" onClick={handleBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={handleNext}
                disabled={activeStep === 2 && blockersExist || activeStep === 3 && blockersExist}
                className="flex items-center gap-2 rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeStep === 3 ? "Proceed to Review" : "Next"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {activeStep === 4 && (
            <div className="mt-4 pt-4 border-t border-border">
              <button type="button" onClick={handleBack} className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
                <ChevronLeft className="h-4 w-4" /> Back to Corridor
              </button>
            </div>
          )}
        </div>

        {/* Right: Policy Panel */}
        <PolicyPanel tri={tri} capVal={capVal} approval={approval} blockers={blockers} ready={!!tri && !!capVal} />
      </div>
    </>
  );
}
