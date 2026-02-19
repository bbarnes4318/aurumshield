"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,

  Landmark,
  Download,
  Ban,
  Shield,
  Clock,
  DollarSign,
  ShieldCheck,
  Zap,
  Lock,
  AlertTriangle,
  CreditCard,
  Activity,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardPanel } from "@/components/ui/dashboard-panel";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import {
  useSettlement,
  useSettlementLedger,
  useApplySettlementAction,
  useExportSettlementPacket,
  useCertificateBySettlement,
} from "@/hooks/use-mock-queries";
import {
  computeSettlementRequirements,
  ACTION_ROLE_MAP,
  ROLE_LABELS,
} from "@/lib/settlement-engine";
import type { SettlementActionPayload, SettlementActionType } from "@/lib/settlement-engine";
import type { SettlementStatus, LedgerEntry, UserRole } from "@/lib/mock-data";
import { mockCorridors, mockHubs } from "@/lib/mock-data";
import { SettlementRailsVisualization } from "@/components/demo/SettlementRailsVisualization";

/* ---------- Status chip config ---------- */
const STATUS_CONFIG: Record<SettlementStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-surface-3 text-text-faint border-border" },
  ESCROW_OPEN: { label: "Escrow Open", color: "bg-info/10 text-info border-info/20" },
  AWAITING_FUNDS: { label: "Awaiting Funds", color: "bg-warning/10 text-warning border-warning/20" },
  AWAITING_GOLD: { label: "Awaiting Gold", color: "bg-gold/10 text-gold border-gold/20" },
  AWAITING_VERIFICATION: { label: "Awaiting Verification", color: "bg-warning/10 text-warning border-warning/20" },
  READY_TO_SETTLE: { label: "Ready to Settle", color: "bg-success/10 text-success border-success/20" },
  AUTHORIZED: { label: "Authorized", color: "bg-info/10 text-info border-info/20" },
  SETTLED: { label: "Settled", color: "bg-success/10 text-success border-success/20" },
  FAILED: { label: "Failed", color: "bg-danger/10 text-danger border-danger/20" },
  CANCELLED: { label: "Cancelled", color: "bg-surface-3 text-text-faint border-border" },
};

/* ---------- Ledger entry type icons ---------- */
const LEDGER_ICON: Record<string, React.ReactNode> = {
  ESCROW_OPENED: <Landmark className="h-3 w-3 text-info" />,
  FUNDS_DEPOSITED: <DollarSign className="h-3 w-3 text-success" />,
  GOLD_ALLOCATED: <Shield className="h-3 w-3 text-gold" />,
  VERIFICATION_PASSED: <ShieldCheck className="h-3 w-3 text-success" />,
  SETTLEMENT_AUTHORIZED: <CheckCircle2 className="h-3 w-3 text-success" />,
  AUTHORIZATION: <Lock className="h-3 w-3 text-info" />,
  DVP_EXECUTED: <Zap className="h-3 w-3 text-gold" />,
  FUNDS_RELEASED: <DollarSign className="h-3 w-3 text-info" />,
  GOLD_RELEASED: <Shield className="h-3 w-3 text-info" />,
  SETTLEMENT_FAILED: <XCircle className="h-3 w-3 text-danger" />,
  ESCROW_CLOSED: <Landmark className="h-3 w-3 text-text-faint" />,
  STATUS_CHANGED: <Activity className="h-3 w-3 text-info" />,
  FEE_CONFIGURED: <DollarSign className="h-3 w-3 text-gold" />,
  PAYMENT_RECEIVED: <CreditCard className="h-3 w-3 text-success" />,
  ACTIVATION_COMPLETED: <ShieldCheck className="h-3 w-3 text-success" />,
  APPROVAL_UPDATED: <AlertTriangle className="h-3 w-3 text-warning" />,
};

/* ---------- Action UI config ---------- */
interface ActionConfig {
  label: string;
  icon: React.ReactNode;
  variant: "info" | "gold" | "success" | "danger" | "warning";
}

const ACTION_UI: Record<SettlementActionType, ActionConfig> = {
  CONFIRM_FUNDS_FINAL: { label: "Confirm Funds Final", icon: <DollarSign className="h-3.5 w-3.5" />, variant: "info" },
  ALLOCATE_GOLD: { label: "Allocate Gold", icon: <Shield className="h-3.5 w-3.5" />, variant: "gold" },
  MARK_VERIFICATION_CLEARED: { label: "Mark Verification Cleared", icon: <ShieldCheck className="h-3.5 w-3.5" />, variant: "info" },
  AUTHORIZE_SETTLEMENT: { label: "Authorize Settlement", icon: <Lock className="h-3.5 w-3.5" />, variant: "success" },
  EXECUTE_DVP: { label: "Execute DvP", icon: <Zap className="h-3.5 w-3.5" />, variant: "success" },
  FAIL_SETTLEMENT: { label: "Fail Settlement", icon: <XCircle className="h-3.5 w-3.5" />, variant: "danger" },
  CANCEL_SETTLEMENT: { label: "Cancel Settlement", icon: <Ban className="h-3.5 w-3.5" />, variant: "warning" },
};

/* ---------- Determine disable reason for each action ---------- */
function getActionDisableReason(
  action: SettlementActionType,
  settlement: { status: SettlementStatus; fundsConfirmedFinal: boolean; goldAllocated: boolean; verificationCleared: boolean },
  userRole: UserRole,
  hasBlockers: boolean,
): string | null {
  // Role check first
  const allowed = ACTION_ROLE_MAP[action];
  if (!allowed.includes(userRole)) {
    return `Requires role: ${allowed.map((r) => ROLE_LABELS[r]).join(", ")}`;
  }

  // Terminal state
  if (settlement.status === "SETTLED" || settlement.status === "FAILED" || settlement.status === "CANCELLED") {
    return `Settlement is ${settlement.status}`;
  }

  // Blockers
  if (hasBlockers && action !== "FAIL_SETTLEMENT" && action !== "CANCEL_SETTLEMENT") {
    return "Blocked by requirement failures";
  }

  // Action-specific preconditions
  switch (action) {
    case "CONFIRM_FUNDS_FINAL":
      if (settlement.fundsConfirmedFinal) return "Already confirmed";
      if (settlement.status === "AUTHORIZED") return "Already authorized";
      return null;
    case "ALLOCATE_GOLD":
      if (settlement.goldAllocated) return "Already allocated";
      if (settlement.status === "AUTHORIZED") return "Already authorized";
      return null;
    case "MARK_VERIFICATION_CLEARED":
      if (settlement.verificationCleared) return "Already cleared";
      if (settlement.status === "AUTHORIZED") return "Already authorized";
      return null;
    case "AUTHORIZE_SETTLEMENT":
      if (settlement.status === "AUTHORIZED") return "Already authorized";
      if (!settlement.fundsConfirmedFinal) return "Funds not confirmed";
      if (!settlement.goldAllocated) return "Gold not allocated";
      if (!settlement.verificationCleared) return "Verification not cleared";
      return null;
    case "EXECUTE_DVP":
      if (settlement.status !== "AUTHORIZED") return "Settlement must be AUTHORIZED first";
      return null;
    case "FAIL_SETTLEMENT":
      return null; // needs reason only
    case "CANCEL_SETTLEMENT":
      return null; // needs reason only
    default:
      return null;
  }
}

export default function SettlementDetailPage() {
  return (
    <RequireAuth>
      <SettlementDetailContent />
    </RequireAuth>
  );
}

/* ================================================================ */
function SettlementDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const settlementQ = useSettlement(params.id);
  const ledgerQ = useSettlementLedger(params.id);
  const certQ = useCertificateBySettlement(params.id);
  const applyAction = useApplySettlementAction();
  const exportPacket = useExportSettlementPacket();

  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [failReason, setFailReason] = useState("");

  const settlement = settlementQ.data;
  const ledger = ledgerQ.data ?? [];

  const corridor = useMemo(
    () => (settlement ? mockCorridors.find((c) => c.id === settlement.corridorId) : undefined),
    [settlement],
  );
  const hub = useMemo(
    () => (settlement ? mockHubs.find((h) => h.id === settlement.hubId) : undefined),
    [settlement],
  );
  const vaultHub = useMemo(
    () => (settlement ? mockHubs.find((h) => h.id === settlement.vaultHubId) : undefined),
    [settlement],
  );

  const requirements = useMemo(
    () =>
      settlement
        ? computeSettlementRequirements(settlement, corridor, hub, null)
        : { blockers: [], warns: [], requiredActions: [] },
    [settlement, corridor, hub],
  );


  const userRole = (user?.role ?? "buyer") as UserRole;
  const isViewOnly = userRole === "buyer" || userRole === "seller";

  if (settlementQ.isLoading || ledgerQ.isLoading) {
    return <LoadingState message="Loading settlement…" />;
  }
  if (!settlement) {
    return <ErrorState title="Not Found" message={`Settlement ${params.id} not found.`} />;
  }

  const statusCfg = STATUS_CONFIG[settlement.status] ?? STATUS_CONFIG.DRAFT;

  async function handleAction(action: SettlementActionType, reason?: string) {
    if (!settlement || !user) return;
    setActionError(null);
    try {
      const payload: SettlementActionPayload = {
        action,
        actorRole: user.role as UserRole,
        actorUserId: user.id,
        reason,
      };
      await applyAction.mutateAsync({ settlementId: settlement.id, payload });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleExport() {
    if (!settlement) return;
    await exportPacket.mutateAsync({ settlementId: settlement.id });
  }

  // Build list of all actions with their disable reasons
  const allActions: SettlementActionType[] = [
    "CONFIRM_FUNDS_FINAL",
    "ALLOCATE_GOLD",
    "MARK_VERIFICATION_CLEARED",
    "AUTHORIZE_SETTLEMENT",
    "EXECUTE_DVP",
    "FAIL_SETTLEMENT",
    "CANCEL_SETTLEMENT",
  ];

  return (
    <>
      <div className="flex items-center gap-3 mb-2 print:hidden">
        <Link href="/settlements" className="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Settlements
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <PageHeader title={`Settlement ${settlement.id}`} description={`Order ${settlement.orderId}`} />
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ml-auto", statusCfg.color)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusCfg.label}
        </span>
      </div>

      {/* ═══ DvP Settlement Rails Visualization ═══ */}
      <SettlementRailsVisualization
        fundsState={
          settlement.status === "SETTLED" ? "certified" :
          settlement.status === "AUTHORIZED" ? "authorized" :
          settlement.fundsConfirmedFinal ? "reserved" :
          "pending"
        }
        assetState={
          settlement.status === "SETTLED" ? "certified" :
          settlement.status === "AUTHORIZED" ? "authorized" :
          settlement.goldAllocated ? "reserved" :
          "pending"
        }
        settlementId={settlement.id}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ LEFT PANEL: Settlement Summary ═══ */}
        <DashboardPanel title="Settlement Summary" tooltip="Immutable settlement record with frozen capital snapshot" asOf={settlement.openedAt}>
          <dl className="space-y-2.5 text-sm">
            <Row label="Settlement ID" mono>{settlement.id}</Row>
            <Row label="Order"><Link href={`/orders/${settlement.orderId}`} className="font-mono text-gold hover:underline text-xs">{settlement.orderId}</Link></Row>
            <Row label="Listing" mono>{settlement.listingId}</Row>
            <Row label="Rail">
              <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold", settlement.rail === "RTGS" ? "bg-info/10 text-info" : "bg-surface-3 text-text-muted")}>
                {settlement.rail}
              </span>
            </Row>
            <Divider />
            <Row label="Weight" tabular>{settlement.weightOz} oz</Row>
            <Row label="Price/oz" tabular>${settlement.pricePerOzLocked.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Row>
            <Row label="Notional" tabular bold>${settlement.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}</Row>
            <Divider />
            <Row label="Corridor">{corridor?.name ?? settlement.corridorId}</Row>
            <Row label="Settlement Hub">{hub?.name ?? settlement.hubId}</Row>
            <Row label="Vault Hub">{vaultHub?.name ?? settlement.vaultHubId}</Row>
            <Divider />
            <Row label="Buyer Org" mono>{settlement.buyerOrgId}</Row>
            <Row label="Seller Org" mono>{settlement.sellerOrgId}</Row>
            <Divider />
            <p className="typo-label pt-1">Capital Snapshot (Frozen at Open)</p>
            <Row label="Capital Base" tabular>${settlement.capitalAtOpen.toLocaleString()}</Row>
            <Row label="ECR" tabular>{settlement.ecrAtOpen.toFixed(2)}x</Row>
            <Row label="Hardstop Util." tabular>{(settlement.hardstopUtilizationAtOpen * 100).toFixed(1)}%</Row>
            <Divider />
            <p className="typo-label pt-1">DvP Checkpoint</p>
            <CheckRow label="Funds Confirmed" checked={settlement.fundsConfirmedFinal} />
            <CheckRow label="Gold Allocated" checked={settlement.goldAllocated} />
            <CheckRow label="Verification Cleared" checked={settlement.verificationCleared} />
          </dl>
        </DashboardPanel>

        {/* ═══ Linked Orders ═══ */}
        <DashboardPanel title="Linked Orders" tooltip="Orders associated with this settlement" asOf={settlement.openedAt}>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border border-border bg-surface-2 px-3 py-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-faint mb-0.5">Order</p>
                <p className="text-xs font-mono text-text">{settlement.orderId}</p>
              </div>
              <Link
                href={`/orders/${settlement.orderId}`}
                className="text-xs text-gold hover:underline font-mono"
              >
                View Order →
              </Link>
            </div>
          </div>
        </DashboardPanel>


        {/* ═══ Activation Gate ═══ */}
        <DashboardPanel title="Activation Gate" tooltip="Fee payment and approval status required to unlock settlement actions" asOf={settlement.updatedAt}>
          {(() => {
            const activated = settlement.activationStatus === "activated";
            const paid = settlement.paymentStatus === "paid";
            const pendingApproval = settlement.requiresManualApproval && settlement.approvalStatus === "pending";
            const rejected = settlement.approvalStatus === "rejected";
            return (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-faint">Activation</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      activated ? "bg-success/10 text-success border-success/20" :
                      settlement.activationStatus === "awaiting_payment" ? "bg-warning/10 text-warning border-warning/20" :
                      "bg-surface-3 text-text-faint border-border"
                    )}>
                      {settlement.activationStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-faint">Payment</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      paid ? "bg-success/10 text-success border-success/20" :
                      settlement.paymentStatus === "failed" ? "bg-danger/10 text-danger border-danger/20" :
                      "bg-surface-3 text-text-faint border-border"
                    )}>
                      {settlement.paymentStatus}
                    </span>
                  </div>
                  {settlement.requiresManualApproval && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-faint">Approval</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        settlement.approvalStatus === "approved" ? "bg-success/10 text-success border-success/20" :
                        rejected ? "bg-danger/10 text-danger border-danger/20" :
                        pendingApproval ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-surface-3 text-text-faint border-border"
                      )}>
                        {settlement.approvalStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>
                {!activated && (
                  <Link
                    href={`/settlements/${settlement.id}/activation`}
                    className="flex items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
                    data-tour="activation-gate-link"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {paid ? "Awaiting Approval" : "Configure & Pay"}
                  </Link>
                )}
                {activated && (
                  <Link
                    href={`/settlements/${settlement.id}/activation`}
                    className="flex items-center justify-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success hover:bg-success/20 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    View Fee Receipt
                  </Link>
                )}
              </div>
            );
          })()}
        </DashboardPanel>

        {/* ═══ CENTER PANEL: Immutable Ledger Timeline ═══ */}
        <DashboardPanel title="Escrow Ledger" tooltip="Append-only ledger — no edits, no deletes" asOf={settlement.updatedAt}>
          <div data-tour="settlement-ledger">
          {ledger.length === 0 ? (
            <p className="text-sm text-text-faint">No ledger entries.</p>
          ) : (
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {ledger.map((entry) => (
                  <LedgerItem key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}
          </div>
        </DashboardPanel>

        {/* ═══ CERTIFICATE MODULE ═══ */}
        {settlement.status === "SETTLED" && certQ.data && (
          <DashboardPanel title="Clearing Certificate" tooltip="Issued upon atomic DvP execution — immutable proof of settlement finality" asOf={certQ.data.issuedAt}>
            <div className="space-y-3">
              <div className="rounded-[var(--radius-sm)] border border-success/20 bg-success/5 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-success" />
                  <span className="text-xs font-semibold text-success">Certificate Issued</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-faint">Certificate #</span>
                    <span className="font-mono text-text">{certQ.data.certificateNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-faint">Issued</span>
                    <span className="tabular-nums text-text">
                      {new Date(certQ.data.issuedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-faint">Signature Hash</span>
                    <span className="font-mono text-[10px] text-text-muted truncate max-w-[180px]" title={certQ.data.signatureHash}>
                      {certQ.data.signatureHash.slice(0, 16)}…
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href={`/certificates/${certQ.data.certificateNumber}?demo=true`}
                data-tour="certificate-view"
                className="flex items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                View Certificate
              </Link>
            </div>
          </DashboardPanel>
        )}

        {/* ═══ RIGHT PANEL: Ops Actions ═══ */}
        <aside className="rounded-lg border border-border bg-surface-1 divide-y divide-border h-fit print:hidden">
          {/* Actor Role Badge + View Mode */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="typo-label">Actor Identity</p>
              {isViewOnly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                  View Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                userRole === "admin" ? "bg-gold/10 text-gold border-gold/20" :
                userRole === "treasury" ? "bg-info/10 text-info border-info/20" :
                userRole === "compliance" ? "bg-warning/10 text-warning border-warning/20" :
                userRole === "vault_ops" ? "bg-success/10 text-success border-success/20" :
                "bg-surface-3 text-text-faint border-border"
              )}>
                {ROLE_LABELS[userRole]}
              </span>
              <span className="text-[10px] text-text-faint font-mono">{user?.id}</span>
            </div>
          </div>

          {/* Requirement Checks */}
          <div className="p-4">
            <p className="typo-label mb-3">Requirement Checks</p>
            {requirements.blockers.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {requirements.blockers.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-bold bg-danger/10 text-danger">BLOCK</span>
                    <span className="text-text">{b}</span>
                  </div>
                ))}
              </div>
            )}
            {requirements.warns.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {requirements.warns.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-bold bg-warning/10 text-warning">WARN</span>
                    <span className="text-text">{w}</span>
                  </div>
                ))}
              </div>
            )}
            {requirements.blockers.length === 0 && requirements.warns.length === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-success mb-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No blockers or warnings
              </div>
            )}
            {requirements.requiredActions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-text-faint uppercase tracking-wider">Advisory</p>
                {requirements.requiredActions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Clock className="h-3 w-3 text-text-faint shrink-0 mt-0.5" />
                    <span className="text-text-muted">{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Action Buttons — always shown, disabled with reason */}
          <div className="p-4 space-y-2.5">
            <p className="typo-label mb-2">Settlement Actions</p>

            {allActions.map((action) => {
              const cfg = ACTION_UI[action];
              const disableReason = isViewOnly
                ? "Ops-only action"
                : getActionDisableReason(
                    action,
                    settlement,
                    userRole,
                    requirements.blockers.length > 0,
                  );

              // Fail/Cancel need reason input
              if (action === "FAIL_SETTLEMENT") {
                return (
                  <div key={action} className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Fail reason (required)"
                      value={failReason}
                      onChange={(e) => setFailReason(e.target.value)}
                      className="w-full h-7 rounded border border-border bg-surface-2 px-2 text-xs text-text placeholder-text-faint outline-none focus:border-danger/50"
                    />
                    <ActionButton
                      label={cfg.label}
                      icon={cfg.icon}
                      variant={cfg.variant}
                      loading={applyAction.isPending}
                      disableReason={disableReason ?? (!failReason.trim() ? "Reason required" : null)}
                      onClick={() => handleAction("FAIL_SETTLEMENT", failReason.trim())}
                    />
                  </div>
                );
              }
              if (action === "CANCEL_SETTLEMENT") {
                return (
                  <div key={action} className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Cancel reason (required)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full h-7 rounded border border-border bg-surface-2 px-2 text-xs text-text placeholder-text-faint outline-none focus:border-warning/50"
                    />
                    <ActionButton
                      label={cfg.label}
                      icon={cfg.icon}
                      variant={cfg.variant}
                      loading={applyAction.isPending}
                      disableReason={disableReason ?? (!cancelReason.trim() ? "Reason required" : null)}
                      onClick={() => handleAction("CANCEL_SETTLEMENT", cancelReason.trim())}
                    />
                  </div>
                );
              }

              return (
                <ActionButton
                  key={action}
                  label={cfg.label}
                  icon={cfg.icon}
                  variant={cfg.variant}
                  loading={applyAction.isPending}
                  disableReason={disableReason}
                  onClick={() => handleAction(action)}
                />
              );
            })}
          </div>

          {/* Error display */}
          {actionError && (
            <div className="p-4">
              <div className="rounded-md border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
                {actionError}
              </div>
            </div>
          )}

          {/* Export */}
          <div className="p-4">
            <button
              id="settlement-export-btn"
              data-tour="certificate-export"
              onClick={handleExport}
              disabled={exportPacket.isPending}
              className="flex items-center gap-2 text-xs text-text-muted hover:text-text transition-colors disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exportPacket.isPending ? "Exporting…" : "Export Settlement Packet"}
            </button>
            {exportPacket.isSuccess && (
              <p className="mt-1.5 text-[10px] text-success">✓ Packet exported to console</p>
            )}
          </div>

          {/* Last decision */}
          {settlement.lastDecisionBy && (
            <div className="p-4 text-xs text-text-faint">
              Last decision by <span className="font-medium text-text">{settlement.lastDecisionBy}</span>
              {settlement.lastDecisionAt && (
                <>
                  {" at "}
                  <span className="tabular-nums">
                    {new Date(settlement.lastDecisionAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </>
              )}
            </div>
          )}

          <div className="p-4 print:hidden">
            <button onClick={() => router.push("/settlements")} className="text-xs text-gold hover:underline">
              ← Back to Settlement Console
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ═══ Reusable components ═══ */

function Row({ label, children, mono, tabular, bold }: { label: string; children: React.ReactNode; mono?: boolean; tabular?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-faint">{label}</dt>
      <dd className={cn("text-text", mono && "font-mono text-xs", tabular && "tabular-nums", bold && "font-semibold")}>
        {children}
      </dd>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function CheckRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <dt className="text-text-faint">{label}</dt>
      <dd className="flex items-center gap-1">
        {checked ? (
          <>
            <CheckCircle2 className="h-3 w-3 text-success" />
            <span className="text-success text-xs font-medium">PASS</span>
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 text-danger" />
            <span className="text-danger text-xs font-medium">PENDING</span>
          </>
        )}
      </dd>
    </div>
  );
}

function LedgerItem({ entry }: { entry: LedgerEntry }) {
  return (
    <div className="relative flex gap-3">
      <div className="absolute -left-5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-surface-1 border border-border">
        {LEDGER_ICON[entry.type] ?? <Clock className="h-3 w-3 text-text-faint" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">{entry.type.replace(/_/g, " ")}</span>
          <span className="text-[10px] tabular-nums text-text-faint">
            {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-xs text-text">{entry.detail}</p>
        <p className="text-[10px] text-text-faint mt-0.5">
          <span className="font-mono">{entry.id}</span> · {ROLE_LABELS[entry.actorRole] ?? entry.actorRole} ({entry.actorUserId})
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  variant,
  loading,
  disableReason,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  variant: "info" | "gold" | "success" | "danger" | "warning";
  loading: boolean;
  disableReason: string | null;
  onClick: () => void;
}) {
  const isDisabled = loading || !!disableReason;
  const base = "w-full flex flex-col items-stretch rounded-md border px-3 py-2 text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<string, string> = {
    info: "border-info/30 bg-info/10 text-info hover:bg-info/20",
    gold: "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20",
    success: "border-success/30 bg-success/10 text-success hover:bg-success/20",
    danger: "border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
    warning: "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20",
  };
  return (
    <button
      className={cn(base, variants[variant])}
      disabled={isDisabled}
      onClick={onClick}
    >
      <span className="flex items-center justify-center gap-2 font-medium">
        {icon}
        {loading ? "Processing…" : label}
      </span>
      {disableReason && (
        <span className="mt-1 text-[10px] text-text-faint text-center font-normal">
          {disableReason}
        </span>
      )}
    </button>
  );
}
