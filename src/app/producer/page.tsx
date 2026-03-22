"use client";

/* ================================================================
   PRODUCER TERMINAL — Industrial Operations & Doré Intake
   ================================================================
   Zero-scroll, single-screen SCADA-style dashboard.
   CSS Grid layout — everything fits on one 1080p viewport.

   Layout:
     Root:    absolute inset-0 flex flex-col overflow-hidden
     Header:  shrink-0
     Metrics: shrink-0 (4-cell strip)
     Main:    flex-1 min-h-0 grid grid-cols-12 gap-3
       Left:  col-span-8 grid grid-rows-[1fr_auto]
         Top:   Two side-by-side tables (Yields + Vaulted Doré)
         Bot:   Transit Tracker (inline Brink's logistics)
       Right: col-span-4 (Doré Intake form + dispatch button)
   ================================================================ */

import { useState } from "react";
import { z } from "zod";
import {
  Pickaxe,
  Package,
  Truck,
  ShieldCheck,
  FlaskConical,
  Gauge,
  Clock,
  ChevronRight,
  AlertTriangle,
  Shield,
  CheckCircle2,
} from "lucide-react";

/* ================================================================
   ZOD SCHEMA — Doré Yield Registration
   ================================================================ */
const DoreYieldSchema = z.object({
  grossWeightKg: z
    .string()
    .min(1, "Gross weight is required")
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Must be a positive number"),
  estimatedPurity: z
    .string()
    .min(1, "Purity estimate is required")
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0 && parseFloat(v) <= 100,
      "Must be between 0.01 and 100",
    ),
  extractionDate: z.string().min(1, "Extraction date is required"),
});

/* ================================================================
   MOCK DATA
   ================================================================ */

interface ExtractionYield {
  id: string;
  site: string;
  estimatedKg: number;
  purity: number;
  extractionDate: string;
  status: "ASSAYED" | "PENDING_ASSAY" | "IN_TRANSIT";
}

const MOCK_YIELDS: ExtractionYield[] = [
  { id: "YLD-0041", site: "Shaft 7 — North Vein",  estimatedKg: 14.2, purity: 87.3, extractionDate: "2026-03-19", status: "ASSAYED" },
  { id: "YLD-0040", site: "Shaft 3 — Deep Cut",     estimatedKg: 9.8,  purity: 91.1, extractionDate: "2026-03-18", status: "ASSAYED" },
  { id: "YLD-0039", site: "Surface Pit — Block C",   estimatedKg: 22.5, purity: 72.6, extractionDate: "2026-03-17", status: "PENDING_ASSAY" },
  { id: "YLD-0038", site: "Shaft 7 — South Vein",    estimatedKg: 11.0, purity: 85.0, extractionDate: "2026-03-16", status: "IN_TRANSIT" },
  { id: "YLD-0037", site: "Shaft 3 — Deep Cut",      estimatedKg: 8.4,  purity: 89.7, extractionDate: "2026-03-15", status: "ASSAYED" },
];

interface VaultedDore {
  batchId: string;
  weightKg: number;
  estPurity: number;
  vaultLocation: string;
  awaitingTransport: boolean;
}

const MOCK_VAULTED: VaultedDore[] = [
  { batchId: "DRB-8821", weightKg: 14.2, estPurity: 87.3, vaultLocation: "Mine Vault A", awaitingTransport: true },
  { batchId: "DRB-8820", weightKg: 9.8,  estPurity: 91.1, vaultLocation: "Mine Vault A", awaitingTransport: true },
  { batchId: "DRB-8819", weightKg: 22.5, estPurity: 72.6, vaultLocation: "Mine Vault B", awaitingTransport: false },
  { batchId: "DRB-8818", weightKg: 11.0, estPurity: 85.0, vaultLocation: "Mine Vault A", awaitingTransport: true },
];

/* ── Transit Tracking Mock Data ── */
interface TransitLeg {
  location: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING";
  timestamp: string;
  detail: string;
}

const TRANSIT_LEGS: TransitLeg[] = [
  { location: "Mine Vault A — Sealed",        status: "COMPLETED",    timestamp: "Mar 19 06:00",  detail: "Batch DRB-8818 sealed — dual-key lockout" },
  { location: "Brink's Pickup — Gate 4",       status: "COMPLETED",    timestamp: "Mar 19 08:15",  detail: "Armored vehicle VX-4412 — armed escort" },
  { location: "Johannesburg Int'l — Tarmac",   status: "COMPLETED",    timestamp: "Mar 19 11:30",  detail: "Customs cleared — LBMA chain of custody" },
  { location: "In-Flight → Zurich",            status: "IN_PROGRESS",  timestamp: "Mar 19 14:00",  detail: "GPS: 48.1°N, 11.4°E — ETA 18:45 UTC" },
  { location: "Valcambi SA — Receiving Bay",   status: "PENDING",      timestamp: "Est. Mar 19 20:00", detail: "Assay & accreditation pending" },
];

/* ── Formatters ── */
function fmtKg(v: number): string {
  return v.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function fmtPct(v: number): string {
  return v.toFixed(1) + "%";
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function ProducerTerminalPage() {
  /* ── Doré Intake Form State ── */
  const [grossWeightKg, setGrossWeightKg] = useState("");
  const [estimatedPurity, setEstimatedPurity] = useState("");
  const [extractionDate, setExtractionDate] = useState("");
  const [esgAttested, setEsgAttested] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  /* ── Derived metrics ── */
  const totalExtractedKg = MOCK_YIELDS.reduce((s, y) => s + y.estimatedKg, 0);
  const vaultedKg = MOCK_VAULTED.reduce((s, v) => s + v.weightKg, 0);
  const awaitingTransport = MOCK_VAULTED.filter((v) => v.awaitingTransport).length;

  /* ── Form Handler ── */
  const handleDispatch = async () => {
    setFormErrors({});
    setDispatchSuccess(false);

    const result = DoreYieldSchema.safeParse({ grossWeightKg, estimatedPurity, extractionDate });

    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[issue.path[0] as string] = issue.message;
      }
      setFormErrors(errs);
      return;
    }

    if (!esgAttested) {
      setFormErrors({ esg: "OECD attestation is mandatory before dispatch" });
      return;
    }

    setIsDispatching(true);
    // TODO: POST to /api/producer/dispatch-yield server action
    // Defined interface: { grossWeightKg, estimatedPurity, extractionDate, esgAttested }
    await new Promise((r) => setTimeout(r, 1200));
    setIsDispatching(false);
    setDispatchSuccess(true);
    setGrossWeightKg("");
    setEstimatedPurity("");
    setExtractionDate("");
    setEsgAttested(false);
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950 text-sm">
      {/* ═══════════ HEADER — h-[88px] (32px telemetry + 56px title) ═══════════ */}
      {/* 1. Telemetry Strip (h-8) */}
      <div className="h-8 shrink-0 bg-black/40 border-b border-slate-800/60 px-6 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase">
            Systems Nominal
          </span>
        </div>
        <div className="h-3 w-px bg-slate-800" />
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase">
            <Clock className="h-3 w-3 inline mr-1 -mt-px" />
            {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[8px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 tracking-wider uppercase">
            SYSTEMS NOMINAL
          </span>
        </div>
      </div>

      {/* 2. Title Strip (h-14) */}
      <header className="h-14 shrink-0 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-gold-primary text-xs tracking-[0.25em] uppercase font-bold">
            Producer Terminal
          </span>
          <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
            Industrial Operations & Doré Intake
          </span>
        </div>
      </header>

      {/* ═══════════ METRICS STRIP ═══════════ */}
      <div className="shrink-0 grid grid-cols-4 gap-px bg-slate-800 border-b border-slate-800">
        <MetricCell icon={<FlaskConical className="h-3 w-3 text-slate-400" />} label="Total Extracted (MTD)" value={`${fmtKg(totalExtractedKg)} kg`} accent="slate" />
        <MetricCell icon={<Gauge className="h-3 w-3 text-emerald-400" />} label="Active Yields" value={`${MOCK_YIELDS.length} tracked`} accent="emerald" />
        <MetricCell icon={<Package className="h-3 w-3 text-gold-primary" />} label="Vaulted Doré" value={`${fmtKg(vaultedKg)} kg`} accent="gold" />
        <MetricCell icon={<Truck className="h-3 w-3 text-cyan-400" />} label="Awaiting Transport" value={`${awaitingTransport} batches`} accent="cyan" />
      </div>

      {/* ═══════════ MAIN DASHBOARD ═══════════ */}
      <main className="flex-1 min-h-0 p-3 grid grid-cols-12 gap-3 overflow-hidden">

        {/* ── LEFT PANEL (col-span-8) ── */}
        <div className="col-span-8 grid grid-rows-[1fr_auto] gap-3 min-h-0">

          {/* TOP: Two side-by-side tables */}
          <div className="grid grid-cols-2 gap-3 min-h-0">
            {/* ── Live Extraction Yields ── */}
            <div className="border border-slate-800 bg-slate-900/50 rounded-lg flex flex-col min-h-0">
              <div className="shrink-0 px-3 py-1.5 border-b border-slate-800 flex items-center gap-2">
                <Pickaxe className="h-3 w-3 text-slate-400" />
                <span className="font-mono text-[9px] text-slate-400 tracking-[0.15em] uppercase font-bold">Live Extraction Yields</span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">ID</th>
                      <th className="text-left font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Site</th>
                      <th className="text-right font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Weight</th>
                      <th className="text-right font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Purity</th>
                      <th className="text-left font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_YIELDS.slice(0, 4).map((y) => (
                      <tr key={y.id} className="border-b border-slate-800/30">
                        <td className="px-2 py-1.5 font-mono text-[10px] text-white">{y.id}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">{y.site}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-white tabular-nums text-right">{fmtKg(y.estimatedKg)} kg</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-white tabular-nums text-right">{fmtPct(y.purity)}</td>
                        <td className="px-2 py-1.5"><StatusBadge status={y.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Vaulted Doré ── */}
            <div className="border border-slate-800 bg-slate-900/50 rounded-lg flex flex-col min-h-0">
              <div className="shrink-0 px-3 py-1.5 border-b border-slate-800 flex items-center gap-2">
                <Package className="h-3 w-3 text-gold-primary" />
                <span className="font-mono text-[9px] text-slate-400 tracking-[0.15em] uppercase font-bold">Vaulted Doré — Awaiting Transport</span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Batch</th>
                      <th className="text-right font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Weight</th>
                      <th className="text-right font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Purity</th>
                      <th className="text-left font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Vault</th>
                      <th className="text-left font-mono text-[8px] text-slate-600 tracking-wider uppercase px-2 py-1 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_VAULTED.slice(0, 4).map((v) => (
                      <tr key={v.batchId} className="border-b border-slate-800/30">
                        <td className="px-2 py-1.5 font-mono text-[10px] text-white">{v.batchId}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-white tabular-nums text-right">{fmtKg(v.weightKg)} kg</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-white tabular-nums text-right">{fmtPct(v.estPurity)}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-slate-400">{v.vaultLocation}</td>
                        <td className="px-2 py-1.5">
                          {v.awaitingTransport ? (
                            <span className="inline-flex items-center gap-1 text-yellow-400 font-mono text-[8px] tracking-wider uppercase font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              AWAITING
                            </span>
                          ) : (
                            <span className="font-mono text-[8px] text-emerald-400 tracking-wider uppercase font-bold">DISPATCHED</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* BOTTOM: Transit Tracker */}
          <div className="border border-slate-800 bg-slate-900/50 rounded-lg min-h-0 flex flex-col">
            <div className="shrink-0 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-3 w-3 text-cyan-400" />
                <span className="font-mono text-[9px] text-slate-400 tracking-[0.15em] uppercase font-bold">Active Transit — Brink&apos;s Armored</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-[8px] text-cyan-400 tracking-wider uppercase font-bold">LIVE TRACKING</span>
              </div>
            </div>
            <div className="flex-1 min-h-0 px-3 py-2 overflow-hidden">
              {/* Shipment info banner */}
              <div className="flex items-center justify-between mb-2 px-2 py-1.5 bg-slate-800/40 rounded border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-gold-primary" />
                  <span className="font-mono text-[9px] text-gold-primary font-bold tracking-wider uppercase">DRB-8818</span>
                  <span className="font-mono text-[9px] text-slate-500">11.0 kg · 85.0% est.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-slate-500">Brink&apos;s VX-4412</span>
                  <span className="font-mono text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 tracking-wider uppercase font-bold">INSURED $250M</span>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex items-start gap-0">
                {TRANSIT_LEGS.map((leg, idx) => {
                  const isLast = idx === TRANSIT_LEGS.length - 1;
                  const lineColor =
                    leg.status === "COMPLETED" ? "bg-emerald-500/40" :
                    leg.status === "IN_PROGRESS" ? "bg-cyan-500/30" :
                    "bg-slate-800";
                  const textColor =
                    leg.status === "COMPLETED" ? "text-emerald-400" :
                    leg.status === "IN_PROGRESS" ? "text-cyan-400" :
                    "text-slate-600";

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center relative min-w-0">
                      {/* Connector line (before dot) */}
                      {idx > 0 && (
                        <div className={`absolute top-[5px] right-1/2 left-[-50%] h-[2px] ${lineColor}`} style={{ width: "100%", left: "-50%" }} />
                      )}
                      {/* Dot */}
                      <div className="relative z-10 flex items-center justify-center">
                        {leg.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : leg.status === "IN_PROGRESS" ? (
                          <div className="h-3 w-3 rounded-full border-2 border-cyan-400 bg-cyan-400/20 animate-pulse" />
                        ) : (
                          <div className="h-2.5 w-2.5 rounded-full border border-slate-600 bg-slate-800" />
                        )}
                      </div>
                      {/* Connector after dot */}
                      {!isLast && (
                        <div className={`absolute top-[5px] left-1/2 h-[2px] w-full ${
                          leg.status === "COMPLETED" ? "bg-emerald-500/40" : "bg-slate-800"
                        }`} />
                      )}
                      {/* Label */}
                      <div className="mt-1.5 text-center px-1">
                        <p className={`font-mono text-[8px] font-bold tracking-wider uppercase leading-tight ${textColor}`}>
                          {leg.location}
                        </p>
                        <p className="font-mono text-[7px] text-slate-600 mt-0.5">{leg.timestamp}</p>
                        <p className="font-mono text-[7px] text-slate-500 mt-0.5 leading-tight">{leg.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (col-span-4) — Doré Intake ── */}
        <div className="col-span-4 flex flex-col min-h-0 border border-slate-800 bg-slate-900/50 rounded-lg p-3">

          {/* Register Yield */}
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="h-3 w-3 text-slate-500" />
            <span className="font-mono text-[9px] text-slate-400 tracking-[0.15em] uppercase font-bold">Register Doré / Scrap Yield</span>
          </div>

          <div className="space-y-2">
            {/* Gross Weight */}
            <div>
              <label htmlFor="dore-grossWeight" className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-0.5">
                Gross Weight (kg)
              </label>
              <input
                id="dore-grossWeight"
                type="text"
                value={grossWeightKg}
                onChange={(e) => setGrossWeightKg(e.target.value)}
                placeholder="14.2"
                disabled={isDispatching}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
              />
              {formErrors.grossWeightKg && (
                <p className="font-mono text-[8px] text-red-400 mt-0.5">{formErrors.grossWeightKg}</p>
              )}
            </div>

            {/* Estimated Purity */}
            <div>
              <label htmlFor="dore-purity" className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-0.5">
                Baseline Purity Estimate (%)
              </label>
              <input
                id="dore-purity"
                type="text"
                value={estimatedPurity}
                onChange={(e) => setEstimatedPurity(e.target.value)}
                placeholder="87.3"
                disabled={isDispatching}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
              />
              {formErrors.estimatedPurity && (
                <p className="font-mono text-[8px] text-red-400 mt-0.5">{formErrors.estimatedPurity}</p>
              )}
            </div>

            {/* Extraction Date */}
            <div>
              <label htmlFor="dore-date" className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase block mb-0.5">
                Extraction Date
              </label>
              <input
                id="dore-date"
                type="date"
                value={extractionDate}
                onChange={(e) => setExtractionDate(e.target.value)}
                disabled={isDispatching}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-2.5 py-1.5 font-mono text-xs text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50 scheme-dark"
              />
              {formErrors.extractionDate && (
                <p className="font-mono text-[8px] text-red-400 mt-0.5">{formErrors.extractionDate}</p>
              )}
            </div>
          </div>

          {/* ESG / OECD Attestation */}
          <div className="border-t border-slate-800 pt-2 mt-2">
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="h-3 w-3 text-slate-500" />
              <span className="font-mono text-[9px] text-slate-400 tracking-[0.15em] uppercase font-bold">ESG / OECD Attestation</span>
            </div>
            <label htmlFor="esg-toggle" className="flex items-start gap-2.5 cursor-pointer group">
              <div className="relative shrink-0 mt-0.5">
                <input
                  id="esg-toggle"
                  type="checkbox"
                  checked={esgAttested}
                  onChange={(e) => setEsgAttested(e.target.checked)}
                  disabled={isDispatching}
                  className="sr-only peer"
                />
                <div className="w-7 h-3.5 bg-slate-700 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform peer-checked:translate-x-3.5" />
              </div>
              <span className="font-mono text-[9px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                I attest this extraction complies with the{" "}
                <span className="text-gold-primary font-bold">OECD Due Diligence Guidance</span>{" "}
                for Responsible Supply Chains.
              </span>
            </label>
            {formErrors.esg && (
              <div className="flex items-center gap-1.5 mt-1">
                <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                <p className="font-mono text-[8px] text-red-400">{formErrors.esg}</p>
              </div>
            )}
          </div>

          {/* ── Spacer pushes button to bottom ── */}
          <div className="flex-1" />

          {/* ── Logistics Dispatch — locked to bottom ── */}
          <div className="border-t border-slate-800 pt-2 mt-auto shrink-0 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Truck className="h-3 w-3 text-slate-500" />
              <span className="font-mono text-[9px] text-slate-400 tracking-[0.15em] uppercase font-bold">Logistics Dispatch</span>
            </div>

            {dispatchSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase font-bold">
                  Yield locked — Transport dispatched
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDispatch}
              disabled={isDispatching}
              className={`w-full font-bold text-xs tracking-wide py-2.5 flex items-center justify-center gap-2 transition-colors font-mono rounded-sm ${
                isDispatching
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-gold-primary text-slate-950 hover:bg-gold-hover cursor-pointer"
              }`}
            >
              {isDispatching ? (
                <>
                  <div className="h-3 w-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Locking Yield & Dispatching...
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5" />
                  Lock Yield & Dispatch Transport
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
            <span className="font-mono text-[7px] text-slate-600 tracking-wider uppercase text-center">
              BRINK&apos;S / MALCA-AMIT ARMORED LOGISTICS
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

function MetricCell({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "slate" | "emerald" | "gold" | "cyan";
}) {
  const border =
    accent === "slate" ? "border-t-slate-500/40" :
    accent === "emerald" ? "border-t-emerald-500/40" :
    accent === "cyan" ? "border-t-cyan-500/40" :
    "border-t-gold-primary/40";

  return (
    <div className={`bg-slate-900 px-3 py-2 border-t-2 ${border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="font-mono text-[8px] text-slate-500 tracking-wider uppercase">{label}</span>
      </div>
      <p className="font-mono text-sm text-white font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config =
    status === "ASSAYED"
      ? { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" }
      : status === "PENDING_ASSAY"
        ? { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", dot: "bg-yellow-400 animate-pulse" }
        : { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-400 animate-pulse" };

  const label = status === "PENDING_ASSAY" ? "PENDING" : status === "IN_TRANSIT" ? "TRANSIT" : status;

  return (
    <span className={`inline-flex items-center gap-1 px-1 py-0.5 font-mono text-[8px] tracking-wider uppercase font-bold border ${config.text} ${config.bg} ${config.border}`}>
      <span className={`h-1 w-1 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}
