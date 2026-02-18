"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { useMyReservations, useListings, useConvertReservation, useDashboardData, useCorridors, useHubs, useCounterparties, useVerificationCase } from "@/hooks/use-mock-queries";
import type { Listing } from "@/lib/mock-data";
import {
  computeTRI,
  validateCapital,
  checkBlockers,
  hasBlockLevel,
  determineApproval,
  type MarketplacePolicySnapshot,
} from "@/lib/policy-engine";

/* ---------- Countdown Timer ---------- */
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  });

  useEffect(() => {
    const id = setInterval(() => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remaining <= 0) return <span className="text-sm text-danger font-semibold">EXPIRED</span>;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <span className="font-mono text-2xl tabular-nums font-bold text-warning">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }
function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

const STATE_COLORS: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success border-success/20",
  EXPIRED: "bg-text-faint/10 text-text-faint border-text-faint/20",
  CONVERTED: "bg-info/10 text-info border-info/20",
};
const SEV_CLR: Record<string, string> = { BLOCK: "text-danger bg-danger/10", WARN: "text-warning bg-warning/10", INFO: "text-info bg-info/10" };
const TIER_CLR: Record<string, string> = { auto: "text-success", "desk-head": "text-warning", "credit-committee": "text-warning", board: "text-danger" };

export default function ReservationDetailPage() {
  return (
    <RequireAuth>
      <ReservationDetailContent />
    </RequireAuth>
  );
}

function ReservationDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const resQ = useMyReservations(userId);
  const listingsQ = useListings();
  const dashQ = useDashboardData("phase1");
  const corQ = useCorridors();
  const hubQ = useHubs();
  const cpQ = useCounterparties();
  const vcQ = useVerificationCase(userId);
  const convertMut = useConvertReservation();
  const [convertError, setConvertError] = useState<string | null>(null);

  const reservation = useMemo(() => resQ.data?.find((r) => r.id === params.id), [resQ.data, params.id]);
  const listing = useMemo(() => listingsQ.data?.find((l: Listing) => l.id === reservation?.listingId), [listingsQ.data, reservation?.listingId]);

  /* Verification case gate */
  const verificationCase = vcQ.data;
  const isVerified = verificationCase?.status === "VERIFIED";

  /* Policy evaluation for live preview */
  const policyPreview = useMemo(() => {
    if (!reservation || !listing || !dashQ.data?.capital) return null;
    const capital = dashQ.data.capital;
    /* Derive counterparty from seller — use first active CP for policy evaluation */
    const cp = cpQ.data?.[0];
    const corridor = corQ.data?.find((c) =>
      c.sourceCountry === listing.jurisdiction || c.destinationCountry === listing.jurisdiction
    );
    const hub = hubQ.data?.find((h) => h.id === listing.vaultHubId);
    if (!cp || !corridor || !hub) return null;

    const notional = reservation.weightOz * reservation.pricePerOzLocked;
    const tri = computeTRI(cp, corridor, notional, capital);
    const capVal = validateCapital(notional, capital);
    const blockers = checkBlockers(cp, corridor, hub, tri, notional, capital);
    const approval = determineApproval(tri.score, notional);
    return { tri, capVal, blockers, approval, cp, corridor, hub, notional };
  }, [reservation, listing, dashQ.data, cpQ.data, corQ.data, hubQ.data]);

  const handleConvert = useCallback(() => {
    if (!reservation || !policyPreview) return;
    setConvertError(null);

    // Check verification gate FIRST
    if (!isVerified) {
      const nextStep = verificationCase?.nextRequiredStepId ?? "Unknown";
      const caseStatus = verificationCase?.status ?? "NOT_STARTED";
      setConvertError(
        `IDENTITY PERIMETER NOT VERIFIED — case status: ${caseStatus} — next required step: ${nextStep}`
      );
      return;
    }

    if (hasBlockLevel(policyPreview.blockers)) {
      const blockMsg = policyPreview.blockers
        .filter((b) => b.severity === "BLOCK")
        .map((b) => `${b.title}: ${b.detail}`)
        .join(" | ");
      setConvertError(`BLOCKED — ${blockMsg}`);
      return;
    }

    const snapshot: MarketplacePolicySnapshot = {
      triScore: policyPreview.tri.score,
      triBand: policyPreview.tri.band,
      ecrBefore: policyPreview.capVal.currentECR,
      ecrAfter: policyPreview.capVal.postTxnECR,
      hardstopBefore: policyPreview.capVal.currentHardstopUtil,
      hardstopAfter: policyPreview.capVal.postTxnHardstopUtil,
      approvalTier: policyPreview.approval.tier,
      blockers: policyPreview.blockers,
      timestamp: new Date().toISOString(),
    };

    convertMut.mutate(
      { reservationId: reservation.id, userId, policySnapshot: snapshot },
      { onSuccess: (order) => router.push(`/orders/${order.id}`),
        onError: (err) => setConvertError(err instanceof Error ? err.message : "Conversion failed.") },
    );
  }, [reservation, policyPreview, convertMut, router, userId, isVerified, verificationCase]);

  const isLoading = resQ.isLoading || listingsQ.isLoading || dashQ.isLoading || corQ.isLoading || hubQ.isLoading || cpQ.isLoading || vcQ.isLoading;
  if (isLoading) return <LoadingState message="Loading reservation detail…" />;
  if (!reservation) return <ErrorState title="Not Found" message={`Reservation ${params.id} not found.`} />;

  const notional = reservation.weightOz * reservation.pricePerOzLocked;
  const hasBlocks = policyPreview ? hasBlockLevel(policyPreview.blockers) : false;
  const conversionBlocked = hasBlocks || !isVerified;

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/reservations" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Reservations
        </Link>
      </div>

      <PageHeader title={`Reservation ${reservation.id}`} description={listing?.title ?? "—"} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Left: Listing Summary */}
        <DashboardPanel title="Listing Summary" tooltip="Gold listing detail from the institutional marketplace" asOf={listing?.createdAt ?? ""}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-text-faint">Reference</dt><dd className="font-mono text-text">{listing?.id ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Title</dt><dd className="text-text">{listing?.title ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Form</dt><dd className="text-text capitalize">{listing?.form ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Purity</dt><dd className="tabular-nums text-text">.{listing?.purity ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Vault</dt><dd className="text-text">{listing?.vaultName ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Jurisdiction</dt><dd className="text-text">{listing?.jurisdiction ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Price / oz</dt><dd className="tabular-nums text-text">${listing?.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 }) ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Seller</dt><dd className="text-text text-xs">{listing?.sellerName ?? "—"}</dd></div>
          </dl>
        </DashboardPanel>

        {/* Right: Reservation State + Policy + Convert */}
        <div className="space-y-4">
          <DashboardPanel title="Reservation State" tooltip="Deterministic reservation lock with 10-minute TTL" asOf={reservation.createdAt}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", STATE_COLORS[reservation.state] ?? "")}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {reservation.state}
                </span>
                {reservation.state === "ACTIVE" && <CountdownTimer expiresAt={reservation.expiresAt} />}
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-text-faint">Weight</dt><dd className="tabular-nums text-text">{reservation.weightOz} oz</dd></div>
                <div className="flex justify-between"><dt className="text-text-faint">Locked Price</dt><dd className="tabular-nums text-text">${reservation.pricePerOzLocked.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
                <div className="flex justify-between"><dt className="text-text-faint">Notional</dt><dd className="tabular-nums font-semibold text-text">${notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
              </dl>
            </div>
          </DashboardPanel>

          {/* Policy Preview (only for ACTIVE) */}
          {reservation.state === "ACTIVE" && policyPreview && (
            <aside className="rounded-lg border border-border bg-surface-1 divide-y divide-border">
              {/* TRI */}
              <div className="p-4">
                <p className="typo-label mb-2">Policy Evaluation (Live)</p>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                    policyPreview.tri.band === "green" ? "text-success bg-success/10 border-success" :
                    policyPreview.tri.band === "amber" ? "text-warning bg-warning/10 border-warning" :
                    "text-danger bg-danger/10 border-danger"
                  )}>
                    <span className="text-lg font-bold tabular-nums">{policyPreview.tri.score}</span>
                    <span className="text-[10px] font-semibold uppercase">{policyPreview.tri.band}</span>
                  </div>
                  <span className={cn("text-xs font-semibold", TIER_CLR[policyPreview.approval.tier])}>{policyPreview.approval.label}</span>
                </div>
              </div>

              {/* Capital */}
              <div className="p-4">
                <p className="typo-label mb-2">Capital Impact</p>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><dt className="text-text-faint">ECR</dt><dd className="tabular-nums text-text">{policyPreview.capVal.currentECR.toFixed(2)}x → <span className={policyPreview.capVal.postTxnECR > 7 ? "text-danger font-semibold" : "font-semibold"}>{policyPreview.capVal.postTxnECR.toFixed(2)}x</span></dd></div>
                  <div className="flex justify-between"><dt className="text-text-faint">Hardstop</dt><dd className="tabular-nums text-text">{pct(policyPreview.capVal.currentHardstopUtil)} → <span className={policyPreview.capVal.postTxnHardstopUtil > 0.9 ? "text-danger font-semibold" : "font-semibold"}>{pct(policyPreview.capVal.postTxnHardstopUtil)}</span></dd></div>
                  <div className="flex justify-between"><dt className="text-text-faint">Remaining</dt><dd className="tabular-nums text-text">{fmt(policyPreview.capVal.hardstopRemaining)}</dd></div>
                </dl>
              </div>

              {/* Blockers */}
              <div className="p-4">
                <p className="typo-label mb-2">Blockers</p>
                {policyPreview.blockers.length === 0 ? (
                  <p className="text-xs text-success">✓ No blockers detected</p>
                ) : (
                  <ul className="space-y-1.5">
                    {policyPreview.blockers.map((bl) => (
                      <li key={bl.id} className="flex items-start gap-2 text-xs">
                        <span className={cn("shrink-0 rounded px-1 py-0.5 text-[10px] font-bold", SEV_CLR[bl.severity])}>{bl.severity}</span>
                        <span className="text-text-muted">{bl.title}: {bl.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Verification gate */}
              <div className="p-4">
                <p className="typo-label mb-2">Identity Perimeter</p>
                {isVerified ? (
                  <p className="text-xs text-success font-medium">✓ Verified — cleared for conversion</p>
                ) : (
                  <div className="text-xs">
                    <p className="text-danger font-medium">✗ Not verified — conversion blocked</p>
                    <p className="text-text-faint mt-1">
                      Status: {verificationCase?.status ?? "NOT_STARTED"} | Next step: {verificationCase?.nextRequiredStepId ?? "—"}
                    </p>
                    <Link href="/verification" className="text-gold hover:text-gold-hover mt-1 inline-block font-medium">
                      Open case file →
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          )}

          {convertError && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {convertError}
            </div>
          )}

          {reservation.state === "ACTIVE" && (
            <button
              onClick={handleConvert}
              disabled={convertMut.isPending || conversionBlocked}
              className={cn(
                "w-full rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                conversionBlocked
                  ? "bg-danger/10 border border-danger/30 text-danger"
                  : "bg-gold text-bg hover:bg-gold-hover active:bg-gold-pressed"
              )}
            >
              {convertMut.isPending ? "Converting…" : conversionBlocked ? "Conversion Blocked" : "Convert to Order"}
            </button>
          )}

          {reservation.state === "CONVERTED" && (
            <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-info">
              This reservation has been converted to an order. <Link href="/orders" className="font-medium text-gold hover:text-gold-hover transition-colors">View Orders →</Link>
            </div>
          )}

          {reservation.state === "EXPIRED" && (
            <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-text-faint">
              This reservation has expired. Inventory has been released back to the listing.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
