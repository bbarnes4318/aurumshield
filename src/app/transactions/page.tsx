"use client";

import { useState, useCallback } from "react";
import { Banknote, Hexagon, Shield } from "lucide-react";

/* ================================================================
   MOCK SPOT PRICE
   ================================================================ */
const MOCK_SPOT_PRICE = 2345.5;

/* ================================================================
   HELPERS
   ================================================================ */

/** Strip non-digits, format with commas */
function formatWithCommas(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

/** Parse a comma-formatted string back to a number (or 0) */
function parseAmount(formatted: string): number {
  const n = Number(formatted.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Format ounces to 4 decimal places */
function formatOunces(usd: number): string {
  if (usd <= 0) return "0.0000";
  return (usd / MOCK_SPOT_PRICE).toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

/** Format spot price */
function formatSpot(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ================================================================
   PAGE
   ================================================================ */
export default function TransactionsPage() {
  const [rawValue, setRawValue] = useState("");
  const amount = parseAmount(rawValue);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRawValue(formatWithCommas(e.target.value));
    },
    [],
  );

  const handleExecute = useCallback(
    (rail: "fedwire" | "stablecoin") => {
      // eslint-disable-next-line no-console
      console.log(
        `[AurumShield] Execute via ${rail === "fedwire" ? "Fedwire" : "Stablecoin"} — $${rawValue || "0"} USD → ${formatOunces(amount)} oz Au`,
      );
    },
    [rawValue, amount],
  );

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-slate-950 -mx-5 -mt-5 -mb-5 lg:-mx-8 px-4">
      {/* ─── A. Trust Perimeter Badge ─── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-800/40 bg-emerald-950/30 px-5 py-2 backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold tracking-wide text-emerald-400">
            Entity KYB Cleared
          </span>
          <span className="text-emerald-700">•</span>
          <span className="text-xs font-medium tracking-wide text-emerald-500/80">
            Limit: Unrestricted
          </span>
        </div>
      </div>

      {/* ─── B. Central Execution Card ─── */}
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/50 p-8 sm:p-10 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-1 flex items-center justify-center gap-2.5">
            <Shield className="h-5 w-5 text-slate-500" />
            <h1 className="text-3xl font-light tracking-tight text-slate-100">
              Acquire Vaulted Gold
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            T-Zero mathematical settlement via physically allocated bullion.
          </p>
        </div>

        {/* ── Giant USD Input ── */}
        <div className="relative mb-6">
          <div className="flex items-center rounded-xl border border-slate-700/80 bg-slate-950/60 px-5 py-4 transition-colors focus-within:border-slate-600 focus-within:ring-1 focus-within:ring-slate-600/50">
            <span className="mr-1 select-none text-5xl font-light text-slate-500 font-mono">
              $
            </span>
            <input
              id="usd-amount-input"
              type="text"
              inputMode="numeric"
              value={rawValue}
              onChange={handleChange}
              placeholder="0"
              autoComplete="off"
              className="w-full bg-transparent text-5xl font-mono font-medium tabular-nums text-slate-100 placeholder:text-slate-700 outline-none"
            />
            <span className="ml-3 shrink-0 select-none text-sm font-semibold tracking-wider text-slate-600 uppercase">
              USD
            </span>
          </div>
        </div>

        {/* ── Auto-Calculating Receipt ── */}
        <div className="mb-8 rounded-xl border border-slate-800/60 bg-slate-950/40 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Guaranteed Allocation */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Guaranteed Allocation
              </span>
              <div className="flex items-center gap-2">
                {/* Gold bar icon (inline SVG for precise visual) */}
                <svg
                  className="h-4 w-4 shrink-0 text-amber-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 20h12l3-8H3l3 8z" />
                  <path d="M8 12l2-8h4l2 8" />
                </svg>
                <span className="font-mono text-lg font-semibold tabular-nums text-slate-100">
                  {formatOunces(amount)}
                </span>
                <span className="text-sm font-medium text-slate-500">oz</span>
              </div>
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-slate-800" />

            {/* Right: Spot Execution */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Spot Execution
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums text-amber-500/90">
                ${formatSpot(MOCK_SPOT_PRICE)}
                <span className="text-sm text-slate-500">/oz</span>
              </span>
            </div>
          </div>
        </div>

        {/* ─── C. Dual-Rail Action Triggers ─── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Button 1 — Fedwire */}
          <button
            id="execute-fedwire"
            type="button"
            onClick={() => handleExecute("fedwire")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-5 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-[0.98]"
          >
            <Banknote className="h-6 w-6 text-slate-400 transition-colors group-hover:text-slate-200" />
            <span className="text-sm font-semibold text-slate-200">
              Execute via Fedwire
            </span>
            <span className="text-[11px] font-medium tracking-wide text-slate-500">
              Domestic USD
            </span>
          </button>

          {/* Button 2 — Stablecoin */}
          <button
            id="execute-stablecoin"
            type="button"
            onClick={() => handleExecute("stablecoin")}
            className="group flex flex-col items-center gap-2 rounded-xl border border-amber-700/30 bg-amber-950/15 px-4 py-5 transition-all hover:border-amber-600/50 hover:bg-amber-950/25 active:scale-[0.98]"
          >
            <Hexagon className="h-6 w-6 text-amber-500/80 transition-colors group-hover:text-amber-400" />
            <span className="text-sm font-semibold text-amber-400/90">
              Execute via Stablecoin
            </span>
            <span className="text-[11px] font-medium tracking-wide text-amber-600/70">
              Instant T-Zero
            </span>
          </button>
        </div>
      </div>

      {/* ── Ambient gradient glow behind card ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-900/[0.04] blur-3xl" />
      </div>
    </div>
  );
}
