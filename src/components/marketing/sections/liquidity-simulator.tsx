"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ================================================================
   GOLDWIRE LIQUIDITY SIMULATOR
   ================================================================
   3-stage animated pipeline demonstrating instant Physical-to-Fiat
   conversion. Shows the Goldwire engine's value prop: allocated
   bullion → Goldwire clearing → fiat settlement in milliseconds.
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

/* ── Pipeline stage type ── */
type PipelineState = "idle" | "processing" | "settled";

/* ── Animated particle dots ── */
function PipelineArrow({ active, settled }: { active: boolean; settled: boolean }) {
  return (
    <div className="flex-1 flex items-center justify-center relative min-w-[60px]">
      {/* Static track */}
      <div className="w-full h-px bg-slate-700 relative">
        {/* Animated flow dots */}
        {active && !settled && (
          <>
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "#D4AF37" }}
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "#D4AF37" }}
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear", delay: 0.3 }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "#D4AF37" }}
              animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear", delay: 0.6 }}
            />
          </>
        )}
        {/* Settled: solid green line */}
        {settled && (
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ backgroundColor: "#22c55e" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.4, ease: EASE_CURVE }}
          />
        )}
      </div>
      {/* Arrow head */}
      <div
        className="absolute right-0 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] transition-colors duration-300"
        style={{ borderLeftColor: settled ? "#22c55e" : active ? "#D4AF37" : "#334155" }}
      />
    </div>
  );
}

/* ── Pipeline stage node ── */
function PipelineNode({
  label,
  sublabel,
  icon,
  state,
  delay = 0,
}: {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  state: PipelineState;
  delay?: number;
}) {
  const borderColor =
    state === "settled"
      ? "rgba(34,197,94,0.5)"
      : state === "processing"
        ? "rgba(212,175,55,0.5)"
        : "rgba(51,65,85,0.7)";

  const glowColor =
    state === "settled"
      ? "rgba(34,197,94,0.06)"
      : state === "processing"
        ? "rgba(212,175,55,0.06)"
        : "transparent";

  return (
    <motion.div
      className="flex flex-col items-center text-center relative"
      initial={false}
      animate={{
        scale: state === "processing" ? 1.02 : 1,
      }}
      transition={{ duration: 0.3, delay }}
    >
      <div
        className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl border-2 flex items-center justify-center transition-all duration-500"
        style={{
          borderColor,
          backgroundColor: glowColor,
          boxShadow: state === "processing" ? "0 0 24px rgba(212,175,55,0.12)" : state === "settled" ? "0 0 24px rgba(34,197,94,0.1)" : "none",
        }}
      >
        {/* Processing shimmer ring */}
        {state === "processing" && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 pointer-events-none"
            style={{ borderColor: "rgba(212,175,55,0.3)" }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {icon}
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mt-3 mb-0.5">
        {label}
      </p>
      <p className="text-[11px] text-slate-500">{sublabel}</p>

      {/* Settled checkmark */}
      <AnimatePresence>
        {state === "settled" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15, delay: delay + 0.1 }}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
          >
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function GoldwireLiquiditySimulator() {
  const [ounces, setOunces] = useState(200);
  const [pipelineState, setPipelineState] = useState<PipelineState>("idle");

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOunces(parseFloat(e.target.value));
      // Reset pipeline when slider changes
      if (pipelineState === "settled") {
        setPipelineState("idle");
      }
    },
    [pipelineState],
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

  const executeLiquidation = useCallback(() => {
    if (pipelineState !== "idle" || ounces === 0) return;
    setPipelineState("processing");
    // Simulate processing time, then settle
    setTimeout(() => {
      setPipelineState("settled");
    }, 1800);
  }, [pipelineState, ounces]);

  const resetPipeline = useCallback(() => {
    setPipelineState("idle");
  }, []);

  return (
    <section className="py-28 lg:py-40" style={{ backgroundColor: "#0A1128" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Section Header ── */}
        <div className="mb-16 max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-px w-10"
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
            className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight leading-[1.15]"
            style={{ fontFamily: "var(--font-inter), sans-serif", color: "#f1f5f9" }}
          >
            Physical-to-Fiat.{" "}
            <span style={{ color: "#94a3b8" }}>Zero Extraction Delay.</span>
          </h2>
          <p
            className="mt-6 text-lg max-w-2xl"
            style={{ lineHeight: 1.75, color: "#cbd5e1" }}
          >
            Convert fully allocated vaulted bullion into fiat currency
            instantly, bypassing the typical 14-day physical extraction cycle.
            The Goldwire engine enables immediate liquidation against your
            sovereign metal position.
          </p>
        </div>

        {/* ── Main Bento Container ── */}
        <div
          className="rounded-xl border border-slate-800 overflow-hidden"
          style={{
            backgroundColor: "rgba(17,24,39,0.50)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* ── Top: Pipeline Visualization ── */}
          <div className="border-b border-slate-800 px-6 sm:px-10 py-10 lg:py-12">
            {/* Pipeline Stage Header */}
            <div className="flex items-center gap-2 mb-8">
              <div
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ backgroundColor: pipelineState === "settled" ? "#22c55e" : "#D4AF37" }}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {pipelineState === "idle" && "GOLDWIRE PIPELINE — READY"}
                {pipelineState === "processing" && "EXECUTING LIQUIDATION…"}
                {pipelineState === "settled" && "SETTLEMENT COMPLETE — T+0"}
              </span>
            </div>

            {/* 3-Stage Pipeline */}
            <div className="flex items-center gap-3 sm:gap-5 max-w-3xl mx-auto">
              <PipelineNode
                label="Allocated Gold"
                sublabel="Vault Position"
                state={pipelineState === "idle" ? "idle" : "settled"}
                delay={0}
                icon={
                  <svg className="h-7 w-7 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="none" stroke={pipelineState !== "idle" ? "#22c55e" : "#D4AF37"} strokeWidth={1.5}>
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />

              <PipelineArrow active={pipelineState !== "idle"} settled={pipelineState === "settled"} />

              <PipelineNode
                label="Goldwire Engine"
                sublabel="DvP Clearing"
                state={pipelineState}
                delay={0.1}
                icon={
                  <svg className="h-7 w-7 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="none" stroke={pipelineState === "settled" ? "#22c55e" : pipelineState === "processing" ? "#D4AF37" : "#64748b"} strokeWidth={1.5}>
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              />

              <PipelineArrow active={pipelineState === "settled"} settled={pipelineState === "settled"} />

              <PipelineNode
                label="Fiat Settlement"
                sublabel="Wire / Card"
                state={pipelineState === "settled" ? "settled" : "idle"}
                delay={0.2}
                icon={
                  <svg className="h-7 w-7 sm:h-8 sm:w-8" viewBox="0 0 24 24" fill="none" stroke={pipelineState === "settled" ? "#22c55e" : "#64748b"} strokeWidth={1.5}>
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                }
              />
            </div>

            {/* Settlement Confirmation */}
            <AnimatePresence>
              {pipelineState === "settled" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: EASE_CURVE }}
                  className="mt-8 mx-auto max-w-lg rounded-lg border px-5 py-4 text-center"
                  style={{
                    borderColor: "rgba(34,197,94,0.3)",
                    backgroundColor: "rgba(34,197,94,0.06)",
                  }}
                >
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-1">
                    SETTLEMENT FINALIZED
                  </p>
                  <p className="font-mono text-2xl font-bold text-white">
                    {formatUSD(netLiquidity)}
                  </p>
                  <p className="font-mono text-[10px] text-emerald-400/70 mt-1">
                    T+0 • {formatNumber(ounces)} ozt liquidated • SHA-256 clearing certificate issued
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Bottom: Controls + Card ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* Left: Slider / Controls (60%) */}
            <div className="lg:col-span-3 p-8 lg:p-10 flex flex-col justify-between">
              {/* Spot Price */}
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

              {/* Slider */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    OUNCES TO LIQUIDATE
                  </span>
                  <span className="font-mono text-lg font-bold text-white">
                    {formatNumber(ounces)} ozt
                  </span>
                </div>

                <div className="relative h-2 rounded-full bg-slate-800">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                      width: `${sliderPercent}%`,
                      background: "linear-gradient(to right, #ca8a04, #facc15)",
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
                  <span className="font-mono text-[10px] text-slate-600">0 ozt</span>
                  <span className="font-mono text-[10px] text-slate-600">400 ozt</span>
                </div>
              </div>

              {/* Fiat Readout */}
              <div className="mb-6">
                <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                  INSTANT FIAT LIQUIDITY
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

              {/* Fee Breakdown */}
              <AnimatePresence>
                {ounces > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: EASE_CURVE }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-800 pt-5 grid grid-cols-3 gap-4 mb-6">
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

                    {/* Execute Button */}
                    <button
                      onClick={pipelineState === "settled" ? resetPipeline : executeLiquidation}
                      disabled={pipelineState === "processing" || ounces === 0}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-lg px-8 py-3.5 text-sm font-bold uppercase tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: pipelineState === "settled" ? "rgba(34,197,94,0.15)" : "rgba(212,175,55,0.12)",
                        color: pipelineState === "settled" ? "#22c55e" : "#D4AF37",
                        border: `1px solid ${pipelineState === "settled" ? "rgba(34,197,94,0.3)" : "rgba(212,175,55,0.3)"}`,
                      }}
                    >
                      {pipelineState === "idle" && (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Execute Liquidation
                        </>
                      )}
                      {pipelineState === "processing" && (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                          Processing…
                        </>
                      )}
                      {pipelineState === "settled" && (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M2.5 12a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Reset & Run Again
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Goldwire Card Visual (40%) */}
            <div className="lg:col-span-2 relative flex items-center justify-center border-t lg:border-t-0 lg:border-l border-slate-800 p-8 lg:p-10 min-h-[300px]">
              {/* Ambient glow behind card */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)",
                }}
              />

              {/* Card — fixed proportions */}
              <div
                className="relative w-full max-w-[400px]"
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
      </div>
    </section>
  );
}
