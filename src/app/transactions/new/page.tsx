"use client";

import { useReducer, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronLeft, Zap } from "lucide-react";
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
  type WizardFormData,
  type WizardMachineState,
} from "./wizard-schema";
import { StepParties } from "./step-parties";
import { StepSettlement } from "./step-settlement";
import { StepReview } from "./step-review";

/* ================================================================
   EXECUTE GOLDWIRE — 3-Step Settlement Wizard
   ================================================================ */

const STEP_LABELS = ["Target Entity", "Settlement Parameters", "Review & Sign"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isActive
                  ? "bg-gold text-bg"
                  : isDone
                    ? "bg-gold/20 text-gold"
                    : "bg-surface-3 text-text-faint"
              )}
            >
              {isDone ? "✓" : step}
            </div>
            <span
              className={cn(
                "hidden sm:inline text-xs transition-colors",
                isActive ? "text-text font-medium" : "text-text-faint"
              )}
            >
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

  /* --- Navigation handlers --- */
  const handleNext = useCallback(async () => {
    if (activeStep === 1) {
      const ok = await form.trigger(STEP1_FIELDS);
      if (ok) dispatch({ type: "VALIDATE_TARGET" });
    } else if (activeStep === 2) {
      const ok = await form.trigger(STEP2_FIELDS);
      if (ok) dispatch({ type: "VALIDATE_PARAMETERS" });
    }
  }, [activeStep, form]);

  const handleBack = useCallback(() => {
    if (activeStep === 2) dispatch({ type: "EDIT", target: "TARGET" });
    else if (activeStep === 3) dispatch({ type: "EDIT", target: "PARAMETERS" });
  }, [activeStep]);

  const handleExecute = useCallback(async () => {
    const ok = await form.trigger(STEP3_FIELDS);
    if (!ok) return;

    setIsExecuting(true);

    const payload = {
      beneficiary: beneficiaryName,
      beneficiaryEntityId: watched.beneficiaryEntityId,
      fiatSettlementAmount: watched.fiatSettlementAmount,
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
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/transactions"
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Settlement Ledger
        </Link>
      </div>

      <PageHeader
        title="Execute Goldwire"
        description={`Step ${activeStep} of 3 — ${STEP_LABELS[activeStep - 1]}`}
      />

      <div className="flex items-center justify-between mt-1 mb-4">
        <StepIndicator current={activeStep} total={3} />
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-gold/70">
          <Zap className="h-3 w-3" />
          <span className="font-mono uppercase tracking-widest">T+0 Settlement</span>
        </div>
      </div>

      <div className="card-base p-6">
        {activeStep === 1 && (
          <StepParties form={form} counterparties={counterparties} />
        )}
        {activeStep === 2 && (
          <StepSettlement form={form} beneficiaryName={beneficiaryName} />
        )}
        {activeStep === 3 && (
          <StepReview
            form={form}
            beneficiaryName={beneficiaryName}
            isExecuting={isExecuting}
            onExecute={handleExecute}
          />
        )}

        {/* Navigation — Steps 1 & 2 */}
        {activeStep < 3 && (
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
              className="flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover"
            >
              {activeStep === 2 ? "Proceed to Review" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* Step 3 — back link */}
        {activeStep === 3 && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Parameters
            </button>
          </div>
        )}
      </div>
    </>
  );
}
