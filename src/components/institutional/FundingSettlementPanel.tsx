"use client";

import { cn } from "@/lib/utils";
import {
  Landmark,
  Zap,
  Clock,
  Shield,
  CheckCircle2,
  ArrowRight,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore, computeFees } from "./wizard-store";

/* ================================================================
   FundingSettlementPanel — Step 5 (V2)
   ================================================================
   Wire vs Goldwire. Column Bank settlement updated to T+0.
   Goldwire "pop" animation retained. Zero scroll.
   ================================================================ */

export function FundingSettlementPanel() {
  const {
    paymentMethod, setPaymentMethod,
    barCount, spotPrice, logisticsCost,
    goNext,
  } = useWizardStore();

  const fees = computeFees(barCount, spotPrice, logisticsCost);
  const [goldwireSettled, setGoldwireSettled] = useState(false);

  const handleGoldwire = () => {
    setPaymentMethod("goldwire");
    setTimeout(() => setGoldwireSettled(true), 600);
  };

  const handleWire = () => {
    setPaymentMethod("wire");
    setGoldwireSettled(false);
  };

  const fmtUSD = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

  return (
    <div className="flex h-full flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-3 shrink-0">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">Step 5 of 6</p>
        <h2 className="font-heading text-xl font-bold tracking-tight text-white mt-0.5">
          Funding & Settlement
        </h2>
      </div>

      {/* Total banner */}
      <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">Settlement Amount</p>
          <p className="font-mono text-xl font-bold tabular-nums text-white">{fmtUSD(fees.totalWithLogistics)}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-gold/20 bg-gold/5 px-2.5 py-0.5">
          <Shield className="h-2.5 w-2.5 text-gold" />
          <span className="font-mono text-[8px] text-gold">ESCROW PROTECTED</span>
        </div>
      </div>

      {/* ── Side-by-side ── */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Traditional Wire — T+0 */}
        <button type="button" onClick={handleWire}
          className={cn(
            "rounded-xl border p-4 text-left transition-all flex flex-col overflow-hidden relative",
            paymentMethod === "wire"
              ? "border-slate-600 bg-slate-900/80"
              : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
          )}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl",
              paymentMethod === "wire" ? "bg-slate-700" : "bg-slate-800")}>
              <Landmark className={cn("h-5 w-5", paymentMethod === "wire" ? "text-slate-300" : "text-slate-500")} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Column Bank N.A.</p>
              <p className="font-mono text-[9px] text-slate-500">Institutional Wire</p>
            </div>
            {paymentMethod === "wire" && <CheckCircle2 className="ml-auto h-4 w-4 text-slate-400" />}
          </div>

          <div className="space-y-2 text-[11px] flex-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Settlement</span>
              <span className="font-mono text-xs text-white">Fedwire / SWIFT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Settlement Time</span>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-emerald-400" />
                <span className="font-mono text-xs font-bold text-emerald-300">T+0 Instant</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Wire Fee</span>
              <span className="font-mono text-xs text-slate-300">$25.00</span>
            </div>
          </div>

          {paymentMethod === "wire" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-lg border border-slate-700 bg-slate-950/80 p-3 mt-2 text-[10px]"
            >
              <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Wire Instructions</p>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Bank</span><span className="font-mono text-slate-300">Column N.A.</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Routing</span><span className="font-mono text-slate-300">091311229</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Account</span><span className="font-mono text-slate-300">••••••7842</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono text-gold text-[9px]">GW-2026-0309-INS</span></div>
              </div>
            </motion.div>
          )}

          {/* T+0 callout */}
          <div className="mt-auto pt-2 flex items-center gap-1.5 rounded border border-emerald-800/25 bg-emerald-950/15 px-2.5 py-1.5">
            <Zap className="h-3 w-3 text-emerald-400" />
            <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-emerald-300">
              T+0 — Bypasses Loco London delays
            </span>
          </div>
        </button>

        {/* Goldwire Instant */}
        <button type="button" onClick={handleGoldwire}
          className={cn(
            "rounded-xl border p-4 text-left transition-all flex flex-col overflow-hidden relative",
            paymentMethod === "goldwire"
              ? "border-gold/60 bg-gold/5 shadow-[0_0_30px_rgba(198,168,107,0.1)]"
              : "border-slate-800 bg-slate-900/50 hover:border-gold/30"
          )}>
          <AnimatePresence>
            {paymentMethod === "goldwire" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-linear-to-br from-gold/5 via-transparent to-gold/3 pointer-events-none" />
            )}
          </AnimatePresence>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                paymentMethod === "goldwire" ? "bg-gold/15 shadow-[0_0_15px_rgba(198,168,107,0.15)]" : "bg-slate-800")}>
                <Zap className={cn("h-5 w-5", paymentMethod === "goldwire" ? "text-gold" : "text-slate-500")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Goldwire Network</p>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] text-gold">Instant Settlement</span>
                  <span className="rounded bg-gold/20 px-1 py-0.5 font-mono text-[7px] font-bold text-gold">T+0</span>
                </div>
              </div>
              {paymentMethod === "goldwire" && <CheckCircle2 className="ml-auto h-4 w-4 text-gold" />}
            </div>

            <div className="space-y-2 text-[11px] flex-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Settlement</span>
                <span className="font-mono text-xs text-gold">Atomic · Instant</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Settlement Time</span>
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-emerald-300">Instant (T+0)</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Network Fee</span>
                <span className="font-mono text-xs text-gold">$0.00</span>
              </div>
            </div>

            {/* SETTLED stamp pop */}
            <AnimatePresence>
              {goldwireSettled && paymentMethod === "goldwire" && (
                <motion.div
                  initial={{ scale: 3, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="my-2 flex flex-col items-center rounded-xl border-2 border-emerald-500/50 bg-emerald-950/30 py-4"
                >
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 mb-2">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </motion.div>
                  <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Settled</p>
                  <p className="font-mono text-[8px] text-emerald-500/50 mt-0.5">T+0 · Atomic Execution</p>
                </motion.div>
              )}
            </AnimatePresence>

            {!goldwireSettled && (
              <div className="mt-auto pt-2 flex items-center gap-1.5 rounded border border-gold/15 bg-gold/5 px-2.5 py-1.5">
                <Globe className="h-3 w-3 text-gold" />
                <span className="text-[8px] text-gold">WebAuthn dual-auth for amounts over $10M</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* CTA */}
      <div className="shrink-0 mt-3">
        <button type="button" onClick={goNext} disabled={!paymentMethod}
          className={cn(
            "w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-bold uppercase tracking-wider transition-all",
            paymentMethod
              ? "bg-gold text-black hover:shadow-[0_0_25px_rgba(198,168,107,0.25)]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          )}>
          <ArrowRight className="h-4 w-4" />
          Proceed to Chain of Custody
        </button>
      </div>
    </div>
  );
}
