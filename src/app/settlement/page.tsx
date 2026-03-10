"use client";

/* ================================================================
   SETTLEMENT TERMINAL — Phase 5: Clearing & Logistics
   ================================================================
   High-security banking and logistics command center. 5-step
   vertical timeline from Plaid bank auth through Brink's delivery.
   No backend logic — structural UI only.
   ================================================================ */

import { useState, useCallback } from "react";
import {
  Landmark,
  Search,
  ArrowDownToLine,
  FileKey2,
  Truck,
  Shield,
  Radio,
  Lock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";

/* ── Timeline Step Wrapper ── */
function TimelineStep({
  step,
  title,
  isLast,
  status,
  children,
}: {
  step: string;
  title: string;
  isLast?: boolean;
  status: "active" | "pending" | "complete";
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-6">
      {/* Left rail — node + connecting line */}
      <div className="flex flex-col items-center">
        {/* Node */}
        <div
          className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${
            status === "complete"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : status === "active"
                ? "border-[#c6a86b]/50 bg-[#c6a86b]/10 text-[#c6a86b]"
                : "border-slate-700 bg-slate-900 text-slate-600"
          }`}
        >
          {status === "complete" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            step
          )}
        </div>

        {/* Connecting line */}
        {!isLast && (
          <div className="w-px flex-1 bg-slate-800" />
        )}
      </div>

      {/* Right — card content */}
      <div className={`mb-8 flex-1 border border-slate-800 bg-slate-900 p-6 ${
        status === "pending" ? "opacity-50" : ""
      }`}>
        {/* Card header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
            {step}. {title}
          </h3>
          {status === "complete" && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              ✓ Complete
            </span>
          )}
          {status === "active" && (
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-wider"
              style={{ color: BRAND_GOLD }}
            >
              ● Active
            </span>
          )}
          {status === "pending" && (
            <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-600">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Terminal Output Block ── */
function TerminalBlock({ lines }: { lines: string[] }) {
  return (
    <div className="border border-slate-800/60 bg-slate-950/80 p-4">
      {/* Terminal dots */}
      <div className="mb-3 flex items-center gap-1.5 border-b border-slate-800/40 pb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[7px] uppercase tracking-wider text-slate-700">
          secure-shell
        </span>
      </div>
      <div className="space-y-1.5 font-mono text-[11px]">
        {lines.map((line, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="shrink-0 text-slate-700">$</span>
            <span className="text-slate-400">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Page ── */
export default function SettlementPage() {
  const [plaidConnected, setPlaidConnected] = useState(false);

  const handlePlaidConnect = useCallback(() => {
    setPlaidConnected(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Terminal Header ── */}
      <div className="border-b border-slate-800 px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-3">
            <Landmark className="h-4 w-4" style={{ color: BRAND_GOLD }} />
            <p
              className="font-mono text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: BRAND_GOLD }}
            >
              Operations // Clearing & Logistics
            </p>
          </div>

          {/* Headline */}
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Capital Settlement Dashboard
          </h1>

          {/* Status */}
          <p className="mt-2 animate-pulse font-mono text-sm text-emerald-400">
            AWAITING TREASURY FUNDING...
          </p>
        </div>
      </div>

      {/* ── 5-Step Execution Timeline ── */}
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-4xl">

          {/* ═══ STEP 1: Plaid Bank Auth ═══ */}
          <TimelineStep
            step="01"
            title="CORPORATE TREASURY AUTHENTICATION"
            status={plaidConnected ? "complete" : "active"}
          >
            <p className="mb-5 font-mono text-[11px] leading-relaxed text-slate-500">
              Authenticate your corporate treasury account via Plaid to verify
              ownership and enable Fedwire settlement. All connections are
              encrypted end-to-end.
            </p>

            <div className="mb-5 border border-slate-800/60 bg-slate-950/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-4 w-4 text-slate-600" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                  Plaid Secure Connection
                </span>
              </div>
              {plaidConnected ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-xs text-emerald-400">
                    Treasury account authenticated — JPMorgan Chase ****8842
                  </span>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-slate-600">
                  No institutional account connected. Connect via Plaid to
                  proceed with settlement.
                </p>
              )}
            </div>

            {!plaidConnected && (
              <button
                type="button"
                onClick={handlePlaidConnect}
                className="flex w-full items-center justify-center gap-2 border px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider transition-colors duration-150"
                style={{
                  borderColor: BRAND_GOLD,
                  color: BRAND_GOLD,
                }}
              >
                <ExternalLink className="h-4 w-4" />
                [ CONNECT INSTITUTIONAL ACCOUNT VIA PLAID ]
              </button>
            )}
          </TimelineStep>

          {/* ═══ STEP 2: Verify Funds ═══ */}
          <TimelineStep
            step="02"
            title="LIQUIDITY VERIFICATION"
            status={plaidConnected ? "active" : "pending"}
          >
            <p className="mb-5 font-mono text-[11px] leading-relaxed text-slate-500">
              Real-time balance verification against the required notional
              allocation. Insufficient liquidity will halt settlement.
            </p>

            <TerminalBlock
              lines={
                plaidConnected
                  ? [
                      "Ping Plaid API... 200 OK",
                      "Account: JPMorgan Chase ****8842",
                      "Available Balance: $4,218,340.00",
                      "Required Notional: $1,076,490.00",
                      "STATUS: SUFFICIENT LIQUIDITY CONFIRMED",
                    ]
                  : [
                      "Ping Plaid API...",
                      "Required Notional: $1,076,490.00",
                      "STATUS: PENDING ACCOUNT CONNECTION",
                    ]
              }
            />
          </TimelineStep>

          {/* ═══ STEP 3: Funding via Column ═══ */}
          <TimelineStep
            step="03"
            title="CAPITAL DRAWDOWN (COLUMN N.A.)"
            status="pending"
          >
            <p className="mb-5 font-mono text-[11px] leading-relaxed text-slate-500">
              Fedwire settlement via Column N.A., a nationally chartered bank.
              Irrevocable same-day transfer. Authorization is final.
            </p>

            <div className="mb-5 border border-slate-800/60 bg-slate-950/50 p-4">
              <div className="grid grid-cols-2 gap-y-2 font-mono text-[11px]">
                <span className="text-slate-600">Routing (ABA)</span>
                <span className="text-slate-400">021000021</span>
                <span className="text-slate-600">Account</span>
                <span className="text-slate-400">8847-2391-0044</span>
                <span className="text-slate-600">Amount</span>
                <span className="text-white font-bold">$1,076,490.00</span>
                <span className="text-slate-600">Rail</span>
                <span className="text-slate-400">Fedwire (Same-Day)</span>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider opacity-50 transition-colors duration-150"
              style={{
                backgroundColor: BRAND_GOLD,
                color: "#0f172a",
              }}
            >
              <ArrowDownToLine className="h-4 w-4" />
              [ AUTHORIZE FEDWIRE DRAWDOWN ]
            </button>
          </TimelineStep>

          {/* ═══ STEP 4: Gold Certificate ═══ */}
          <TimelineStep
            step="04"
            title="CRYPTOGRAPHIC TITLE GENERATION"
            status="pending"
          >
            <p className="mb-5 font-mono text-[11px] leading-relaxed text-slate-500">
              A SHA-256 sealed Warrant of Title is generated upon settlement
              confirmation, proving cryptographic ownership of allocated bullion.
            </p>

            <TerminalBlock
              lines={[
                "SHA-256 Warrant of Title: PENDING SETTLEMENT",
                "Bailment Status: UNASSIGNED",
                "LBMA Reference: AWAITING ALLOCATION",
                "Custodian: Brink's Global Services",
                "Insurance: Lloyd's of London — Syndicate 2623",
              ]}
            />
          </TimelineStep>

          {/* ═══ STEP 5: Brink's Logistics ═══ */}
          <TimelineStep
            step="05"
            title="KINETIC LOGISTICS (BRINK'S GLOBAL)"
            status="pending"
            isLast
          >
            <p className="mb-5 font-mono text-[11px] leading-relaxed text-slate-500">
              Armored transit coordinated by Brink&apos;s Global Services.
              Full chain-of-custody tracking from vault extraction to client
              facility delivery.
            </p>

            <div className="border border-slate-800/60 bg-slate-950/50 p-4">
              <div className="space-y-3 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Extraction</span>
                  <span className="text-slate-400">ZURICH FREEPORT</span>
                </div>
                <div className="border-t border-slate-800/40" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Destination</span>
                  <span className="text-slate-400">CLIENT FACILITY</span>
                </div>
                <div className="border-t border-slate-800/40" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tarmac Status</span>
                  <span className="text-amber-400">SECURE STANDBY</span>
                </div>
                <div className="border-t border-slate-800/40" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Carrier</span>
                  <span className="text-slate-400">BRINK&apos;S ARMED CONVOY</span>
                </div>
                <div className="border-t border-slate-800/40" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">ETA</span>
                  <span className="text-slate-500">PENDING SETTLEMENT</span>
                </div>
              </div>
            </div>
          </TimelineStep>

        </div>

        {/* ── Footer ── */}
        <div className="mx-auto mt-6 max-w-4xl border-t border-slate-800 pt-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="font-mono text-[10px] leading-relaxed text-slate-600">
              All settlements are irrevocable and subject to compliance
              clearance. Fedwire finality is governed by Federal Reserve
              Operating Circular 6.
            </p>
            <div className="flex items-center gap-2">
              <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                Operations Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
