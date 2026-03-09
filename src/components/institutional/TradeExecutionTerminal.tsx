"use client";

import { cn } from "@/lib/utils";
import {
  Lock,
  TrendingUp,
  Zap,
  BarChart3,
  ArrowRight,
  Info,
  X,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore, computeFees } from "./wizard-store";

/* ================================================================
   TradeExecutionTerminal — Step 2 (V2)
   ================================================================
   - Dynamic tiered fees (inverse scaling)
   - Fee compression info tooltip
   - Frosted-glass price lock confirmation modal
   - Post-confirmation cryptographic lock animation
   - Zero scroll — fits in viewport
   ================================================================ */

const TROY_OZ_PER_BAR = 400;
const BASE_SPOT = 5171.92;

export function TradeExecutionTerminal() {
  const {
    barCount, setBarCount,
    priceLocked, setPriceLocked,
    spotPrice,
    logisticsCost,
    goNext,
  } = useWizardStore();

  const [liveSpot, setLiveSpot] = useState(spotPrice);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (priceLocked) return;
    const t = setInterval(() => {
      setLiveSpot((prev) => {
        const next = prev + (Math.random() - 0.48) * 2.8;
        setDirection(next >= prev ? "up" : "down");
        return Math.max(next, BASE_SPOT - 15);
      });
    }, 2500);
    return () => clearInterval(t);
  }, [priceLocked]);

  const fees = computeFees(barCount, liveSpot, logisticsCost);
  const totalOz = barCount * TROY_OZ_PER_BAR;

  const handleLockClick = useCallback(() => setShowModal(true), []);

  const handleConfirmLock = useCallback(() => {
    setShowModal(false);
    setPriceLocked(true);
    setLockCountdown(120);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, [setPriceLocked]);

  useEffect(() => {
    if (!priceLocked || lockCountdown <= 0) return;
    const t = setInterval(() => {
      setLockCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [priceLocked, lockCountdown]);

  const fmtUSD = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

  return (
    <div className="flex h-full flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="mb-3 shrink-0">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">Step 2 of 6</p>
        <h2 className="font-heading text-xl font-bold tracking-tight text-white mt-0.5">
          Trade Execution & Asset Allocation
        </h2>
      </div>

      {/* Main grid — 2x2 */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* ── Live Price ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-gold" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">XAU/USD Spot</span>
            </div>
            <span className={cn("h-1.5 w-1.5 rounded-full", priceLocked ? "bg-emerald-400" : "bg-gold animate-pulse")} />
          </div>
          <span className={cn(
            "font-mono text-3xl font-bold tabular-nums text-white transition-colors",
            !priceLocked && direction === "up" && "text-emerald-300",
            !priceLocked && direction === "down" && "text-red-300"
          )}>
            {fmtUSD(liveSpot)}
          </span>
          <span className="font-mono text-[9px] text-slate-600 mt-0.5">/ troy oz</span>

          {priceLocked && lockCountdown > 0 && (
            <div className="mt-2 flex items-center gap-1.5 rounded bg-emerald-950/30 border border-emerald-800/30 px-2.5 py-1.5">
              <Lock className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-300">
                Locked — {Math.floor(lockCountdown / 60)}:{(lockCountdown % 60).toString().padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        {/* ── Bar Selector ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-2">
            LBMA Good Delivery 400-oz Bars
          </p>
          <div className="flex items-center gap-3 mb-3">
            <button type="button" onClick={() => setBarCount(barCount - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-bold text-white hover:border-gold/50">−</button>
            <input type="number" value={barCount}
              onChange={(e) => setBarCount(parseInt(e.target.value) || 1)}
              className="h-10 w-20 rounded-lg border border-gold/30 bg-slate-950 text-center font-mono text-xl font-bold tabular-nums text-white focus:border-gold focus:outline-none" />
            <button type="button" onClick={() => setBarCount(barCount + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-bold text-white hover:border-gold/50">+</button>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-500">Troy Ounces</span><span className="font-mono tabular-nums text-white">{totalOz.toLocaleString()} oz</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Tonnage</span><span className="font-mono tabular-nums text-white">{((totalOz * 31.1035) / 1e6).toFixed(3)} MT</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Specification</span><span className="font-mono text-[10px] text-slate-400">995+ Fine · 350–430 oz</span></div>
          </div>
        </div>

        {/* ── Fee Breakdown ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-gold" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Fee Structure</p>
            <button type="button" className="ml-auto relative"
              onMouseEnter={() => setShowFeeTooltip(true)}
              onMouseLeave={() => setShowFeeTooltip(false)}>
              <Info className="h-3 w-3 text-gold/40 hover:text-gold" />
              {showFeeTooltip && (
                <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[10px] text-slate-300 shadow-xl z-50">
                  As your volume scales, execution friction compresses. You are accessing
                  direct wholesale OTC pricing — bypassing retail spreads entirely.
                </div>
              )}
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] flex-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Value</span>
              <span className="font-mono tabular-nums text-white">{fmtUSD(fees.grossValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Platform Fee ({fees.platformFeeBps} bps)</span>
              <span className="font-mono tabular-nums text-gold">+{fmtUSD(fees.platformFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Physical Premium ({fees.physicalPremiumBps} bps)</span>
              <span className="font-mono tabular-nums text-slate-300">+{fmtUSD(fees.physicalPremium)}</span>
            </div>
            <hr className="border-slate-800" />
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-white">Total Capital</span>
              <span className="font-mono text-base font-bold tabular-nums text-gold">{fmtUSD(fees.subtotal)}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5 rounded border border-gold/15 bg-gold/5 px-2.5 py-1.5">
            <Zap className="h-3 w-3 text-gold" />
            <span className="text-[9px] text-gold">
              All-in: <span className="font-mono font-bold">{((fees.platformFeeBps + fees.physicalPremiumBps) / 100).toFixed(2)}%</span> — vs 1.5–3% retail
            </span>
          </div>
        </div>

        {/* ── Action Panel ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-end">
          {!priceLocked ? (
            <button type="button" onClick={handleLockClick}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gold py-3.5 text-sm font-bold uppercase tracking-wider text-black hover:shadow-[0_0_30px_rgba(198,168,107,0.25)] transition-all">
              <Lock className="h-4 w-4" />
              Lock Institutional Price
            </button>
          ) : (
            <button type="button" onClick={goNext}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl border-2 border-emerald-500/50 bg-emerald-950/30 py-3.5 text-sm font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-950/50 transition-all">
              <ArrowRight className="h-4 w-4" />
              Proceed to Logistics
            </button>
          )}
        </div>
      </div>

      {/* ══════ Frosted-Glass Price Lock Modal ══════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-[440px] rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-lg p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Lock className="h-5 w-5 text-gold" />
                  <h3 className="font-heading text-lg font-bold text-white">Confirm Execution</h3>
                </div>
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Asset</span>
                  <span className="font-mono text-white">{barCount} × 400oz LBMA Bars</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Locked Price</span>
                  <span className="font-mono text-white">{fmtUSD(liveSpot)} / oz</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Capital</span>
                  <span className="font-mono font-bold text-gold">{fmtUSD(fees.subtotal)}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mb-4">
                By clicking confirm, you are locking the institutional spot price
                for 120 seconds. This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-800">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmLock}
                  className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold uppercase tracking-wider text-black transition hover:shadow-[0_0_25px_rgba(198,168,107,0.3)]">
                  Confirm & Lock
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════ "Execution Secured" Toast ══════ */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-[310px] z-50 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/90 backdrop-blur-md px-5 py-3 shadow-xl"
          >
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-emerald-300">Execution Secured</p>
              <p className="font-mono text-[9px] text-emerald-500/60">Price locked at {fmtUSD(liveSpot)} for 120s</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
