"use client";

import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { WizardFormData } from "./wizard-schema";
import { cn } from "@/lib/utils";
import { ShieldCheck, Fingerprint, Lock } from "lucide-react";

/* ── Constants — same as step-settlement for consistency ── */
const MOCK_GOLD_SPOT_USD = 2_342.50;
const NETWORK_FEE_RATE = 0.01;

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  form: UseFormReturn<WizardFormData>;
  beneficiaryName: string;
  isExecuting: boolean;
  onExecute: () => void;
}

export function StepReview({ form, beneficiaryName, isExecuting, onExecute }: Props) {
  const {
    register,
    formState: { errors },
    watch,
  } = form;

  const fiatAmount = watch("fiatSettlementAmount") ?? 0;
  const memo = watch("memo");
  const amount = Number.isFinite(fiatAmount) && fiatAmount > 0 ? fiatAmount : 0;

  const calc = useMemo(() => {
    const goldOz = amount / MOCK_GOLD_SPOT_USD;
    const fee = amount * NETWORK_FEE_RATE;
    return { goldOz, fee, total: amount + fee };
  }, [amount]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
          <ShieldCheck className="h-4 w-4 text-gold" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-text">
            Step 3 — Review & Authorize
          </h2>
          <p className="text-xs text-text-faint">
            Verify all parameters before signing the Goldwire execution certificate.
          </p>
        </div>
      </div>

      {/* Goldwire Summary */}
      <div className="rounded-lg border border-border bg-surface-2 overflow-hidden">
        <div className="bg-gold/[0.06] border-b border-gold/20 px-4 py-2.5 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-gold" />
          <span className="text-xs font-bold text-gold uppercase tracking-widest">
            Goldwire Execution Certificate
          </span>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-text-faint text-xs">Beneficiary</span>
              <p className="text-text font-medium">{beneficiaryName}</p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Settlement Value</span>
              <p className="text-text font-bold tabular-nums">{fmt(amount)}</p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Gold Allocation</span>
              <p className="text-text font-bold tabular-nums">
                {calc.goldOz.toFixed(4)} <span className="text-text-faint font-normal">oz t</span>
              </p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Spot Price</span>
              <p className="text-text tabular-nums">{fmt(MOCK_GOLD_SPOT_USD)} /oz</p>
            </div>
          </div>
          <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-text-faint text-xs">Network Fee (1.0%)</span>
              <p className="text-gold font-semibold tabular-nums">{fmt(calc.fee)}</p>
            </div>
            <div>
              <span className="text-text-faint text-xs">Total Debit</span>
              <p className="text-text font-bold tabular-nums">{fmt(calc.total)}</p>
            </div>
          </div>
          {memo && (
            <div className="pt-2 border-t border-border/50 text-sm">
              <span className="text-text-faint text-xs">Memo</span>
              <p className="text-text-muted">{memo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reference Code */}
      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-ref">
          Wire Reference Code
        </label>
        <input
          id="w-ref"
          type="text"
          {...register("referenceCode")}
          placeholder="GW-2026-0391"
          className={cn(FIELD, "font-mono tracking-wider")}
        />
        {errors.referenceCode && (
          <p className="mt-1 text-xs text-danger">{errors.referenceCode.message}</p>
        )}
        <p className="mt-1 text-xs text-text-faint">
          Unique identifier for this settlement. Will be embedded in the SHA-256 clearing certificate.
        </p>
      </div>

      {/* Execute CTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onExecute}
          disabled={isExecuting}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-gold px-5 py-3 text-sm font-bold text-bg transition-all hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Fingerprint className="h-4.5 w-4.5" />
          {isExecuting ? "Signing & Executing…" : "Sign & Execute Goldwire"}
        </button>
        <p className="mt-2 text-center text-[11px] text-text-faint">
          By executing, you authorize the deterministic title transfer of {calc.goldOz.toFixed(4)} oz t
          of allocated gold within the Malca-Amit sovereign vault network.
        </p>
      </div>
    </div>
  );
}
