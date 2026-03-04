"use client";

import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { WizardFormData } from "./wizard-schema";
import { cn } from "@/lib/utils";
import { DollarSign, Scale, TrendingUp } from "lucide-react";

/* ── Mock spot price — TODO: replace with live feed ── */
const MOCK_GOLD_SPOT_USD = 2_342.50;
const NETWORK_FEE_RATE = 0.01; // 1.0%

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);

interface Props {
  form: UseFormReturn<WizardFormData>;
  beneficiaryName: string;
  disabled?: boolean;
}

export function StepSettlement({ form, beneficiaryName, disabled }: Props) {
  const {
    register,
    formState: { errors },
    watch,
  } = form;

  const fiatAmount = watch("fiatSettlementAmount");
  const amount = Number.isFinite(fiatAmount) && fiatAmount > 0 ? fiatAmount : 0;

  const calculated = useMemo(() => {
    if (amount <= 0)
      return { goldOz: 0, networkFee: 0, totalCost: 0, spotPrice: MOCK_GOLD_SPOT_USD };
    const goldOz = amount / MOCK_GOLD_SPOT_USD;
    const networkFee = amount * NETWORK_FEE_RATE;
    const totalCost = amount + networkFee;
    return { goldOz, networkFee, totalCost, spotPrice: MOCK_GOLD_SPOT_USD };
  }, [amount]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
          <DollarSign className="h-4 w-4 text-gold" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-text">
            Step 2 — Settlement Parameters
          </h2>
          <p className="text-xs text-text-faint">
            Define the fiat value to settle via Goldwire to{" "}
            <span className="text-gold font-medium">{beneficiaryName}</span>.
          </p>
        </div>
      </div>

      {/* Fiat Amount Input */}
      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-fiat">
          Settlement Amount (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-faint font-medium">
            $
          </span>
          <input
            id="w-fiat"
            type="number"
            step="any"
            {...register("fiatSettlementAmount", { valueAsNumber: true })}
            disabled={disabled}
            placeholder="5,000,000"
            className={cn(FIELD, "pl-7 tabular-nums text-lg font-semibold")}
          />
        </div>
        {errors.fiatSettlementAmount && (
          <p className="mt-1 text-xs text-danger">{errors.fiatSettlementAmount.message}</p>
        )}
      </div>

      {/* Dynamic Calculation Panel */}
      {amount > 0 && (
        <div className="rounded-lg border border-gold/20 bg-gold/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gold uppercase tracking-widest">
            <TrendingUp className="h-3.5 w-3.5" />
            Live Settlement Calculation
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-surface-2 border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
                <Scale className="h-3 w-3" />
                Required Gold Weight
              </div>
              <p className="text-lg font-bold tabular-nums text-text">
                {calculated.goldOz.toFixed(4)}{" "}
                <span className="text-xs text-text-faint font-medium">oz t</span>
              </p>
              <p className="text-[11px] text-text-faint mt-0.5">
                @ ${calculated.spotPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} /oz
              </p>
            </div>

            <div className="rounded-md bg-surface-2 border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-text-faint mb-1">
                <DollarSign className="h-3 w-3" />
                Network Execution Fee
              </div>
              <p className="text-lg font-bold tabular-nums text-gold">
                ${calculated.networkFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-text-faint mt-0.5">
                1.0% flat fee on settlement value
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-sm">
            <span className="text-text-faint">Total Debit from Treasury</span>
            <span className="font-bold tabular-nums text-text">
              ${calculated.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Memo */}
      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-memo">
          Internal Memo{" "}
          <span className="text-text-faint font-normal">(optional)</span>
        </label>
        <input
          id="w-memo"
          type="text"
          {...register("memo")}
          disabled={disabled}
          placeholder="Q1 supplier settlement — invoice #GW-2026-0391"
          className={FIELD}
        />
      </div>
    </div>
  );
}
