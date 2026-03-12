"use client";

/* ================================================================
   PRODUCER ESCROW RELEASE — Atomic Swap Settlement
   ================================================================
   The Producer reviews the escrow state and authorizes the atomic
   DvP execution: title handoff to Offtaker + Fedwire payout to
   Producer. Triggers the executeAtomicSwap server action.
   ================================================================ */

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Shield,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Activity,
} from "lucide-react";
import { executeAtomicSwap } from "@/actions/settlement-actions";

/* ----------------------------------------------------------------
   MOCK ORDER DATA
   In production this is fetched via TanStack Query from the API.
   ---------------------------------------------------------------- */
const MOCK_ORDER = {
  id: "ORD-8842-XAU",
  orderId: "ORD-8842-XAU",
  asset: "400 oz LBMA Good Delivery Bar",
  quantity: 10,
  totalWeightOz: 4_000,
  fineness: "≥995.0",
  lockedPricePerOz: 2_652.65,
  totalNotional: 10_610_600.0,
  offtakerEntity: "Aureus Capital Partners Ltd.",
  offtakerLei: "5493001KJTIIGC8Y1R12",
  vaultLocation: "Zurich Free Trade Zone — Malca-Amit Vault VII",
  status: "FUNDS_CLEARED_READY_FOR_RELEASE" as const,
  escrowConfirmedAt: "2026-03-11T18:32:00Z",
  producerId: "producer-001",
};

/* ----------------------------------------------------------------
   CURRENCY FORMATTER
   ---------------------------------------------------------------- */
function fmt(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function ProducerSettlementPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId ?? MOCK_ORDER.id;

  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    titleHash?: string;
    outboundTransferId?: string;
    settledAt?: string;
    error?: string;
  } | null>(null);

  const isReady = MOCK_ORDER.status === "FUNDS_CLEARED_READY_FOR_RELEASE";
  const isCompleted = result?.success === true;

  function handleExecuteSwap() {
    startTransition(async () => {
      try {
        const res = await executeAtomicSwap(orderId, MOCK_ORDER.producerId);
        setResult(res);
        if (res.success) {
          // Refresh server data after successful execution
          router.refresh();
        }
      } catch (err) {
        setResult({
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "DvP Execution Failed. Escrow remains locked.",
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-14">
      <div className="max-w-5xl mx-auto p-8 pt-12">
        {/* ── Page Header ── */}
        <div className="flex items-center gap-3 mb-1">
          <Shield className="h-4 w-4 text-gold-primary" />
          <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
            Producer Settlement Terminal
          </span>
        </div>
        <h1 className="font-mono text-2xl text-white font-bold tracking-tight mb-2">
          Escrow Release &amp; Atomic Swap
        </h1>
        <p className="font-mono text-[11px] text-slate-600 mb-8">
          Order Reference: {orderId}
        </p>

        {/* ── Escrow State Banner ── */}
        <div
          className={`border p-4 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] flex items-center justify-between mb-8 ${
            isCompleted
              ? "bg-emerald-950/30 border-emerald-500/50"
              : isReady
                ? "bg-slate-900 border-gold-primary/50"
                : "bg-slate-900 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Lock className="h-4 w-4 text-gold-primary shrink-0" />
            )}
            <span className="font-mono text-xs text-white tracking-wider uppercase">
              {isCompleted
                ? "ATOMIC SWAP EXECUTED — TITLE TRANSFERRED & FUNDS ROUTED"
                : isReady
                  ? "ESCROW FUNDED — READY FOR DVP EXECUTION"
                  : `STATE: ${MOCK_ORDER.status}`}
            </span>
          </div>
          {isReady && !isCompleted && (
            <span className="font-mono text-[10px] text-gold-primary animate-pulse flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-primary" />
              AWAITING PRODUCER AUTHORIZATION
            </span>
          )}
        </div>

        {/* ── Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ─── LEFT: Order & Escrow Summary ─── */}
          <div className="space-y-6">
            {/* Asset Summary */}
            <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  Escrowed Asset Summary
                </h2>
              </div>

              <div className="space-y-3">
                <DataRow label="Order Reference" value={orderId} />
                <DataRow
                  label="Instrument"
                  value={`${MOCK_ORDER.quantity}x ${MOCK_ORDER.asset}`}
                />
                <DataRow
                  label="Total Weight"
                  value={`${fmt(MOCK_ORDER.totalWeightOz, 0)} troy oz`}
                  mono
                />
                <DataRow label="Fineness" value={MOCK_ORDER.fineness} mono />
                <DataRow
                  label="Locked Price/oz"
                  value={`$${fmt(MOCK_ORDER.lockedPricePerOz)}`}
                  mono
                />

                <div className="border-t border-slate-800 pt-3 mt-3">
                  <DataRow label="Vault Custody" value={MOCK_ORDER.vaultLocation} />
                </div>
              </div>
            </div>

            {/* Offtaker (Counterparty) */}
            <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  Offtaker (Counterparty)
                </h2>
              </div>

              <div className="space-y-3">
                <DataRow label="Legal Entity" value={MOCK_ORDER.offtakerEntity} />
                <DataRow label="LEI" value={MOCK_ORDER.offtakerLei} mono />
                <DataRow
                  label="Escrow Confirmed"
                  value={new Date(MOCK_ORDER.escrowConfirmedAt).toLocaleString()}
                  mono
                />
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Execution Panel ─── */}
          <div className="space-y-6">
            {/* Notional / DvP Summary */}
            <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <Zap className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
                  DvP Execution Summary
                </h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                  <span className="font-mono text-[10px] text-slate-500 tracking-wider uppercase">
                    Escrowed Notional
                  </span>
                  <span className="font-mono text-lg text-white font-bold tabular-nums">
                    ${fmt(MOCK_ORDER.totalNotional)}
                  </span>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-4 space-y-2">
                  <p className="font-mono text-[10px] text-slate-500 tracking-wider uppercase mb-3">
                    Upon Execution
                  </p>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 text-gold-primary mt-0.5 shrink-0" />
                    <p className="font-mono text-[10px] text-slate-400 leading-relaxed">
                      Cryptographic title signed and transferred to Offtaker
                      via Turnkey.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 text-gold-primary mt-0.5 shrink-0" />
                    <p className="font-mono text-[10px] text-slate-400 leading-relaxed">
                      Outbound Fedwire of{" "}
                      <span className="text-white font-bold">
                        ${fmt(MOCK_ORDER.totalNotional)}
                      </span>{" "}
                      routed to your pre-verified counterparty account via
                      Column Bank.
                    </p>
                  </div>
                </div>
              </div>

              {/* Execution Result */}
              {result && (
                <div
                  className={`mt-4 p-4 border ${
                    result.success
                      ? "bg-emerald-950/20 border-emerald-500/30"
                      : "bg-red-950/20 border-red-500/30"
                  }`}
                >
                  {result.success ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider uppercase">
                          Atomic Swap Executed
                        </span>
                      </div>
                      <DataRow
                        label="Title Hash"
                        value={result.titleHash?.slice(0, 24) + "..." || "—"}
                        mono
                      />
                      <DataRow
                        label="Outbound Wire"
                        value={result.outboundTransferId || "—"}
                        mono
                      />
                      <DataRow
                        label="Settled At"
                        value={
                          result.settledAt
                            ? new Date(result.settledAt).toLocaleString()
                            : "—"
                        }
                        mono
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-mono text-xs text-red-400 font-bold mb-1">
                          Execution Failed
                        </p>
                        <p className="font-mono text-[10px] text-red-400/80">
                          {result.error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Legal Disclaimer */}
            <div className="border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4">
              <p className="font-mono text-[10px] text-slate-600 leading-relaxed">
                By clicking &quot;Execute Atomic Swap &amp; Route Funds&quot;
                you authorize the irrevocable release of the escrowed physical
                asset and the simultaneous routing of settlement funds to your
                designated counterparty account. This operation is
                cryptographically binding and cannot be reversed after
                execution.
              </p>
            </div>

            {/* CTA — Execute Atomic Swap */}
            <div>
              <button
                onClick={handleExecuteSwap}
                disabled={!isReady || isPending || isCompleted}
                className={`w-full font-bold text-sm tracking-wide py-4 flex items-center justify-center gap-2 font-mono transition-colors ${
                  !isReady || isPending || isCompleted
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                    : "bg-gold-primary text-slate-950 hover:bg-gold-hover cursor-pointer"
                }`}
              >
                {isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Executing Atomic Swap...
                  </>
                ) : isCompleted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    DvP Executed — Settlement Complete
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Execute Atomic Swap &amp; Route Funds
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
                EXECUTION IS CRYPTOGRAPHICALLY BINDING. ESCROW RELEASE IS
                IRREVOCABLE.
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="mt-10 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Clearing · Delivery versus Payment · Sovereign Financial
          Infrastructure
        </p>
      </div>
    </div>
  );
}

/* ── Inline Helper: Data Row ── */
function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase shrink-0 mr-4">
        {label}
      </span>
      <span
        className={`font-mono text-sm text-right text-white ${mono ? "tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
