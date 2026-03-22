"use client";

/* ================================================================
   BROKER LBMA ASSETS — Vaulted Inventory + Verification Intake
   ================================================================
   Two-pane layout for managing physical LBMA-certified metal.

   Layout:
     ┌──────────────────────────┬───────────────────────┐
     │  VAULTED INVENTORY (2/3) │  VERIFICATION (1/3)   │
     │  internal-scroll table   │  certificate upload   │
     └──────────────────────────┴───────────────────────┘
   ================================================================ */

import { useState } from "react";
import {
  Shield,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
} from "lucide-react";

/* ── Mock vaulted inventory data ── */
const MOCK_INVENTORY = [
  { serial: "PAMP-2024-004782", refiner: "PAMP SA",           vault: "Zurich Custody Vault",       weightOz: 400, purity: 0.9999, verified: "VERIFIED"   },
  { serial: "AH-2024-011294",   refiner: "Argor-Heraeus",     vault: "Zurich Custody Vault",       weightOz: 400, purity: 0.9999, verified: "VERIFIED"   },
  { serial: "VAL-2025-000318",  refiner: "Valcambi SA",       vault: "London Precious Metals",     weightOz: 400, purity: 0.9995, verified: "VERIFIED"   },
  { serial: "MKS-2025-007841",  refiner: "MKS PAMP Group",    vault: "Singapore FreePort",         weightOz: 400, purity: 0.9999, verified: "PENDING"    },
  { serial: "PAMP-2025-006119", refiner: "PAMP SA",           vault: "Zurich Custody Vault",       weightOz: 400, purity: 0.9999, verified: "VERIFIED"   },
  { serial: "JM-2024-088421",   refiner: "Johnson Matthey",   vault: "London Precious Metals",     weightOz: 400, purity: 0.9995, verified: "VERIFIED"   },
  { serial: "AH-2025-012007",   refiner: "Argor-Heraeus",     vault: "Dubai Multi Commodities",    weightOz: 400, purity: 0.9999, verified: "PENDING"    },
  { serial: "HER-2024-002199",  refiner: "Heraeus",           vault: "Zurich Custody Vault",       weightOz: 400, purity: 0.9999, verified: "VERIFIED"   },
  { serial: "RR-2025-000044",   refiner: "Rand Refinery",     vault: "Johannesburg Brink's Vault", weightOz: 400, purity: 0.9960, verified: "REJECTED"   },
  { serial: "MET-2025-003811",  refiner: "Metalor Technologies", vault: "Singapore FreePort",      weightOz: 400, purity: 0.9999, verified: "VERIFIED"   },
  { serial: "TK-2025-001290",   refiner: "Tanaka Kikinzoku",  vault: "Tokyo Vault (TOCOM)",        weightOz: 400, purity: 0.9999, verified: "PENDING"    },
  { serial: "VAL-2025-000992",  refiner: "Valcambi SA",       vault: "London Precious Metals",     weightOz: 400, purity: 0.9995, verified: "VERIFIED"   },
] as const;

/* ── Verification status styling ── */
const STATUS_STYLES: Record<string, { text: string; dot: string; icon: React.ComponentType<{ className?: string }> }> = {
  VERIFIED: { text: "text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle2 },
  PENDING:  { text: "text-yellow-400",   dot: "bg-yellow-400",   icon: Clock },
  REJECTED: { text: "text-red-400",     dot: "bg-red-400",     icon: AlertTriangle },
};

const DEFAULT_STATUS = { text: "text-slate-500", dot: "bg-slate-500", icon: Clock };

/* ── Formatters ── */
const fmtOz = (v: number) => new Intl.NumberFormat("en-US").format(v);
const fmtPurity = (v: number) => `${(v * 100).toFixed(2)}%`;

/* ================================================================
   COMPONENT
   ================================================================ */

export default function BrokerAssetsPage() {
  /* ── Certificate intake form state ── */
  const [certSerial, setCertSerial] = useState("");
  const [certRefiner, setCertRefiner] = useState("");
  const [certFile, setCertFile] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const canSubmit = certSerial.trim().length > 0 && certRefiner.trim().length > 0;

  const handleCertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitStatus("idle");
    // TODO: Wire to real API endpoint
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    setSubmitStatus("success");
    setCertSerial("");
    setCertRefiner("");
    setCertFile("");
    setTimeout(() => setSubmitStatus("idle"), 3000);
  };

  /* ── KPI calculations ── */
  const totalBars = MOCK_INVENTORY.length;
  const verifiedCount = MOCK_INVENTORY.filter((i) => i.verified === "VERIFIED").length;
  const pendingCount = MOCK_INVENTORY.filter((i) => i.verified === "PENDING").length;
  const totalWeightOz = MOCK_INVENTORY.reduce((s, i) => s + i.weightOz, 0);

  return (
    <div className="absolute inset-0 flex flex-col p-4 gap-4 overflow-hidden bg-slate-950 text-slate-300">
      {/* ── KPI Strip ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">Total Bars</p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-slate-100 leading-none">{totalBars}</p>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">{fmtOz(totalWeightOz)} oz total</p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">Verified</p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-emerald-400 leading-none">{verifiedCount}</p>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">LBMA Good Delivery</p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">Pending Review</p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-yellow-400 leading-none">{pendingCount}</p>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">awaiting assay</p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">Avg Purity</p>
          <p className="mt-1.5 text-xl font-semibold font-mono text-slate-100 leading-none tabular-nums">
            {fmtPurity(MOCK_INVENTORY.reduce((s, i) => s + i.purity, 0) / totalBars)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500 font-mono">across {totalBars} bars</p>
        </div>
      </div>

      {/* ── MAIN SPLIT ── */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ── LEFT: Vaulted Inventory ── */}
        <div className="w-2/3 flex flex-col rounded border border-slate-800 bg-slate-900/40">
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
            <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest">
              Vaulted Inventory
            </h2>
            <span className="text-[10px] font-mono text-slate-600">
              {totalBars} bars · {fmtOz(totalWeightOz)} oz
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-sm font-mono">
              <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm">
                <tr className="text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
                  <th className="text-left px-4 py-2.5 font-medium">Serial</th>
                  <th className="text-left px-4 py-2.5 font-medium">Refiner</th>
                  <th className="text-left px-4 py-2.5 font-medium">Vault Location</th>
                  <th className="text-right px-4 py-2.5 font-medium">Weight</th>
                  <th className="text-right px-4 py-2.5 font-medium">Purity</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_INVENTORY.map((bar) => {
                  const style = STATUS_STYLES[bar.verified] ?? DEFAULT_STATUS;
                  const StatusIcon = style.icon;
                  return (
                    <tr
                      key={bar.serial}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-semibold">{bar.serial}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-300">{bar.refiner}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{bar.vault}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-200 tabular-nums">{fmtOz(bar.weightOz)} oz</td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400 tabular-nums">{fmtPurity(bar.purity)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider ${style.text}`}>
                          <StatusIcon className="h-3 w-3" />
                          {bar.verified}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT: Verification Intake ── */}
        <div className="w-1/3 flex flex-col rounded border border-slate-800 bg-slate-900/40">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-800 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest">
              LBMA Certificate Intake
            </h2>
          </div>

          <form onSubmit={handleCertSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
            {/* Serial Number */}
            <div>
              <label htmlFor="cert-serial" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                Bar Serial Number
              </label>
              <input
                id="cert-serial"
                type="text"
                value={certSerial}
                onChange={(e) => setCertSerial(e.target.value.toUpperCase())}
                placeholder="PAMP-2025-XXXXXX"
                disabled={isSubmitting}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            {/* Refiner */}
            <div>
              <label htmlFor="cert-refiner" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                Accredited Refiner
              </label>
              <select
                id="cert-refiner"
                value={certRefiner}
                onChange={(e) => setCertRefiner(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-950 border border-slate-700 rounded-sm px-3 py-2 font-mono text-sm text-white focus:border-slate-500 focus:ring-1 focus:ring-slate-500/30 focus:outline-none transition-colors disabled:opacity-50"
              >
                <option value="">Select Refiner…</option>
                <option value="PAMP SA">PAMP SA</option>
                <option value="Argor-Heraeus">Argor-Heraeus</option>
                <option value="Valcambi SA">Valcambi SA</option>
                <option value="MKS PAMP Group">MKS PAMP Group</option>
                <option value="Johnson Matthey">Johnson Matthey</option>
                <option value="Heraeus">Heraeus</option>
                <option value="Metalor Technologies">Metalor Technologies</option>
                <option value="Tanaka Kikinzoku">Tanaka Kikinzoku</option>
                <option value="Rand Refinery">Rand Refinery</option>
              </select>
            </div>

            {/* Certificate Upload */}
            <div>
              <label htmlFor="cert-file" className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-1">
                Good Delivery Certificate (PDF)
              </label>
              <div
                className="w-full bg-slate-950 border border-dashed border-slate-700 rounded-sm px-3 py-4 text-center cursor-pointer hover:border-slate-500/40 transition-colors"
                onClick={() => document.getElementById("cert-file")?.click()}
              >
                <Upload className="h-5 w-5 text-slate-600 mx-auto mb-1" />
                <p className="font-mono text-[11px] text-slate-500">
                  {certFile || "Click to upload certificate"}
                </p>
                <input
                  id="cert-file"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setCertFile(e.target.files?.[0]?.name ?? "")}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* System Readout */}
            <div className="bg-black border border-slate-800 p-2.5 mt-auto">
              <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mb-1.5">System Readout</p>
              <p className="font-mono text-xs text-slate-600">
                <span className="text-slate-700 select-none">{"> "}</span>
                LBMA_VERIFICATION_ENGINE: STANDBY
              </p>
              <p className="font-mono text-xs text-slate-600">
                <span className="text-slate-700 select-none">{"> "}</span>
                ASSAY_CERTIFICATE_PARSER: READY
              </p>
              <p className="font-mono text-xs text-slate-700 flex items-center gap-1">
                <span className="text-slate-700 select-none">{"> "}</span>
                AWAITING_UPLOAD
                <span className="inline-block w-1.5 h-3 bg-slate-400 ml-1 animate-pulse" />
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className={`w-full font-bold text-sm tracking-wide py-3 flex items-center justify-center gap-2 transition-colors font-mono rounded ${
                isSubmitting || !canSubmit
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-white text-slate-950 hover:bg-slate-100 cursor-pointer"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Verifying Certificate…
                </>
              ) : submitStatus === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Certificate Submitted
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Submit for Verification
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
