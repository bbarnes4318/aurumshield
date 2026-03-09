"use client";

import { cn } from "@/lib/utils";
import {
  Truck,
  Shield,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useWizardStore } from "./wizard-store";

/* ================================================================
   SecureLogisticsRouting — Step 3 (V2)
   ================================================================
   Dedicated full-step for carrier selection and jurisdiction.
   Mounts a mock DeliveryRateCard-style calculator inline.
   Logistics cost feeds back into Zustand store.
   Zero scroll — single viewport.
   ================================================================ */

type Carrier = "brinks" | "loomis";
type Jurisdiction = "london" | "zurich" | "new_york";

const CARRIERS = [
  {
    id: "brinks" as Carrier,
    name: "Brink's Global Services",
    sla: "24–72 hrs",
    features: ["Armored Fleet", "Tarmac Supervision", "GPS Telemetry", "Armed Escort"],
  },
  {
    id: "loomis" as Carrier,
    name: "Loomis International",
    sla: "48–96 hrs",
    features: ["Armored Transport", "Dual-Key Verification", "CCTV", "Bonded Couriers"],
  },
] as const;

const JURISDICTIONS = [
  { id: "london" as Jurisdiction, name: "London", vault: "JP Morgan Chase Vault", flag: "🇬🇧", insurance: "$250M" },
  { id: "zurich" as Jurisdiction, name: "Zurich", vault: "SIX Swiss Exchange Vault", flag: "🇨🇭", insurance: "$200M" },
  { id: "new_york" as Jurisdiction, name: "New York", vault: "HSBC USA Depository", flag: "🇺🇸", insurance: "$300M" },
] as const;

/* Mock calculator cost based on jurisdiction and carrier */
function computeLogisticsCost(carrier: Carrier, jurisdiction: Jurisdiction, barCount: number): number {
  const baseFee = carrier === "brinks" ? 12500 : 10800;
  const jurisdictionMultiplier = jurisdiction === "london" ? 1.0 : jurisdiction === "zurich" ? 1.15 : 0.85;
  const perBarFee = 385;
  return Math.round(baseFee * jurisdictionMultiplier + perBarFee * barCount);
}

export function SecureLogisticsRouting() {
  const {
    carrier, setCarrier,
    jurisdiction, setJurisdiction,
    barCount,
    setLogisticsCost,
    logisticsCost,
    goNext,
  } = useWizardStore();

  /* Update logistics cost whenever inputs change */
  const cost = computeLogisticsCost(carrier, jurisdiction, barCount);
  if (cost !== logisticsCost) setLogisticsCost(cost);

  const fmtUSD = (n: number) => "$" + n.toLocaleString();

  return (
    <div className="flex h-full flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-3 shrink-0">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">Step 3 of 6</p>
        <h2 className="font-heading text-xl font-bold tracking-tight text-white mt-0.5">
          Secure Logistics Routing
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* ── Carrier Selection ── */}
        <div className="flex flex-col gap-3">
          {CARRIERS.map((c) => (
            <button key={c.id} type="button" onClick={() => setCarrier(c.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all flex-1",
                carrier === c.id
                  ? "border-gold/50 bg-gold/5 shadow-[0_0_20px_rgba(198,168,107,0.06)]"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              )}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg",
                  carrier === c.id ? "bg-gold/10" : "bg-slate-800")}>
                  <Truck className={cn("h-4 w-4", carrier === c.id ? "text-gold" : "text-slate-500")} />
                </div>
                <div>
                  <p className={cn("text-xs font-semibold", carrier === c.id ? "text-white" : "text-slate-300")}>{c.name}</p>
                  <p className="font-mono text-[9px] text-slate-600">SLA: {c.sla}</p>
                </div>
                {carrier === c.id && <CheckCircle2 className="ml-auto h-4 w-4 text-gold" />}
              </div>
              <div className="flex flex-wrap gap-1">
                {c.features.map((f) => (
                  <span key={f} className="rounded-full bg-slate-800/80 px-2 py-0.5 font-mono text-[8px] text-slate-400">{f}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* ── Right column: Jurisdiction + Calculator ── */}
        <div className="flex flex-col gap-3">
          {/* Jurisdiction */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex-1">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
              Depository Jurisdiction
            </p>
            <div className="space-y-2">
              {JURISDICTIONS.map((j) => (
                <button key={j.id} type="button" onClick={() => setJurisdiction(j.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-all flex items-center gap-3",
                    jurisdiction === j.id
                      ? "border-gold/40 bg-gold/5"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                  )}>
                  <span className="text-lg">{j.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-semibold", jurisdiction === j.id ? "text-white" : "text-slate-300")}>
                      {j.name}
                    </p>
                    <p className="font-mono text-[8px] text-slate-600 truncate">{j.vault}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5 text-gold/40" />
                    <span className="font-mono text-[8px] text-gold/50">{j.insurance}</span>
                  </div>
                  {jurisdiction === j.id && <CheckCircle2 className="h-3.5 w-3.5 text-gold" />}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Logistics Calculator */}
          <div className="rounded-xl border border-gold/20 bg-gold/5 backdrop-blur-sm p-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Shield className="h-3.5 w-3.5 text-gold" />
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-gold/60">
                Logistics Cost Calculator
              </p>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Armored Transport (base)</span>
                <span className="font-mono tabular-nums text-white">
                  {fmtUSD(carrier === "brinks" ? 12500 : 10800)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Per-bar handling (×{barCount})</span>
                <span className="font-mono tabular-nums text-white">{fmtUSD(385 * barCount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Insurance Premium (0.15%)</span>
                <span className="font-mono tabular-nums text-white">Included</span>
              </div>
              <hr className="border-slate-700/50" />
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-white">Total Logistics</span>
                <span className="font-mono text-sm font-bold tabular-nums text-gold">{fmtUSD(cost)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarmac Badge + CTA */}
      <div className="shrink-0 mt-3 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-800/30 bg-emerald-950/15 px-3 py-2 flex-1">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-300">
            Tarmac Supervision · Specie Insurance Active
          </span>
        </div>
        <button type="button" onClick={goNext}
          className="rounded-xl bg-gold px-8 py-2.5 text-sm font-bold uppercase tracking-wider text-black hover:shadow-[0_0_25px_rgba(198,168,107,0.25)] transition-all flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          Continue
        </button>
      </div>
    </div>
  );
}
