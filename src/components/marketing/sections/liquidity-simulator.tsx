"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoldwireBrandLogo } from "@/components/ui/goldwire-logo";

/* ================================================================
   GOLDWIRE LIQUIDITY SIMULATOR
   ================================================================
   Terminal-style interactive demo. Goldwire logo at top, use-case
   grid, then an interactive calculator with "Executing Wire…"
   loading state and "WIRE_COMPLETE" success animation.
   ================================================================ */

const LIVE_SPOT_PRICE = 5171.92;
const EXECUTION_FEE_BPS = 10;
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

/* ── Use case data ── */
const USE_CASES = [
  {
    icon: "⚡",
    title: "Emergency Payroll",
    description: "Liquidate vaulted gold to cover payroll obligations within minutes, not weeks.",
  },
  {
    icon: "🌐",
    title: "Cross-Border Settlement",
    description: "Bypass SWIFT and correspondent banking. Settle internationally via physical gold transport layer.",
  },
  {
    icon: "📊",
    title: "Margin Call Coverage",
    description: "Instantly convert sovereign metal into fiat to meet intraday margin requirements.",
  },
  {
    icon: "🏦",
    title: "Capital Repatriation",
    description: "Move value across jurisdictions without triggering legacy FX friction or banking limits.",
  },
  {
    icon: "🔒",
    title: "Sanctions-Compliant Transfers",
    description: "Physical asset-backed settlement that operates within full regulatory compliance perimeters.",
  },
  {
    icon: "💰",
    title: "Treasury Rebalancing",
    description: "Rotate between gold and fiat positions instantly to optimize capital allocation ratios.",
  },
] as const;

/* ── Terminal output lines ── */
const TERMINAL_LINES = [
  { text: "> GOLDWIRE_ENGINE.init()", delay: 0 },
  { text: "  [OK] Vault position verified", delay: 200 },
  { text: "  [OK] Spot price locked: XAU/USD", delay: 400 },
  { text: "  [OK] Counterparty escrow confirmed", delay: 600 },
  { text: "> EXECUTE_WIRE --mode=INSTANT", delay: 800 },
  { text: "  [OK] DvP clearing — atomic swap", delay: 1000 },
  { text: "  [OK] SHA-256 certificate sealed", delay: 1200 },
  { text: "  [OK] Fiat wire dispatched", delay: 1400 },
];

type PipelineState = "idle" | "processing" | "settled";

/* ── Terminal line component ── */
function TerminalLine({ text, visible }: { text: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="font-mono text-xs leading-relaxed"
        >
          <span
            className={
              text.includes("[OK]")
                ? "text-emerald-400"
                : text.startsWith(">")
                  ? "text-gold"
                  : "text-slate-400"
            }
          >
            {text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GoldwireLiquiditySimulator() {
  const [ounces, setOunces] = useState(200);
  const [pipelineState, setPipelineState] = useState<PipelineState>("idle");
  const [visibleLines, setVisibleLines] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setOunces(parseFloat(e.target.value));
      if (pipelineState === "settled") {
        setPipelineState("idle");
        setVisibleLines(0);
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const executeLiquidation = useCallback(() => {
    if (pipelineState !== "idle" || ounces === 0) return;
    setPipelineState("processing");
    setVisibleLines(0);

    // Clear any existing timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    // Animate terminal lines
    TERMINAL_LINES.forEach((line, i) => {
      const timer = setTimeout(() => {
        setVisibleLines(i + 1);
      }, line.delay);
      timersRef.current.push(timer);
    });

    // Settle after all lines
    const settleTimer = setTimeout(() => {
      setPipelineState("settled");
    }, 1800);
    timersRef.current.push(settleTimer);
  }, [pipelineState, ounces]);

  const resetPipeline = useCallback(() => {
    setPipelineState("idle");
    setVisibleLines(0);
  }, []);

  return (
    <section className="py-28 lg:py-40" style={{ backgroundColor: "#0A1128" }}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Goldwire Logo at Top ── */}
        <div className="flex justify-center mb-6">
          <GoldwireBrandLogo />
        </div>

        {/* ── Section Header ── */}
        <div className="mb-16 max-w-3xl mx-auto text-center">
          <h2
            className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight leading-[1.15]"
            style={{ fontFamily: "var(--font-inter), sans-serif", color: "#f1f5f9" }}
          >
            Physical-to-Fiat.{" "}
            <span style={{ color: "#94a3b8" }}>Zero Extraction Delay.</span>
          </h2>
          <p
            className="mt-6 text-lg max-w-2xl mx-auto"
            style={{ lineHeight: 1.75, color: "#cbd5e1" }}
          >
            Convert fully allocated vaulted bullion into fiat currency
            instantly, bypassing the typical 14-day physical extraction cycle.
            The Goldwire engine enables immediate liquidation against your
            sovereign metal position.
          </p>
        </div>

        {/* ── Use Case Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="group rounded-xl border border-white/[0.06] p-6 transition-all duration-300 hover:border-gold/20 hover:bg-white/[0.02]"
              style={{
                backgroundColor: "rgba(15,20,35,0.40)",
              }}
            >
              <span className="text-2xl mb-3 block">{uc.icon}</span>
              <h3 className="text-sm font-bold text-white mb-2 tracking-tight">
                {uc.title}
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                {uc.description}
              </p>
            </div>
          ))}
        </div>

        {/* ── Interactive Calculator Terminal ── */}
        <div
          className="rounded-xl border border-slate-800 overflow-hidden"
          style={{
            backgroundColor: "rgba(17,24,39,0.50)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Terminal Header Bar */}
          <div className="flex items-center gap-2 border-b border-slate-800 px-6 py-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 ml-3">
              GOLDWIRE LIQUIDITY ENGINE v2.4.0
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full animate-pulse"
                style={{ backgroundColor: pipelineState === "settled" ? "#22c55e" : "#D4AF37" }}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {pipelineState === "idle" && "READY"}
                {pipelineState === "processing" && "EXECUTING…"}
                {pipelineState === "settled" && "SETTLED"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left: Controls */}
            <div className="p-8 lg:p-10 lg:border-r border-slate-800">
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

              {/* Fee Breakdown + Execute Button */}
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
                      className="w-full inline-flex items-center justify-center gap-2.5 rounded-lg px-8 py-4 text-sm font-bold uppercase tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: pipelineState === "settled" ? "rgba(34,197,94,0.12)" : "rgba(212,175,55,0.10)",
                        color: pipelineState === "settled" ? "#22c55e" : "#D4AF37",
                        border: `1px solid ${pipelineState === "settled" ? "rgba(34,197,94,0.3)" : "rgba(212,175,55,0.3)"}`,
                      }}
                    >
                      {pipelineState === "idle" && (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Execute Wire Transfer
                        </>
                      )}
                      {pipelineState === "processing" && (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                          Executing Wire…
                        </>
                      )}
                      {pipelineState === "settled" && (
                        <>
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M2.5 12a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Reset &amp; Run Again
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Terminal Output */}
            <div className="p-8 lg:p-10 border-t lg:border-t-0 border-slate-800 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600">
                  TERMINAL OUTPUT
                </span>
              </div>

              {/* Terminal body */}
              <div
                className="flex-1 rounded-lg border border-slate-800/60 p-5 min-h-[280px] flex flex-col"
                style={{ backgroundColor: "rgba(0,0,0,0.40)" }}
              >
                {pipelineState === "idle" && (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <span className="font-mono text-[10px] font-bold text-slate-600 tracking-[0.15em] uppercase block mb-2">
                        WAITING FOR EXECUTION
                      </span>
                      <span className="font-mono text-xs text-slate-500 block">
                        Set amount and press Execute
                      </span>
                    </div>
                  </div>
                )}

                {(pipelineState === "processing" || pipelineState === "settled") && (
                  <div className="space-y-1.5">
                    {TERMINAL_LINES.map((line, i) => (
                      <TerminalLine
                        key={line.text}
                        text={line.text}
                        visible={i < visibleLines}
                      />
                    ))}

                    {/* Settlement complete message */}
                    <AnimatePresence>
                      {pipelineState === "settled" && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.4 }}
                          className="mt-4 pt-4 border-t border-slate-800/50"
                        >
                          <div className="font-mono text-xs space-y-1">
                            <span className="text-emerald-400 font-bold block">
                              ✓ WIRE_COMPLETE
                            </span>
                            <span className="text-slate-400 block">
                              Amount: {formatUSD(netLiquidity)}
                            </span>
                            <span className="text-slate-400 block">
                              Gold Liquidated: {formatNumber(ounces)} ozt
                            </span>
                            <span className="text-slate-500 block">
                              Settlement: T+0 • Finality: ABSOLUTE
                            </span>
                            <span className="text-slate-600 block mt-2">
                              Hash: 0xa3f7d91c0b4e28f6
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
