"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ================================================================
   GOLDWIRE LIQUIDITY SIMULATOR
   ================================================================
   Interactive Physical-to-Fiat conversion demonstrator.
   Proves millisecond liquidity on allocated 400-oz bars.
   ================================================================ */

const LIVE_SPOT_PRICE = 5171.92; // USD per troy ounce (mock)
const EXECUTION_FEE_BPS = 10; // 0.10%
const EASE_CURVE = [0.16, 1, 0.3, 1] as const;

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function GoldwireLiquiditySimulator() {
  const [ounces, setOunces] = useState(200);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOunces(parseFloat(e.target.value));
    },
    [],
  );

  const grossLiquidity = useMemo(() => ounces * LIVE_SPOT_PRICE, [ounces]);
  const executionFee = useMemo(
    () => grossLiquidity * (EXECUTION_FEE_BPS / 10000),
    [grossLiquidity],
  );
  const netLiquidity = useMemo(
    () => grossLiquidity - executionFee,
    [grossLiquidity, executionFee],
  );

  const sliderPercent = (ounces / 400) * 100;

  return (
    <section className="py-24 lg:py-32" style={{ backgroundColor: "#0A1128" }}>
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section Header ── */}
        <div className="mb-14 max-w-3xl">
          <div className="flex items-center gap-4 mb-5">
            <div
              className="h-px w-8"
              style={{ backgroundColor: "rgba(212,175,55,0.5)" }}
            />
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "#D4AF37" }}
            >
              INSTANT LIQUIDITY ENGINE
            </p>
          </div>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold tracking-tight text-white leading-tight"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            Physical-to-Fiat.{" "}
            <span className="text-slate-400">Zero Extraction Delay.</span>
          </h2>
          <p
            className="mt-4 text-base text-slate-400 max-w-2xl"
            style={{ lineHeight: 1.6 }}
          >
            Convert fully allocated vaulted bullion into fiat currency
            instantly, bypassing the typical 14-day physical extraction cycle.
            The Goldwire Corporate Card enables immediate point-of-sale
            liquidation against your sovereign metal position.
          </p>
        </div>

        {/* ── Bento Container ── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-5 gap-0 rounded-2xl border border-slate-800 overflow-hidden"
          style={{
            backgroundColor: "rgba(17,24,39,0.50)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* ── Left Pane: Controls & Readouts (60%) ── */}
          <div className="lg:col-span-3 p-8 lg:p-10 flex flex-col justify-between">
            {/* Spot Price Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="h-2 w-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "#22c55e" }}
                />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  LIVE SPOT XAU/USD
                </span>
              </div>
              <span className="font-mono text-2xl font-bold text-white">
                {formatUSD(LIVE_SPOT_PRICE)}
              </span>
              <span className="ml-2 font-mono text-xs text-slate-500">/ozt</span>
            </div>

            {/* ── Slider ── */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  OUNCES TO LIQUIDATE
                </span>
                <span className="font-mono text-lg font-bold text-white">
                  {formatNumber(ounces)} ozt
                </span>
              </div>

              {/* Custom range input */}
              <div className="relative h-2 rounded-full bg-slate-800">
                {/* Filled track */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{
                    width: `${sliderPercent}%`,
                    background:
                      "linear-gradient(to right, #ca8a04, #facc15)",
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={400}
                  step={0.1}
                  value={ounces}
                  onChange={handleSliderChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Ounces to liquidate"
                />
                {/* Thumb indicator */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 pointer-events-none shadow-lg"
                  style={{
                    left: `calc(${sliderPercent}% - 10px)`,
                    backgroundColor: "#D4AF37",
                    borderColor: "#0A1128",
                    boxShadow: "0 0 12px rgba(212,175,55,0.3)",
                  }}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[10px] text-slate-600">
                  0 ozt
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  400 ozt
                </span>
              </div>
            </div>

            {/* ── Primary Fiat Readout ── */}
            <div className="mb-6">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                INSTANT FIAT LIQUIDITY GENERATED
              </span>
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={Math.round(ounces * 10)}
                  initial={{ scale: 1.03, color: "#facc15" }}
                  animate={{ scale: 1, color: "#ffffff" }}
                  transition={{ duration: 0.3, ease: EASE_CURVE }}
                  className="font-mono text-4xl lg:text-5xl font-bold text-white block"
                >
                  {formatUSD(grossLiquidity)}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* ── Progressive Disclosure: Fee Breakdown ── */}
            <AnimatePresence>
              {ounces > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: EASE_CURVE }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-slate-800 pt-5 grid grid-cols-3 gap-4">
                    <div>
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        GROSS VALUE
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-300">
                        {formatUSD(grossLiquidity)}
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        EXECUTION FEE (0.10%)
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-400">
                        −{formatUSD(executionFee)}
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        NET SETTLEMENT
                      </span>
                      <span className="font-mono text-sm font-bold text-white">
                        {formatUSD(netLiquidity)}
                      </span>
                    </div>
                  </div>

                  <div
                    className="mt-4 rounded border px-3 py-2 font-mono text-[10px] leading-relaxed"
                    style={{
                      borderColor: "rgba(212,175,55,0.2)",
                      backgroundColor: "rgba(212,175,55,0.04)",
                      color: "rgba(212,175,55,0.7)",
                    }}
                  >
                    T+0 Settlement &bull; No extraction delay &bull; Funds
                    available instantly via Goldwire Corporate Card or wire
                    transfer
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right Pane: Goldwire Card Visual (40%) ── */}
          <div className="lg:col-span-2 relative flex items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-800 p-8 lg:p-10 min-h-[300px]">
            {/* Ambient glow behind card */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)",
              }}
            />

            {/* Card container with float animation */}
            <div
              className="relative w-full max-w-[320px]"
              style={{ animation: "goldwireFloat 6s ease-in-out infinite" }}
            >
              <style>{`
                @keyframes goldwireFloat {
                  0% { transform: translateY(0px) rotate(-2deg); }
                  50% { transform: translateY(-12px) rotate(-1deg); }
                  100% { transform: translateY(0px) rotate(-2deg); }
                }
              `}</style>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gold-wire.png"
                alt="Goldwire Corporate Card"
                className="w-full h-auto drop-shadow-[0_25px_50px_rgba(0,0,0,0.8)]"
              />
            </div>

            {/* Card label */}
            <div className="absolute bottom-5 left-0 right-0 text-center">
              <span
                className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "rgba(212,175,55,0.4)" }}
              >
                GOLDWIRE CORPORATE CARD
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
