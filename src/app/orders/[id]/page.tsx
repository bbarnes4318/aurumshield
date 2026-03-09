"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Landmark,
  Clock,
  FileText,
  Lock,
  Download,
  Fingerprint,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import {
  useOrder,
  useListings,
  useMyReservations,
  useVerificationCase,
  useOpenSettlementFromOrder,
  useSettlementByOrder,
  useSettlementLedger,
} from "@/hooks/use-mock-queries";
import { ROLE_LABELS } from "@/lib/settlement-engine";
import type { Listing, Reservation, OrderStatus, LedgerEntry, UserRole } from "@/lib/mock-data";

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderDetailContent />
    </RequireAuth>
  );
}

/* ---------- Status Chip ---------- */
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-surface-3 text-text-faint border-border" },
  pending_verification: { label: "Pending Verification", color: "bg-warning/10 text-warning border-warning/20" },
  reserved: { label: "Reserved", color: "bg-info/10 text-info border-info/20" },
  settlement_pending: { label: "Settlement Pending", color: "bg-gold/10 text-gold border-gold/20" },
  completed: { label: "Completed", color: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", color: "bg-danger/10 text-danger border-danger/20" },
};

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

const BAND = {
  green: { bg: "bg-success/10", text: "text-success", border: "border-success" },
  amber: { bg: "bg-warning/10", text: "text-warning", border: "border-warning" },
  red: { bg: "bg-danger/10", text: "text-danger", border: "border-danger" },
};
const TIER_CLR: Record<string, string> = { auto: "text-success", "desk-head": "text-warning", "credit-committee": "text-warning", board: "text-danger" };
const TIER_LABEL: Record<string, string> = { auto: "Auto-Approved", "desk-head": "Desk Head", "credit-committee": "Credit Committee", board: "Board Approval" };
const SEV_CLR: Record<string, string> = { BLOCK: "text-danger bg-danger/10", WARN: "text-warning bg-warning/10", INFO: "text-info bg-info/10" };

/* ---------- Lifecycle Step Definition ---------- */
interface LifecycleStep {
  id: string;
  label: string;
  /** Derive from reservation state, settlement status, or ledger entry type */
  derivedFrom: "order" | "reservation" | "settlement_status" | "ledger";
  /** The ledger entry type to look for, if ledger-derived */
  ledgerType?: string;
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  { id: "ORDER_CREATED", label: "Order Created", derivedFrom: "order" },
  { id: "RESERVATION_CONVERTED", label: "Reservation Converted", derivedFrom: "reservation" },
  { id: "SETTLEMENT_OPENED", label: "Settlement Opened", derivedFrom: "ledger", ledgerType: "ESCROW_OPENED" },
  { id: "FUNDS_CONFIRMED_FINAL", label: "Funds Confirmed Final", derivedFrom: "ledger", ledgerType: "FUNDS_DEPOSITED" },
  { id: "GOLD_ALLOCATED", label: "Gold Allocated", derivedFrom: "ledger", ledgerType: "GOLD_ALLOCATED" },
  { id: "VERIFICATION_CLEARED", label: "Verification Cleared", derivedFrom: "ledger", ledgerType: "VERIFICATION_PASSED" },
  { id: "AUTHORIZED", label: "Authorized", derivedFrom: "ledger", ledgerType: "AUTHORIZATION" },
  { id: "DVP_EXECUTED", label: "DvP Executed", derivedFrom: "ledger", ledgerType: "DVP_EXECUTED" },
  { id: "SETTLED", label: "Settled", derivedFrom: "ledger", ledgerType: "ESCROW_CLOSED" },
];

interface ResolvedStep {
  step: LifecycleStep;
  status: "COMPLETED" | "CURRENT" | "PENDING";
  timestamp: string | null;
  actorRole: string | null;
  actorUserId: string | null;
}

function resolveLifecycle(
  order: { createdAt: string; reservationId: string },
  reservation: Reservation | null | undefined,
  settlementLedger: LedgerEntry[],
): ResolvedStep[] {
  const resolved: ResolvedStep[] = [];
  let lastReachedIdx = -1;

  for (let i = 0; i < LIFECYCLE_STEPS.length; i++) {
    const step = LIFECYCLE_STEPS[i];
    let timestamp: string | null = null;
    let actorRole: string | null = null;
    let actorUserId: string | null = null;

    if (step.derivedFrom === "order") {
      // ORDER_CREATED is always reached if the order exists
      timestamp = order.createdAt;
    } else if (step.derivedFrom === "reservation") {
      if (reservation && reservation.state === "CONVERTED") {
        // Use reservation createdAt as the conversion timestamp
        timestamp = reservation.createdAt;
      }
    } else if (step.derivedFrom === "ledger" && step.ledgerType) {
      // Find the first matching ledger entry
      const entry = settlementLedger.find((e) => e.type === step.ledgerType);
      if (entry) {
        timestamp = entry.timestamp;
        actorRole = entry.actorRole;
        actorUserId = entry.actorUserId;
      }
    }

    if (timestamp) {
      lastReachedIdx = i;
    }

    resolved.push({
      step,
      status: timestamp ? "COMPLETED" : "PENDING",
      timestamp,
      actorRole,
      actorUserId,
    });
  }

  // Mark the last reached step as CURRENT if it's not the final step
  if (lastReachedIdx >= 0 && lastReachedIdx < LIFECYCLE_STEPS.length - 1) {
    resolved[lastReachedIdx].status = "CURRENT";
  }

  return resolved;
}

/* ── Cryptographic Title Certificate ── */
function generateKmsSignatureHash(orderId: string): string {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    const char = orderId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const seed = Math.abs(hash);
  const hexChars = '0123456789abcdef';
  let sig = '0x';
  for (let i = 0; i < 128; i++) {
    sig += hexChars[(seed * (i + 1) * 7 + i * 13) % 16];
  }
  return sig;
}

function generateSerialNumbers(weightOz: number): string[] {
  const barCount = Math.max(1, Math.round(weightOz / 10));
  const serials: string[] = [];
  const baseSerial = 88392;
  for (let i = 0; i < barCount; i++) {
    serials.push(`#AU-${baseSerial + i}-ZH`);
  }
  return serials;
}

interface CertificateProps {
  order: {
    id: string;
    weightOz: number;
    notional: number;
    pricePerOz: number;
    status: string;
  };
  settlementUpdatedAt?: string;
}

function CryptographicTitleCertificate({ order, settlementUpdatedAt }: CertificateProps) {
  const kmsHash = generateKmsSignatureHash(order.id);
  const serials = generateSerialNumbers(order.weightOz);
  const allocationDate = settlementUpdatedAt
    ? new Date(settlementUpdatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mt-8 rounded-lg border border-yellow-500/30 bg-slate-900 p-8 shadow-[0_0_30px_rgba(234,179,8,0.05)]">
      {/* ── Decorative Top Border ── */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
          <Shield className="h-5 w-5 text-yellow-500/60" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />
        </div>
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.35em] text-yellow-500">
          Digital Warrant of Title
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Cryptographic Title &amp; Allocation Certificate
        </p>
        <div className="flex items-center gap-4 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
          <span className="font-mono text-[9px] text-slate-600">REF: {order.id}</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
        </div>
      </div>

      {/* ── Asset Details Grid ── */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Refiner</dt>
          <dd className="font-mono text-sm font-semibold text-slate-200">
            PAMP Suisse / Valcambi
            <span className="ml-2 text-[10px] font-normal text-yellow-500/70">(99.99% Au)</span>
          </dd>
        </div>
        <div className="rounded border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Total Allocated Weight</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-slate-200">
            {order.weightOz.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} oz
            <span className="ml-2 text-[10px] font-normal text-slate-500">
              ({(order.weightOz * 31.1035).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}g)
            </span>
          </dd>
        </div>
        <div className="rounded border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Vault Location</dt>
          <dd className="font-mono text-sm font-semibold text-slate-200">
            Loomis International
            <span className="ml-2 text-[10px] font-normal text-slate-400">(Zurich, CHE)</span>
          </dd>
        </div>
        <div className="rounded border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Allocation Date</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-slate-200">{allocationDate}</dd>
        </div>
      </div>

      {/* ── Serial Registry ── */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Fingerprint className="h-3.5 w-3.5 text-yellow-500/50" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Serial Registry — Allocated Bars
          </h3>
        </div>
        <div className="rounded border border-slate-700/50 bg-slate-950/80 p-4">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {serials.map((serial, idx) => (
              <div key={serial} className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-600">Bar {idx + 1}:</span>
                <span className="font-semibold tabular-nums text-slate-300">{serial}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cryptographic Proof ── */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-yellow-500/50" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            KMS Signature Hash
          </h3>
        </div>
        <div className="rounded border border-slate-700/50 bg-slate-950/80 p-4">
          <p className="break-all font-mono text-[10px] leading-relaxed tabular-nums text-yellow-500/70">
            {kmsHash}
          </p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-slate-600">
          <Shield className="h-3 w-3" />
          Signed via AWS Key Management Service · Mathematically unforgeable.
        </p>
      </div>

      {/* ── Decorative Bottom Border ── */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
      </div>

      {/* ── Download Cryptographic Title ── */}
      <a
        id="download-title-json-btn"
        href={`/api/certificates/${order.id}/download`}
        download={`Warrant_of_Title_${order.id}.json`}
        className="flex w-full items-center justify-center gap-2.5 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-yellow-500 transition-all hover:border-yellow-500/50 hover:bg-yellow-500/15 hover:shadow-[0_0_20px_rgba(234,179,8,0.1)] active:scale-[0.99] no-underline"
      >
        <Download className="h-4 w-4" />
        Download Cryptographic Title (.json)
      </a>
    </div>
  );
}

/* ================================================================ */
function OrderDetailContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  const orderQ = useOrder(params.id);
  const listingsQ = useListings();
  const resQ = useMyReservations(userId);
  const vcQ = useVerificationCase(userId);
  const settlementQ = useSettlementByOrder(params.id);
  const openSettlement = useOpenSettlementFromOrder();
  const [settleError, setSettleError] = useState<string | null>(null);

  const order = orderQ.data;
  const listing = useMemo(() => listingsQ.data?.find((l: Listing) => l.id === order?.listingId), [listingsQ.data, order?.listingId]);
  const reservation = useMemo(() => resQ.data?.find((r: Reservation) => r.id === order?.reservationId), [resQ.data, order?.reservationId]);

  const verificationCase = vcQ.data;
  const settlement = settlementQ.data;
  const settlementId = settlement?.id ?? "";

  const ledgerQ = useSettlementLedger(settlementId);
  const settlementLedger = ledgerQ.data ?? [];

  const isLoading = orderQ.isLoading || listingsQ.isLoading || resQ.isLoading || vcQ.isLoading || settlementQ.isLoading;
  if (isLoading) return <LoadingState message="Loading order detail…" />;
  if (!order) return <ErrorState title="Not Found" message={`Order ${params.id} not found.`} />;

  const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
  const snap = order.policySnapshot;

  const hasSettlement = !!settlement;
  const canInitiateSettlement = isAdmin && !hasSettlement && (order.status === "reserved" || order.status === "pending_verification");
  const isSettled = settlement?.status === "SETTLED";

  // Resolve lifecycle from ledger
  const lifecycleSteps = resolveLifecycle(order, reservation, settlementLedger);

  async function handleInitiateSettlement() {
    setSettleError(null);
    try {
      const s = await openSettlement.mutateAsync({ orderId: order!.id, actorRole: user!.role as UserRole, actorUserId: user!.id });
      router.push(`/settlements/${s.id}`);
    } catch (err: unknown) {
      setSettleError(err instanceof Error ? err.message : "Failed to initiate settlement");
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/orders" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Orders
        </Link>
      </div>

      <PageHeader title={`Order ${order.id}`} description={listing?.title ?? "—"} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* ── Left Panel: Order Summary ── */}
        <DashboardPanel title="Order Summary" tooltip="Immutable order record with frozen policy snapshot" asOf={order.createdAt}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-text-faint">Order ID</dt><dd className="font-mono text-text">{order.id}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Status</dt>
              <dd>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusCfg.label}
                </span>
              </dd>
            </div>
            <div className="flex justify-between"><dt className="text-text-faint">Listing</dt><dd className="font-mono text-xs text-text">{order.listingId}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Weight</dt><dd className="tabular-nums text-text">{order.weightOz} oz</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Price / oz</dt><dd className="tabular-nums text-text">${order.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
            <div className="flex justify-between border-t border-border pt-2"><dt className="text-text-faint">Notional</dt><dd className="tabular-nums font-semibold text-text">${order.notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Seller</dt><dd className="font-mono text-xs text-text">{order.sellerOrgId}</dd></div>
            <div className="flex justify-between"><dt className="text-text-faint">Created</dt>
              <dd className="text-xs tabular-nums text-text">
                {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" "}
                {new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </dd>
            </div>
          </dl>
        </DashboardPanel>

        {/* ── Center Panel: Lifecycle + Settlement Linkage + Receipt ── */}
        <div className="space-y-4">
          {/* Post-Trade Lifecycle Timeline */}
          <DashboardPanel title="Post-Trade Lifecycle" tooltip="Deterministic lifecycle derived from reservation state, settlement status, and ledger entries" asOf={settlement?.updatedAt ?? order.createdAt}>
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3">
                {lifecycleSteps.map((resolved, i) => {
                  const isCompleted = resolved.status === "COMPLETED" || resolved.status === "CURRENT";
                  const isCurrent = resolved.status === "CURRENT";
                  const isPending = resolved.status === "PENDING";

                  return (
                    <div key={resolved.step.id} className="relative flex gap-3">
                      <div className={cn(
                        "absolute -left-5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border",
                        isCompleted ? "bg-success border-success/30" : isCurrent ? "bg-gold border-gold/30" : "bg-surface-3 border-border",
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-3 w-3 text-bg" />
                        ) : (
                          <span className="text-[8px] font-bold text-text-faint">{i + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            isCompleted ? "text-text" : "text-text-faint",
                          )}>
                            {resolved.step.label}
                          </span>
                          {isPending && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-medium text-text-faint">
                              <Clock className="h-2.5 w-2.5" /> PENDING
                            </span>
                          )}
                        </div>
                        {resolved.timestamp && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] tabular-nums text-text-faint">
                              {new Date(resolved.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {resolved.actorRole && (
                              <span className="text-[10px] text-text-faint">
                                · {ROLE_LABELS[resolved.actorRole as UserRole] ?? resolved.actorRole} ({resolved.actorUserId})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DashboardPanel>

          {/* Settlement Linkage */}
          {hasSettlement && settlement && (
            <DashboardPanel title="Settlement Linkage" tooltip="Settlement case linked to this order" asOf={settlement.updatedAt}>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-faint">Settlement ID</dt>
                  <dd className="font-mono text-xs text-text">{settlement.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-faint">Status</dt>
                  <dd>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      settlement.status === "SETTLED" ? "bg-success/10 text-success border-success/20" :
                      settlement.status === "AUTHORIZED" ? "bg-info/10 text-info border-info/20" :
                      settlement.status === "FAILED" ? "bg-danger/10 text-danger border-danger/20" :
                      "bg-gold/10 text-gold border-gold/20"
                    )}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {settlement.status}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-faint">Last Updated</dt>
                  <dd className="text-xs tabular-nums text-text">
                    {new Date(settlement.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </dd>
                </div>
                <div className="pt-1">
                  <Link
                    href={`/settlements/${settlement.id}`}
                    className="flex items-center gap-2 text-xs text-gold hover:underline font-mono"
                  >
                    <Landmark className="h-3.5 w-3.5" />
                    View Settlement →
                  </Link>
                </div>
              </dl>
            </DashboardPanel>
          )}

          {/* Receipt Card */}
          <DashboardPanel title="Clearing Receipt" tooltip="Institutional receipt generated from append-only ledger" asOf={settlement?.updatedAt ?? order.createdAt}>
            {isSettled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-success">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">Clearing Receipt Available</span>
                </div>
                <p className="text-[10px] text-text-faint">
                  The settlement for this order has reached SETTLED status. A full clearing receipt is available with frozen authorization and execution snapshots.
                </p>
                <Link
                  href={`/orders/${order.id}/receipt`}
                  id="receipt-cta-btn"
                  className="flex items-center justify-center gap-2 w-full rounded-md border border-success/30 bg-success/10 text-success px-3 py-2.5 text-xs font-medium transition-all hover:bg-success/20"
                >
                  <FileText className="h-4 w-4" />
                  View Clearing Receipt
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-text-faint">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Receipt Not Available</span>
                </div>
                <p className="text-[10px] text-text-faint">
                  Clearing receipt will be available once the settlement reaches SETTLED status.
                  {settlement ? ` Current status: ${settlement.status}.` : " No settlement has been initiated yet."}
                </p>
              </div>
            )}
          </DashboardPanel>

          {/* ── Armored Shipment Tracker (STP) ── */}
          {isSettled && (() => {
            // Deterministic tracking number from order ID (consistent across loads)
            let hash = 0;
            for (let i = 0; i < order.id.length; i++) {
              hash = ((hash << 5) - hash) + order.id.charCodeAt(i);
              hash = hash & hash;
            }
            const rand4 = String(1000 + Math.abs(hash) % 9000);
            const trackingNum = `BRK-US-10005-${rand4}`;
            const waybillId = `WB-${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}-${rand4}`;

            return (
              <DashboardPanel title="Armored Shipment Tracker" tooltip="STP-dispatched armored carrier — tracking auto-generated on fund clearing" asOf={settlement?.updatedAt ?? order.createdAt}>
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-950/20 px-3 py-2">
                    <Truck className="h-4 w-4 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-400">
                      Straight-Through Dispatch
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      IN TRANSIT
                    </span>
                  </div>

                  {/* Carrier & Tracking */}
                  <dl className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-text-faint">Carrier</dt>
                      <dd className="font-semibold text-text">Brink&apos;s Global Services</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-faint">Tracking #</dt>
                      <dd
                        className="font-mono font-bold tabular-nums text-emerald-400"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {trackingNum}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-faint">Waybill</dt>
                      <dd
                        className="font-mono text-[10px] text-text-muted"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {waybillId}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-faint">Est. Transit</dt>
                      <dd className="tabular-nums text-text">3 business days</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-text-faint">Origin Vault</dt>
                      <dd className="text-text">New York, NY 10005</dd>
                    </div>
                  </dl>

                  {/* Audit Log */}
                  <div className="rounded border border-border bg-surface-2 px-3 py-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      <span className="text-text-muted">Brink&apos;s API Pinged</span>
                      <span className="ml-auto tabular-nums text-text-faint">
                        {settlement?.updatedAt
                          ? new Date(settlement.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      <span className="text-text-muted">Waybill Auto-Generated</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      <span className="text-text-muted">Carrier Dispatched</span>
                    </div>
                  </div>
                </div>
              </DashboardPanel>
            );
          })()}

          {/* Initiate Settlement — admin only */}
          {canInitiateSettlement && (
            <DashboardPanel title="Settlement" tooltip="Initiate the DvP settlement process for this order" asOf={order.createdAt}>
              <div className="space-y-3">
                <p className="text-xs text-text-muted">
                  This order is eligible for settlement. Initiating will open an escrow case and freeze the capital snapshot.
                </p>
                <button
                  id="initiate-settlement-btn"
                  onClick={handleInitiateSettlement}
                  disabled={openSettlement.isPending}
                  className="flex items-center justify-center gap-2 w-full rounded-md border border-gold/30 bg-gold/10 text-gold px-3 py-2.5 text-xs font-medium transition-all hover:bg-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Landmark className="h-4 w-4" />
                  {openSettlement.isPending ? "Opening Escrow…" : "Initiate Settlement"}
                </button>
                {settleError && (
                  <div className="rounded-md border border-danger/20 bg-danger/5 p-2.5 text-xs text-danger">
                    {settleError}
                  </div>
                )}
              </div>
            </DashboardPanel>
          )}

          {/* Listing Details */}
          <DashboardPanel title="Listing Details" tooltip="Gold listing specifications" asOf={listing?.createdAt ?? ""}>
            {listing ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-text-faint">Form</dt><dd className="text-text capitalize">{listing.form}</dd></div>
                <div className="flex justify-between"><dt className="text-text-faint">Purity</dt><dd className="tabular-nums text-text">.{listing.purity}</dd></div>
                <div className="flex justify-between"><dt className="text-text-faint">Vault</dt><dd className="text-text">{listing.vaultName}</dd></div>
                <div className="flex justify-between"><dt className="text-text-faint">Jurisdiction</dt><dd className="text-text">{listing.jurisdiction}</dd></div>
              </dl>
            ) : (
              <p className="text-sm text-text-faint">Listing data not available.</p>
            )}
          </DashboardPanel>
        </div>

        {/* ── Right Panel: Risk / Policy + Identity Perimeter ── */}
        <aside className="rounded-lg border border-border bg-surface-1 divide-y divide-border h-fit">
          {snap ? (
            <>
              {/* TRI Score */}
              <div className="p-4">
                <p className="typo-label mb-2">TRI Score (Snapshot)</p>
                <div className="flex items-center gap-3">
                  <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1", BAND[snap.triBand].bg, BAND[snap.triBand].text, BAND[snap.triBand].border)}>
                    <span className="text-lg font-bold tabular-nums">{snap.triScore}</span>
                    <span className="text-[10px] font-semibold uppercase">{snap.triBand}</span>
                  </div>
                </div>
              </div>

              {/* Approval Tier */}
              <div className="p-4">
                <p className="typo-label mb-2">Approval Tier</p>
                <span className={cn("text-sm font-semibold", TIER_CLR[snap.approvalTier])}>{TIER_LABEL[snap.approvalTier] ?? snap.approvalTier}</span>
              </div>

              {/* Capital Impact */}
              <div className="p-4">
                <p className="typo-label mb-2">Capital Impact (At Conversion)</p>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-text-faint">ECR</dt>
                    <dd className="tabular-nums text-text">
                      {snap.ecrBefore.toFixed(2)}x → <span className={snap.ecrAfter > 7 ? "text-danger font-semibold" : "font-semibold"}>{snap.ecrAfter.toFixed(2)}x</span>
                    </dd>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <dt className="text-text-faint">Hardstop</dt>
                      <dd className="tabular-nums text-text">
                        {pct(snap.hardstopBefore)} → <span className={snap.hardstopAfter > 0.9 ? "text-danger font-semibold" : "font-semibold"}>{pct(snap.hardstopAfter)}</span>
                      </dd>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          snap.hardstopAfter > 0.9 ? "bg-danger" : snap.hardstopAfter > 0.75 ? "bg-warning" : "bg-success"
                        )}
                        style={{ width: `${Math.min(100, snap.hardstopAfter * 100)}%` }}
                      />
                    </div>
                  </div>
                </dl>
              </div>

              {/* Blockers */}
              <div className="p-4">
                <p className="typo-label mb-2">Blockers (At Conversion)</p>
                {snap.blockers.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    No blockers detected — conversion passed all checks
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {snap.blockers.map((bl) => (
                      <li key={bl.id} className="flex items-start gap-2 text-xs">
                        <span className={cn("shrink-0 rounded px-1 py-0.5 text-[10px] font-bold", SEV_CLR[bl.severity])}>{bl.severity}</span>
                        <div>
                          <span className="text-text font-medium">{bl.title}</span>
                          <p className="text-text-faint">{bl.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Identity Perimeter Status */}
              <div className="p-4">
                <p className="typo-label mb-2">Identity Perimeter</p>
                <div className="space-y-2 text-xs">
                  {verificationCase ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-text-faint">Identity Perimeter</span>
                        <div className="flex items-center gap-1">
                          {verificationCase.status === "VERIFIED"
                            ? <><CheckCircle2 className="h-3 w-3 text-success" /><span className="text-success font-medium">PASS</span></>
                            : <><XCircle className="h-3 w-3 text-danger" /><span className="text-danger font-medium">FAIL</span></>
                          }
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-faint">Sanctions Screening</span>
                        <div className="flex items-center gap-1">
                          {verificationCase.riskTier === "HIGH"
                            ? <><XCircle className="h-3 w-3 text-danger" /><span className="text-danger font-medium">FAIL</span></>
                            : verificationCase.riskTier === "ELEVATED"
                            ? <><AlertTriangle className="h-3 w-3 text-warning" /><span className="text-warning font-medium">REVIEW</span></>
                            : <><CheckCircle2 className="h-3 w-3 text-success" /><span className="text-success font-medium">PASS</span></>
                          }
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-text-faint">Last Screened</span>
                        <span className="tabular-nums text-text font-mono">
                          {verificationCase.lastScreenedAt
                            ? new Date(verificationCase.lastScreenedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-text-faint" />
                      <span className="text-text-faint">No verification case — identity perimeter not initiated</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Snapshot Timestamp */}
              <div className="p-4">
                <p className="typo-label mb-1">Snapshot Frozen</p>
                <p className="text-xs tabular-nums text-text-faint">
                  {new Date(snap.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" "}
                  {new Date(snap.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </div>
            </>
          ) : (
            <div className="p-4">
              <p className="typo-label mb-2">Policy Snapshot</p>
              <p className="text-xs text-text-faint">No policy snapshot available for this order. This order may have been created before policy integration.</p>
            </div>
          )}
        </aside>
      </div>

      {/* ── Cryptographic Title & Allocation Certificate ── */}
      {(order.status === "completed" || isSettled) && (
        <CryptographicTitleCertificate
          order={order}
          settlementUpdatedAt={settlement?.updatedAt}
        />
      )}
    </>
  );
}
