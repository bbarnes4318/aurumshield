"use client";

import { cn } from "@/lib/utils";
import {
  Lock,
  Shield,
  Building2,
  Info,
  CheckCircle2,
  ArrowRight,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { useWizardStore } from "./wizard-store";

/* ================================================================
   VaultingLegalStructuring — Step 4 (V2)
   ================================================================
   Dedicated step: Fully Allocated Storage under Bailment
   Jurisprudence. Unallocated disabled. Tooltips for Bankruptcy
   Remoteness and Zero Counterparty Risk. Zero scroll.
   ================================================================ */

export function VaultingLegalStructuring() {
  const { storageType, setStorageType, goNext, jurisdiction } = useWizardStore();
  const [tipBankruptcy, setTipBankruptcy] = useState(false);
  const [tipBailment, setTipBailment] = useState(false);

  const jurisdictionName = jurisdiction === "london" ? "London" : jurisdiction === "zurich" ? "Zurich" : "New York";

  return (
    <div className="flex h-full flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-3 shrink-0">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">Step 4 of 6</p>
        <h2 className="font-heading text-xl font-bold tracking-tight text-white mt-0.5">
          Vaulting & Legal Structuring
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure custody arrangement under bailment jurisprudence.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* ── Fully Allocated ── */}
        <button type="button" onClick={() => setStorageType("allocated")}
          className={cn(
            "rounded-xl border p-5 text-left transition-all flex flex-col",
            storageType === "allocated"
              ? "border-emerald-500/40 bg-emerald-950/15 shadow-[0_0_20px_rgba(63,174,122,0.06)]"
              : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
          )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg",
              storageType === "allocated" ? "bg-emerald-500/10" : "bg-slate-800")}>
              <Lock className={cn("h-5 w-5", storageType === "allocated" ? "text-emerald-400" : "text-slate-500")} />
            </div>
            <div>
              <p className={cn("text-sm font-semibold", storageType === "allocated" ? "text-white" : "text-slate-300")}>
                Fully Allocated Storage
              </p>
              <p className="font-mono text-[9px] text-emerald-500/60">Recommended · Institutional Standard</p>
            </div>
            {storageType === "allocated" && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />}
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Physically segregated, individually serialized, held under title in your entity&apos;s name. Not commingled.
          </p>

          <div className="space-y-2 flex-1">
            <div className="relative flex items-center gap-2 rounded bg-emerald-950/25 px-2.5 py-2">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-300">Bankruptcy Remoteness</span>
              <div className="ml-auto"
                onMouseEnter={() => setTipBankruptcy(true)}
                onMouseLeave={() => setTipBankruptcy(false)}>
                <Info className="h-3 w-3 text-emerald-500/40 hover:text-emerald-400 cursor-help" />
              </div>
              {tipBankruptcy && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[10px] text-slate-300 shadow-xl z-50">
                  Under fully allocated bailment, your gold is legally segregated from the vault
                  operator&apos;s balance sheet. In the event of custodian insolvency, your assets
                  are NOT available to creditors.
                </div>
              )}
            </div>
            <div className="relative flex items-center gap-2 rounded bg-emerald-950/25 px-2.5 py-2">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-300">Zero Counterparty Risk</span>
              <div className="ml-auto"
                onMouseEnter={() => setTipBailment(true)}
                onMouseLeave={() => setTipBailment(false)}>
                <Info className="h-3 w-3 text-emerald-500/40 hover:text-emerald-400 cursor-help" />
              </div>
              {tipBailment && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[10px] text-slate-300 shadow-xl z-50">
                  Bailment jurisprudence ensures you retain full legal title. The vault acts as
                  a bailee, not a debtor. Your gold is your physical property.
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/30 px-3 py-2">
            <Globe className="h-3 w-3 text-gold/50" />
            <span className="font-mono text-[9px] text-slate-500">
              Destination: <span className="text-white font-semibold">{jurisdictionName}</span> · Segregated Title
            </span>
          </div>
        </button>

        {/* ── Unallocated (Disabled) ── */}
        <div className="relative rounded-xl border border-slate-800/40 bg-slate-900/20 p-5 opacity-40">
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/60 z-10">
            <span className="rounded-full border border-red-800/30 bg-red-950/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-red-400">
              Not Available for Institutional
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Unallocated Storage</p>
              <p className="font-mono text-[9px] text-slate-600">Commingled · Higher Risk</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600">
            Gold is commingled with other depositors&apos; holdings. Subject to counterparty risk.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="shrink-0 mt-3">
        <button type="button" onClick={goNext}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gold py-3 text-sm font-bold uppercase tracking-wider text-black hover:shadow-[0_0_25px_rgba(198,168,107,0.25)] transition-all">
          <ArrowRight className="h-4 w-4" />
          Proceed to Funding & Settlement
        </button>
      </div>
    </div>
  );
}
