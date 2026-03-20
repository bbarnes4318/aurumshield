"use client";

/* ================================================================
   COMMAND CENTER — /offtaker
   ================================================================
   Bloomberg-style telemetry dashboard. High-density, non-scrolling
   CSS Grid showing capital metrics, live operations, and market
   telemetry via the GoldAPI.io XAU/USD feed.

   Zero-Scroll Layout: h-full flex flex-col overflow-hidden
   Aesthetic:           bg-slate-950, institutional, monospace data
   ================================================================ */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  ShieldCheck,
  Landmark,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Truck,
  Coins,
  CircleDot,
  Loader2,
} from "lucide-react";
import { useGoldPrice, formatSpotPrice } from "@/hooks/use-gold-price";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ── MetricCard ── */

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtext?: string;
  accent?: boolean;
}

function MetricCard({ icon: Icon, label, value, subtext, accent }: MetricCardProps) {
  return (
    <div className="border border-slate-800 bg-slate-900/50 p-2.5 flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
          {label}
        </span>
      </div>
      <span
        className={`font-mono text-lg font-bold tabular-nums tracking-tight ${
          accent ? "text-[#C6A86B]" : "text-white"
        }`}
      >
        {value}
      </span>
      {subtext && (
        <span className="font-mono text-[9px] text-slate-600">{subtext}</span>
      )}
    </div>
  );
}

/* ── Mock Operations Data ── */

interface LiveOperation {
  id: string;
  asset: string;
  notional: string;
  state: string;
  stateColor: string;
  stateIcon: React.ComponentType<{ className?: string }>;
  counterparty: string;
  timestamp: string;
}

const LIVE_OPERATIONS: LiveOperation[] = [
  {
    id: "ORD-8842-XAU",
    asset: "400oz LBMA",
    notional: "$106,106,000.00",
    state: "Awaiting Fiat Wire",
    stateColor: "text-[#C6A86B]",
    stateIcon: Landmark,
    counterparty: "Sovereign Wealth Fund — Abu Dhabi",
    timestamp: "14:32:01 UTC",
  },
  {
    id: "ORD-8837-XAU",
    asset: "1kg Bar × 250",
    notional: "$16,812,500.00",
    state: "In Brinks Transit",
    stateColor: "text-blue-400",
    stateIcon: Truck,
    counterparty: "Family Office — Zurich",
    timestamp: "11:15:44 UTC",
  },
  {
    id: "ORD-8801-XAU",
    asset: "400oz LBMA × 50",
    notional: "$53,053,000.00",
    state: "Tokens Minted",
    stateColor: "text-emerald-400",
    stateIcon: Coins,
    counterparty: "Central Bank Reserve — Singapore",
    timestamp: "09:42:18 UTC",
  },
];

/* ── Price History (mock sparkline data for 24h) ── */

const PRICE_HISTORY = [
  2641.2, 2643.8, 2640.5, 2645.1, 2647.3, 2644.9, 2648.2,
  2650.1, 2646.7, 2649.8, 2652.3, 2655.0, 2651.4, 2648.9,
  2653.2, 2656.8, 2654.1, 2650.7, 2653.5, 2657.2, 2660.1,
  2658.3, 2655.9, 2652.4,
];

function MiniSparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 60;
  const w = 280;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[35px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C6A86B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C6A86B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill="url(#spark-grad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#C6A86B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function CommandCenterPage() {
  const router = useRouter();
  const { data: onboardingState, isLoading: complianceLoading } = useOnboardingState();
  const isCleared = onboardingState?.status === "COMPLETED";
  const { data: goldPrice, isLoading, isError, isLive } = useGoldPrice();

  const spotDisplay = goldPrice ? formatSpotPrice(goldPrice.spotPriceUsd) : "—";

  /* ── Hard Ejection: unverified users get pushed to onboarding ── */
  useEffect(() => {
    if (!complianceLoading && !isCleared) {
      router.replace("/offtaker/org/select");
    }
  }, [complianceLoading, isCleared, router]);

  /* ── Loading gate ── */
  if (complianceLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 text-slate-600 animate-spin" />
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Syncing Telemetry...
          </span>
        </div>
      </div>
    );
  }

  /* ── Block render if not cleared (ejection in-flight) ── */
  if (!isCleared) {
    return <div className="h-full bg-slate-950" />;
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950">
      {/* ── Header Strip ── */}
      <div className="shrink-0 border-b border-slate-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C6A86B]/10">
              <LayoutDashboard className="h-4.5 w-4.5 text-[#C6A86B]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Command Center
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                Institutional Telemetry · Prime Brokerage Terminal
              </p>
            </div>
          </div>

          {/* Live Status */}
          <div className="flex items-center gap-2.5 rounded border border-slate-800 bg-black/40 px-3 py-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isLive
                  ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                  : isError
                    ? "bg-red-500"
                    : "bg-slate-600 animate-pulse"
              }`}
            />
            <span className="font-mono text-[10px] text-slate-400 tracking-wider uppercase">
              {isLive ? "ALL FEEDS LIVE" : isError ? "FEED OFFLINE" : "SYNCING"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Top Metrics Strip ── */}
      <div className="shrink-0 flex flex-col gap-3 px-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Total Capital Deployed"
          value="$175,971,500"
          subtext="Across 14 active positions"
          accent
        />
        <MetricCard
          icon={ShieldCheck}
          label="Active Escrows"
          value="3"
          subtext="2 DVP in-flight · 1 pending wire"
        />
        <MetricCard
          icon={ArrowRightLeft}
          label="Total Ounces Vaulted"
          value="48,215 oz"
          subtext="Zurich, London, Singapore"
        />
        <MetricCard
          icon={Clock}
          label="Next Settlement Deadline"
          value="T+0 14:00 UTC"
          subtext="ORD-8842-XAU · Fedwire"
        />
        </div>
      </div>

      {/* ── Main Split: Operations + Market Telemetry ── */}
      <div className="flex-1 min-h-0 flex flex-row gap-4 px-4 pb-4 overflow-hidden">
        {/* ═══ LEFT: Live Operations ═══ */}
        <div className="w-1/2 flex flex-col border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Live Operations Pipeline
              </span>
              <span className="ml-auto font-mono text-[9px] text-emerald-500/70 flex items-center gap-1.5">
                <CircleDot className="h-2.5 w-2.5 animate-pulse" />
                {LIVE_OPERATIONS.length} ACTIVE
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-0">
            {LIVE_OPERATIONS.map((op) => {
              const StateIcon = op.stateIcon;
              return (
                <div
                  key={op.id}
                  className="border-b border-slate-800/50 px-3 py-2.5 hover:bg-slate-900/50 transition-colors"
                >
                  {/* Row 1: ID + Notional */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-white font-bold">
                      {op.id}
                    </span>
                    <span className="font-mono text-sm text-[#C6A86B] font-bold tabular-nums">
                      {op.notional}
                    </span>
                  </div>

                  {/* Row 2: Asset + State */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] text-slate-400">
                      {op.asset}
                    </span>
                    <div className={`flex items-center gap-1.5 ${op.stateColor}`}>
                      <StateIcon className="h-3 w-3" />
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        {op.state}
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Counterparty + Time */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-600">
                      {op.counterparty}
                    </span>
                    <span className="font-mono text-[9px] text-slate-600 tabular-nums">
                      {op.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT: Market Telemetry ═══ */}
        <div className="w-1/2 flex flex-col border border-slate-800 bg-slate-900/50 rounded-xl overflow-hidden">
          <div className="shrink-0 px-3 py-2 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                Market Telemetry · XAU/USD
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {/* Spot Price Display */}
            <div className="border border-slate-800 bg-black/40 p-3 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                  Spot Price
                </span>
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    isLive
                      ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                      : "bg-slate-600"
                  }`}
                />
                {isLive && (
                  <span className="font-mono text-[8px] text-emerald-400 animate-pulse">
                    LIVE
                  </span>
                )}
              </div>

              {isLoading ? (
                <span className="font-mono text-lg text-slate-600 animate-pulse">
                  SYNCING...
                </span>
              ) : (
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-3xl text-white font-bold tabular-nums">
                    {spotDisplay}
                  </span>
                  {goldPrice && (
                    <div className="flex items-center gap-1.5">
                      {goldPrice.change24h >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-400" />
                      )}
                      <span
                        className={`font-mono text-sm font-bold tabular-nums ${
                          goldPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {goldPrice.change24h >= 0 ? "+" : ""}
                        {goldPrice.change24h.toFixed(2)} ({goldPrice.changePct24h.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sparkline Chart */}
            <div className="border border-slate-800 bg-black/40 p-3 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                  24h Price Action
                </span>
                <span className="font-mono text-[9px] text-slate-600 tabular-nums">
                  24 data points
                </span>
              </div>
              <MiniSparkline data={PRICE_HISTORY} />
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[8px] text-slate-600">
                  L: ${Math.min(...PRICE_HISTORY).toFixed(2)}
                </span>
                <span className="font-mono text-[8px] text-slate-600">
                  H: ${Math.max(...PRICE_HISTORY).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Market Data Grid */}
            <div className="grid grid-cols-2 gap-px bg-slate-800/30">
              {[
                { label: "Pool Liquidity", value: "48,000 oz" },
                { label: "24h Volume", value: "$312.4M" },
                { label: "Open Interest", value: "3 DVP" },
                { label: "Avg Premium", value: "+0.42%" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-slate-950 border border-slate-800 p-2"
                >
                  <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider block mb-1">
                    {item.label}
                  </span>
                  <span className="font-mono text-sm text-white font-bold tabular-nums">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Telemetry Footer ── */}
      <TelemetryFooter />
    </div>
  );
}
