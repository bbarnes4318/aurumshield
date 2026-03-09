"use client";

import { cn } from "@/lib/utils";
import {
  Lock,
  TrendingUp,
  AlertTriangle,
  Zap,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

/* ================================================================
   TradeExecutionTerminal — Step 1
   ================================================================
   "Price Lock" terminal. Real-time spot price, 400-oz bar quantity
   selector, fee breakdown, and Lock Price CTA.
   
   Hardcoded "Wow" Data:
   - Spot $5,171.92 with simulated fluctuations
   - Default $100M order (~48 bars)
   - Fee compression at 0.05% (5 bps)
   ================================================================ */

const TROY_OZ_PER_BAR = 400;
const BASE_SPOT = 5171.92;
const INSTITUTIONAL_PREMIUM_BPS = 5; // 0.05%
const PLATFORM_FEE_BPS = 3; // 0.03%

interface TradeExecutionTerminalProps {
  barCount: number;
  onBarCountChange: (count: number) => void;
  onPriceLocked: () => void;
}

function useSpotPrice() {
  const [spot, setSpot] = useState(BASE_SPOT);
  const [prevSpot, setPrevSpot] = useState(BASE_SPOT);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpot((prev) => {
        setPrevSpot(prev);
        const fluctuation = (Math.random() - 0.48) * 2.8;
        return Math.max(prev + fluctuation, BASE_SPOT - 15);
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return { spot, prevSpot, direction: spot >= prevSpot ? "up" : "down" };
}

export function TradeExecutionTerminal({
  barCount,
  onBarCountChange,
  onPriceLocked,
}: TradeExecutionTerminalProps) {
  const { spot, direction } = useSpotPrice();
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  const totalOz = barCount * TROY_OZ_PER_BAR;
  const grossValue = totalOz * spot;
  const institutionalPremium = grossValue * (INSTITUTIONAL_PREMIUM_BPS / 10000);
  const platformFee = grossValue * (PLATFORM_FEE_BPS / 10000);
  const totalAcquisition = grossValue + institutionalPremium + platformFee;
  const totalTonnage = (totalOz * 31.1035) / 1_000_000; // troy oz to metric tonnes

  const handleLockPrice = useCallback(() => {
    setIsLocked(true);
    setLockCountdown(120);
  }, []);

  useEffect(() => {
    if (!isLocked || lockCountdown <= 0) return;
    const t = setInterval(() => {
      setLockCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isLocked, lockCountdown]);

  const fmtUSD = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const fmtBPS = (bps: number) => `${bps} bps (${(bps / 100).toFixed(2)}%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 p-6"
    >
      {/* ── Step Header ── */}
      <div>
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">
          — Step 1 of 5
        </p>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-white mt-1">
          Trade Execution & Asset Allocation
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Lock the institutional spot price and configure your LBMA Good
          Delivery bar allocation.
        </p>
      </div>

      {/* ── Live Price Terminal ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gold" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Gold Spot Price (XAU/USD)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isLocked ? "bg-emerald-400" : "bg-gold animate-pulse"
              )}
            />
            <span className="font-mono text-[10px] text-slate-500">
              {isLocked ? "PRICE LOCKED" : "LIVE FEED"}
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-4">
          <span
            className={cn(
              "font-mono text-4xl font-bold tabular-nums text-white transition-colors duration-300",
              direction === "up" && !isLocked && "text-emerald-300",
              direction === "down" && !isLocked && "text-red-300"
            )}
          >
            {fmtUSD(spot)}
          </span>
          <span className="font-mono text-xs text-slate-500">/ troy oz</span>
        </div>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded bg-slate-800/50 px-2.5 py-1">
            <span className="text-[10px] text-slate-500">
              Institutional Premium
            </span>
            <span className="font-mono text-[10px] font-semibold text-gold">
              {fmtBPS(INSTITUTIONAL_PREMIUM_BPS)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded bg-slate-800/50 px-2.5 py-1">
            <span className="text-[10px] text-slate-500">Platform Fee</span>
            <span className="font-mono text-[10px] font-semibold text-slate-300">
              {fmtBPS(PLATFORM_FEE_BPS)}
            </span>
          </div>
        </div>

        {isLocked && lockCountdown > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-300">
              Price locked for{" "}
              <span className="font-mono font-bold tabular-nums">
                {Math.floor(lockCountdown / 60)}:
                {(lockCountdown % 60).toString().padStart(2, "0")}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Asset Allocation ── */}
      <div className="grid grid-cols-2 gap-5">
        {/* Bar Selection */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
            LBMA Good Delivery 400-oz Bars
          </p>

          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => onBarCountChange(Math.max(1, barCount - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-lg font-bold text-white transition hover:border-gold/50 hover:bg-slate-700"
            >
              −
            </button>
            <input
              type="number"
              value={barCount}
              onChange={(e) =>
                onBarCountChange(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="h-12 w-24 rounded-lg border border-gold/30 bg-slate-950 text-center font-mono text-2xl font-bold tabular-nums text-white focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/30"
            />
            <button
              type="button"
              onClick={() => onBarCountChange(barCount + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-lg font-bold text-white transition hover:border-gold/50 hover:bg-slate-700"
            >
              +
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Troy Ounces</span>
              <span className="font-mono font-semibold tabular-nums text-white">
                {totalOz.toLocaleString()} oz
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total Tonnage</span>
              <span className="font-mono font-semibold tabular-nums text-white">
                {totalTonnage.toFixed(3)} MT
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Bar Specification</span>
              <span className="font-mono text-xs text-slate-400">
                995+ Fine · 350–430 oz
              </span>
            </div>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-gold" />
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Fee Breakdown
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Gross Value ({totalOz.toLocaleString()} oz × spot)
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-white">
                {fmtUSD(grossValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Institutional Premium ({INSTITUTIONAL_PREMIUM_BPS} bps)
              </span>
              <span className="font-mono text-sm tabular-nums text-gold">
                +{fmtUSD(institutionalPremium)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Platform Fee ({PLATFORM_FEE_BPS} bps)
              </span>
              <span className="font-mono text-sm tabular-nums text-slate-400">
                +{fmtUSD(platformFee)}
              </span>
            </div>

            <hr className="border-slate-800" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Total Acquisition Capital
              </span>
              <span className="font-mono text-xl font-bold tabular-nums text-gold">
                {fmtUSD(totalAcquisition)}
              </span>
            </div>
          </div>

          {/* Fee compression callout */}
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
            <Zap className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] text-gold">
              Institutional fee compression:{" "}
              <span className="font-mono font-bold">
                {((INSTITUTIONAL_PREMIUM_BPS + PLATFORM_FEE_BPS) / 100).toFixed(
                  2
                )}
                %
              </span>{" "}
              all-in — vs. 1.5–3% retail
            </span>
          </div>
        </div>
      </div>

      {/* ── Lock Price CTA ── */}
      {!isLocked ? (
        <button
          type="button"
          onClick={handleLockPrice}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-gold py-4 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-gold-hover hover:shadow-[0_0_30px_rgba(198,168,107,0.25)]"
        >
          <Lock className="h-4 w-4" />
          Lock Institutional Price — {fmtUSD(totalAcquisition)}
        </button>
      ) : (
        <button
          type="button"
          onClick={onPriceLocked}
          className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-950/30 py-4 text-sm font-bold uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-950/50"
        >
          <ArrowRight className="h-4 w-4" />
          Proceed to Logistics Routing
        </button>
      )}

      {/* ── Warning ── */}
      <div className="flex items-center gap-2 text-[10px] text-slate-600">
        <AlertTriangle className="h-3 w-3" />
        <span>
          All prices denominated in USD. Settlement subject to T+0 via Goldwire
          or T+2 via traditional wire. Past performance is not indicative of
          future results.
        </span>
      </div>
    </motion.div>
  );
}
