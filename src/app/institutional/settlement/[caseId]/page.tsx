"use client";

/* ================================================================
   SETTLEMENT CASE — /institutional/settlement/[caseId]
   ================================================================
   The core post-authorization operational center for institutional
   gold transactions. This is the trust surface that keeps the buyer
   informed while millions may be in flight.

   Displays:
     1. Case header with reference, status badge, and price label
     2. Asset summary with delivery and settlement configuration
     3. 8-stage settlement timeline with responsible parties
     4. Current milestone callout with next milestone preview
     5. Artifact cards (quote, SI, custody, clearing cert)
     6. Operations escalation channel
     7. Full indicative price breakdown

   Data source:
     - onboarding_state.metadataJson.__firstTradeIntent (primary)
     - sessionStorage aurumshield:execution (marketplace trades)
     - Falls back to loading state if neither is available
   ================================================================ */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  Info,
  ArrowRight,
  ArrowLeft,
  Mail,
  ChevronRight,
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
  line: string;
  bg: string;
} {
  switch (state) {
    case "completed":
      return {
        dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
        text: "text-slate-300",
        line: "bg-emerald-400/40",
        bg: "bg-emerald-400/5",
      };
    case "active":
      return {
        dot: "bg-[#C6A86B] shadow-[0_0_10px_rgba(198,168,107,0.6)] animate-pulse",
        text: "text-white",
        line: "bg-slate-700",
        bg: "bg-[#C6A86B]/5",
      };
    case "pending":
      return {
        dot: "bg-slate-700",
        text: "text-slate-600",
        line: "bg-slate-800",
        bg: "bg-transparent",
      };
  }
}

/* ================================================================
   PRICE LABEL BADGE
   ================================================================ */

function PriceLabelBadge({ label }: { label: string }) {
  const styles: Record<string, string> = {
    INDICATIVE:
      "border-[#C6A86B]/30 bg-[#C6A86B]/10 text-[#C6A86B]",
    LOCKED:
      "border-blue-400/30 bg-blue-400/10 text-blue-400",
    FINAL:
      "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${styles[label] ?? styles.INDICATIVE}`}
    >
      {label === "LOCKED" && <Lock className="h-2.5 w-2.5" />}
      {label === "FINAL" && <CheckCircle2 className="h-2.5 w-2.5" />}
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
  const caseId = params.caseId as string;

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
  const activeMilestone = sc.milestones[sc.currentMilestoneIndex];
  const nextMilestone =
    sc.currentMilestoneIndex < sc.milestones.length - 1
      ? sc.milestones[sc.currentMilestoneIndex + 1]
      : null;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950">
      {/* ══════════════════════════════════════════════════════════
         HEADER
         ══════════════════════════════════════════════════════════ */}
      <div className="shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/institutional")}
              className="flex h-8 w-8 items-center justify-center rounded border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-mono text-sm text-white font-bold tracking-wide">
                  {sc.caseRef}
                </h1>
                <PriceLabelBadge label={sc.priceLabel} />
              </div>
              <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                Order {sc.orderRef} · Submitted{" "}
                {fmtTime(sc.submittedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              Settlement Operations Center
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         BODY — Two-column layout
         ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ─── LEFT COLUMN: Timeline + Current Milestone ─── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── Current Milestone Callout ── */}
          <div className="border border-[#C6A86B]/20 bg-[#C6A86B]/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#C6A86B] animate-pulse shadow-[0_0_8px_rgba(198,168,107,0.6)]" />
              <h3 className="font-mono text-[9px] text-[#C6A86B] tracking-[0.15em] uppercase font-bold">
                Current Status
              </h3>
            </div>
            <p className="font-mono text-sm text-white font-bold mb-1">
              {activeMilestone?.label}
            </p>
            <p className="font-mono text-[11px] text-slate-400 leading-relaxed mb-3">
              {activeMilestone?.description}
            </p>

            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-slate-500">
                Responsible:{" "}
                <strong className="text-slate-300">
                  {activeMilestone?.responsibleParty}
                </strong>
              </span>
              {nextMilestone && (
                <span className="font-mono text-[9px] text-slate-600 flex items-center gap-1">
                  Next: {nextMilestone.label}
                  <ChevronRight className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* ── Settlement Timeline ── */}
          <div className="border border-slate-800 bg-slate-900/30 p-5">
            <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold mb-4">
              Settlement Timeline
            </h3>

            <div className="space-y-0">
              {sc.milestones.map((milestone, index) => {
                const colors = milestoneColor(milestone.state);
                const isLast = index === sc.milestones.length - 1;

                return (
                  <div key={milestone.milestone} className="flex gap-4">
                    {/* Vertical line + dot */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-3 w-3 rounded-full shrink-0 ${colors.dot}`}
                      />
                      {!isLast && (
                        <div
                          className={`w-px flex-1 min-h-[32px] ${colors.line}`}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-5 flex-1 -mt-0.5 ${isLast ? "pb-0" : ""}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`font-mono text-[11px] font-bold ${colors.text}`}
                        >
                          {milestone.label}
                        </span>
                        <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">
                          {milestone.responsibleParty}
                        </span>
                      </div>
                      <p
                        className={`font-mono text-[10px] leading-relaxed ${
                          milestone.state === "pending"
                            ? "text-slate-700"
                            : "text-slate-500"
                        }`}
                      >
                        {milestone.description}
                      </p>
                      {milestone.completedAt && (
                        <span className="font-mono text-[9px] text-emerald-400/60 mt-0.5 inline-block">
                          ✓ {fmtTime(milestone.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Operations Escalation ── */}
          <div className="border border-slate-800 bg-slate-900/30 p-5">
            <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold mb-3">
              Operations Contact
            </h3>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-700 bg-slate-800">
                <Mail className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="font-mono text-xs text-white font-bold">
                  Institutional Settlement Desk
                </p>
                <a
                  href={`mailto:${sc.escalationEmail}?subject=${encodeURIComponent(sc.escalationSubject)}`}
                  className="font-mono text-[11px] text-[#C6A86B] hover:text-[#d4b87a] transition-colors"
                >
                  {sc.escalationEmail}
                </a>
                <p className="font-mono text-[9px] text-slate-600 mt-1">
                  Reference:{" "}
                  <span className="text-slate-400">{sc.caseRef}</span> ·{" "}
                  Response SLA: 30 minutes during market hours
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Asset Summary + Artifacts + Price ─── */}
        <div className="w-[420px] shrink-0 border-l border-slate-800 bg-slate-900/20 overflow-y-auto p-5 space-y-4">
          {/* ── Asset Summary ── */}
          <div className="border border-slate-800 bg-black/40 p-4 space-y-3">
            <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold">
              Asset Summary
            </h3>
            <div className="space-y-2">
              {[
                { label: "Asset", value: sc.assetName },
                {
                  label: "Quantity",
                  value: `${sc.quantity} unit${sc.quantity > 1 ? "s" : ""}`,
                },
                {
                  label: "Total Weight",
                  value: `${fmtWeight(sc.totalWeightOz)} troy oz`,
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
                      <Vault className="h-3 w-3 text-[#C6A86B]" />
                    ) : (
                      <Truck className="h-3 w-3 text-[#C6A86B]" />
                    ),
                },
                ...(sc.vaultJurisdiction
                  ? [{ label: "Vault", value: sc.vaultJurisdiction }]
                  : []),
                ...(sc.deliveryRegion
                  ? [{ label: "Region", value: sc.deliveryRegion }]
                  : []),
                {
                  label: "Settlement Rail",
                  value: sc.settlementRail,
                  icon: <Landmark className="h-3 w-3 text-slate-500" />,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between"
                >
                  <span className="font-mono text-[10px] text-slate-500">
                    {row.label}
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 text-right max-w-[60%] truncate flex items-center gap-1.5">
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

          {/* ── Settlement Artifacts ── */}
          <div className="border border-slate-800 bg-black/40 p-4 space-y-3">
            <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold">
              Settlement Documents
            </h3>
            <div className="space-y-2">
              {sc.artifacts.map((artifact) => (
                <div
                  key={artifact.type}
                  className={`flex items-start gap-3 p-3 border transition-colors ${
                    artifact.available
                      ? "border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:border-emerald-500/40"
                      : "border-slate-800/50 bg-slate-900/30"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center border ${
                      artifact.available
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    <FileText
                      className={`h-3.5 w-3.5 ${
                        artifact.available
                          ? "text-emerald-400"
                          : "text-slate-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          artifact.available
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        {artifact.label}
                      </span>
                      {artifact.available ? (
                        <span className="flex items-center gap-0.5 font-mono text-[8px] text-emerald-400 tracking-wider uppercase">
                          Available
                          <ChevronRight className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-[8px] text-slate-600 tracking-wider uppercase">
                          <Clock className="h-2.5 w-2.5" />
                          Pending
                        </span>
                      )}
                    </div>
                    <p
                      className={`font-mono text-[9px] leading-relaxed mt-0.5 ${
                        artifact.available
                          ? "text-slate-500"
                          : "text-slate-700"
                      }`}
                    >
                      {artifact.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Price Snapshot ── */}
          {sc.priceSnapshot && (
            <div className="border border-[#C6A86B]/15 bg-slate-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase font-bold">
                  Pricing Snapshot
                </h3>
                <PriceLabelBadge label={sc.priceSnapshot.label} />
              </div>

              <div className="space-y-1.5">
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
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-[10px] text-slate-500">
                      {row.label}
                    </span>
                    <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                      {row.value}
                    </span>
                  </div>
                ))}

                <div className="border-t border-slate-700/50 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-300 font-semibold">
                      {sc.priceLabel === "FINAL"
                        ? "Final Total"
                        : "Estimated Total"}
                    </span>
                    <span className="font-mono text-sm text-white font-bold tabular-nums">
                      {fmtUsd(sc.priceSnapshot.estimatedTotalUsd)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Clock className="h-3 w-3 shrink-0 text-slate-600" />
                <span className="font-mono text-[9px] text-slate-600">
                  Captured {fmtTime(sc.priceSnapshot.capturedAt)}
                </span>
              </div>

              {sc.priceLabel === "INDICATIVE" && (
                <div className="flex items-start gap-2 border border-slate-800/50 bg-slate-900/30 px-3 py-2">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#C6A86B]/60" />
                  <p className="font-mono text-[9px] text-slate-500 leading-relaxed">
                    This is an{" "}
                    <strong className="text-slate-400">
                      indicative estimate
                    </strong>
                    . Final execution price will be determined when a binding
                    quote is issued by the settlement desk.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Quick Actions ── */}
          <div className="space-y-2">
            <Link
              href="/institutional/orders"
              className="flex items-center justify-center gap-2 w-full py-3 border border-slate-800 bg-slate-900/30 font-mono text-[10px] text-slate-400 tracking-wider uppercase hover:text-white hover:border-slate-600 transition-colors"
            >
              View Trade Blotter
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/institutional/marketplace"
              className="flex items-center justify-center gap-2 w-full py-3 border border-slate-800 bg-slate-900/30 font-mono text-[10px] text-slate-400 tracking-wider uppercase hover:text-white hover:border-slate-600 transition-colors"
            >
              Return to Marketplace
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-6 py-2">
        <p className="font-mono text-[9px] text-slate-700 text-center tracking-wider">
          AurumShield Settlement Operations · Append-Only Audit Trail ·
          End-to-End Encryption · Sovereign Custody
        </p>
      </div>
    </div>
  );
}
