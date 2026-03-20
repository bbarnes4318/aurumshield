"use client";

/* ================================================================
   PRODUCER TERMINAL — Industrial Operations & Doré Intake
   ================================================================
   Zero-scroll, single-screen SCADA-style dashboard for mine
   operators. Displays extraction yields, crusher/mill status,
   vaulted Doré inventory, and provides a Doré intake + logistics
   dispatch panel.

   Layout Architecture:
     Root:   absolute inset-0 flex flex-col overflow-hidden
     Header: shrink-0 px-4 py-3
     Main:   flex-1 min-h-0 grid grid-cols-12 gap-4 overflow-hidden
     Left:   col-span-8 (Industrial Operations)
     Right:  col-span-4 (Doré Intake & Logistics)
   ================================================================ */

import { useState } from "react";
import { z } from "zod";
import {
  Activity,
  Pickaxe,
  Package,
  Truck,
  ShieldCheck,
  FlaskConical,
  Gauge,
  Clock,
  ChevronRight,
  AlertTriangle,
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
   MOCK DATA — Industrial Telemetry
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
  { id: "YLD-0041", site: "Shaft 7 — North Vein", estimatedKg: 14.2, purity: 87.3, extractionDate: "2026-03-19", status: "ASSAYED" },
  { id: "YLD-0040", site: "Shaft 3 — Deep Cut", estimatedKg: 9.8, purity: 91.1, extractionDate: "2026-03-18", status: "ASSAYED" },
  { id: "YLD-0039", site: "Surface Pit — Block C", estimatedKg: 22.5, purity: 72.6, extractionDate: "2026-03-17", status: "PENDING_ASSAY" },
  { id: "YLD-0038", site: "Shaft 7 — South Vein", estimatedKg: 11.0, purity: 85.0, extractionDate: "2026-03-16", status: "IN_TRANSIT" },
  { id: "YLD-0037", site: "Shaft 3 — Deep Cut", estimatedKg: 8.4, purity: 89.7, extractionDate: "2026-03-15", status: "ASSAYED" },
];

interface CrusherStatus {
  equipmentId: string;
  type: string;
  status: "ONLINE" | "MAINTENANCE" | "STANDBY";
  throughputTph: number;
  lastServiceDate: string;
}

const MOCK_CRUSHERS: CrusherStatus[] = [
  { equipmentId: "CR-001", type: "Jaw Crusher", status: "ONLINE", throughputTph: 42.5, lastServiceDate: "2026-03-01" },
  { equipmentId: "ML-003", type: "Ball Mill",   status: "ONLINE", throughputTph: 28.1, lastServiceDate: "2026-02-20" },
  { equipmentId: "CR-002", type: "Cone Crusher", status: "MAINTENANCE", throughputTph: 0, lastServiceDate: "2026-03-18" },
  { equipmentId: "ML-004", type: "SAG Mill",    status: "STANDBY", throughputTph: 0, lastServiceDate: "2026-03-10" },
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
  { batchId: "DRB-8820", weightKg: 9.8, estPurity: 91.1, vaultLocation: "Mine Vault A", awaitingTransport: true },
  { batchId: "DRB-8819", weightKg: 22.5, estPurity: 72.6, vaultLocation: "Mine Vault B", awaitingTransport: false },
];

/* ================================================================
   FORMATTERS
   ================================================================ */
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
  const onlineCrushers = MOCK_CRUSHERS.filter((c) => c.status === "ONLINE").length;
  const vaultedKg = MOCK_VAULTED.reduce((s, v) => s + v.weightKg, 0);
  const awaitingTransport = MOCK_VAULTED.filter((v) => v.awaitingTransport).length;

  /* ── Form Handlers ── */
  const handleDispatch = async () => {
    setFormErrors({});
    setDispatchSuccess(false);

    const result = DoreYieldSchema.safeParse({
      grossWeightKg,
      estimatedPurity,
      extractionDate,
    });

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
      {/* ════════════════════════════════════════════════════════
         HEADER — Ultra-Tight
         ════════════════════════════════════════════════════════ */}
      <header className="shrink-0 px-4 py-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-gold-primary text-xs tracking-[0.25em] uppercase font-bold">
            Producer Terminal
          </span>
          <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
            Industrial Operations & Doré Intake
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
            <Clock className="h-3 w-3 inline mr-1 -mt-px" />
            {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
          </span>
          <span className="font-mono text-[8px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 tracking-wider uppercase">
            SYSTEMS NOMINAL
          </span>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
         METRICS STRIP — 4-block dense row
         ════════════════════════════════════════════════════════ */}
      <div className="shrink-0 grid grid-cols-4 gap-px bg-slate-800 border-b border-slate-800">
        <MetricCell
          icon={<FlaskConical className="h-3.5 w-3.5 text-amber-400" />}
          label="Total Extracted (MTD)"
          value={`${fmtKg(totalExtractedKg)} kg`}
          accent="amber"
        />
        <MetricCell
          icon={<Gauge className="h-3.5 w-3.5 text-emerald-400" />}
          label="Crushers Online"
          value={`${onlineCrushers} / ${MOCK_CRUSHERS.length}`}
          accent="emerald"
        />
        <MetricCell
          icon={<Package className="h-3.5 w-3.5 text-gold-primary" />}
          label="Vaulted Doré"
          value={`${fmtKg(vaultedKg)} kg`}
          accent="gold"
        />
        <MetricCell
          icon={<Truck className="h-3.5 w-3.5 text-cyan-400" />}
          label="Awaiting Transport"
          value={`${awaitingTransport} batches`}
          accent="cyan"
        />
      </div>

      {/* ════════════════════════════════════════════════════════
         MAIN DASHBOARD GRID
         ════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-h-0 p-4 grid grid-cols-12 gap-4 overflow-hidden">

        {/* ──────────────────────────────────────────────────────
           LEFT PANEL — Industrial Operations (col-span-8)
           ────────────────────────────────────────────────────── */}
        <div className="col-span-8 flex flex-col gap-3 min-h-0 overflow-y-auto border border-slate-800 bg-slate-900/50 rounded-lg p-3">

          {/* ── Section 1: Live Extraction Yields ── */}
          <SectionHeader icon={<Pickaxe className="h-3 w-3" />} title="Live Extraction Yields" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th>Yield ID</Th>
                  <Th>Mining Site</Th>
                  <Th align="right">Est. Weight</Th>
                  <Th align="right">Purity</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {MOCK_YIELDS.map((y) => (
                  <tr key={y.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <Td><span className="text-white">{y.id}</span></Td>
                    <Td>{y.site}</Td>
                    <Td align="right"><span className="text-white tabular-nums">{fmtKg(y.estimatedKg)} kg</span></Td>
                    <Td align="right"><span className="text-white tabular-nums">{fmtPct(y.purity)}</span></Td>
                    <Td><span className="tabular-nums">{y.extractionDate}</span></Td>
                    <Td><StatusBadge status={y.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Section 2: Crusher / Mill Status ── */}
          <SectionHeader icon={<Activity className="h-3 w-3" />} title="Crusher / Mill Operational Status" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th>Equipment</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th align="right">Throughput</Th>
                  <Th>Last Service</Th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CRUSHERS.map((c) => (
                  <tr key={c.equipmentId} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <Td><span className="text-white">{c.equipmentId}</span></Td>
                    <Td>{c.type}</Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase font-bold border ${
                        c.status === "ONLINE"
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                          : c.status === "MAINTENANCE"
                            ? "text-red-400 bg-red-500/10 border-red-500/30"
                            : "text-slate-500 bg-slate-800/50 border-slate-700"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          c.status === "ONLINE" ? "bg-emerald-400 animate-pulse" : c.status === "MAINTENANCE" ? "bg-red-400" : "bg-slate-600"
                        }`} />
                        {c.status}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="text-white tabular-nums">
                        {c.throughputTph > 0 ? `${c.throughputTph.toFixed(1)} TPH` : "—"}
                      </span>
                    </Td>
                    <Td><span className="tabular-nums">{c.lastServiceDate}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Section 3: Vaulted Doré Inventory ── */}
          <SectionHeader icon={<Package className="h-3 w-3" />} title="Vaulted Doré — Awaiting Transport" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <Th>Batch ID</Th>
                  <Th align="right">Weight</Th>
                  <Th align="right">Est. Purity</Th>
                  <Th>Vault</Th>
                  <Th>Transport</Th>
                </tr>
              </thead>
              <tbody>
                {MOCK_VAULTED.map((v) => (
                  <tr key={v.batchId} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                    <Td><span className="text-white">{v.batchId}</span></Td>
                    <Td align="right"><span className="text-white tabular-nums">{fmtKg(v.weightKg)} kg</span></Td>
                    <Td align="right"><span className="text-white tabular-nums">{fmtPct(v.estPurity)}</span></Td>
                    <Td>{v.vaultLocation}</Td>
                    <Td>
                      {v.awaitingTransport ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-[9px] tracking-wider uppercase font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          AWAITING
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase font-bold">DISPATCHED</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer Trust Line ── */}
          <div className="pt-2 border-t border-slate-800/50 mt-auto">
            <span className="font-mono text-[8px] text-slate-700 tracking-wider uppercase">
              AurumShield · Industrial SCADA · Mine-to-Vault Pipeline · Real-Time Telemetry
            </span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────
           RIGHT PANEL — Doré Intake & Logistics (col-span-4)
           ────────────────────────────────────────────────────── */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0 border border-slate-800 bg-slate-900/50 rounded-lg p-3">

          {/* ── Register New Yield ── */}
          <SectionHeader icon={<FlaskConical className="h-3 w-3" />} title="Register New Yield" />

          <div className="space-y-3">
            {/* Gross Weight */}
            <div>
              <label htmlFor="dore-grossWeight" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                Gross Weight (kg)
              </label>
              <input
                id="dore-grossWeight"
                type="text"
                value={grossWeightKg}
                onChange={(e) => setGrossWeightKg(e.target.value)}
                placeholder="14.2"
                disabled={isDispatching}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
              />
              {formErrors.grossWeightKg && (
                <p className="font-mono text-[9px] text-red-400 mt-1">{formErrors.grossWeightKg}</p>
              )}
            </div>

            {/* Estimated Purity */}
            <div>
              <label htmlFor="dore-purity" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                Estimated Purity (%)
              </label>
              <input
                id="dore-purity"
                type="text"
                value={estimatedPurity}
                onChange={(e) => setEstimatedPurity(e.target.value)}
                placeholder="87.3"
                disabled={isDispatching}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors tabular-nums disabled:opacity-50"
              />
              {formErrors.estimatedPurity && (
                <p className="font-mono text-[9px] text-red-400 mt-1">{formErrors.estimatedPurity}</p>
              )}
            </div>

            {/* Extraction Date */}
            <div>
              <label htmlFor="dore-date" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                Extraction Date
              </label>
              <input
                id="dore-date"
                type="date"
                value={extractionDate}
                onChange={(e) => setExtractionDate(e.target.value)}
                disabled={isDispatching}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 font-mono text-xs text-white focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors disabled:opacity-50 scheme-dark"
              />
              {formErrors.extractionDate && (
                <p className="font-mono text-[9px] text-red-400 mt-1">{formErrors.extractionDate}</p>
              )}
            </div>
          </div>

          {/* ── ESG / OECD Attestation ── */}
          <div className="border-t border-slate-800 pt-3">
            <SectionHeader icon={<ShieldCheck className="h-3 w-3" />} title="ESG / OECD Attestation" />
            <label
              htmlFor="esg-toggle"
              className="flex items-start gap-3 mt-2 cursor-pointer group"
            >
              <div className="relative shrink-0 mt-0.5">
                <input
                  id="esg-toggle"
                  type="checkbox"
                  checked={esgAttested}
                  onChange={(e) => setEsgAttested(e.target.checked)}
                  disabled={isDispatching}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-700 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="font-mono text-[10px] text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                I attest that this mineral extraction complies with the{" "}
                <span className="text-gold-primary font-bold">OECD Due Diligence Guidance</span>{" "}
                for Responsible Supply Chains of Minerals from Conflict-Affected and High-Risk Areas.
              </span>
            </label>
            {formErrors.esg && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                <p className="font-mono text-[9px] text-red-400">{formErrors.esg}</p>
              </div>
            )}
          </div>

          {/* ── Logistics Dispatch ── */}
          <div className="border-t border-slate-800 pt-3 mt-auto flex flex-col gap-2">
            <SectionHeader icon={<Truck className="h-3 w-3" />} title="Logistics Dispatch" />

            {dispatchSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px] text-emerald-400 tracking-wider uppercase font-bold">
                  Yield locked — Armored transport dispatched
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDispatch}
              disabled={isDispatching}
              className={`w-full font-bold text-xs tracking-wide py-3 flex items-center justify-center gap-2 transition-colors font-mono rounded-sm ${
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
            <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase text-center">
              BRINK&apos;S / MALCA-AMIT ARMORED LOGISTICS
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS — Inlined to prevent broken imports
   ════════════════════════════════════════════════════════════════ */

/* ── Metric Cell ── */
function MetricCell({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "amber" | "emerald" | "gold" | "cyan";
}) {
  const border =
    accent === "amber"
      ? "border-t-amber-500/40"
      : accent === "emerald"
        ? "border-t-emerald-500/40"
        : accent === "cyan"
          ? "border-t-cyan-500/40"
          : "border-t-gold-primary/40";

  return (
    <div className={`bg-slate-900 px-4 py-3 border-t-2 ${border}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase">{label}</span>
      </div>
      <p className="font-mono text-base text-white font-bold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500">{icon}</span>
      <span className="font-mono text-[10px] text-slate-400 tracking-[0.15em] uppercase font-bold">{title}</span>
    </div>
  );
}

/* ── Table Header Cell ── */
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`text-${align} font-mono text-[9px] text-slate-600 tracking-wider uppercase px-3 py-2 font-normal`}>
      {children}
    </th>
  );
}

/* ── Table Data Cell ── */
function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <td className={`text-${align} font-mono text-xs text-slate-400 px-3 py-2`}>
      {children}
    </td>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const config =
    status === "ASSAYED"
      ? { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", dot: "bg-emerald-400" }
      : status === "PENDING_ASSAY"
        ? { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", dot: "bg-amber-400 animate-pulse" }
        : { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", dot: "bg-cyan-400 animate-pulse" };

  const label = status === "PENDING_ASSAY" ? "PENDING" : status === "IN_TRANSIT" ? "IN TRANSIT" : status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 font-mono text-[9px] tracking-wider uppercase font-bold border ${config.text} ${config.bg} ${config.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}
