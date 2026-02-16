"use client";

import type { UseFormReturn } from "react-hook-form";
import type { Corridor, Hub } from "@/lib/mock-data";
import type { WizardFormData } from "./wizard-schema";
import { cn } from "@/lib/utils";

const FIELD = cn(
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text",
  "placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-focus-ring focus:border-transparent transition-colors"
);

const HUB_STATUS_DOT: Record<string, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  maintenance: "bg-warning",
  offline: "bg-danger",
};

const COR_STATUS_DOT: Record<string, string> = {
  active: "bg-success",
  restricted: "bg-warning",
  suspended: "bg-danger",
};

interface Props { form: UseFormReturn<WizardFormData>; corridors: Corridor[]; hubs: Hub[]; disabled?: boolean }

export function StepCorridor({ form, corridors, hubs, disabled }: Props) {
  const { register, formState: { errors }, watch } = form;
  const corId = watch("corridorId");
  const hubId = watch("hubId");
  const selectedCor = corridors.find((c) => c.id === corId);
  const selectedHub = hubs.find((h) => h.id === hubId);

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-text">Step 2 — Corridor & Hub</h2>

      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-cor">Corridor</label>
        <select id="w-cor" {...register("corridorId")} disabled={disabled} className={FIELD}>
          <option value="">Select corridor…</option>
          {corridors.map((c) => (
            <option key={c.id} value={c.id}>{c.name} — {c.sourceCountry} → {c.destinationCountry}</option>
          ))}
        </select>
        {errors.corridorId && <p className="mt-1 text-xs text-danger">{errors.corridorId.message}</p>}
        {selectedCor && (
          <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2 text-xs text-text-muted">
            <span className={cn("h-2 w-2 rounded-full", COR_STATUS_DOT[selectedCor.status])} />
            <span className="capitalize">{selectedCor.status}</span>
            <span>Risk: <span className="capitalize font-medium text-text">{selectedCor.riskLevel}</span></span>
            <span>Avg settlement: {selectedCor.avgSettlementHours}h</span>
          </div>
        )}
      </div>

      <div>
        <label className="typo-label mb-1.5 block" htmlFor="w-hub">Settlement Hub</label>
        <select id="w-hub" {...register("hubId")} disabled={disabled} className={FIELD}>
          <option value="">Select hub…</option>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>{h.name} — {h.country} ({h.type})</option>
          ))}
        </select>
        {errors.hubId && <p className="mt-1 text-xs text-danger">{errors.hubId.message}</p>}
        {selectedHub && (
          <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2 text-xs text-text-muted">
            <span className={cn("h-2 w-2 rounded-full", HUB_STATUS_DOT[selectedHub.status])} />
            <span className="capitalize">{selectedHub.status}</span>
            <span>Utilization: {selectedHub.utilization}%</span>
            <span>Uptime: {selectedHub.uptime}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
