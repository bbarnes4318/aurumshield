"use client";

import type { UseFormReturn } from "react-hook-form";
import type { Counterparty } from "@/lib/mock-data";
import type { WizardFormData } from "./wizard-schema";
import { RiskBadge } from "@/components/ui/risk-badge";
import { cn } from "@/lib/utils";
import { Building2, Search } from "lucide-react";

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);

interface Props {
  form: UseFormReturn<WizardFormData>;
  counterparties: Counterparty[];
  disabled?: boolean;
}

export function StepParties({ form, counterparties, disabled }: Props) {
  const {
    register,
    formState: { errors },
    watch,
  } = form;
  const cpId = watch("beneficiaryEntityId");
  const selectedCp = counterparties.find((c) => c.id === cpId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 border border-gold/20">
          <Building2 className="h-4 w-4 text-gold" />
        </div>
        <div>
          <h2 className="font-heading text-base font-semibold text-text">
            Step 1 — Counterparty &amp; Asset Selection
          </h2>
          <p className="text-xs text-text-faint">
            Identify the institutional counterparty and define the settlement notional.
          </p>
        </div>
      </div>

      {/* Beneficiary Selector */}
      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-cp">
          Beneficiary Entity
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint pointer-events-none" />
          <select
            id="w-cp"
            {...register("beneficiaryEntityId")}
            disabled={disabled}
            className={cn(FIELD, "pl-9")}
          >
            <option value="">Select beneficiary…</option>
            {counterparties.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.entity} — {cp.jurisdiction}
              </option>
            ))}
          </select>
        </div>
        {errors.beneficiaryEntityId && (
          <p className="mt-1 text-xs text-danger">{errors.beneficiaryEntityId.message}</p>
        )}
        {selectedCp && (
          <div className="mt-3 rounded-lg bg-surface-2 border border-border p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text">{selectedCp.entity}</span>
              <RiskBadge level={selectedCp.riskLevel} />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-text-muted">
              <div>
                <span className="text-text-faint">LEI:</span>{" "}
                <span className="font-mono tracking-wider text-text">{selectedCp.legalEntityId}</span>
              </div>
              <div>
                <span className="text-text-faint">Jurisdiction:</span> {selectedCp.jurisdiction}
              </div>
              <div>
                <span className="text-text-faint">Status:</span>{" "}
                <span className="capitalize text-success font-medium">{selectedCp.status}</span>
              </div>
              <div>
                <span className="text-text-faint">KYC:</span>{" "}
                <span className="text-emerald-400 font-medium">Verified</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settlement Amount */}
      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-fiat">
          Settlement Notional (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-faint font-medium font-mono">
            $
          </span>
          <input
            id="w-fiat"
            type="number"
            step="any"
            {...register("fiatSettlementAmount", { valueAsNumber: true })}
            disabled={disabled}
            placeholder="5,000,000"
            className={cn(FIELD, "pl-7 font-mono tabular-nums text-lg font-semibold")}
          />
        </div>
        {errors.fiatSettlementAmount && (
          <p className="mt-1 text-xs text-danger">{errors.fiatSettlementAmount.message}</p>
        )}
      </div>

      {/* Internal Memo */}
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
