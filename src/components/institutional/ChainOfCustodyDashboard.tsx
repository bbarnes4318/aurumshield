"use client";

import {
  Shield,
  CheckCircle2,
  FileText,
  Award,
  Lock,
  Scan,
  Building2,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useWizardStore, computeFees } from "./wizard-store";
import { useCallback } from "react";
import jsPDF from "jspdf";

/* ================================================================
   ChainOfCustodyDashboard — Step 6 (V2)
   ================================================================
   Compact optimized grid — fits in single viewport. Zero scroll.
   "Download Cryptographic Title" → real jsPDF generation.
   "Initialize Secure Transit" → advances to tracking handoff.
   ================================================================ */

const CUSTODY_EVENTS = [
  { time: "15:32 UTC", title: "Trade Executed — Price Locked", icon: Lock },
  { time: "15:33 UTC", title: "KYC/AML Compliance — Passed", icon: Shield },
  { time: "15:34 UTC", title: "Settlement Confirmed — T+0", icon: CheckCircle2 },
  { time: "15:35 UTC", title: "Title Transfer — Ownership Assigned", icon: FileText },
  { time: "15:40 UTC", title: "Ultrasonic Assay — Passed", icon: Scan },
  { time: "15:50 UTC", title: "Vault Deposit — Allocated Cage", icon: Building2 },
  { time: "16:00 UTC", title: "Clearing Certificate Issued", icon: Award },
];

function generateMockSerials(count: number) {
  const refiners = ["Metalor", "PAMP SA", "Argor-Heraeus", "Valcambi", "Johnson Matthey", "Rand Refinery"];
  return Array.from({ length: Math.min(count, 8) }, (_, i) => ({
    serial: `GD${String(2024001 + i).padStart(7, "0")}`,
    refiner: refiners[i % refiners.length],
    weight: `${(398 + Math.random() * 5).toFixed(1)} oz`,
    purity: `${(999.0 + Math.random() * 0.9).toFixed(1)}`,
  }));
}

export function ChainOfCustodyDashboard() {
  const { barCount, spotPrice, logisticsCost, goNext } = useWizardStore();
  const fees = computeFees(barCount, spotPrice, logisticsCost);
  const serials = generateMockSerials(barCount);

  const fmtUSD = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

  const handleDownloadPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Header
    doc.setFillColor(10, 17, 40);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(198, 168, 107);
    doc.setFontSize(20);
    doc.text("AURUMSHIELD", 20, 18);
    doc.setFontSize(10);
    doc.text("Cryptographic Title — Digital Warrant of Title", 20, 28);
    doc.setTextColor(150, 150, 170);
    doc.setFontSize(8);
    doc.text(`Settlement ID: GW-2026-0309-INS-48A  |  Date: ${new Date().toISOString().split("T")[0]}`, 20, 35);

    // Body
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.text("Certificate of Ownership", 20, 55);

    doc.setFontSize(9);
    const lines = [
      `Asset: ${barCount} × LBMA Good Delivery 400-oz Gold Bars`,
      `Total Troy Ounces: ${(barCount * 400).toLocaleString()} oz`,
      `Gross Value: ${fmtUSD(fees.grossValue)}`,
      `Total Acquisition Capital: ${fmtUSD(fees.totalWithLogistics)}`,
      `Storage: Fully Allocated — Segregated Title`,
      `Custody: Bailment Jurisprudence — Bankruptcy Remote`,
      `Insurance: Lloyd's of London Specie Coverage — $100,000,000`,
      "",
      "Certificate Hash (SHA-256):",
      "7f8a3b1c9e2d4f6a8b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e3b1",
      "",
      "This certificate is digitally signed by the AurumShield HSM",
      "and constitutes an immutable proof of settlement.",
    ];

    let y = 65;
    lines.forEach((line) => {
      doc.text(line, 20, y);
      y += 5.5;
    });

    // Bar register
    y += 5;
    doc.setFontSize(10);
    doc.text("Bar Register", 20, y);
    y += 6;
    doc.setFontSize(7);
    doc.text("Serial | Refiner | Weight | Purity", 20, y);
    y += 4;

    serials.forEach((bar) => {
      doc.text(`${bar.serial} | ${bar.refiner} | ${bar.weight} | ${bar.purity}`, 20, y);
      y += 3.5;
    });

    // Footer
    doc.setFillColor(10, 17, 40);
    doc.rect(0, 275, 210, 22, "F");
    doc.setTextColor(198, 168, 107);
    doc.setFontSize(7);
    doc.text("AurumShield — Sovereign Financial Infrastructure ™", 20, 285);
    doc.text("SOC 2 Type II | ISO 27001 | PCI DSS | LBMA Accredited", 20, 290);

    doc.save("AurumShield-Cryptographic-Title.pdf");
  }, [barCount, fees, fmtUSD, serials]);

  return (
    <div className="flex h-full flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-2 shrink-0 flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">Step 6 of 6</p>
          <h2 className="font-heading text-lg font-bold tracking-tight text-white mt-0.5">
            Chain of Custody & Audit
          </h2>
        </div>
        {/* Confirmation badge */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/15 px-3 py-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-[10px] font-bold text-emerald-300">Settlement Confirmed</p>
            <p className="font-mono text-[8px] text-emerald-500/50">GW-2026-0309-INS-48A</p>
          </div>
        </div>
      </div>

      {/* Main compact grid */}
      <div className="grid grid-cols-5 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* ── Timeline (3 col) ── */}
        <div className="col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex flex-col overflow-hidden">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
            Unbroken Chain of Custody
          </p>
          <div className="relative pl-5 space-y-1.5 flex-1 overflow-hidden">
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-linear-to-b from-emerald-500/30 via-gold/20 to-slate-800" />
            {CUSTODY_EVENTS.map((e, idx) => {
              const Icon = e.icon;
              return (
                <motion.div key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 * idx + 0.2 }}
                  className="relative flex gap-2 items-start"
                >
                  <div className="absolute -left-5 mt-0.5 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <Icon className="h-2 w-2 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] font-semibold text-white truncate">{e.title}</p>
                      <span className="font-mono text-[7px] text-slate-600 shrink-0">{e.time}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Right column (2 col) ── */}
        <div className="col-span-2 flex flex-col gap-2 overflow-hidden">
          {/* Assay */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Scan className="h-3 w-3 text-gold" />
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Ultrasonic Assay</p>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
              <span className="text-slate-500">Tested</span><span className="font-mono text-white text-right">{barCount}/{barCount}</span>
              <span className="text-slate-500">Pass Rate</span><span className="font-mono text-emerald-400 text-right">100%</span>
              <span className="text-slate-500">Avg Purity</span><span className="font-mono text-white text-right">999.4</span>
            </div>
          </div>

          {/* Certificate */}
          <div className="rounded-xl border border-gold/20 bg-gold/5 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Award className="h-3 w-3 text-gold" />
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-gold/60">Clearing Certificate</p>
            </div>
            <div className="space-y-1 text-[9px] mb-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Hash</span>
                <span className="font-mono text-gold text-[7px]">sha256:7f8a...e3b1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Signed</span>
                <span className="font-mono text-slate-400 text-[8px]">AurumShield HSM</span>
              </div>
            </div>
            <button type="button" onClick={handleDownloadPDF}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 py-2 text-[10px] font-semibold text-gold hover:bg-gold/20 transition">
              <FileText className="h-3.5 w-3.5" />
              Download Cryptographic Title
            </button>
          </div>

          {/* Bar Register */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex-1 overflow-hidden">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
              Bar Register ({serials.length}/{barCount})
            </p>
            <div className="space-y-0.5 overflow-hidden">
              {serials.map((bar) => (
                <div key={bar.serial} className="flex items-center text-[8px]">
                  <span className="font-mono font-semibold text-gold w-20 shrink-0">{bar.serial}</span>
                  <span className="text-slate-400 flex-1 truncate">{bar.refiner}</span>
                  <span className="font-mono text-slate-300 w-12 text-right shrink-0">{bar.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Initialize Secure Transit CTA ── */}
      <div className="shrink-0 mt-3">
        <button type="button" onClick={goNext}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gold py-3 text-sm font-bold uppercase tracking-wider text-black hover:shadow-[0_0_25px_rgba(198,168,107,0.25)] transition-all">
          <ArrowRight className="h-4 w-4" />
          Initialize Secure Transit
        </button>
      </div>
    </div>
  );
}
