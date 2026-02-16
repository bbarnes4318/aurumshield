"use client";

import type { UseFormReturn } from "react-hook-form";
import type { Counterparty } from "@/lib/mock-data";
import type { WizardFormData } from "./wizard-schema";
import { RiskBadge } from "@/components/ui/risk-badge";
import { cn } from "@/lib/utils";

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);
const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "SGD", "NOK", "ARS", "JPY"];
const TYPE_OPTIONS = [
  { value: "wire", label: "Wire Transfer" },
  { value: "swift", label: "SWIFT" },
  { value: "settlement", label: "Settlement" },
  { value: "collateral", label: "Collateral" },
  { value: "margin-call", label: "Margin Call" },
  { value: "dividend", label: "Dividend" },
];

interface Props { form: UseFormReturn<WizardFormData>; counterparties: Counterparty[]; disabled?: boolean }

export function StepParties({ form, counterparties, disabled }: Props) {
  const { register, formState: { errors }, watch } = form;
  const cpId = watch("counterpartyId");
  const selectedCp = counterparties.find((c) => c.id === cpId);

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-text">Step 1 — Parties & Amount</h2>

      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-type">Transaction Type</label>
        <select id="w-type" {...register("type")} disabled={disabled} className={FIELD}>
          {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {errors.type && <p className="mt-1 text-xs text-danger">{errors.type.message}</p>}
      </div>

      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-cp">Counterparty</label>
        <select id="w-cp" {...register("counterpartyId")} disabled={disabled} className={FIELD}>
          <option value="">Select counterparty…</option>
          {counterparties.map((cp) => (
            <option key={cp.id} value={cp.id}>{cp.entity} — {cp.jurisdiction}</option>
          ))}
        </select>
        {errors.counterpartyId && <p className="mt-1 text-xs text-danger">{errors.counterpartyId.message}</p>}
        {selectedCp && (
          <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2 text-xs text-text-muted">
            <RiskBadge level={selectedCp.riskLevel} />
            <span>LEI: {selectedCp.legalEntityId}</span>
            <span className="capitalize">{selectedCp.status}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="typo-label mb-1.5 block" htmlFor="w-amount">Amount</label>
          <input id="w-amount" type="number" step="any" {...register("amount", { valueAsNumber: true })} disabled={disabled} placeholder="0" className={cn(FIELD, "tabular-nums")} />
          {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="typo-label mb-1.5 block" htmlFor="w-ccy">Currency</label>
          <select id="w-ccy" {...register("currency")} disabled={disabled} className={FIELD}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.currency && <p className="mt-1 text-xs text-danger">{errors.currency.message}</p>}
        </div>
      </div>
    </div>
  );
}
