"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import {
  useOrder,
  useListings,
  useSettlementByOrder,
  useSettlementLedger,
} from "@/hooks/use-mock-queries";
import type {
  Listing,
  LedgerEntry,
  LedgerEntrySnapshot,
  SettlementCase,
  Order,
} from "@/lib/mock-data";
import {
  mockOrgs,
  mockCounterparties,
  mockCorridors,
  mockHubs,
} from "@/lib/mock-data";

export default function ReceiptPage() {
  return (
    <RequireAuth>
      <ReceiptContent />
    </RequireAuth>
  );
}

/* ---------- Helpers ---------- */

function fmtUsd(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}



function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

/** Deterministic document ID: AR-CLR-{orderId}-{settlementId}-{YYYYMMDD} */
function buildDocId(orderId: string, settlementId: string, ledger: LedgerEntry[]): string {
  // Use the last ledger entry timestamp (ESCROW_CLOSED or DVP_EXECUTED) as the date basis
  const dvpEntry = ledger.find((e) => e.type === "DVP_EXECUTED");
  const dateStr = dvpEntry
    ? dvpEntry.timestamp
    : ledger.length > 0
    ? ledger[ledger.length - 1].timestamp
    : new Date().toISOString();
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyymmdd = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  return `AR-CLR-${orderId}-${settlementId}-${yyyymmdd}`;
}

/** Derive clearing fee (0.15%) and custody fee (0.05%) deterministically */
function computeFees(notional: number) {
  return {
    clearingFee: notional * 0.0015,
    custodyFee: notional * 0.0005,
    totalFees: notional * 0.002,
  };
}

/* ---------- Snapshot Checks Row ---------- */
function CheckRow({ label, snapshot }: { label: string; snapshot: LedgerEntrySnapshot | undefined }) {
  if (!snapshot) {
    return (
      <tr>
        <td className="py-1.5 pr-4 text-text-faint text-xs align-top">{label}</td>
        <td className="py-1.5 text-xs text-text-faint italic">No snapshot available</td>
      </tr>
    );
  }

  const icon = snapshot.checksStatus === "PASS"
    ? <CheckCircle2 className="h-3 w-3 text-success inline mr-1" />
    : snapshot.checksStatus === "WARN"
    ? <AlertTriangle className="h-3 w-3 text-warning inline mr-1" />
    : <XCircle className="h-3 w-3 text-danger inline mr-1" />;

  return (
    <>
      <tr>
        <td className="py-1.5 pr-4 text-text-faint text-xs align-top">{label}</td>
        <td className="py-1.5 text-xs">
          <span className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
            snapshot.checksStatus === "PASS" ? "bg-success/10 text-success" :
            snapshot.checksStatus === "WARN" ? "bg-warning/10 text-warning" :
            "bg-danger/10 text-danger"
          )}>
            {icon}{snapshot.checksStatus}
          </span>
        </td>
      </tr>
      <tr>
        <td className="py-0.5 pr-4 text-text-faint text-[10px] pl-4">Funds Confirmed</td>
        <td className="py-0.5 text-[10px] font-mono">{snapshot.fundsConfirmed ? "YES" : "NO"}</td>
      </tr>
      <tr>
        <td className="py-0.5 pr-4 text-text-faint text-[10px] pl-4">Gold Allocated</td>
        <td className="py-0.5 text-[10px] font-mono">{snapshot.goldAllocated ? "YES" : "NO"}</td>
      </tr>
      <tr>
        <td className="py-0.5 pr-4 text-text-faint text-[10px] pl-4">Verification Cleared</td>
        <td className="py-0.5 text-[10px] font-mono">{snapshot.verificationCleared ? "YES" : "NO"}</td>
      </tr>
      <tr>
        <td className="py-0.5 pr-4 text-text-faint text-[10px] pl-4">ECR at Action</td>
        <td className="py-0.5 text-[10px] tabular-nums font-mono">{snapshot.ecrAtAction.toFixed(2)}x</td>
      </tr>
      <tr>
        <td className="py-0.5 pr-4 text-text-faint text-[10px] pl-4">Hardstop at Action</td>
        <td className="py-0.5 text-[10px] tabular-nums font-mono">{(snapshot.hardstopAtAction * 100).toFixed(1)}%</td>
      </tr>
      {snapshot.blockers.length > 0 && (
        <tr>
          <td className="py-0.5 pr-4 text-text-faint text-[10px] pl-4">Blockers</td>
          <td className="py-0.5 text-[10px] text-danger">{snapshot.blockers.join(", ")}</td>
        </tr>
      )}
      {snapshot.warnings.length > 0 && (
        <tr>
          <td className="py-0.5 pr-4 text-text-faint text-[10px] pl-4">Warnings</td>
          <td className="py-0.5 text-[10px] text-warning">{snapshot.warnings.join(", ")}</td>
        </tr>
      )}
    </>
  );
}

/* ---------- Build JSON Receipt Payload ---------- */
function buildJsonPayload(
  order: Order,
  settlement: SettlementCase,
  listing: Listing | undefined,
  ledger: LedgerEntry[],
  docId: string,
  authEntry: LedgerEntry | undefined,
  dvpEntry: LedgerEntry | undefined,
) {
  const fees = computeFees(settlement.notionalUsd);
  const corridor = mockCorridors.find((c) => c.id === settlement.corridorId);
  const hub = mockHubs.find((h) => h.id === settlement.hubId);
  const vaultHub = mockHubs.find((h) => h.id === settlement.vaultHubId);
  const buyerOrg = mockOrgs.find((o) => o.id === settlement.buyerOrgId);
  const sellerOrg = mockOrgs.find((o) => o.id === settlement.sellerOrgId);
  const buyerCp = mockCounterparties.find((cp) => cp.entity === buyerOrg?.legalName);
  const sellerCp = mockCounterparties.find((cp) => cp.entity === sellerOrg?.legalName);

  return {
    documentId: docId,
    receiptVersion: "v1",
    generatedAt: dvpEntry?.timestamp ?? settlement.updatedAt,
    parties: {
      buyer: {
        orgId: settlement.buyerOrgId,
        name: buyerOrg?.legalName ?? settlement.buyerOrgId,
        lei: buyerCp?.legalEntityId ?? "N/A",
        jurisdiction: buyerOrg?.jurisdiction ?? "N/A",
      },
      seller: {
        orgId: settlement.sellerOrgId,
        name: sellerOrg?.legalName ?? settlement.sellerOrgId,
        lei: sellerCp?.legalEntityId ?? "N/A",
        jurisdiction: sellerOrg?.jurisdiction ?? "N/A",
      },
    },
    asset: {
      listingId: listing?.id ?? order.listingId,
      form: listing?.form ?? "N/A",
      purity: listing?.purity ?? "N/A",
      weightOz: settlement.weightOz,
      vault: vaultHub?.name ?? settlement.vaultHubId,
    },
    economics: {
      pricePerOzLocked: settlement.pricePerOzLocked,
      notionalUsd: settlement.notionalUsd,
      clearingFee: fees.clearingFee,
      custodyFee: fees.custodyFee,
      totalFees: fees.totalFees,
      settlementRail: settlement.rail,
    },
    controls: {
      corridor: corridor?.name ?? settlement.corridorId,
      settlementHub: hub?.name ?? settlement.hubId,
      vaultHub: vaultHub?.name ?? settlement.vaultHubId,
    },
    checksAtAuthorization: authEntry?.snapshot ?? null,
    checksAtExecution: dvpEntry?.snapshot ?? null,
    ledgerExcerpt: {
      authorizationEntry: authEntry
        ? { id: authEntry.id, type: authEntry.type, timestamp: authEntry.timestamp, actor: authEntry.actor, detail: authEntry.detail }
        : null,
      dvpExecutedEntry: dvpEntry
        ? { id: dvpEntry.id, type: dvpEntry.type, timestamp: dvpEntry.timestamp, actor: dvpEntry.actor, detail: dvpEntry.detail }
        : null,
    },
    ledgerIntegrity: {
      ledgerMode: "Append-only",
      ledgerEntryCount: ledger.length,
      authorizationEntryId: authEntry?.id ?? "N/A",
      dvpExecutionEntryId: dvpEntry?.id ?? "N/A",
      executionModel: "Atomic Delivery-versus-Payment (DvP)",
      capitalSnapshotFrozenAtOpen: true,
      settlementStatusAtGeneration: settlement.status,
    },
    attestation: "This clearing receipt is generated directly from AurumShield's append-only settlement ledger. All economic, verification, and capital conditions reflected herein correspond to the authorization and execution snapshots recorded in immutable ledger state.",
  };
}

/* ================================================================ */
function ReceiptContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const orderQ = useOrder(params.id);
  const listingsQ = useListings();
  const settlementQ = useSettlementByOrder(params.id);

  const order = orderQ.data;
  const settlement = settlementQ.data;
  const settlementId = settlement?.id ?? "";

  const ledgerQ = useSettlementLedger(settlementId);
  const ledger = ledgerQ.data ?? [];

  const listing = useMemo(
    () => listingsQ.data?.find((l: Listing) => l.id === order?.listingId),
    [listingsQ.data, order?.listingId],
  );

  const isLoading = orderQ.isLoading || listingsQ.isLoading || settlementQ.isLoading || ledgerQ.isLoading;
  if (isLoading) return <LoadingState message="Loading receipt data…" />;
  if (!order) return <ErrorState title="Not Found" message={`Order ${params.id} not found.`} />;

  // Access control: must be order owner or admin/ops role
  const isOwner = user?.id === order.buyerUserId || user?.id === order.sellerUserId;
  const isOps = user?.role === "admin" || user?.role === "treasury" || user?.role === "vault_ops" || user?.role === "compliance";

  if (!isOwner && !isOps) {
    return (
      <div className="max-w-xl mx-auto mt-12">
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-8 text-center space-y-4">
          <Shield className="h-8 w-8 text-danger mx-auto" />
          <h2 className="text-lg font-semibold text-danger">Access Denied</h2>
          <p className="text-sm text-text-muted">
            You do not have permission to view this receipt. Only the order buyer, seller, or authorized operations personnel may access clearing receipts.
          </p>
          <p className="text-xs font-mono text-text-faint">
            HTTP 403 — Insufficient privileges for order {order.id}
          </p>
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 text-sm text-gold hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Order
          </Link>
        </div>
      </div>
    );
  }

  // Lock panel when not settled
  const isSettled = settlement?.status === "SETTLED";
  if (!isSettled) {
    return (
      <>
        <div className="flex items-center gap-3 mb-2 print:hidden">
          <Link href={`/orders/${order.id}`} className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
            <ArrowLeft className="h-4 w-4" /> Order {order.id}
          </Link>
        </div>
        <div className="max-w-xl mx-auto mt-8">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-8 text-center space-y-4">
            <Lock className="h-8 w-8 text-warning mx-auto" />
            <h2 className="text-lg font-semibold text-warning">Receipt Not Available</h2>
            <p className="text-sm text-text-muted">
              Clearing receipts are generated only for orders that have reached <span className="font-mono font-semibold">SETTLED</span> status.
            </p>
            <p className="text-xs text-text-faint">
              {settlement
                ? `Current settlement status: ${settlement.status}. All lifecycle steps must be completed before a receipt can be generated.`
                : "No settlement case has been initiated for this order yet. Settlement must be opened and completed before a receipt is available."
              }
            </p>
            <Link
              href={`/orders/${order.id}`}
              className="inline-flex items-center gap-2 text-sm text-gold hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Order
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Resolve entities
  const buyerOrg = mockOrgs.find((o) => o.id === settlement.buyerOrgId);
  const sellerOrg = mockOrgs.find((o) => o.id === settlement.sellerOrgId);
  const buyerCp = mockCounterparties.find((cp) => cp.entity === buyerOrg?.legalName);
  const sellerCp = mockCounterparties.find((cp) => cp.entity === sellerOrg?.legalName);
  const corridor = mockCorridors.find((c) => c.id === settlement.corridorId);
  const hub = mockHubs.find((h) => h.id === settlement.hubId);
  const vaultHub = mockHubs.find((h) => h.id === settlement.vaultHubId);
  const fees = computeFees(settlement.notionalUsd);

  // Extract ledger snapshots
  const authEntry = ledger.find((e) => e.type === "AUTHORIZATION");
  const dvpEntry = ledger.find((e) => e.type === "DVP_EXECUTED");

  const docId = buildDocId(order.id, settlement.id, ledger);
  const generatedAt = dvpEntry?.timestamp ?? settlement.updatedAt;

  function handlePrint() {
    window.print();
  }

  function handleExportJson() {
    const payload = buildJsonPayload(order!, settlement!, listing, ledger, docId, authEntry, dvpEntry);
    console.log("=== AURUMSHIELD CLEARING RECEIPT — JSON EXPORT ===");
    console.log(JSON.stringify(payload, null, 2));
    // TODO: Generate PDF from structured payload
    alert("Receipt JSON payload has been exported to the browser console.\nSee Developer Tools → Console.");
  }

  return (
    <>
      {/* Navigation bar (hidden in print) */}
      <div className="flex items-center justify-between gap-3 mb-4 print:hidden">
        <Link href={`/orders/${order.id}`} className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Order {order.id}
        </Link>
        <div className="flex items-center gap-2">
          <button
            id="receipt-print-btn"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text hover:bg-surface-3 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            id="receipt-export-btn"
            onClick={handleExportJson}
            className="flex items-center gap-2 rounded-md border border-gold/30 bg-gold/10 text-gold px-3 py-2 text-xs font-medium hover:bg-gold/20 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>
        </div>
      </div>

      {/* Receipt Document */}
      <div className="receipt-print max-w-3xl mx-auto">
        <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">

          {/* ═══ HEADER ═══ */}
          <div className="border-b-2 border-gold/30 bg-surface-2 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-text" style={{ fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace" }}>
                  AURUMSHIELD CLEARING RECEIPT
                </h1>
                <p className="text-[10px] text-text-faint mt-1 font-mono">{docId}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-text-faint font-semibold">Receipt Version</p>
                <p className="text-sm font-mono font-bold text-text">v1</p>
              </div>
            </div>
          </div>

          {/* ═══ PARTIES ═══ */}
          <div className="border-b border-border px-8 py-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-faint mb-3">Parties</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Buyer</p>
                <p className="text-sm font-semibold text-text">{buyerOrg?.legalName ?? settlement.buyerOrgId}</p>
                <p className="text-[10px] text-text-faint mt-0.5">LEI: <span className="font-mono">{buyerCp?.legalEntityId ?? "N/A"}</span></p>
                <p className="text-[10px] text-text-faint">Jurisdiction: {buyerOrg?.jurisdiction ?? "N/A"}</p>
                <p className="text-[10px] text-text-faint font-mono">User ID: {settlement.buyerUserId}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Seller</p>
                <p className="text-sm font-semibold text-text">{sellerOrg?.legalName ?? settlement.sellerOrgId}</p>
                <p className="text-[10px] text-text-faint mt-0.5">LEI: <span className="font-mono">{sellerCp?.legalEntityId ?? "N/A"}</span></p>
                <p className="text-[10px] text-text-faint">Jurisdiction: {sellerOrg?.jurisdiction ?? "N/A"}</p>
                <p className="text-[10px] text-text-faint font-mono">User ID: {settlement.sellerUserId}</p>
              </div>
            </div>
          </div>

          {/* ═══ ASSET ═══ */}
          <div className="border-b border-border px-8 py-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-faint mb-3">Asset</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs w-40">Listing ID</td>
                  <td className="py-1 font-mono text-xs">{listing?.id ?? order.listingId}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Form</td>
                  <td className="py-1 text-xs capitalize">{listing?.form ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Purity</td>
                  <td className="py-1 text-xs tabular-nums">.{listing?.purity ?? "—"}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Weight</td>
                  <td className="py-1 text-xs tabular-nums font-semibold">{settlement.weightOz} oz</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Vault</td>
                  <td className="py-1 text-xs">{vaultHub?.name ?? settlement.vaultHubId}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ═══ ECONOMICS ═══ */}
          <div className="border-b border-border px-8 py-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-faint mb-3">Economics</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs w-40">Price / oz (Locked)</td>
                  <td className="py-1 text-xs tabular-nums font-mono">{fmtUsd(settlement.pricePerOzLocked)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Notional</td>
                  <td className="py-1 text-xs tabular-nums font-semibold">{fmtUsd(settlement.notionalUsd)}</td>
                </tr>
                <tr className="border-t border-border/50">
                  <td className="py-1 pr-4 text-text-faint text-xs">Clearing Fee (0.15%)</td>
                  <td className="py-1 text-xs tabular-nums font-mono">{fmtUsd(fees.clearingFee)}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Custody Fee (0.05%)</td>
                  <td className="py-1 text-xs tabular-nums font-mono">{fmtUsd(fees.custodyFee)}</td>
                </tr>
                <tr className="border-t border-border/50">
                  <td className="py-1 pr-4 text-text-faint text-xs font-semibold">Total Fees</td>
                  <td className="py-1 text-xs tabular-nums font-semibold">{fmtUsd(fees.totalFees)}</td>
                </tr>
                <tr className="border-t border-border/50">
                  <td className="py-1 pr-4 text-text-faint text-xs">Settlement Rail</td>
                  <td className="py-1 text-xs font-mono">{settlement.rail}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ═══ CONTROLS ═══ */}
          <div className="border-b border-border px-8 py-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-faint mb-3">Controls</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs w-40">Corridor</td>
                  <td className="py-1 text-xs">{corridor?.name ?? settlement.corridorId} <span className="font-mono text-text-faint">({settlement.corridorId})</span></td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Settlement Hub</td>
                  <td className="py-1 text-xs">{hub?.name ?? settlement.hubId} <span className="font-mono text-text-faint">({settlement.hubId})</span></td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 text-text-faint text-xs">Vault Hub</td>
                  <td className="py-1 text-xs">{vaultHub?.name ?? settlement.vaultHubId} <span className="font-mono text-text-faint">({settlement.vaultHubId})</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ═══ DETERMINISTIC CHECKS ═══ */}
          <div className="border-b border-border px-8 py-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-faint mb-3">Deterministic Checks (Snapshot)</h2>
            <table className="w-full text-sm">
              <tbody>
                <CheckRow label="At Authorization" snapshot={authEntry?.snapshot} />
                <tr><td colSpan={2} className="py-1"><div className="border-t border-border/50" /></td></tr>
                <CheckRow label="At DvP Execution" snapshot={dvpEntry?.snapshot} />
              </tbody>
            </table>
          </div>

          {/* ═══ LEDGER EXCERPT ═══ */}
          <div className="border-b border-border px-8 py-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-faint mb-3">Ledger Excerpt</h2>
            <div className="space-y-3">
              {authEntry && (
                <div className="rounded border border-border bg-surface-2 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold">{authEntry.type}</span>
                    <span className="text-[10px] font-mono text-text-faint">{authEntry.id}</span>
                  </div>
                  <p className="text-[10px] text-text-muted font-mono break-all leading-relaxed">{authEntry.detail}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-faint">
                    <span className="tabular-nums">{fmtDateTime(authEntry.timestamp)}</span>
                    <span>Actor: {authEntry.actor} ({authEntry.actorUserId})</span>
                  </div>
                </div>
              )}
              {dvpEntry && (
                <div className="rounded border border-border bg-surface-2 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-success">{dvpEntry.type}</span>
                    <span className="text-[10px] font-mono text-text-faint">{dvpEntry.id}</span>
                  </div>
                  <p className="text-[10px] text-text-muted font-mono break-all leading-relaxed">{dvpEntry.detail}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-faint">
                    <span className="tabular-nums">{fmtDateTime(dvpEntry.timestamp)}</span>
                    <span>Actor: {dvpEntry.actor} ({dvpEntry.actorUserId})</span>
                  </div>
                </div>
              )}
              {!authEntry && !dvpEntry && (
                <p className="text-xs text-text-faint italic">No authorization or execution ledger entries found.</p>
              )}
            </div>
          </div>

          {/* ═══ LEDGER INTEGRITY & CLEARING ATTESTATION ═══ */}
          <div className="px-8 py-5">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-text-faint mb-3">Ledger Integrity &amp; Clearing Attestation</h2>

            {/* Ledger Integrity */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Ledger Integrity</p>
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint w-52">Ledger Mode</td>
                    <td className="py-0.5 font-mono">Append-only</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">Ledger Entries</td>
                    <td className="py-0.5 font-mono tabular-nums">{ledger.length}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">Authorization Entry ID</td>
                    <td className="py-0.5 font-mono">{authEntry?.id ?? "N/A"}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">DvP Execution Entry ID</td>
                    <td className="py-0.5 font-mono">{dvpEntry?.id ?? "N/A"}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">Execution Model</td>
                    <td className="py-0.5 font-mono">Atomic Delivery-versus-Payment (DvP)</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">Capital Snapshot Frozen At Open</td>
                    <td className="py-0.5 font-mono">YES</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">Settlement Status at Generation</td>
                    <td className="py-0.5 font-mono font-semibold">{settlement.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Divider */}
            <div className="border-t border-border my-4" />

            {/* Attestation */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Attestation</p>
              <blockquote className="text-xs text-text-muted italic leading-relaxed border-l-2 border-gold/30 pl-4">
                This clearing receipt is generated directly from AurumShield&apos;s append-only settlement ledger.
                All economic, verification, and capital conditions reflected herein correspond to the
                authorization and execution snapshots recorded in immutable ledger state.
              </blockquote>
            </div>

            {/* Metadata */}
            <div className="border-t border-border pt-3">
              <table className="w-full text-[10px]">
                <tbody>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint w-52">Generated At</td>
                    <td className="py-0.5 font-mono tabular-nums">{generatedAt}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">Receipt Version</td>
                    <td className="py-0.5 font-mono font-semibold">v1</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 pr-4 text-text-faint">Document ID</td>
                    <td className="py-0.5 font-mono font-semibold">{docId}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
