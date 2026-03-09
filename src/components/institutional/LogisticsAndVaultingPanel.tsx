"use client";

import { cn } from "@/lib/utils";
import {
  Truck,
  Shield,
  Building2,
  Globe,
  Lock,
  CheckCircle2,
  Info,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

/* ================================================================
   LogisticsAndVaultingPanel — Steps 2 & 3
   ================================================================
   Step 2: Secure Logistics Routing
     - Brink's / Loomis toggle cards
     - Jurisdiction selector (London, Zurich, New York)
     - Specie Insurance Wrapper badge
   Step 3: Vaulting & Legal Structuring
     - Fully Allocated Storage under Bailment Jurisprudence
     - Tooltips: Bankruptcy Remoteness, Zero Counterparty Risk
   ================================================================ */

type Carrier = "brinks" | "loomis";
type Jurisdiction = "london" | "zurich" | "new_york";
type StorageType = "allocated" | "unallocated";

interface LogisticsAndVaultingPanelProps {
  carrier: Carrier;
  onCarrierChange: (c: Carrier) => void;
  jurisdiction: Jurisdiction;
  onJurisdictionChange: (j: Jurisdiction) => void;
  storageType: StorageType;
  onStorageTypeChange: (s: StorageType) => void;
  onContinue: () => void;
}

const CARRIERS = [
  {
    id: "brinks" as Carrier,
    name: "Brink's Global Services",
    description: "Full armored transport with tarmac supervision and GPS telemetry.",
    features: ["Armored Vehicle Fleet", "Tarmac Supervision", "Real-time GPS", "Armed Escort"],
    sla: "24–72 hours",
  },
  {
    id: "loomis" as Carrier,
    name: "Loomis International",
    description: "Premium secure logistics with chain-of-custody documentation.",
    features: ["Armored Transport", "Dual-Key Verification", "CCTV Surveillance", "Bonded Couriers"],
    sla: "48–96 hours",
  },
] as const;

const JURISDICTIONS = [
  {
    id: "london" as Jurisdiction,
    name: "London",
    vault: "JP Morgan Chase (London)",
    flag: "🇬🇧",
    insurance: "$250M",
  },
  {
    id: "zurich" as Jurisdiction,
    name: "Zurich",
    vault: "SIX Swiss Exchange Vault",
    flag: "🇨🇭",
    insurance: "$200M",
  },
  {
    id: "new_york" as Jurisdiction,
    name: "New York",
    vault: "HSBC USA Depository (Manhattan)",
    flag: "🇺🇸",
    insurance: "$300M",
  },
] as const;

export function LogisticsAndVaultingPanel({
  carrier,
  onCarrierChange,
  jurisdiction,
  onJurisdictionChange,
  storageType,
  onStorageTypeChange,
  onContinue,
}: LogisticsAndVaultingPanelProps) {
  const [showBailmentTooltip, setShowBailmentTooltip] = useState(false);
  const [showBankruptcyTooltip, setShowBankruptcyTooltip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 p-6"
    >
      {/* ═══════════════════════════════════════════════════════════
         STEP 2 — Secure Logistics Routing
         ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="mb-5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">
            — Step 2 of 5
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-white mt-1">
            Secure Logistics Routing
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Select your armored carrier and depository jurisdiction for physical delivery.
          </p>
        </div>

        {/* Carrier Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {CARRIERS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onCarrierChange(c.id)}
              className={cn(
                "rounded-xl border p-5 text-left transition-all",
                carrier === c.id
                  ? "border-gold/50 bg-gold/5 shadow-[0_0_20px_rgba(198,168,107,0.08)]"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    carrier === c.id ? "bg-gold/10" : "bg-slate-800"
                  )}
                >
                  <Truck
                    className={cn(
                      "h-5 w-5",
                      carrier === c.id ? "text-gold" : "text-slate-500"
                    )}
                  />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      carrier === c.id ? "text-white" : "text-slate-300"
                    )}
                  >
                    {c.name}
                  </p>
                  <p className="font-mono text-[9px] text-slate-500">
                    SLA: {c.sla}
                  </p>
                </div>
                {carrier === c.id && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-gold" />
                )}
              </div>

              <p className="text-xs text-slate-400 mb-3">{c.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {c.features.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-slate-800/80 px-2 py-0.5 font-mono text-[9px] text-slate-400"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {/* Tarmac Supervision Badge */}
        <div className="flex items-center gap-3 rounded-lg border border-emerald-800/30 bg-emerald-950/15 px-4 py-2.5 mb-6">
          <Shield className="h-4 w-4 text-emerald-400" />
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Tarmac Supervision Protocol Active
            </span>
            <p className="text-[10px] text-emerald-500/60">
              Dual-agent verification at origin and destination. Full video recording.
            </p>
          </div>
        </div>

        {/* Jurisdiction Selector */}
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
          Depository Jurisdiction
        </p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {JURISDICTIONS.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => onJurisdictionChange(j.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                jurisdiction === j.id
                  ? "border-gold/50 bg-gold/5"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{j.flag}</span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    jurisdiction === j.id ? "text-white" : "text-slate-300"
                  )}
                >
                  {j.name}
                </span>
                {jurisdiction === j.id && (
                  <CheckCircle2 className="ml-auto h-4 w-4 text-gold" />
                )}
              </div>
              <p className="font-mono text-[10px] text-slate-500">{j.vault}</p>
              <div className="mt-2 flex items-center gap-1">
                <Shield className="h-3 w-3 text-gold/50" />
                <span className="font-mono text-[9px] text-gold/60">
                  Insured to {j.insurance}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Specie Insurance Wrapper */}
        <div className="flex items-center gap-3 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3">
          <Shield className="h-4 w-4 text-gold" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gold">
            Specie Insurance Wrapper — Full Transit Coverage Active
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
         STEP 3 — Vaulting & Legal Structuring
         ═══════════════════════════════════════════════════════════ */}
      <section>
        <hr className="border-slate-800 mb-6" />
        <div className="mb-5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">
            — Step 3 of 5
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-white mt-1">
            Vaulting & Legal Structuring
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure your custody arrangement under bailment jurisprudence.
          </p>
        </div>

        {/* Storage Type Selection */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Fully Allocated */}
          <button
            type="button"
            onClick={() => onStorageTypeChange("allocated")}
            className={cn(
              "rounded-xl border p-5 text-left transition-all",
              storageType === "allocated"
                ? "border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_20px_rgba(63,174,122,0.08)]"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  storageType === "allocated" ? "bg-emerald-500/10" : "bg-slate-800"
                )}
              >
                <Lock
                  className={cn(
                    "h-5 w-5",
                    storageType === "allocated"
                      ? "text-emerald-400"
                      : "text-slate-500"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    storageType === "allocated" ? "text-white" : "text-slate-300"
                  )}
                >
                  Fully Allocated Storage
                </p>
                <p className="font-mono text-[9px] text-emerald-500/60">
                  Recommended · Institutional Standard
                </p>
              </div>
              {storageType === "allocated" && (
                <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />
              )}
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Your gold is physically segregated, individually serialized, and held under
              title in your entity&apos;s name. Not commingled.
            </p>
            <div className="space-y-2">
              <div className="relative flex items-center gap-2 rounded bg-emerald-950/30 px-2.5 py-1.5">
                <Shield className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-300">
                  Bankruptcy Remoteness
                </span>
                <button
                  type="button"
                  className="ml-auto"
                  onMouseEnter={() => setShowBankruptcyTooltip(true)}
                  onMouseLeave={() => setShowBankruptcyTooltip(false)}
                >
                  <Info className="h-3 w-3 text-emerald-500/50 hover:text-emerald-400" />
                </button>
                {showBankruptcyTooltip && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[10px] text-slate-300 shadow-xl z-50">
                    Under fully allocated bailment, your gold is legally segregated 
                    from the vault operator&apos;s balance sheet. In the event of the 
                    custodian&apos;s insolvency, your assets are NOT available to creditors.
                  </div>
                )}
              </div>
              <div className="relative flex items-center gap-2 rounded bg-emerald-950/30 px-2.5 py-1.5">
                <Shield className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-300">
                  Zero Counterparty Risk
                </span>
                <button
                  type="button"
                  className="ml-auto"
                  onMouseEnter={() => setShowBailmentTooltip(true)}
                  onMouseLeave={() => setShowBailmentTooltip(false)}
                >
                  <Info className="h-3 w-3 text-emerald-500/50 hover:text-emerald-400" />
                </button>
                {showBailmentTooltip && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[10px] text-slate-300 shadow-xl z-50">
                    Bailment jurisprudence ensures you retain full legal title to your 
                    specific bars. The vault acts as a bailee, not a debtor. Your gold 
                    is not a claim — it is your physical property.
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Unallocated (disabled for institutional) */}
          <div className="relative rounded-xl border border-slate-800/50 bg-slate-900/30 p-5 opacity-50">
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/70 z-10">
              <span className="rounded-full border border-red-800/30 bg-red-950/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-red-400">
                Not Available for Institutional
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Unallocated Storage
                </p>
                <p className="font-mono text-[9px] text-slate-600">
                  Commingled · Higher Risk
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Gold is commingled with other depositors&apos; holdings. Subject to
              counterparty risk.
            </p>
          </div>
        </div>

        {/* Bailment Jurisprudence Label */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-3">
          <Globe className="h-4 w-4 text-gold/60" />
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Bailment Jurisprudence:{" "}
            </span>
            <span className="font-mono text-[10px] font-semibold text-white">
              Fully Allocated — Segregated Title
            </span>
          </div>
        </div>
      </section>

      {/* ── Continue CTA ── */}
      <button
        type="button"
        onClick={onContinue}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-gold py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-gold-hover hover:shadow-[0_0_30px_rgba(198,168,107,0.25)]"
      >
        <ArrowRight className="h-4 w-4" />
        Proceed to Funding & Settlement
      </button>
    </motion.div>
  );
}
