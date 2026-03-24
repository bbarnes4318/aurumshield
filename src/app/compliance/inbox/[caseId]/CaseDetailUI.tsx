"use client";

/* ================================================================
   CASE DETAIL UI — Full V3 Compliance Case View
   ================================================================
   Renders the operator-facing case detail with all 9 sections
   plus assignment controls, task workflow, and disposition panel.
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { RequireRole } from "@/components/auth/require-role";
import type { CaseDetailData } from "@/actions/compliance-queries";
import { assignCaseAction, completeTaskAction } from "@/actions/compliance-decisions";
import DispositionPanel from "./DispositionPanel";
import {
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  Users,
  Truck,
  FlaskConical,
  Landmark,
  FileCheck,
  Hash,
  ClipboardList,
  MessageSquare,
  History,
  Gavel,
  ExternalLink,
  Info,
  UserPlus,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// ─── STATUS / BADGE HELPERS ────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:                      { label: "Draft",              cls: "text-slate-400 bg-slate-400/10 border-slate-400/20" },
  OPEN:                       { label: "Open",               cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  AWAITING_SUBJECT:           { label: "Awaiting Subject",   cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  AWAITING_PROVIDER:          { label: "Awaiting Provider",  cls: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  AWAITING_INTERNAL_REVIEW:   { label: "Awaiting Review",    cls: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  ESCALATED:                  { label: "Escalated",          cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  READY_FOR_DISPOSITION:      { label: "Ready for Disposition", cls: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  APPROVED:                   { label: "Approved",           cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  REJECTED:                   { label: "Rejected",           cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  SUSPENDED:                  { label: "Suspended",          cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  CLOSED:                     { label: "Closed",             cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20" },
  EXPIRED:                    { label: "Expired",            cls: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20" },
};

const CASE_TYPE_LABELS: Record<string, string> = {
  ONBOARDING: "Subject Onboarding",
  PERIODIC_REVIEW: "Periodic Review",
  EVENT_DRIVEN_REVIEW: "Event-Driven Review",
  WALLET_REVIEW: "Wallet Review",
  TRAINING_CERTIFICATION: "Training Certification",
  PHYSICAL_SHIPMENT_REVIEW: "Physical Shipment Review",
  REFINERY_INTAKE_REVIEW: "Refinery Intake Review",
  SETTLEMENT_AUTHORIZATION: "Settlement Authorization",
};

const SUBJECT_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual Buyer",
  ENTITY: "Entity / Corporate",
  SUPPLIER: "Supplier (Mine)",
  REFINERY: "Refinery",
  INTERNAL_USER: "Internal User",
};

const VERDICT_BADGE: Record<string, { label: string; cls: string }> = {
  PASS:    { label: "PASS",    cls: "text-emerald-400 bg-emerald-400/10" },
  FAIL:    { label: "FAIL",    cls: "text-red-400 bg-red-400/10" },
  REVIEW:  { label: "REVIEW",  cls: "text-amber-400 bg-amber-400/10" },
  ERROR:   { label: "ERROR",   cls: "text-red-400 bg-red-400/10" },
  EXPIRED: { label: "EXPIRED", cls: "text-zinc-400 bg-zinc-400/10" },
};

function priorityLabel(p: number): { label: string; cls: string } {
  if (p >= 90) return { label: "CRITICAL", cls: "text-red-400 bg-red-400/10" };
  if (p >= 70) return { label: "HIGH", cls: "text-orange-400 bg-orange-400/10" };
  if (p >= 50) return { label: "MEDIUM", cls: "text-amber-400 bg-amber-400/10" };
  return { label: "LOW", cls: "text-slate-400 bg-slate-400/10" };
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
}

function shortHash(h: string | null): string {
  if (!h) return "—";
  return h.slice(0, 12) + "…";
}

// ─── SECTION WRAPPER ───────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
  count,
}: {
  icon: typeof Shield;
  title: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface-2">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icon className="h-4 w-4 text-text-faint" />
        <h2 className="text-sm font-semibold text-text tracking-tight">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-text-faint">
            {count}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 py-4 text-sm text-text-faint/50">
      <Inbox className="h-4 w-4" />
      {message}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function CaseDetailUI({ data }: { data: CaseDetailData }) {
  const { caseRecord, subject, policySnapshot, checks, decisions, tasks, auditEvents, linkedShipments, linkedLots, linkedSettlements, gaps } = data;
  const badge = STATUS_BADGE[caseRecord.status] ?? STATUS_BADGE.OPEN;
  const prio = priorityLabel(caseRecord.priority);
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = (user as Record<string, string> | null)?.id ?? "unknown";

  // ── Action state ──
  const [assigning, setAssigning] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState("");
  const [completingTask, setCompletingTask] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Derived ──
  const isTerminal = ["APPROVED", "REJECTED", "CLOSED", "EXPIRED"].includes(caseRecord.status);
  const hasIncompleteRequiredTasks = tasks.some((t) => t.required && t.status === "PENDING");
  const isReadyForDisposition = caseRecord.status === "READY_FOR_DISPOSITION";

  // ── Handlers ──
  const handleAssignToMe = useCallback(async () => {
    setAssigning(true);
    setActionError(null);
    const result = await assignCaseAction(caseRecord.id, currentUserId);
    setAssigning(false);
    if (!result.success) setActionError(result.error ?? "Assignment failed.");
    else router.refresh();
  }, [caseRecord.id, currentUserId, router]);

  const handleCompleteTask = useCallback(async () => {
    if (!activeTaskId || !taskNotes.trim()) return;
    setCompletingTask(true);
    setActionError(null);
    const result = await completeTaskAction(activeTaskId, currentUserId, taskNotes.trim());
    setCompletingTask(false);
    if (!result.success) {
      setActionError(result.error ?? "Task completion failed.");
    } else {
      setActiveTaskId(null);
      setTaskNotes("");
      router.refresh();
    }
  }, [activeTaskId, taskNotes, currentUserId, router]);

  // Group checks by category
  const identityChecks = checks.filter((c) =>
    ["IDENTITY", "KYC", "KYB", "UBO", "PEP", "ADVERSE_MEDIA", "SOURCE_OF_FUNDS", "SOURCE_OF_WEALTH"].includes(c.checkType),
  );
  const sanctionsChecks = checks.filter((c) =>
    ["SANCTIONS", "ORIGIN_SANCTIONS"].includes(c.checkType),
  );
  const logisticsChecks = checks.filter((c) =>
    ["CHAIN_OF_CUSTODY", "TRANSPORT_INTEGRITY", "REFINERY_LOT_MATCH", "ASSAY_CONFIRMATION"].includes(c.checkType),
  );
  const otherChecks = checks.filter((c) =>
    !identityChecks.includes(c) && !sanctionsChecks.includes(c) && !logisticsChecks.includes(c),
  );

  // Extract reviewer notes from audit events
  const noteEvents = auditEvents.filter((e) =>
    e.eventType === "REVIEWER_NOTE" || e.eventType === "TASK_COMPLETED",
  );

  return (
    <RequireRole allowedRoles={["admin", "compliance", "treasury", "vault_ops"]}>
      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* ── Back Link ── */}
        <Link
          href="/compliance/inbox"
          className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Inbox
        </Link>

        {/* ════════════════════════════════════════════════════════════════
           A. CASE HEADER / SUMMARY
           ════════════════════════════════════════════════════════════════ */}
        <div className="rounded-lg border border-border bg-surface-2 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              {/* Title row */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-semibold text-text tracking-tight">
                  {CASE_TYPE_LABELS[caseRecord.caseType] ?? caseRecord.caseType}
                </h1>
                <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold", badge.cls)}>
                  {badge.label}
                </span>
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums", prio.cls)}>
                  P{caseRecord.priority} {prio.label}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-[10px] text-text-faint tabular-nums flex-wrap">
                <span>ID: <span className="font-mono tracking-wider">{caseRecord.id.slice(0, 12)}</span></span>
                <span>Opened: {fmtDate(caseRecord.createdAt)}</span>
                <span>Updated: {fmtDate(caseRecord.updatedAt)}</span>
                {caseRecord.closedAt && <span>Closed: {fmtDate(caseRecord.closedAt)}</span>}
                {caseRecord.assignedReviewerId && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Reviewer: {caseRecord.assignedReviewerId.slice(0, 8)}
                  </span>
                )}
                {policySnapshot && (
                  <span>Policy v{policySnapshot.version}</span>
                )}
              </div>

              {caseRecord.closedReason && (
                <p className="text-xs text-text-muted mt-1">
                  <span className="font-semibold">Reason:</span> {caseRecord.closedReason}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Assign to Me */}
              {!isTerminal && (
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  disabled={assigning}
                  className={cn(
                    "flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-medium transition-colors",
                    assigning
                      ? "border-border bg-surface-3 text-text-faint cursor-wait"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
                  )}
                >
                  {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  {caseRecord.assignedReviewerId === currentUserId ? "Reassigned" : "Assign to Me"}
                </button>
              )}

              {/* Disposition */}
              <button
                type="button"
                onClick={() => setShowDisposition(true)}
                disabled={isTerminal}
                className={cn(
                  "flex items-center gap-2 rounded border px-4 py-1.5 text-xs font-semibold transition-colors",
                  isTerminal
                    ? "border-border bg-surface-3 text-text-faint/40 cursor-not-allowed"
                    : isReadyForDisposition
                    ? "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
                    : "border-border bg-surface-3 text-text-faint hover:text-text hover:bg-surface-3/80",
                )}
                title={isTerminal ? "Case is already closed" : isReadyForDisposition ? "Ready for disposition" : "Complete required tasks first"}
              >
                <Gavel className="h-3.5 w-3.5" />
                Disposition
              </button>

              {/* Disabled future controls */}
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 rounded border border-border bg-surface-3 px-3 py-1.5 text-xs text-text-faint/30 cursor-not-allowed"
                title="Escalation endpoint not yet implemented"
              >
                Escalate
              </button>
            </div>
          </div>
        </div>

        {/* Ready-for-disposition banner */}
        {isReadyForDisposition && !isTerminal && (
          <div className="flex items-center gap-3 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-gold shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gold">All required tasks complete — Ready for Disposition</p>
              <p className="text-xs text-gold/70">Click &quot;Disposition&quot; above to render your final verdict.</p>
            </div>
          </div>
        )}

        {/* Action error banner */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{actionError}</p>
            <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <XCircle className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
           B. SUBJECT SUMMARY
           ════════════════════════════════════════════════════════════════ */}
        <Section icon={Users} title="Subject">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="typo-label text-text-faint mb-1">Legal Name</p>
              <p className="text-sm font-medium text-text">{subject.legalName}</p>
            </div>
            <div>
              <p className="typo-label text-text-faint mb-1">Subject Type</p>
              <p className="text-sm text-text">{SUBJECT_TYPE_LABELS[subject.subjectType] ?? subject.subjectType}</p>
            </div>
            <div>
              <p className="typo-label text-text-faint mb-1">Status</p>
              <span className={cn(
                "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                subject.status === "ACTIVE" ? "text-emerald-400 bg-emerald-400/10" :
                subject.status === "SUSPENDED" ? "text-red-400 bg-red-400/10" :
                "text-amber-400 bg-amber-400/10"
              )}>
                {subject.status}
              </span>
            </div>
            <div>
              <p className="typo-label text-text-faint mb-1">Risk Tier</p>
              <p className="text-sm font-mono text-text-muted">{subject.riskTier}</p>
            </div>
            {subject.userId && (
              <div>
                <p className="typo-label text-text-faint mb-1">User ID</p>
                <p className="font-mono text-[11px] text-text-faint">{subject.userId.slice(0, 12)}</p>
              </div>
            )}
            {subject.entityId && (
              <div>
                <p className="typo-label text-text-faint mb-1">Entity ID</p>
                <p className="font-mono text-[11px] text-text-faint">{subject.entityId.slice(0, 12)}</p>
              </div>
            )}
          </div>
        </Section>

        {/* ════════════════════════════════════════════════════════════════
           C. RELATED OBJECTS SUMMARY
           ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Shipments */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Physical Shipments</h3>
            </div>
            {linkedShipments.length === 0 ? (
              <p className="text-xs text-text-faint/50">No linked shipments</p>
            ) : (
              <div className="space-y-2">
                {linkedShipments.map((s) => (
                  <Link
                    key={s.id}
                    href={`/compliance/shipments/${s.id}`}
                    className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-text">{s.mineReference}</p>
                      <p className="text-[10px] text-text-faint">{s.shipmentStatus} · {s.armoredCarrierName}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-text-faint" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Refinery Lots */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Refinery Lots</h3>
            </div>
            {linkedLots.length === 0 ? (
              <p className="text-xs text-text-faint/50">No linked refinery lots</p>
            ) : (
              <div className="space-y-2">
                {linkedLots.map((l) => (
                  <Link
                    key={l.id}
                    href={`/compliance/lots/${l.id}`}
                    className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-text">Lot {l.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-text-faint">
                        {l.assayStatus}
                        {l.payableGoldWeight && ` · ${l.payableGoldWeight}oz payable`}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-text-faint" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Settlement Authorizations */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-text-faint" />
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Settlement Auth</h3>
            </div>
            {linkedSettlements.length === 0 ? (
              <p className="text-xs text-text-faint/50">No linked settlement authorizations</p>
            ) : (
              <div className="space-y-2">
                {linkedSettlements.map((sa) => (
                  <Link
                    key={sa.id}
                    href={`/compliance/settlements/${sa.id}`}
                    className="flex items-center justify-between rounded border border-border/50 bg-surface-3/50 px-3 py-2 text-xs hover:bg-surface-3 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-text">{sa.verdict}</p>
                      <p className="text-[10px] text-text-faint">
                        {sa.paymentRail} · ${sa.payableValue}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-text-faint" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
           D. CHECKS SECTION
           ════════════════════════════════════════════════════════════════ */}
        <Section icon={FileCheck} title="Compliance Checks" count={checks.length}>
          {checks.length === 0 ? (
            <EmptyState message="No compliance checks recorded for this case." />
          ) : (
            <div className="space-y-4">
              {[
                { label: "Identity & KYC", items: identityChecks },
                { label: "Sanctions", items: sanctionsChecks },
                { label: "Logistics & Assay", items: logisticsChecks },
                { label: "Other", items: otherChecks },
              ]
                .filter((g) => g.items.length > 0)
                .map((group) => (
                  <div key={group.label}>
                    <p className="typo-label text-text-faint mb-2">{group.label}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 text-left">
                            <th className="py-1.5 pr-3 typo-label font-semibold">Type</th>
                            <th className="py-1.5 px-3 typo-label font-semibold">Provider</th>
                            <th className="py-1.5 px-3 typo-label font-semibold">Status</th>
                            <th className="py-1.5 px-3 typo-label font-semibold">Verdict</th>
                            <th className="py-1.5 px-3 typo-label font-semibold">Result Code</th>
                            <th className="py-1.5 px-3 typo-label font-semibold text-right">Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((check) => {
                            const vb = check.normalizedVerdict ? VERDICT_BADGE[check.normalizedVerdict] : null;
                            return (
                              <tr key={check.id} className="border-b border-border/30 last:border-b-0">
                                <td className="py-2 pr-3 text-text font-medium">{check.checkType}</td>
                                <td className="py-2 px-3 text-text-muted">{check.provider}</td>
                                <td className="py-2 px-3 text-text-muted">{check.status}</td>
                                <td className="py-2 px-3">
                                  {vb ? (
                                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", vb.cls)}>
                                      {vb.label}
                                    </span>
                                  ) : (
                                    <span className="text-text-faint/50">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-text-faint">{check.resultCode ?? "—"}</td>
                                <td className="py-2 px-3 text-right text-xs text-text-faint tabular-nums">{fmtDate(check.completedAt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* ════════════════════════════════════════════════════════════════
           E. EVIDENCE SECTION
           ════════════════════════════════════════════════════════════════ */}
        <Section icon={Hash} title="Evidence References" count={checks.filter((c) => c.rawPayloadRef).length}>
          {checks.filter((c) => c.rawPayloadRef).length === 0 ? (
            <EmptyState message="No evidence bundles attached to this case." />
          ) : (
            <div className="space-y-1.5">
              {checks
                .filter((c) => c.rawPayloadRef)
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded border border-border/30 bg-surface-3/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-medium text-text-muted">{c.checkType}</span>
                      <span className="text-xs text-text-faint">{c.provider}</span>
                    </div>
                    <span className="font-mono text-[10px] text-text-faint/60 tracking-wider shrink-0">
                      {shortHash(c.rawPayloadRef)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </Section>

        {/* ════════════════════════════════════════════════════════════════
           F. TASKS SECTION (ACTIONABLE)
           ════════════════════════════════════════════════════════════════ */}
        <Section icon={ClipboardList} title="Case Tasks" count={tasks.length}>
          {tasks.length === 0 ? (
            <EmptyState message="No tasks assigned to this case." />
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "rounded border px-3 py-2.5",
                    t.status === "COMPLETED" ? "border-emerald-500/20 bg-emerald-500/5" :
                    t.status === "WAIVED" ? "border-zinc-500/20 bg-zinc-500/5" :
                    "border-border bg-surface-3/30",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Status indicator */}
                    <div className="mt-0.5 shrink-0">
                      {t.status === "COMPLETED" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : t.status === "WAIVED" ? (
                        <XCircle className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-text">{t.taskType}</span>
                        {t.required && (
                          <span className="rounded bg-amber-400/10 px-1 py-0.5 text-[9px] font-bold text-amber-400 uppercase">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{t.description}</p>
                      {t.completionNotes && (
                        <p className="mt-1.5 text-xs text-text-faint italic border-l-2 border-border pl-2">
                          {t.completionNotes}
                        </p>
                      )}
                      {t.completedAt && (
                        <p className="mt-1 text-[10px] text-text-faint tabular-nums">
                          Completed: {fmtDate(t.completedAt)}
                        </p>
                      )}

                      {/* Complete Task button for PENDING tasks */}
                      {t.status === "PENDING" && !isTerminal && (
                        <div className="mt-2">
                          {activeTaskId === t.id ? (
                            <div className="space-y-2 border-t border-border/30 pt-2 mt-2">
                              <textarea
                                value={taskNotes}
                                onChange={(e) => setTaskNotes(e.target.value)}
                                placeholder="Document your findings and completion notes…"
                                className="w-full rounded border border-border bg-surface-3 px-2.5 py-1.5 text-xs text-text placeholder:text-text-faint/40 focus:outline-none focus:ring-1 focus:ring-gold/30 resize-none"
                                rows={2}
                                disabled={completingTask}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleCompleteTask}
                                  disabled={completingTask || !taskNotes.trim()}
                                  className={cn(
                                    "flex items-center gap-1 rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                                    completingTask || !taskNotes.trim()
                                      ? "border-border bg-surface-3 text-text-faint/40 cursor-not-allowed"
                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                                  )}
                                >
                                  {completingTask ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                  Submit
                                </button>
                                <button
                                  onClick={() => { setActiveTaskId(null); setTaskNotes(""); }}
                                  className="text-[11px] text-text-faint hover:text-text"
                                  disabled={completingTask}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveTaskId(t.id)}
                              className="flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Complete Task
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ════════════════════════════════════════════════════════════════
           G. REVIEWER NOTES
           ════════════════════════════════════════════════════════════════ */}
        <Section icon={MessageSquare} title="Reviewer Notes" count={noteEvents.length}>
          {noteEvents.length === 0 ? (
            <EmptyState message="No reviewer notes recorded." />
          ) : (
            <div className="space-y-2">
              {noteEvents.map((e) => {
                const payload = e.payload as Record<string, unknown>;
                return (
                  <div key={e.id} className="rounded border border-border/30 bg-surface-3/30 px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{e.eventType}</span>
                      <span className="text-[10px] text-text-faint tabular-nums">{fmtDate(e.createdAt)}</span>
                    </div>
                    {typeof payload.completionNotes === "string" && payload.completionNotes && (
                      <p className="text-xs text-text-muted">{payload.completionNotes}</p>
                    )}
                    {typeof payload.notes === "string" && payload.notes && (
                      <p className="text-xs text-text-muted">{payload.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ════════════════════════════════════════════════════════════════
           H. AUDIT TIMELINE
           ════════════════════════════════════════════════════════════════ */}
        <Section icon={History} title="Audit Timeline" count={auditEvents.length}>
          {auditEvents.length === 0 ? (
            <EmptyState message="No audit events recorded for this case." />
          ) : (
            <div className="relative pl-4 border-l-2 border-border space-y-3">
              {auditEvents.map((e) => (
                <div key={e.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-surface-2" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text">{e.eventType}</p>
                      <p className="text-[10px] text-text-faint">
                        {e.aggregateType} · <span className="font-mono tracking-wider">{shortHash(e.hash)}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-text-faint tabular-nums whitespace-nowrap shrink-0">
                      {fmtDate(e.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ════════════════════════════════════════════════════════════════
           I. DECISION HISTORY
           ════════════════════════════════════════════════════════════════ */}
        <Section icon={Gavel} title="Decision History" count={decisions.length}>
          {decisions.length === 0 ? (
            <EmptyState message="No formal decisions rendered for this case." />
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => {
                const decisionCls = d.decision === "APPROVED"
                  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                  : d.decision === "REJECTED"
                  ? "text-red-400 bg-red-400/10 border-red-400/20"
                  : "text-amber-400 bg-amber-400/10 border-amber-400/20";

                const reasonCodes = Array.isArray(d.reasonCodes)
                  ? (d.reasonCodes as string[])
                  : [];

                return (
                  <div key={d.id} className="rounded border border-border bg-surface-3/30 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded border px-2 py-0.5 text-[11px] font-bold", decisionCls)}>
                          {d.decision}
                        </span>
                        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-text-faint uppercase">
                          {d.decisionType}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-faint tabular-nums">{fmtDate(d.createdAt)}</span>
                    </div>

                    {reasonCodes.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        {reasonCodes.map((code, i) => (
                          <span key={i} className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono text-text-faint">
                            {code}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[10px] text-text-faint tabular-nums">
                      <span>Hash: <span className="font-mono">{shortHash(d.decisionHash)}</span></span>
                      {d.expiresAt && <span>Expires: {fmtDate(d.expiresAt)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Backend Gaps Notice ── */}
        {gaps.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Backend Integration Notes</h3>
            </div>
            <ul className="space-y-1">
              {gaps.map((g, i) => (
                <li key={i} className="text-xs text-amber-400/80">• {g}</li>
              ))}
            </ul>
          </div>
        )}
        {/* ── Disposition Panel Modal ── */}
        {showDisposition && (
          <DispositionPanel
            caseId={caseRecord.id}
            caseStatus={caseRecord.status}
            casePriority={caseRecord.priority}
            assignedReviewerId={caseRecord.assignedReviewerId}
            currentUserId={currentUserId}
            subjectRiskTier={subject.riskTier}
            hasIncompleteRequiredTasks={hasIncompleteRequiredTasks}
            onClose={() => setShowDisposition(false)}
            onSuccess={() => {
              setShowDisposition(false);
              router.refresh();
            }}
          />
        )}
      </div>
    </RequireRole>
  );
}
