"use client";

/* ================================================================
   GOLDWIRE PORTAL — Phase 6: Treasury Liquidity Nexus
   ================================================================
   Post-settlement dashboard for vaulted collateral management and
   fractional liquidation via the Goldwire card network.
   No backend logic — structural UI only.
   ================================================================ */

import { useState, useCallback, useMemo } from "react";
import { Radio, Shield, CreditCard, ArrowDownToLine, Flame } from "lucide-react";

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";
const MOCK_SPOT = 2_650.0;
const MOCK_WEIGHT = 400.0;
const MOCK_LIQUIDITY = 1_060_000.0;

/* ── Mock Ledger ── */
const MOCK_ACTIVITY = [
  {
    timestamp: "2026-03-09 14:22:01",
    execution: "Aviation Lease Settlement",
    fiat: 2_000_000.0,
    burn: -0.754,
  },
  {
    timestamp: "2026-03-05 09:14:55",
    execution: "Supply Chain Margin Call",
    fiat: 15_000_000.0,
    burn: -5.659,
  },
  {
    timestamp: "2026-02-28 11:03:44",
    execution: "Maritime Insurance Premium",
    fiat: 750_000.0,
    burn: -0.283,
  },
  {
    timestamp: "2026-02-20 16:47:12",
    execution: "Cross-Border Infrastructure Bond",
    fiat: 8_400_000.0,
    burn: -3.17,
  },
];

/* ── Formatter ── */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ── Page ── */
export default function GoldwirePortalPage() {
  const [drawdownInput, setDrawdownInput] = useState("");

  const drawdownAmount = useMemo(() => {
    const n = parseFloat(drawdownInput.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  }, [drawdownInput]);

  const fractionalBurn = useMemo(() => {
    if (drawdownAmount <= 0 || MOCK_SPOT <= 0) return 0;
    return drawdownAmount / MOCK_SPOT;
  }, [drawdownAmount]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      setDrawdownInput(raw);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Collateral Header ── */}
      <div className="border-b border-slate-800 px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-3">
            <CreditCard className="h-4 w-4" style={{ color: BRAND_GOLD }} />
            <p
              className="font-mono text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: BRAND_GOLD }}
            >
              Treasury Management // Goldwire Liquidity Nexus
            </p>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Active Vaulted Collateral
          </h1>

          {/* Collateral Summary */}
          <div className="flex flex-wrap gap-6 border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                Total Encumbered Weight
              </span>
              <span className="font-mono text-xl font-bold tabular-nums text-white">
                {MOCK_WEIGHT.toFixed(3)} troy oz
              </span>
            </div>

            <div className="hidden w-px bg-slate-800 sm:block" />

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                Available Liquidity
              </span>
              <span
                className="font-mono text-xl font-bold tabular-nums"
                style={{ color: BRAND_GOLD }}
              >
                ${fmtUSD(MOCK_LIQUIDITY)}
              </span>
            </div>

            <div className="hidden w-px bg-slate-800 sm:block" />

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                Storage
              </span>
              <span className="font-mono text-sm font-semibold text-slate-300">
                ZURICH FREEPORT (LBMA VERIFIED)
              </span>
            </div>

            <div className="hidden w-px bg-slate-800 sm:block" />

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                Live Spot
              </span>
              <div className="flex items-center gap-2">
                <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
                <span className="font-mono text-sm font-bold tabular-nums text-white">
                  ${fmtUSD(MOCK_SPOT)}/oz
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Drawdown Terminal (Split Layout) ── */}
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">

            {/* ═══ LEFT: Tungsten Black Card ═══ */}
            <div className="flex items-center justify-center">
              <div
                className="relative w-full overflow-hidden border"
                style={{
                  aspectRatio: "1.586",
                  maxWidth: "420px",
                  borderColor: `${BRAND_GOLD}66`,
                  background:
                    "linear-gradient(135deg, #334155 0%, #1e293b 30%, #0f172a 70%, #000000 100%)",
                  boxShadow: `0 10px 40px rgba(198,168,107,0.15), 0 2px 8px rgba(0,0,0,0.5)`,
                  borderRadius: "12px",
                }}
              >
                {/* Card content */}
                <div className="relative z-10 flex h-full flex-col justify-between p-6">
                  {/* Top: Brand + Chip */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
                        style={{ color: BRAND_GOLD }}
                      >
                        Goldwire
                      </p>
                      <p className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-500">
                        Institutional Reserve Card
                      </p>
                    </div>

                    {/* EMV chip */}
                    <div
                      className="flex h-9 w-11 items-center justify-center rounded-md border"
                      style={{
                        borderColor: `${BRAND_GOLD}50`,
                        background: `linear-gradient(135deg, ${BRAND_GOLD}30 0%, ${BRAND_GOLD}10 100%)`,
                      }}
                    >
                      <div className="grid grid-cols-3 gap-px">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-1.5 w-1.5 rounded-[1px]"
                            style={{ backgroundColor: `${BRAND_GOLD}60` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Account number */}
                  <div>
                    <p className="font-mono text-lg tracking-[0.25em] text-slate-300">
                      4392 •••• •••• 7841
                    </p>
                  </div>

                  {/* Bottom: Holder + Network */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                        Card Holder
                      </p>
                      <p className="font-mono text-xs text-slate-400">
                        MERIDIAN SOVEREIGN CAPITAL
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                        Collateral-Backed
                      </p>
                      <p
                        className="font-mono text-xs font-bold"
                        style={{ color: BRAND_GOLD }}
                      >
                        Au 999.9
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subtle diagonal shimmer */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, transparent 40%, rgba(198,168,107,0.04) 50%, transparent 60%)",
                  }}
                />
              </div>
            </div>

            {/* ═══ RIGHT: Liquidation Terminal ═══ */}
            <div className="flex flex-col border border-slate-800 bg-slate-900 p-6">
              <div className="mb-5 flex items-center gap-3">
                <Flame className="h-4 w-4" style={{ color: BRAND_GOLD }} />
                <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Instant Liquidation
                </h2>
              </div>

              <p className="mb-6 font-mono text-[10px] leading-relaxed text-slate-500">
                Convert vaulted gold collateral to fiat instantly via the
                Goldwire network. Fractional burns are settled against live spot.
              </p>

              {/* Input */}
              <label
                htmlFor="drawdown-amount"
                className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600"
              >
                Drawdown Amount (USD)
              </label>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-3xl text-slate-600">
                  $
                </span>
                <input
                  id="drawdown-amount"
                  type="text"
                  inputMode="decimal"
                  value={drawdownInput}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full border border-slate-700 bg-slate-950 py-4 pl-12 pr-4 font-mono text-3xl tabular-nums text-white placeholder:text-slate-700 transition-all focus:border-[#c6a86b]/50 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/30"
                />
              </div>

              {/* Dynamic math */}
              <div className="mb-6 border border-slate-800/60 bg-slate-950/50 px-4 py-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-500">
                    Equivalent Fractional Burn
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      fractionalBurn > 0 ? "text-red-400" : "text-slate-600"
                    }`}
                  >
                    {fractionalBurn > 0 ? "-" : ""}
                    {fractionalBurn.toFixed(3)} oz
                  </span>
                </div>
                {fractionalBurn > 0 && (
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
                    <span className="text-slate-600">
                      Remaining Collateral After Burn
                    </span>
                    <span className="tabular-nums text-slate-400">
                      {(MOCK_WEIGHT - fractionalBurn).toFixed(3)} oz
                    </span>
                  </div>
                )}
              </div>

              {/* Execute button */}
              <button
                type="button"
                disabled={drawdownAmount <= 0}
                className="mt-auto flex w-full items-center justify-center gap-2 py-4 font-mono text-sm font-bold uppercase tracking-wider transition-colors duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                style={{
                  backgroundColor: BRAND_GOLD,
                  color: "#0f172a",
                }}
              >
                <ArrowDownToLine className="h-4 w-4" />
                [ EXECUTE FRACTIONAL LIQUIDATION ]
              </button>
            </div>
          </div>

          {/* ── Fractional Ledger (Recent Activity) ── */}
          <div className="mt-10 border border-slate-800 bg-slate-900">
            {/* Table header */}
            <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-4">
              <Shield className="h-4 w-4 text-slate-600" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Recent Liquidation Activity
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-6 py-3 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                      Execution
                    </th>
                    <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                      Fiat Drawdown
                    </th>
                    <th className="px-6 py-3 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                      Fractional Burn
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {MOCK_ACTIVITY.map((row, i) => (
                    <tr
                      key={i}
                      className="transition-colors hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-6 py-3.5 tabular-nums text-slate-500">
                        {row.timestamp}
                      </td>
                      <td className="px-6 py-3.5 text-slate-300">
                        {row.execution}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right tabular-nums text-white">
                        ${fmtUSD(row.fiat)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right tabular-nums text-red-400">
                        {row.burn.toFixed(3)} oz
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="font-mono text-[10px] leading-relaxed text-slate-600">
                Fractional liquidations are settled against live XAU/USD spot.
                All burns are cryptographically recorded on the Goldwire ledger.
              </p>
              <div className="flex items-center gap-2">
                <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Goldwire Network Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
