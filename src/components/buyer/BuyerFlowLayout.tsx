"use client";

/* ================================================================
   BUYER FLOW LAYOUT — Linear Purchase Journey Shell
   ================================================================
   Full-bleed dark layout with persistent progress rail.
   No sidebar, no topbar, no admin chrome.
   Clean, professional, guided experience.
   ================================================================ */

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Lock,
  Shield,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  useBuyerFlow,
  BUYER_PHASES,
  PHASE_META,
  type BuyerPhase,
} from "@/stores/buyer-flow-store";
import { useGoldPrice } from "@/hooks/use-gold-price";

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";
const NAV_BG = "#070e1a";
const MAIN_BG = "#0a1128";

/* ── Spot Price Ticker ── */
function SpotTicker() {
  const { data, isLoading } = useGoldPrice();

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
          XAU/USD
        </span>
        <span className="font-mono text-sm tabular-nums text-slate-400">
          Loading…
        </span>
      </div>
    );
  }

  const isUp = data.change24h >= 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Live Gold
        </span>
      </div>
      <span className="font-mono text-sm font-bold tabular-nums text-white">
        ${data.spotPriceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
      <span
        className={`flex items-center gap-0.5 font-mono text-[10px] font-bold tabular-nums ${
          isUp ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isUp ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {isUp ? "+" : ""}
        {data.changePct24h}%
      </span>
    </div>
  );
}

/* ── Phase Step (Progress Rail) ── */
function PhaseStep({
  phase,
  index,
  isCompleted,
  isCurrent,
  isAccessible,
  isLast,
}: {
  phase: BuyerPhase;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isAccessible: boolean;
  isLast: boolean;
}) {
  const meta = PHASE_META[phase];
  const router = useRouter();

  const handleClick = () => {
    if (isAccessible) {
      router.push(meta.path);
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* Step indicator + connector line */}
      <div className="flex flex-col items-center">
        {/* Circle */}
        <button
          type="button"
          onClick={handleClick}
          disabled={!isAccessible}
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-200 ${
            isCompleted
              ? "border-emerald-500 bg-emerald-500/15"
              : isCurrent
                ? "border-[#c6a86b] bg-[#c6a86b]/10 shadow-[0_0_16px_rgba(198,168,107,0.15)]"
                : "border-slate-700 bg-slate-900"
          } ${isAccessible && !isCurrent ? "cursor-pointer hover:border-slate-500" : ""} ${!isAccessible ? "cursor-not-allowed opacity-50" : ""}`}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
          ) : !isAccessible ? (
            <Lock className="h-3.5 w-3.5 text-slate-600" />
          ) : (
            <span
              className="font-mono text-sm font-bold"
              style={{ color: isCurrent ? BRAND_GOLD : "#64748b" }}
            >
              {index + 1}
            </span>
          )}
        </button>

        {/* Connector line */}
        {!isLast && (
          <div
            className={`mt-1 h-8 w-0.5 ${
              isCompleted ? "bg-emerald-500/40" : "bg-slate-800"
            }`}
          />
        )}
      </div>

      {/* Labels */}
      <div className="pt-1.5">
        <p
          className={`text-sm font-semibold leading-tight ${
            isCompleted
              ? "text-emerald-400"
              : isCurrent
                ? "text-white"
                : "text-slate-500"
          }`}
        >
          {meta.label}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight text-slate-600">
          {meta.description}
        </p>
      </div>
    </div>
  );
}

/* ── Mobile Progress Bar ── */
function MobileProgressBar() {
  const { completedPhases, currentPhase } = useBuyerFlow();
  const currentIndex = BUYER_PHASES.indexOf(currentPhase);
  const progress = (completedPhases.length / BUYER_PHASES.length) * 100;

  return (
    <div className="border-b border-slate-800/60 bg-[#070e1a] px-4 py-3 lg:hidden">
      {/* Progress bar */}
      <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(progress, 5)}%`,
            backgroundColor: BRAND_GOLD,
          }}
        />
      </div>
      {/* Current step label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">
          Step {currentIndex + 1} of {BUYER_PHASES.length}:{" "}
          {PHASE_META[currentPhase].label}
        </span>
        <span className="text-[10px] text-slate-500">
          {PHASE_META[currentPhase].description}
        </span>
      </div>
    </div>
  );
}

/* ── Main Layout ── */
export function BuyerFlowLayout({ children }: { children: React.ReactNode }) {
  const { completedPhases, currentPhase, canAccess } = useBuyerFlow();

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: MAIN_BG }}
    >
      {/* ── Top Bar ── */}
      <header
        className="flex shrink-0 items-center justify-between border-b border-slate-800/60 px-5 py-3 lg:px-8"
        style={{ backgroundColor: NAV_BG }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Shield className="h-5 w-5" style={{ color: BRAND_GOLD }} />
          <span
            className="text-base font-bold tracking-tight"
            style={{ color: BRAND_GOLD }}
          >
            AurumShield
          </span>
        </Link>

        {/* Live Gold Price */}
        <SpotTicker />
      </header>

      {/* ── Mobile Progress ── */}
      <MobileProgressBar />

      {/* ── Body: Rail + Content ── */}
      <div className="flex flex-1">
        {/* Desktop Progress Rail */}
        <aside
          className="hidden w-[260px] shrink-0 flex-col border-r border-slate-800/60 px-6 py-8 lg:flex"
          style={{ backgroundColor: NAV_BG }}
        >
          {/* Phase Steps */}
          <nav className="flex flex-1 flex-col gap-1">
            {BUYER_PHASES.map((phase, i) => (
              <PhaseStep
                key={phase}
                phase={phase}
                index={i}
                isCompleted={completedPhases.includes(phase)}
                isCurrent={currentPhase === phase}
                isAccessible={canAccess(phase)}
                isLast={i === BUYER_PHASES.length - 1}
              />
            ))}
          </nav>

          {/* Trust Footer */}
          <div className="mt-auto border-t border-slate-800/40 pt-5">
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3 text-slate-600" />
              <span className="text-[10px] leading-relaxed text-slate-600">
                256-bit TLS encryption
              </span>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-700">
              All transactions are settlement-gated and cryptographically
              sealed.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-5 py-10 lg:px-10 lg:py-14">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
