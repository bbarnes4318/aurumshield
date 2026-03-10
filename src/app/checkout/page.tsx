"use client";

/* ================================================================
   EXECUTION TERMINAL — Phase 4: Settlement Math
   ================================================================
   Bloomberg-style capital allocation ledger. 6 line items with
   strict monospace financial data. Cryptographic price lock action.
   No backend logic — structural UI only.
   ================================================================ */

import { useState, useCallback, useEffect } from "react";
import { Shield, Lock, AlertTriangle, Radio, Zap } from "lucide-react";

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";

/* ── Ledger Line Items ── */
const LEDGER = [
  {
    step: "01",
    label: "SPOT MARKET EXECUTION (400-OZ LBMA GOOD DELIVERY)",
    value: 1_060_000.0,
    optional: false,
  },
  {
    step: "02",
    label: "BRINK'S ARMORED TRANSIT & LLOYD'S SPECIE INSURANCE",
    value: 12_500.0,
    optional: false,
  },
  {
    step: "03",
    label: "AURUMSHIELD SETTLEMENT INFRASTRUCTURE (15 BPS)",
    value: 1_590.0,
    optional: false,
  },
  {
    step: "04",
    label: "INDEPENDENT ASSAY & ULTRASONIC TUNGSTEN VERIFICATION",
    value: 2_400.0,
    optional: true,
  },
];

/* ── Formatter ── */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ── Toggle Switch ── */
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
        checked
          ? "border-emerald-500/40 bg-emerald-500/20"
          : "border-slate-700 bg-slate-800"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full transition-transform duration-200 ${
          checked
            ? "translate-x-4 bg-emerald-400"
            : "translate-x-0.5 bg-slate-500"
        }`}
      />
    </button>
  );
}

/* ── Page ── */
export default function CheckoutPage() {
  const [assayEnabled, setAssayEnabled] = useState(true);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);

  /* ── Compute totals ── */
  const requiredTotal = LEDGER.filter((l) => !l.optional).reduce(
    (sum, l) => sum + l.value,
    0,
  );
  const optionalTotal = assayEnabled
    ? LEDGER.filter((l) => l.optional).reduce((sum, l) => sum + l.value, 0)
    : 0;
  const grandTotal = requiredTotal + optionalTotal;

  /* ── Price Lock Countdown ── */
  const handlePriceLock = useCallback(() => {
    if (lockCountdown !== null) return;
    setLockCountdown(60);
  }, [lockCountdown]);

  useEffect(() => {
    if (lockCountdown === null || lockCountdown <= 0) return;
    const timer = setTimeout(() => {
      setLockCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockCountdown]);

  const isLocked = lockCountdown !== null;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Terminal Header ── */}
      <div className="border-b border-slate-800 px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-3">
            <Zap className="h-4 w-4" style={{ color: BRAND_GOLD }} />
            <p
              className="font-mono text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: BRAND_GOLD }}
            >
              Execution Terminal // Settlement Math
            </p>
          </div>

          {/* Headline */}
          <h1 className="mb-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Capital Allocation Summary
          </h1>

          {/* Security Badge */}
          <div className="inline-flex items-center gap-2 border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Lock className="h-3 w-3 text-emerald-400" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Connection Secured // 256-Bit Encryption
            </span>
          </div>
        </div>
      </div>

      {/* ── Financial Ledger ── */}
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="border border-slate-800 bg-slate-900 p-6 md:p-10">
            {/* Ledger header */}
            <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
              <Shield className="h-4 w-4 text-slate-600" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
                Settlement Breakdown — All Values in USD
              </span>
            </div>

            {/* ── Line Items ── */}
            <div className="divide-y divide-slate-800">
              {LEDGER.map((item) => {
                const isActive = !item.optional || assayEnabled;

                return (
                  <div
                    key={item.step}
                    className={`flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between ${
                      !isActive ? "opacity-40" : ""
                    }`}
                  >
                    {/* Left: Label */}
                    <div className="flex items-start gap-3 sm:items-center">
                      {/* Step number */}
                      <span
                        className="shrink-0 font-mono text-[10px] font-bold tabular-nums"
                        style={{ color: BRAND_GOLD }}
                      >
                        {item.step}.
                      </span>

                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                          {item.label}
                        </span>

                        {/* Optional toggle */}
                        {item.optional && (
                          <div className="flex items-center gap-2">
                            <ToggleSwitch
                              checked={assayEnabled}
                              onChange={setAssayEnabled}
                            />
                            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                              {assayEnabled ? "Included" : "Excluded"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Value */}
                    <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-white">
                      ${fmtUSD(item.value)}
                    </span>
                  </div>
                );
              })}

              {/* ── Line 5: Grand Total ── */}
              <div className="flex flex-col gap-3 pt-6 pb-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-[10px] font-bold tabular-nums"
                    style={{ color: BRAND_GOLD }}
                  >
                    05.
                  </span>
                  <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Total Required Capital Allocation
                  </span>
                </div>
                <span
                  className="font-mono text-3xl font-bold tabular-nums"
                  style={{ color: BRAND_GOLD }}
                >
                  ${fmtUSD(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Price Lock Execution Block ── */}
          <div className="mt-8 border border-slate-800 bg-slate-900 p-6 md:p-10">
            {/* Warning */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              <p className="text-center font-mono text-xs text-red-400">
                WARNING: SPOT PRICE FLUCTUATES. EXECUTING THIS CONTRACT LOCKS
                THE NOTIONAL VALUE FOR 60 SECONDS.
              </p>
            </div>

            {/* Lock Button or Countdown */}
            {!isLocked ? (
              <button
                type="button"
                onClick={handlePriceLock}
                className="flex w-full items-center justify-center gap-3 py-6 text-xl font-bold uppercase tracking-wider transition-colors duration-150 active:scale-[0.99]"
                style={{
                  backgroundColor: BRAND_GOLD,
                  color: "#0f172a",
                }}
              >
                [ EXECUTE CRYPTOGRAPHIC PRICE LOCK ]
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                {/* Locked state */}
                <div className="flex w-full items-center justify-center gap-3 border border-emerald-500/30 bg-emerald-500/5 py-6">
                  <Lock className="h-5 w-5 text-emerald-400" />
                  <span className="font-mono text-lg font-bold uppercase tracking-wider text-emerald-400">
                    PRICE LOCKED
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums text-white">
                    — {lockCountdown}s remaining
                  </span>
                </div>

                {/* Locked total confirmation */}
                <div className="flex w-full items-center justify-between border border-slate-800 bg-slate-950 px-6 py-4">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Locked Notional
                  </span>
                  <span
                    className="font-mono text-2xl font-bold tabular-nums"
                    style={{ color: BRAND_GOLD }}
                  >
                    ${fmtUSD(grandTotal)}
                  </span>
                </div>

                {/* Proceed to settlement */}
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-3 py-5 font-mono text-sm font-bold uppercase tracking-wider transition-colors duration-150 active:scale-[0.99]"
                  style={{
                    backgroundColor: BRAND_GOLD,
                    color: "#0f172a",
                  }}
                >
                  [ PROCEED TO WIRE SETTLEMENT ]
                </button>
              </div>
            )}

            {/* Session info */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Session Active
                </span>
              </div>
              <span className="text-slate-800">|</span>
              <span className="font-mono text-[9px] text-slate-700">
                Settlement Engine v1.0.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
