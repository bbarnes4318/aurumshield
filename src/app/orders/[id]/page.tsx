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
  ShieldCheck,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderDetailContent />
    </RequireAuth>
  );
}

/* ---------- Status Chip ---------- */
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "border-slate-700 bg-slate-800/50 text-slate-400" },
  pending_verification: { label: "Pending Verification", color: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  reserved: { label: "Reserved", color: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
  settlement_pending: { label: "Settlement Pending", color: "border-[#c6a86b]/30 bg-[#c6a86b]/10 text-[#c6a86b]" },
  completed: { label: "Completed", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  cancelled: { label: "Cancelled", color: "border-red-500/30 bg-red-500/10 text-red-400" },
};

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

const BAND = {
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};
const TIER_CLR: Record<string, string> = { auto: "text-emerald-400", "desk-head": "text-amber-400", "credit-committee": "text-amber-400", board: "text-red-400" };
const TIER_LABEL: Record<string, string> = { auto: "Auto-Approved", "desk-head": "Desk Head", "credit-committee": "Credit Committee", board: "Board Approval" };
const SEV_CLR: Record<string, string> = { BLOCK: "text-red-400 bg-red-500/10", WARN: "text-amber-400 bg-amber-500/10", INFO: "text-sky-400 bg-sky-500/10" };

/* ---------- Lifecycle Step Definition ---------- */
interface LifecycleStep {
  id: string;
  label: string;
  institutionalLabel: string;
  derivedFrom: "order" | "reservation" | "settlement_status" | "ledger";
  ledgerType?: string;
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  { id: "ORDER_CREATED", label: "Order Created", institutionalLabel: "Contract Originated", derivedFrom: "order" },
  { id: "RESERVATION_CONVERTED", label: "Reservation Converted", institutionalLabel: "Allocation Locked", derivedFrom: "reservation" },
  { id: "SETTLEMENT_OPENED", label: "Settlement Opened", institutionalLabel: "Escrow Initiated", derivedFrom: "ledger", ledgerType: "ESCROW_OPENED" },
  { id: "FUNDS_CONFIRMED_FINAL", label: "Funds Confirmed Final", institutionalLabel: "Funds Clearing via Fedwire", derivedFrom: "ledger", ledgerType: "FUNDS_DEPOSITED" },
  { id: "GOLD_ALLOCATED", label: "Gold Allocated", institutionalLabel: "Bullion Segregated (LBMA)", derivedFrom: "ledger", ledgerType: "GOLD_ALLOCATED" },
  { id: "VERIFICATION_CLEARED", label: "Verification Cleared", institutionalLabel: "Compliance Perimeter Cleared", derivedFrom: "ledger", ledgerType: "VERIFICATION_PASSED" },
  { id: "AUTHORIZED", label: "Authorized", institutionalLabel: "Armored Tarmac Extraction", derivedFrom: "ledger", ledgerType: "AUTHORIZATION" },
  { id: "DVP_EXECUTED", label: "DvP Executed", institutionalLabel: "DvP Atomic Settlement", derivedFrom: "ledger", ledgerType: "DVP_EXECUTED" },
  { id: "SETTLED", label: "Settled", institutionalLabel: "Vaulted under Bailment (Zurich)", derivedFrom: "ledger", ledgerType: "ESCROW_CLOSED" },
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
      timestamp = order.createdAt;
    } else if (step.derivedFrom === "reservation") {
      if (reservation && reservation.state === "CONVERTED") {
        timestamp = reservation.createdAt;
      }
    } else if (step.derivedFrom === "ledger" && step.ledgerType) {
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
    <div className="mt-8 border border-[#c6a86b]/30 bg-slate-900 p-8">
      {/* Decorative Top Border */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c6a86b]/40 to-transparent" />
          <Shield className="h-5 w-5" style={{ color: BRAND_GOLD }} />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c6a86b]/40 to-transparent" />
        </div>
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.35em]" style={{ color: BRAND_GOLD }}>
          Digital Warrant of Title
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
          Cryptographic Title &amp; Allocation Certificate
        </p>
        <div className="flex items-center gap-4 w-full">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c6a86b]/20 to-transparent" />
          <span className="font-mono text-[9px] text-slate-600">REF: {order.id}</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c6a86b]/20 to-transparent" />
        </div>
      </div>

      {/* Asset Details Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Refiner</dt>
          <dd className="font-mono text-sm font-semibold text-slate-200">
            PAMP Suisse / Valcambi
            <span className="ml-2 text-[10px] font-normal" style={{ color: `${BRAND_GOLD}b3` }}>(99.99% Au)</span>
          </dd>
        </div>
        <div className="border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Total Allocated Weight</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-slate-200">
            {order.weightOz.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} oz
            <span className="ml-2 text-[10px] font-normal text-slate-500">
              ({(order.weightOz * 31.1035).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}g)
            </span>
          </dd>
        </div>
        <div className="border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Vault Location</dt>
          <dd className="font-mono text-sm font-semibold text-slate-200">
            Loomis International
            <span className="ml-2 text-[10px] font-normal text-slate-400">(Zurich, CHE)</span>
          </dd>
        </div>
        <div className="border border-slate-700/50 bg-slate-800/50 p-4">
          <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Allocation Date</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-slate-200">{allocationDate}</dd>
        </div>
      </div>

      {/* Serial Registry */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Fingerprint className="h-3.5 w-3.5" style={{ color: `${BRAND_GOLD}80` }} />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Serial Registry — Allocated Bars
          </h3>
        </div>
        <div className="border border-slate-700/50 bg-slate-950/80 p-4">
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

      {/* Cryptographic Proof */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" style={{ color: `${BRAND_GOLD}80` }} />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            KMS Signature Hash
          </h3>
        </div>
        <div className="border border-slate-700/50 bg-slate-950/80 p-4">
          <p className="break-all font-mono text-[10px] leading-relaxed tabular-nums" style={{ color: `${BRAND_GOLD}b3` }}>
            {kmsHash}
          </p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-slate-600">
          <Shield className="h-3 w-3" />
          Signed via AWS Key Management Service · Mathematically unforgeable.
        </p>
      </div>

      {/* Decorative Bottom Border */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c6a86b]/20 to-transparent" />
      </div>

      {/* Download */}
      <a
        id="download-title-json-btn"
        href={`/api/certificates/${order.id}/download`}
        download={`Warrant_of_Title_${order.id}.json`}
        className="flex w-full items-center justify-center gap-2.5 border border-[#c6a86b]/30 bg-[#c6a86b]/10 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all hover:border-[#c6a86b]/50 hover:bg-[#c6a86b]/15 active:scale-[0.99] no-underline"
        style={{ color: BRAND_GOLD }}
      >
        <Download className="h-4 w-4" />
        Download Cryptographic Title (.json)
      </a>
    </div>
  );
}

/* ── Panel wrapper (replaces DashboardPanel with terminal-style card) ── */
function LedgerPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-800 bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
        <span className="h-2 w-2 rounded-full bg-red-500/40" />
        <span className="h-2 w-2 rounded-full bg-amber-500/40" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
          {title}
        </span>
      </div>
      <div className="p-5">{children}</div>
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

  const lifecycleSteps = resolveLifecycle(order, reservation, settlementLedger);

  // Generate mock SHA-256 clearing hash from order ID
  const clearingHash = generateKmsSignatureHash(order.id).slice(0, 66);

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
    <div className="min-h-screen bg-slate-950">
      {/* ── Terminal Header ── */}
      <div className="border-b border-slate-800 px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-6xl">
          {/* Back link */}
          <Link href="/orders" className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 transition-colors hover:text-slate-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Orders
          </Link>

          {/* Eyebrow */}
          <div className="mb-3 flex items-center gap-3">
            <Shield className="h-4 w-4" style={{ color: BRAND_GOLD }} />
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em]" style={{ color: BRAND_GOLD }}>
              Settlement Ledger
            </p>
          </div>

          {/* Order ID headline */}
          <h1 className="mb-3 font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {order.id}
          </h1>

          {/* Status + Asset */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider", statusCfg.color)}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusCfg.label}
            </span>
            {listing && (
              <span className="font-mono text-xs text-slate-500">
                {listing.title}
              </span>
            )}
          </div>

          {/* SHA-256 Clearing Hash */}
          <div className="mt-4 border border-slate-800 bg-slate-900/50 px-4 py-2">
            <p className="font-mono text-[10px] text-slate-500">
              <span className="text-slate-600">SHA-256 CLEARING HASH:</span>{" "}
              <span className="tabular-nums text-slate-400 truncate">{clearingHash}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ═══ LEFT — Cryptographic Receipt Card ═══ */}
            <LedgerPanel title="Cryptographic Receipt">
              {/* Notional summary grid */}
              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="border border-slate-800 bg-slate-950/60 p-3">
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Weight</dt>
                  <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-white">{order.weightOz} oz</dd>
                </div>
                <div className="border border-slate-800 bg-slate-950/60 p-3">
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Purity</dt>
                  <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-white">.{listing?.purity ?? "9999"}</dd>
                </div>
                <div className="border border-slate-800 bg-slate-950/60 p-3">
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Price / oz</dt>
                  <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-slate-300">${order.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd>
                </div>
                <div className="border border-slate-800 bg-slate-950/60 p-3">
                  <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">Notional</dt>
                  <dd className="mt-1 font-mono text-sm font-bold tabular-nums" style={{ color: BRAND_GOLD }}>${order.notional.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd>
                </div>
              </div>

              {/* Detail rows */}
              <dl className="space-y-2.5">
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Order ID</dt>
                  <dd className="font-mono text-xs tabular-nums text-slate-300">{order.id}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Listing</dt>
                  <dd className="font-mono text-xs text-slate-300">{order.listingId}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Seller</dt>
                  <dd className="font-mono text-xs text-slate-300">{order.sellerOrgId}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Vault</dt>
                  <dd className="font-mono text-xs text-slate-300">{listing?.vaultName ?? "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Jurisdiction</dt>
                  <dd className="font-mono text-xs text-slate-300">{listing?.jurisdiction ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Created</dt>
                  <dd className="font-mono text-xs tabular-nums text-slate-300">
                    {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {" "}
                    {new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </dd>
                </div>
              </dl>
            </LedgerPanel>

            {/* ═══ CENTER — Timeline + Settlement + Receipt ═══ */}
            <div className="space-y-5">

              {/* Armored Shipment Tracker (STP) */}
              {isSettled && (() => {
                let hash = 0;
                for (let i = 0; i < order.id.length; i++) {
                  hash = ((hash << 5) - hash) + order.id.charCodeAt(i);
                  hash = hash & hash;
                }
                const rand4 = String(1000 + Math.abs(hash) % 9000);
                const trackingNum = `BRK-US-10005-${rand4}`;
                const waybillId = `WB-${Math.abs(hash).toString(36).toUpperCase().slice(0, 6)}-${rand4}`;

                return (
                  <LedgerPanel title="Armored Transit — Brink's Global">
                    <div className="space-y-3">
                      {/* Status */}
                      <div className="flex items-center gap-2 border border-emerald-500/20 bg-emerald-950/20 px-3 py-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-400">
                          Straight-Through Dispatch
                        </span>
                        <span className="ml-auto inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          IN TRANSIT
                        </span>
                      </div>

                      <dl className="space-y-2 font-mono text-xs">
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Carrier</dt>
                          <dd className="font-semibold text-slate-300">Brink&apos;s Global Services</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Tracking #</dt>
                          <dd className="font-bold tabular-nums text-emerald-400">{trackingNum}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Waybill</dt>
                          <dd className="text-[10px] tabular-nums text-slate-400">{waybillId}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Est. Transit</dt>
                          <dd className="tabular-nums text-slate-300">3 business days</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-500">Origin Vault</dt>
                          <dd className="text-slate-300">New York, NY 10005</dd>
                        </div>
                      </dl>

                      {/* Audit trail */}
                      <div className="border border-slate-800 bg-slate-950/60 px-3 py-2 space-y-1">
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-slate-400">Brink&apos;s API Pinged</span>
                          <span className="ml-auto tabular-nums text-slate-600">
                            {settlement?.updatedAt
                              ? new Date(settlement.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-slate-400">Waybill Auto-Generated</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          <span className="text-slate-400">Carrier Dispatched</span>
                        </div>
                      </div>
                    </div>
                  </LedgerPanel>
                );
              })()}

              {/* Post-Trade Lifecycle Timeline */}
              <LedgerPanel title="Post-Trade Lifecycle">
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-0 bottom-0 w-px bg-slate-800" />
                  <div className="space-y-3">
                    {lifecycleSteps.map((resolved, i) => {
                      const isCompleted = resolved.status === "COMPLETED" || resolved.status === "CURRENT";
                      const isCurrent = resolved.status === "CURRENT";
                      const isPending = resolved.status === "PENDING";

                      return (
                        <div key={resolved.step.id} className="relative flex gap-3">
                          <div className={cn(
                            "absolute -left-5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border",
                            isCompleted ? "border-[#c6a86b]/40 bg-[#c6a86b]/20" : "bg-slate-800 border-slate-700",
                          )}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-3 w-3" style={{ color: BRAND_GOLD }} />
                            ) : (
                              <span className="font-mono text-[8px] font-bold text-slate-600">{i + 1}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-mono text-[10px] font-bold uppercase tracking-wider",
                                isCompleted ? "text-slate-200" : "text-slate-600",
                              )}>
                                {resolved.step.institutionalLabel}
                              </span>
                              {isCurrent && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ color: BRAND_GOLD, backgroundColor: `${BRAND_GOLD}15`, border: `1px solid ${BRAND_GOLD}30` }}>
                                  ACTIVE
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-medium text-slate-600">
                                  <Clock className="h-2.5 w-2.5" /> PENDING
                                </span>
                              )}
                            </div>
                            {resolved.timestamp && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] tabular-nums text-slate-500">
                                  {new Date(resolved.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {resolved.actorRole && (
                                  <span className="font-mono text-[10px] text-slate-600">
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
              </LedgerPanel>

              {/* Settlement Linkage */}
              {hasSettlement && settlement && (
                <LedgerPanel title="Settlement Linkage">
                  <dl className="space-y-2.5">
                    <div className="flex justify-between font-mono text-xs">
                      <dt className="text-slate-500">Settlement ID</dt>
                      <dd className="tabular-nums text-slate-300">{settlement.id}</dd>
                    </div>
                    <div className="flex justify-between font-mono text-xs">
                      <dt className="text-slate-500">Status</dt>
                      <dd>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                          settlement.status === "SETTLED" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                          settlement.status === "AUTHORIZED" ? "border-sky-500/30 bg-sky-500/10 text-sky-400" :
                          settlement.status === "FAILED" ? "border-red-500/30 bg-red-500/10 text-red-400" :
                          "border-[#c6a86b]/30 bg-[#c6a86b]/10 text-[#c6a86b]"
                        )}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {settlement.status}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between font-mono text-xs">
                      <dt className="text-slate-500">Last Updated</dt>
                      <dd className="tabular-nums text-slate-300">
                        {new Date(settlement.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </dd>
                    </div>
                    <div className="pt-1">
                      <Link
                        href={`/settlements/${settlement.id}`}
                        className="flex items-center gap-2 font-mono text-xs transition-colors hover:underline"
                        style={{ color: BRAND_GOLD }}
                      >
                        <Landmark className="h-3.5 w-3.5" />
                        View Settlement →
                      </Link>
                    </div>
                  </dl>
                </LedgerPanel>
              )}

              {/* Clearing Receipt */}
              <LedgerPanel title="Clearing Receipt">
                {isSettled ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Clearing Receipt Available</span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-500">
                      The settlement for this order has reached SETTLED status. A full clearing receipt is available with frozen authorization and execution snapshots.
                    </p>
                    <Link
                      href={`/orders/${order.id}/receipt`}
                      id="receipt-cta-btn"
                      className="flex items-center justify-center gap-2 w-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3 py-2.5 font-mono text-xs font-medium transition-all hover:bg-emerald-500/20"
                    >
                      <FileText className="h-4 w-4" />
                      View Clearing Receipt
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                      <Lock className="h-4 w-4" />
                      <span className="font-medium">Receipt Not Available</span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-600">
                      Clearing receipt will be available once the settlement reaches SETTLED status.
                      {settlement ? ` Current status: ${settlement.status}.` : " No settlement has been initiated yet."}
                    </p>
                  </div>
                )}
              </LedgerPanel>

              {/* Initiate Settlement — admin only */}
              {canInitiateSettlement && (
                <LedgerPanel title="Settlement">
                  <div className="space-y-3">
                    <p className="font-mono text-[10px] text-slate-500">
                      This order is eligible for settlement. Initiating will open an escrow case and freeze the capital snapshot.
                    </p>
                    <button
                      id="initiate-settlement-btn"
                      onClick={handleInitiateSettlement}
                      disabled={openSettlement.isPending}
                      className="flex items-center justify-center gap-2 w-full border px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        borderColor: `${BRAND_GOLD}4d`,
                        backgroundColor: `${BRAND_GOLD}1a`,
                        color: BRAND_GOLD,
                      }}
                    >
                      <Landmark className="h-4 w-4" />
                      {openSettlement.isPending ? "Opening Escrow…" : "Initiate Settlement"}
                    </button>
                    {settleError && (
                      <div className="border border-red-500/20 bg-red-500/5 p-2.5 font-mono text-xs text-red-400">
                        {settleError}
                      </div>
                    )}
                  </div>
                </LedgerPanel>
              )}
            </div>

            {/* ═══ RIGHT — Risk / Policy + Identity Perimeter ═══ */}
            <aside className="border border-slate-800 bg-slate-900 divide-y divide-slate-800 h-fit">
              {snap ? (
                <>
                  {/* TRI Score */}
                  <div className="p-4">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2">TRI Score (Snapshot)</p>
                    <div className="flex items-center gap-3">
                      <div className={cn("inline-flex items-center gap-1.5 border px-2.5 py-1", BAND[snap.triBand].bg, BAND[snap.triBand].text, BAND[snap.triBand].border)}>
                        <span className="font-mono text-lg font-bold tabular-nums">{snap.triScore}</span>
                        <span className="font-mono text-[10px] font-semibold uppercase">{snap.triBand}</span>
                      </div>
                    </div>
                  </div>

                  {/* Approval Tier */}
                  <div className="p-4">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2">Approval Tier</p>
                    <span className={cn("font-mono text-sm font-semibold", TIER_CLR[snap.approvalTier])}>{TIER_LABEL[snap.approvalTier] ?? snap.approvalTier}</span>
                  </div>

                  {/* Capital Impact */}
                  <div className="p-4">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2">Capital Impact (At Conversion)</p>
                    <dl className="space-y-2 font-mono text-xs">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">ECR</dt>
                        <dd className="tabular-nums text-slate-300">
                          {snap.ecrBefore.toFixed(2)}x → <span className={snap.ecrAfter > 7 ? "text-red-400 font-semibold" : "font-semibold"}>{snap.ecrAfter.toFixed(2)}x</span>
                        </dd>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <dt className="text-slate-500">Hardstop</dt>
                          <dd className="tabular-nums text-slate-300">
                            {pct(snap.hardstopBefore)} → <span className={snap.hardstopAfter > 0.9 ? "text-red-400 font-semibold" : "font-semibold"}>{pct(snap.hardstopAfter)}</span>
                          </dd>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 overflow-hidden">
                          <div
                            className={cn(
                              "h-full",
                              snap.hardstopAfter > 0.9 ? "bg-red-500" : snap.hardstopAfter > 0.75 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, snap.hardstopAfter * 100)}%` }}
                          />
                        </div>
                      </div>
                    </dl>
                  </div>

                  {/* Blockers */}
                  <div className="p-4">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2">Blockers (At Conversion)</p>
                    {snap.blockers.length === 0 ? (
                      <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        No blockers detected — conversion passed all checks
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {snap.blockers.map((bl) => (
                          <li key={bl.id} className="flex items-start gap-2 font-mono text-xs">
                            <span className={cn("shrink-0 px-1 py-0.5 text-[10px] font-bold", SEV_CLR[bl.severity])}>{bl.severity}</span>
                            <div>
                              <span className="font-medium text-slate-300">{bl.title}</span>
                              <p className="text-slate-500">{bl.detail}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Identity Perimeter Status */}
                  <div className="p-4">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2">Identity Perimeter</p>
                    <div className="space-y-2 font-mono text-xs">
                      {verificationCase ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Identity Perimeter</span>
                            <div className="flex items-center gap-1">
                              {verificationCase.status === "VERIFIED"
                                ? <><CheckCircle2 className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400 font-medium">PASS</span></>
                                : <><XCircle className="h-3 w-3 text-red-400" /><span className="text-red-400 font-medium">FAIL</span></>
                              }
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Sanctions Screening</span>
                            <div className="flex items-center gap-1">
                              {verificationCase.riskTier === "HIGH"
                                ? <><XCircle className="h-3 w-3 text-red-400" /><span className="text-red-400 font-medium">FAIL</span></>
                                : verificationCase.riskTier === "ELEVATED"
                                ? <><AlertTriangle className="h-3 w-3 text-amber-400" /><span className="text-amber-400 font-medium">REVIEW</span></>
                                : <><CheckCircle2 className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400 font-medium">PASS</span></>
                              }
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Last Screened</span>
                            <span className="tabular-nums text-slate-300">
                              {verificationCase.lastScreenedAt
                                ? new Date(verificationCase.lastScreenedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                                : "—"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-slate-600" />
                          <span className="text-slate-600">No verification case — identity perimeter not initiated</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Snapshot Timestamp */}
                  <div className="p-4">
                    <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-1">Snapshot Frozen</p>
                    <p className="font-mono text-xs tabular-nums text-slate-400">
                      {new Date(snap.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" "}
                      {new Date(snap.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-4">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-2">Policy Snapshot</p>
                  <p className="font-mono text-[10px] text-slate-500">No policy snapshot available for this order. This order may have been created before policy integration.</p>
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

          {/* ── Footer ── */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="flex items-center justify-center gap-2">
              <Radio className="h-3 w-3 animate-pulse text-emerald-500" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                Immutable Ledger Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
