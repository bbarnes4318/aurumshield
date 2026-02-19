"use client";

/* ================================================================
   CAPITAL CONTROLS CONSOLE — Committee-Grade Control Instrument
   ================================================================
   Features:
   - Live control mode badge + reasons
   - Action matrix: canonical block/allow per ControlActionKey
   - Overrides table with create form + revoke
   - Export + print modes
   - Role-gated via RequireRole
   ================================================================ */

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { RequireRole } from "@/components/auth/require-role";
import { ErrorState, LoadingState } from "@/components/ui/state-views";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  useCapitalControls,
  useCapitalOverrides,
  useCreateCapitalOverride,
  useRevokeCapitalOverride,
  useRunCapitalControlsSweep,
  useExportCapitalControlsPacket,
  useIntradayCapital,
} from "@/hooks/use-mock-queries";
import type { ControlActionKey } from "@/lib/capital-controls";
import { ALL_ACTION_KEYS, ACTION_KEY_LABELS, CONTROL_MODE_SEVERITY } from "@/lib/capital-controls";
import { OVERRIDE_ALLOWED_ROLES } from "@/lib/override-store";
import type { OverrideScope, CapitalOverride } from "@/lib/override-store";
import {
  ShieldOff,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  RotateCw,
  Plus,
  Ban,
  Clock,
  Lock,
} from "lucide-react";

/* ================================================================
   DESIGN TOKENS
   ================================================================ */

const MODE_CONFIG: Record<string, {
  label: string;
  description: string;
  cls: string;
  bg: string;
  icon: typeof ShieldCheck;
}> = {
  NORMAL: {
    label: "NORMAL",
    description: "All actions permitted. Capital adequacy within acceptable bounds.",
    cls: "text-success",
    bg: "bg-success/10 border-success/30",
    icon: ShieldCheck,
  },
  THROTTLE_RESERVATIONS: {
    label: "THROTTLE RESERVATIONS",
    description: "Reservation creation is blocked to prevent further capital consumption.",
    cls: "text-warning",
    bg: "bg-warning/10 border-warning/30",
    icon: AlertTriangle,
  },
  FREEZE_CONVERSIONS: {
    label: "FREEZE CONVERSIONS",
    description: "Reservation creation and order conversions are blocked.",
    cls: "text-warning",
    bg: "bg-warning/15 border-warning/40",
    icon: AlertTriangle,
  },
  FREEZE_MARKETPLACE: {
    label: "FREEZE MARKETPLACE",
    description: "All marketplace activity is frozen. Listings cannot be published.",
    cls: "text-danger",
    bg: "bg-danger/10 border-danger/30",
    icon: ShieldAlert,
  },
  EMERGENCY_HALT: {
    label: "EMERGENCY HALT",
    description: "All actions including settlements and DvP are halted. Immediate intervention required.",
    cls: "text-danger",
    bg: "bg-danger/15 border-danger/40",
    icon: XCircle,
  },
};

const OVERRIDE_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "text-success" },
  EXPIRED: { label: "Expired", cls: "text-text-faint" },
  REVOKED: { label: "Revoked", cls: "text-danger" },
};

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function CapitalControlsPage() {
  return (
    <RequireRole allowedRoles={["admin", "treasury", "compliance"]}>
      <CapitalControlsConsole />
    </RequireRole>
  );
}

function CapitalControlsConsole() {
  const { user } = useAuth();
  const controlsQ = useCapitalControls();
  const overridesQ = useCapitalOverrides();
  const capitalQ = useIntradayCapital();
  const sweepMutation = useRunCapitalControlsSweep();
  const exportMutation = useExportCapitalControlsPacket();

  const [showCreateForm, setShowCreateForm] = useState(false);

  if (controlsQ.isLoading || overridesQ.isLoading || capitalQ.isLoading) {
    return <LoadingState message="Loading capital controls..." />;
  }

  if (controlsQ.isError) {
    return <ErrorState message="Failed to load capital controls." onRetry={() => controlsQ.refetch()} />;
  }

  const decision = controlsQ.data!;
  const overrides = overridesQ.data ?? [];
  const snap = capitalQ.data;
  const modeCfg = MODE_CONFIG[decision.mode] ?? MODE_CONFIG.NORMAL;
  const ModeIcon = modeCfg.icon;

  const activeOverrides = overrides.filter((o) => o.status === "ACTIVE");
  const inactiveOverrides = overrides
    .filter((o) => o.status !== "ACTIVE")
    .sort((a, b) => (b.revokedAt ?? b.expiresAt).localeCompare(a.revokedAt ?? a.expiresAt))
    .slice(0, 20);

  const canCreateOverride = user && OVERRIDE_ALLOWED_ROLES.includes(user.role);

  return (
    <>
      <PageHeader
        title="Capital Controls Console"
        description="Deterministic guardrails, throttles, and override governance. Committee-grade instrument."
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => sweepMutation.mutate()}
              disabled={sweepMutation.isPending}
              className="flex items-center gap-2 rounded-input border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-3 disabled:opacity-50"
              data-tour="control-mode-toggle"
            >
              <RotateCw className={cn("h-3.5 w-3.5", sweepMutation.isPending && "animate-spin")} />
              Run Sweep
            </button>
            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 rounded-input border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-3 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-input bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        }
      />

      {/* ── SECTION: CONTROL MODE ── */}
      <section>
        <h2 className="typo-label mb-3">Current Control Mode</h2>
        <div className={cn("card-base px-5 py-5 border-l-4", modeCfg.bg.split(" ").find(c => c.startsWith("border-")))}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ModeIcon className={cn("h-6 w-6 mt-0.5 shrink-0", modeCfg.cls)} />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={cn("text-lg font-bold tracking-wider", modeCfg.cls)}>
                    {modeCfg.label}
                  </span>
                  <span className="text-[10px] font-mono text-text-faint">
                    Severity: {CONTROL_MODE_SEVERITY[decision.mode]}/4
                  </span>
                </div>
                <p className="text-sm text-text-muted">{modeCfg.description}</p>
                {decision.reasons.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">Reasons</span>
                    {decision.reasons.map((r, i) => (
                      <p key={i} className="text-xs text-text-muted pl-3 border-l border-border">
                        {r}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 print:hidden">
              {snap && (
                <div className="space-y-1">
                  <div className="text-xs tabular-nums text-text-faint">
                    ECR <span className="text-text">{snap.ecr.toFixed(2)}x</span>
                  </div>
                  <div className="text-xs tabular-nums text-text-faint">
                    HU <span className="text-text">{(snap.hardstopUtilization * 100).toFixed(1)}%</span>
                  </div>
                  <div className="text-[10px] font-mono text-text-faint mt-1">
                    Hash: {decision.snapshotHash}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: ACTION MATRIX ── */}
      <section className="mt-6">
        <h2 className="typo-label mb-3">Action Matrix</h2>
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">Action</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-faint">Status</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-text-faint">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ALL_ACTION_KEYS.map((key) => {
                  const blocked = decision.blocks[key];
                  const hasOverride = activeOverrides.some(
                    (o) => o.scope === "GLOBAL" || (o.scope === "ACTION" && o.actionKey === key)
                  );
                  return (
                    <tr key={key} className="hover:bg-surface-2/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-text">{ACTION_KEY_LABELS[key]}</span>
                        <span className="ml-2 text-[10px] font-mono text-text-faint">{key}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {blocked ? (
                          <span className="inline-flex items-center gap-1 text-danger">
                            <Ban className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold">BLOCKED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold">ALLOWED</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasOverride ? (
                          <span className="inline-flex items-center gap-1 text-gold">
                            <ShieldOff className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold uppercase">Override Active</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Advisory limits (throttle mode) */}
        {decision.limits.maxReservationNotional != null && (
          <div className="mt-3 card-base px-4 py-3 bg-warning/5 border-warning/20">
            <p className="text-xs text-warning">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
              Advisory limit — max reservation notional:{" "}
              <span className="font-bold tabular-nums">
                ${decision.limits.maxReservationNotional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        )}
      </section>

      {/* ── SECTION: ACTIVE OVERRIDES ── */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="typo-label">
            Active Overrides
            {activeOverrides.length > 0 && (
              <span className="ml-2 text-[11px] font-normal text-gold tabular-nums">
                ({activeOverrides.length})
              </span>
            )}
          </h2>
          {canCreateOverride && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 rounded-input border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-3 print:hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              {showCreateForm ? "Cancel" : "Create Override"}
            </button>
          )}
        </div>

        {showCreateForm && user && <CreateOverrideForm currentMode={decision.mode} onClose={() => setShowCreateForm(false)} />}

        {activeOverrides.length === 0 ? (
          <div className="card-base px-5 py-8 text-center">
            <Lock className="h-6 w-6 text-text-faint mx-auto mb-2" />
            <p className="text-sm text-text-muted">No active overrides</p>
          </div>
        ) : (
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <OverridesTable overrides={activeOverrides} showRevoke={!!canCreateOverride} />
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION: OVERRIDE HISTORY ── */}
      {inactiveOverrides.length > 0 && (
        <section className="mt-6">
          <h2 className="typo-label mb-3">Override History</h2>
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <OverridesTable overrides={inactiveOverrides} showRevoke={false} />
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION: METADATA ── */}
      <section className="mt-6 print:mt-4">
        <div className="flex items-center gap-4 text-[10px] text-text-faint tabular-nums">
          <span>As of: {new Date(decision.asOf).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })}</span>
          <span>Snapshot Hash: <span className="font-mono">{decision.snapshotHash}</span></span>
          <span>Mode Severity: {CONTROL_MODE_SEVERITY[decision.mode]}/4</span>
        </div>
      </section>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          nav, header button, .print\\:hidden { display: none !important; }
          body { font-size: 11px !important; }
          .card-base { break-inside: avoid; }
          table { font-size: 10px !important; }
          .font-mono { font-family: "Courier New", monospace !important; }
        }
      `}</style>
    </>
  );
}

/* ================================================================
   OVERRIDES TABLE
   ================================================================ */

function OverridesTable({ overrides, showRevoke }: { overrides: CapitalOverride[]; showRevoke: boolean }) {
  const { user } = useAuth();
  const revokeMutation = useRevokeCapitalOverride();

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-2/50">
          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">ID</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">Scope</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">Action</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">Status</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">Created By</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">Expires</th>
          <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-faint">Reason</th>
          {showRevoke && <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-text-faint print:hidden" />}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {overrides.map((ov) => {
          const statusCfg = OVERRIDE_STATUS_CONFIG[ov.status] ?? { label: ov.status, cls: "text-text-faint" };
          return (
            <tr key={ov.id} className="hover:bg-surface-2/30 transition-colors">
              <td className="px-4 py-3 font-mono text-[11px] text-text-faint whitespace-nowrap">
                {ov.id}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  ov.scope === "GLOBAL" ? "text-gold" : "text-info"
                )}>
                  {ov.scope}
                </span>
              </td>
              <td className="px-4 py-3 text-xs whitespace-nowrap">
                {ov.actionKey ? ACTION_KEY_LABELS[ov.actionKey] : "All Actions"}
              </td>
              <td className="px-4 py-3">
                <span className={cn("text-xs font-semibold", statusCfg.cls)}>
                  {statusCfg.label}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                <span className="font-medium text-text">{ov.actorName}</span>
                <span className="ml-1 text-text-faint">({ov.actorRole})</span>
              </td>
              <td className="px-4 py-3 text-xs tabular-nums text-text-muted whitespace-nowrap">
                <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
                {new Date(ov.expiresAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
              </td>
              <td className="px-4 py-3 text-xs text-text-muted max-w-[200px] truncate" title={ov.reason}>
                {ov.reason}
              </td>
              {showRevoke && (
                <td className="px-4 py-3 text-right print:hidden">
                  {ov.status === "ACTIVE" && user && (
                    <button
                      onClick={() =>
                        revokeMutation.mutate({
                          overrideId: ov.id,
                          actorRole: user.role,
                          actorUserId: user.id,
                        })
                      }
                      disabled={revokeMutation.isPending}
                      className="text-[11px] font-medium text-danger hover:underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ================================================================
   CREATE OVERRIDE FORM
   ================================================================ */

function CreateOverrideForm({ currentMode, onClose }: { currentMode: string; onClose: () => void }) {
  const { user } = useAuth();
  const createMutation = useCreateCapitalOverride();

  const [scope, setScope] = useState<OverrideScope>("ACTION");
  const [actionKey, setActionKey] = useState<ControlActionKey>("CREATE_RESERVATION");
  const [reason, setReason] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);

    if (reason.trim().length < 20) {
      setError("Reason must be at least 20 characters.");
      return;
    }

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    try {
      await createMutation.mutateAsync({
        scope,
        actionKey: scope === "ACTION" ? actionKey : null,
        reason: reason.trim(),
        expiresAt,
        actorRole: user.role,
        actorUserId: user.id,
        actorName: user.name,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create override.");
    }
  };

  return (
    <div className="card-base px-5 py-5 mb-4 border-l-4 border-gold/30 print:hidden">
      <h3 className="text-sm font-semibold text-text mb-4">Create Override</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Scope */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-faint block mb-1.5">
            Scope
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="ACTION"
                checked={scope === "ACTION"}
                onChange={() => setScope("ACTION")}
                className="accent-gold"
              />
              <span className="text-sm text-text">Action-Specific</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="GLOBAL"
                checked={scope === "GLOBAL"}
                onChange={() => setScope("GLOBAL")}
                className="accent-gold"
              />
              <span className="text-sm text-text">Global</span>
            </label>
          </div>
          {scope === "GLOBAL" && (
            <p className="text-[10px] text-warning mt-1">
              Global overrides are only permitted for THROTTLE_RESERVATIONS and FREEZE_CONVERSIONS modes (max one level downgrade).
            </p>
          )}
        </div>

        {/* Action Key (only for ACTION scope) */}
        {scope === "ACTION" && (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-faint block mb-1.5">
              Action
            </label>
            <select
              value={actionKey}
              onChange={(e) => setActionKey(e.target.value as ControlActionKey)}
              className="rounded-input w-full max-w-xs bg-surface-2 border border-border px-3 py-2 text-sm text-text"
            >
              {ALL_ACTION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ACTION_KEY_LABELS[key]} ({key})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Expiry */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-faint block mb-1.5">
            Duration (minutes)
          </label>
          <select
            value={expiryMinutes}
            onChange={(e) => setExpiryMinutes(Number(e.target.value))}
            className="rounded-input w-full max-w-xs bg-surface-2 border border-border px-3 py-2 text-sm text-text"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={240}>4 hours</option>
            <option value={480}>8 hours</option>
          </select>
        </div>

        {/* Reason */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-text-faint block mb-1.5">
            Reason (min. 20 characters)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="rounded-input w-full bg-surface-2 border border-border px-3 py-2 text-sm text-text resize-none"
            placeholder="Provide a detailed reason for this override..."
          />
          <p className="text-[10px] text-text-faint mt-1 tabular-nums">
            {reason.trim().length}/20 characters
          </p>
        </div>

        {error && (
          <div className="rounded-input bg-danger/10 border border-danger/30 px-3 py-2">
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 rounded-input bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Override
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-border px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-3"
          >
            Cancel
          </button>
        </div>

        {/* Context info */}
        <div className="mt-2 text-[10px] text-text-faint space-y-0.5">
          <p>Current mode: <span className="font-mono font-semibold">{currentMode}</span></p>
          <p>Actor: <span className="font-semibold">{user?.name}</span> ({user?.role})</p>
        </div>
      </form>
    </div>
  );
}
