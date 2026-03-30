"use client";

/* ================================================================
   SETTLEMENT CASE — /institutional/settlement/[caseId]
   ================================================================
   The core post-authorization operational center for institutional
   gold transactions. This is the trust surface that keeps the buyer
   informed while millions may be in flight.

   ZERO-SCROLL DESIGN: At 1366x768, the entire page is visible in
   one viewport. Demo mode (?demo=true) removes scrollbars, compresses
   milestones into a 2-column grid, shows chain of custody as a
   horizontal strip, and tightens all spacing.
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Vault,
  Truck,
  Landmark,
  Lock,
} from "lucide-react";

import { useOnboardingState } from "@/hooks/use-onboarding-state";
import {
  buildSettlementCase,
  type FirstTradeIntentData,
} from "@/lib/settlement/build-settlement-case";
import type {
  SettlementCaseData,
  MilestoneState,
} from "@/lib/types/settlement-case-types";
import { ChainOfCustody } from "@/components/institutional/ChainOfCustody";

/* ================================================================
   FORMATTERS
   ================================================================ */

function fmtUsd(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtWeight(oz: number): string {
  return oz.toLocaleString("en-US", {
    minimumFractionDigits: oz % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/* ================================================================
   MILESTONE STATE COLORS
   ================================================================ */

function milestoneColor(state: MilestoneState): {
  dot: string;
  text: string;
  bg: string;
} {
  switch (state) {
    case "completed":
      return {
        dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
        text: "text-slate-300",
        bg: "bg-emerald-400/5",
      };
    case "active":
      return {
        dot: "bg-[#C6A86B] shadow-[0_0_8px_rgba(198,168,107,0.6)] animate-pulse",
        text: "text-white",
        bg: "bg-[#C6A86B]/5",
      };
    case "pending":
      return {
        dot: "bg-slate-700",
        text: "text-slate-600",
        bg: "bg-transparent",
      };
  }
}

/* ================================================================
   PRICE LABEL BADGE
   ================================================================ */

function PriceLabelBadge({ label }: { label: string }) {
  const styles: Record<string, string> = {
    INDICATIVE: "border-[#C6A86B]/30 bg-[#C6A86B]/10 text-[#C6A86B]",
    LOCKED: "border-blue-400/30 bg-blue-400/10 text-blue-400",
    FINAL: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-px text-[8px] font-bold uppercase tracking-widest ${styles[label] ?? styles.INDICATIVE}`}
    >
      {label === "LOCKED" && <Lock className="h-2 w-2" />}
      {label === "FINAL" && <CheckCircle2 className="h-2 w-2" />}
      {label}
    </span>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function SettlementCasePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = params.caseId as string;
  const isDemo = searchParams.get("demo") === "true";

  /* ── Data hooks ── */
  const { data: onboardingState, isLoading: stateLoading } =
    useOnboardingState();
  const hasRestoredRef = useRef(false);

  /* ── Local state ── */
  const [settlementCase, setSettlementCase] =
    useState<SettlementCaseData | null>(null);

  /* ── Build settlement case from metadata + sessionStorage ── */
  useEffect(() => {
    if (hasRestoredRef.current) return;
    if (stateLoading) return;
    hasRestoredRef.current = true;

    queueMicrotask(() => {
      // Source 1: onboarding_state metadata
      if (onboardingState?.metadataJson) {
        const meta = onboardingState.metadataJson as Record<string, unknown>;
        const intent = meta.__firstTradeIntent as
          | FirstTradeIntentData
          | undefined;

        if (intent && typeof intent === "object" && intent.ref) {
          const built = buildSettlementCase(intent);
          setSettlementCase(built);
          return;
        }
      }

      // Source 2: sessionStorage (marketplace execution)
      if (typeof window !== "undefined") {
        const raw = sessionStorage.getItem("aurumshield:execution");
        if (raw) {
          try {
            const exec = JSON.parse(raw) as {
              orderId: string;
              asset?: { shortName?: string; title?: string; id?: string };
              deliveryMode?: string;
              destination?: string;
              rail?: string;
              executedAt?: string;
            };

            const syntheticIntent: FirstTradeIntentData = {
              ref: exec.orderId,
              assetId: exec.asset?.id ?? "lbma-400oz",
              quantity: 1,
              deliveryMethod:
                exec.deliveryMode === "VAULT"
                  ? "vault_custody"
                  : "secure_delivery",
              vaultJurisdiction: exec.destination ?? null,
              deliveryRegion: null,
              submittedAt: exec.executedAt ?? new Date().toISOString(),
            };

            const built = buildSettlementCase(syntheticIntent);
            setSettlementCase(built);
            return;
          } catch {
            // Invalid JSON — fall through
          }
        }
      }

      // No data — show empty state
    });
  }, [stateLoading, onboardingState]);

  /* ── Loading state ── */
  if (stateLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-[#C6A86B] animate-spin" />
          <p className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Loading Settlement Case…
          </p>
        </div>
      </div>
    );
  }

  /* ── No data state ── */
  if (!settlementCase) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-800 bg-slate-900">
            <FileText className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h2 className="font-mono text-sm text-white font-bold mb-1">
              Settlement Case Not Found
            </h2>
            <p className="font-mono text-[11px] text-slate-500 leading-relaxed">
              No active settlement case was found for reference{" "}
              <strong className="text-slate-400">{caseId}</strong>. This may
              occur if the trade has not yet been authorized.
            </p>
          </div>
          <Link
            href="/institutional"
            className="font-mono text-[10px] text-[#C6A86B] tracking-wider uppercase hover:text-[#d4b87a] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Return to Workspace
          </Link>
        </div>
      </div>
    );
  }

  const sc = settlementCase;
  const completedCount = sc.milestones.filter(
    (m) => m.state === "completed"
  ).length;
  const allComplete = completedCount === sc.milestones.length;

  return (
    <div
      className={`h-full flex flex-col bg-slate-950 ${isDemo ? "overflow-hidden" : ""}`}
    >
      {/* ══════════════════════════════════════════════════════════
         HEADER — compact
         ══════════════════════════════════════════════════════════ */}
      <div className={`shrink-0 border-b border-slate-800 px-5 ${isDemo ? "py-2" : "py-3"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/institutional")}
              className="flex h-7 w-7 items-center justify-center rounded border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-xs text-white font-bold tracking-wide">
                  {sc.caseRef}
                </h1>
                <PriceLabelBadge label={sc.priceLabel} />
              </div>
              <p className="font-mono text-[9px] text-slate-500 mt-px">
                Order {sc.orderRef} · Submitted {fmtTime(sc.submittedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">
              Settlement Operations Center
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         STATUS BANNER — compact trust signal
         ══════════════════════════════════════════════════════════ */}
      <div className={`shrink-0 border-b border-slate-800 ${isDemo ? "px-5 py-1.5" : "px-5 py-2"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allComplete ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <div className="h-3 w-3 rounded-full bg-[#C6A86B] animate-pulse shadow-[0_0_8px_rgba(198,168,107,0.6)]" />
            )}
            <span
              className={`font-mono text-[10px] font-bold tracking-wide ${
                allComplete ? "text-emerald-400" : "text-[#C6A86B]"
              }`}
            >
              {allComplete ? "Settlement Complete" : "Settlement In Progress"}
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-500">
            {completedCount} of {sc.milestones.length} milestones completed
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         BODY — Two-column layout, zero scroll in demo
         ══════════════════════════════════════════════════════════ */}
      <div className={`flex-1 min-h-0 flex ${isDemo ? "overflow-hidden" : "overflow-hidden"}`}>
        {/* ─── LEFT COLUMN ─── */}
        <div className={`flex-1 ${isDemo ? "overflow-hidden p-3 space-y-2" : "overflow-y-auto p-5 space-y-4"}`}>

          {/* ── Settlement Pipeline — 2-column compact grid ── */}
          <div className={`border border-slate-800 bg-slate-900/30 ${isDemo ? "p-2.5" : "p-4"}`}>
            <h3 className="font-mono text-[8px] text-slate-500 tracking-[0.15em] uppercase font-bold mb-2">
              Settlement Pipeline
            </h3>

            {isDemo ? (
              /* DEMO: Compact 2-column grid */
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {sc.milestones.map((milestone) => {
                  const colors = milestoneColor(milestone.state);
                  return (
                    <div
                      key={milestone.milestone}
                      className={`flex items-center gap-1.5 py-0.5 px-1.5 rounded-sm ${colors.bg}`}
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${colors.dot}`} />
                      <span className={`font-mono text-[9px] font-semibold truncate ${colors.text}`}>
                        {milestone.label}
                      </span>
                      {milestone.state === "completed" && (
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400/60 shrink-0 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* PRODUCTION: Full timeline */
              <div className="space-y-0">
                {sc.milestones.map((milestone, index) => {
                  const colors = milestoneColor(milestone.state);
                  const isLast = index === sc.milestones.length - 1;
                  return (
                    <div key={milestone.milestone} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full shrink-0 ${colors.dot}`} />
                        {!isLast && <div className={`w-px flex-1 min-h-[24px] ${milestone.state === "completed" ? "bg-emerald-400/40" : "bg-slate-800"}`} />}
                      </div>
                      <div className={`pb-3 flex-1 -mt-0.5 ${isLast ? "pb-0" : ""}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-mono text-[10px] font-bold ${colors.text}`}>
                            {milestone.label}
                          </span>
                          <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">
                            {milestone.responsibleParty}
                          </span>
                        </div>
                        <p className={`font-mono text-[9px] leading-snug ${milestone.state === "pending" ? "text-slate-700" : "text-slate-500"}`}>
                          {milestone.description}
                        </p>
                        {milestone.completedAt && (
                          <span className="font-mono text-[8px] text-emerald-400/60 mt-0.5 inline-block">
                            ✓ {fmtTime(milestone.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Chain of Custody — compact horizontal ── */}
          <div className={`border border-slate-800 bg-slate-900/30 ${isDemo ? "p-2.5" : "p-4"}`}>
            <ChainOfCustody
              compact={isDemo}
              allComplete={allComplete}
            />
          </div>

          {/* ── Operations Contact — hidden in demo ── */}
          {!isDemo && (
            <div className="border border-slate-800 bg-slate-900/30 p-4">
              <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold mb-2">
                Operations Contact
              </h3>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-slate-700 bg-slate-800">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[11px] text-white font-bold">
                    Institutional Settlement Desk
                  </p>
                  <a
                    href={`mailto:${sc.escalationEmail}?subject=${encodeURIComponent(sc.escalationSubject)}`}
                    className="font-mono text-[10px] text-[#C6A86B] hover:text-[#d4b87a] transition-colors"
                  >
                    {sc.escalationEmail}
                  </a>
                  <p className="font-mono text-[8px] text-slate-600 mt-0.5">
                    Reference: <span className="text-slate-400">{sc.caseRef}</span> · SLA: 30min
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div className={`shrink-0 border-l border-slate-800 bg-slate-900/20 ${isDemo ? "w-[360px] overflow-hidden p-3 space-y-2" : "w-[420px] overflow-y-auto p-5 space-y-4"}`}>

          {/* ── Asset Summary ── */}
          <div className={`border border-slate-800 bg-black/40 ${isDemo ? "p-2.5 space-y-1.5" : "p-4 space-y-3"}`}>
            <h3 className="font-mono text-[8px] text-slate-500 tracking-[0.15em] uppercase font-bold">
              Asset Summary
            </h3>
            <div className={isDemo ? "space-y-0.5" : "space-y-2"}>
              {[
                { label: "Asset", value: sc.assetName },
                {
                  label: "Weight",
                  value: `${sc.quantity} × ${fmtWeight(sc.totalWeightOz)} troy oz`,
                  mono: true,
                },
                {
                  label: "Handling",
                  value:
                    sc.deliveryMethod === "vault_custody"
                      ? "Allocated Vaulted Custody"
                      : "Armored Physical Delivery",
                  icon:
                    sc.deliveryMethod === "vault_custody" ? (
                      <Vault className="h-2.5 w-2.5 text-[#C6A86B]" />
                    ) : (
                      <Truck className="h-2.5 w-2.5 text-[#C6A86B]" />
                    ),
                },
                ...(sc.vaultJurisdiction
                  ? [{ label: "Vault", value: sc.vaultJurisdiction }]
                  : []),
                {
                  label: "Settlement Rail",
                  value: sc.settlementRail,
                  icon: <Landmark className="h-2.5 w-2.5 text-slate-500" />,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between ${isDemo ? "py-px" : ""}`}
                >
                  <span className={`font-mono ${isDemo ? "text-[9px]" : "text-[10px]"} text-slate-500`}>
                    {row.label}
                  </span>
                  <span className={`font-mono ${isDemo ? "text-[9px]" : "text-[11px]"} text-slate-300 text-right max-w-[60%] truncate flex items-center gap-1`}>
                    {"icon" in row && row.icon}
                    {"mono" in row && row.mono ? (
                      <span className="tabular-nums">{row.value}</span>
                    ) : (
                      row.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Settlement Documents ── */}
          <div className={`border border-slate-800 bg-black/40 ${isDemo ? "p-2.5 space-y-1.5" : "p-4 space-y-3"}`}>
            <h3 className="font-mono text-[8px] text-slate-500 tracking-[0.15em] uppercase font-bold">
              Settlement Documents
            </h3>
            <div className={isDemo ? "space-y-1" : "space-y-2"}>
              {sc.artifacts.map((artifact) => (
                <div
                  key={artifact.type}
                  className={`flex items-center gap-2 ${isDemo ? "py-1 px-2" : "p-3"} border transition-colors ${
                    artifact.available
                      ? "border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:border-emerald-500/40"
                      : "border-slate-800/50 bg-slate-900/30"
                  }`}
                >
                  <FileText
                    className={`h-3 w-3 shrink-0 ${
                      artifact.available ? "text-emerald-400" : "text-slate-600"
                    }`}
                  />
                  <span
                    className={`font-mono text-[9px] font-semibold flex-1 truncate ${
                      artifact.available ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {artifact.label}
                  </span>
                  {artifact.available ? (
                    <span className="font-mono text-[7px] text-emerald-400 tracking-wider uppercase shrink-0">
                      Available
                    </span>
                  ) : (
                    <Clock className="h-2.5 w-2.5 text-slate-600 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Price Snapshot ── */}
          {sc.priceSnapshot && (
            <div className={`border border-[#C6A86B]/15 bg-slate-900/40 ${isDemo ? "p-2.5 space-y-1.5" : "p-4 space-y-3"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[8px] text-slate-500 tracking-[0.15em] uppercase font-bold">
                  Pricing Snapshot
                </h3>
                <PriceLabelBadge label={sc.priceSnapshot.label} />
              </div>

              <div className={isDemo ? "space-y-0.5" : "space-y-1.5"}>
                {[
                  {
                    label: "XAU/USD Spot",
                    value: fmtUsd(sc.priceSnapshot.spotPriceUsd),
                  },
                  {
                    label: `Spot Value (${fmtWeight(sc.priceSnapshot.totalWeightOz)} oz)`,
                    value: fmtUsd(sc.priceSnapshot.baseSpotValueUsd),
                  },
                  {
                    label: `Asset Premium (+${(sc.priceSnapshot.assetPremiumBps / 100).toFixed(2)}%)`,
                    value: fmtUsd(sc.priceSnapshot.assetPremiumUsd),
                  },
                  {
                    label: `Platform Fee (${(sc.priceSnapshot.platformFeeBps / 100).toFixed(2)}%)`,
                    value: fmtUsd(sc.priceSnapshot.platformFeeUsd),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between"
                  >
                    <span className={`font-mono ${isDemo ? "text-[9px]" : "text-[10px]"} text-slate-500`}>
                      {row.label}
                    </span>
                    <span className={`font-mono ${isDemo ? "text-[9px]" : "text-[11px]"} text-slate-300 tabular-nums`}>
                      {row.value}
                    </span>
                  </div>
                ))}

                <div className="border-t border-slate-700/50 pt-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-mono ${isDemo ? "text-[10px]" : "text-xs"} text-slate-300 font-semibold`}>
                      {sc.priceLabel === "FINAL"
                        ? "Final Total"
                        : "Estimated Total"}
                    </span>
                    <span className={`font-mono ${isDemo ? "text-xs" : "text-sm"} text-white font-bold tabular-nums`}>
                      {fmtUsd(sc.priceSnapshot.estimatedTotalUsd)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Quick Actions — hidden in demo ── */}
          {!isDemo && (
            <div className="space-y-2">
              <Link
                href="/institutional/orders"
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-800 bg-slate-900/30 font-mono text-[10px] text-slate-400 tracking-wider uppercase hover:text-white hover:border-slate-600 transition-colors"
              >
                View Trade Blotter
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/institutional/marketplace"
                className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-800 bg-slate-900/30 font-mono text-[10px] text-slate-400 tracking-wider uppercase hover:text-white hover:border-slate-600 transition-colors"
              >
                Return to Marketplace
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer — minimal in demo ── */}
      <div className={`shrink-0 border-t border-slate-800 bg-black/60 px-5 ${isDemo ? "py-1" : "py-2"}`}>
        <p className={`font-mono ${isDemo ? "text-[7px]" : "text-[9px]"} text-slate-700 text-center tracking-wider`}>
          AurumShield Settlement Operations · Append-Only Audit Trail ·
          End-to-End Encryption · Sovereign Custody
        </p>
      </div>
    </div>
  );
}
