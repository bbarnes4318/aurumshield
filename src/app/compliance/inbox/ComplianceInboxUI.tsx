"use client";

/* ================================================================
   COMPLIANCE INBOX UI — Case Queue for Operators
   ================================================================
   Displays all V3 compliance cases with filtering by:
     - Status queue (tabs)
     - Case type
     - Priority
     - Overdue flag
     - Assigned reviewer

   Design: Brutalist institutional — high contrast, tabular-nums,
   stark borders, extensive white space. No decorative elements.
   ================================================================ */

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { RequireRole } from "@/components/auth/require-role";
import { cn } from "@/lib/utils";
import type { ComplianceCaseRow } from "@/actions/compliance-queries";
import {
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Filter,
  Inbox,
  Users,
} from "lucide-react";

// ─── STATUS QUEUE TABS ─────────────────────────────────────────────────────────

type QueueTab =
  | "ALL"
  | "OPEN"
  | "AWAITING_REVIEW"
  | "ESCALATED"
  | "READY_FOR_DISPOSITION"
  | "OVERDUE"
  | "TERMINAL";

interface TabDef {
  key: QueueTab;
  label: string;
  filter: (c: ComplianceCaseRow) => boolean;
}

const TERMINAL_STATUSES = ["APPROVED", "REJECTED", "CLOSED", "EXPIRED", "SUSPENDED"];

const TABS: TabDef[] = [
  { key: "ALL", label: "All Cases", filter: () => true },
  {
    key: "OPEN",
    label: "Pending",
    filter: (c) =>
      ["DRAFT", "OPEN", "AWAITING_SUBJECT", "AWAITING_PROVIDER"].includes(c.status),
  },
  {
    key: "AWAITING_REVIEW",
    label: "Awaiting Review",
    filter: (c) => c.status === "AWAITING_INTERNAL_REVIEW",
  },
  {
    key: "ESCALATED",
    label: "Escalated",
    filter: (c) => c.status === "ESCALATED",
  },
  {
    key: "READY_FOR_DISPOSITION",
    label: "Ready for Disposition",
    filter: (c) => c.status === "READY_FOR_DISPOSITION",
  },
  {
    key: "OVERDUE",
    label: "Overdue",
    filter: (c) => c.isOverdue,
  },
  {
    key: "TERMINAL",
    label: "Closed",
    filter: (c) => TERMINAL_STATUSES.includes(c.status),
  },
];

// ─── CASE TYPE LABELS ──────────────────────────────────────────────────────────

const CASE_TYPE_LABELS: Record<string, string> = {
  ONBOARDING: "Onboarding",
  PERIODIC_REVIEW: "Periodic Review",
  EVENT_DRIVEN_REVIEW: "Event Review",
  WALLET_REVIEW: "Wallet Review",
  TRAINING_CERTIFICATION: "Training",
  PHYSICAL_SHIPMENT_REVIEW: "Shipment Review",
  REFINERY_INTAKE_REVIEW: "Refinery Intake",
  SETTLEMENT_AUTHORIZATION: "Settlement Auth",
};

// ─── STATUS BADGE CONFIG ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: typeof Shield }> = {
  DRAFT:                      { label: "Draft",         cls: "text-slate-400 bg-slate-400/10 border-slate-400/20",   icon: Clock },
  OPEN:                       { label: "Open",          cls: "text-blue-400 bg-blue-400/10 border-blue-400/20",      icon: Inbox },
  AWAITING_SUBJECT:           { label: "Awaiting Subject", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: AlertTriangle },
  AWAITING_PROVIDER:          { label: "Awaiting Provider", cls: "text-purple-400 bg-purple-400/10 border-purple-400/20", icon: Clock },
  AWAITING_INTERNAL_REVIEW:   { label: "Awaiting Review",  cls: "text-orange-400 bg-orange-400/10 border-orange-400/20", icon: Shield },
  ESCALATED:                  { label: "Escalated",     cls: "text-red-400 bg-red-400/10 border-red-400/20",         icon: AlertTriangle },
  READY_FOR_DISPOSITION:      { label: "Ready",         cls: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",      icon: CheckCircle2 },
  APPROVED:                   { label: "Approved",      cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  REJECTED:                   { label: "Rejected",      cls: "text-red-400 bg-red-400/10 border-red-400/20",         icon: XCircle },
  SUSPENDED:                  { label: "Suspended",     cls: "text-red-400 bg-red-400/10 border-red-400/20",         icon: XCircle },
  CLOSED:                     { label: "Closed",        cls: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",      icon: Shield },
  EXPIRED:                    { label: "Expired",       cls: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",      icon: Clock },
};

// ─── PRIORITY BADGE ────────────────────────────────────────────────────────────

function priorityLabel(p: number): { label: string; cls: string } {
  if (p >= 90) return { label: "CRITICAL", cls: "text-red-400 bg-red-400/10" };
  if (p >= 70) return { label: "HIGH", cls: "text-orange-400 bg-orange-400/10" };
  if (p >= 50) return { label: "MEDIUM", cls: "text-amber-400 bg-amber-400/10" };
  return { label: "LOW", cls: "text-slate-400 bg-slate-400/10" };
}

// ─── AGE FORMATTER ─────────────────────────────────────────────────────────────

function formatAge(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (days < 7) return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  return `${Math.floor(days / 7)}w ${days % 7}d`;
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export default function ComplianceInboxUI({
  cases,
}: {
  cases: ComplianceCaseRow[];
}) {
  const [activeTab, setActiveTab] = useState<QueueTab>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [minPriority, setMinPriority] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  // ── Filtered cases ──
  const filtered = useMemo(() => {
    const tabDef = TABS.find((t) => t.key === activeTab) ?? TABS[0];
    return cases.filter((c) => {
      if (!tabDef.filter(c)) return false;
      if (typeFilter !== "ALL" && c.caseType !== typeFilter) return false;
      if (c.priority < minPriority) return false;
      return true;
    });
  }, [cases, activeTab, typeFilter, minPriority]);

  // ── Tab counts ──
  const tabCounts = useMemo(() => {
    const counts: Record<QueueTab, number> = {
      ALL: 0, OPEN: 0, AWAITING_REVIEW: 0, ESCALATED: 0,
      READY_FOR_DISPOSITION: 0, OVERDUE: 0, TERMINAL: 0,
    };
    for (const c of cases) {
      for (const tab of TABS) {
        if (tab.filter(c)) counts[tab.key]++;
      }
    }
    return counts;
  }, [cases]);

  // ── Unique case types for filter dropdown ──
  const caseTypes = useMemo(() => {
    const types = new Set(cases.map((c) => c.caseType));
    return Array.from(types).sort();
  }, [cases]);

  // ── Route helper: map case to its detail route ──
  function getCaseDetailHref(c: ComplianceCaseRow): string {
    return `/compliance/inbox/${c.id}`;
  }

  return (
    <RequireRole allowedRoles={["admin", "compliance", "treasury", "vault_ops"]}>
      <PageHeader
        title="Compliance Inbox"
        description="V3 Compliance Operating System — case queue for internal review, disposition, and settlement authorization."
        actions={
          <button
            type="button"
            onClick={() => setShowFilters((p) => !p)}
            className={cn(
              "flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium transition-colors",
              showFilters
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-border bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text",
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        }
      />

      {/* ── Queue Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto rounded border border-border bg-surface-2 p-1 mb-4">
        {TABS.map((tab) => {
          const count = tabCounts[tab.key];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-[12px] font-medium transition-colors",
                isActive
                  ? "bg-surface-3 text-text border border-border"
                  : "text-text-faint hover:text-text-muted",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    isActive ? "bg-gold/20 text-gold" : "bg-surface-3 text-text-faint",
                    tab.key === "OVERDUE" && count > 0 && "bg-red-500/20 text-red-400",
                    tab.key === "ESCALATED" && count > 0 && "bg-red-500/20 text-red-400",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filter Bar (collapsible) ── */}
      {showFilters && (
        <div className="flex items-center gap-4 rounded border border-border bg-surface-2 px-4 py-3 mb-4">
          {/* Case Type */}
          <div className="flex items-center gap-2">
            <label className="typo-label text-text-faint">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border border-border bg-surface-3 px-2 py-1 text-xs text-text"
            >
              <option value="ALL">All Types</option>
              {caseTypes.map((t) => (
                <option key={t} value={t}>
                  {CASE_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>

          {/* Min Priority */}
          <div className="flex items-center gap-2">
            <label className="typo-label text-text-faint">Min Priority</label>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={minPriority}
              onChange={(e) => setMinPriority(Number(e.target.value))}
              className="w-24 accent-gold"
            />
            <span className="text-xs tabular-nums text-text-faint w-6">{minPriority}</span>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={() => { setTypeFilter("ALL"); setMinPriority(0); }}
            className="text-xs text-text-faint hover:text-text transition-colors"
          >
            Reset
          </button>
        </div>
      )}

      {/* ── Case Table ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="h-10 w-10 text-text-faint/30 mb-3" />
          <p className="text-sm text-text-faint">
            {cases.length === 0
              ? "No compliance cases in the system."
              : "No cases match the current filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-border bg-surface-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2.5 pl-4 pr-3 typo-label font-semibold">Case ID</th>
                <th className="py-2.5 px-3 typo-label font-semibold">Subject</th>
                <th className="py-2.5 px-3 typo-label font-semibold">Type</th>
                <th className="py-2.5 px-3 typo-label font-semibold">Status</th>
                <th className="py-2.5 px-3 typo-label font-semibold text-right">Priority</th>
                <th className="py-2.5 px-3 typo-label font-semibold">Assigned</th>
                <th className="py-2.5 px-3 typo-label font-semibold text-right">Age</th>
                <th className="py-2.5 pl-3 pr-4 typo-label font-semibold text-right" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.OPEN;
                const StatusIcon = badge.icon;
                const prio = priorityLabel(c.priority);

                return (
                  <tr
                    key={c.id}
                    className={cn(
                      "border-b border-border/50 last:border-b-0 transition-colors hover:bg-surface-3/50",
                      c.isOverdue && "bg-red-950/10",
                    )}
                  >
                    {/* Case ID */}
                    <td className="py-2.5 pl-4 pr-3">
                      <span className="font-mono text-[11px] tracking-wider text-text-muted">
                        {c.id.slice(0, 8)}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-2.5 px-3">
                      <div className="min-w-0">
                        <p className="text-text font-medium truncate max-w-[200px]">{c.legalName}</p>
                        <p className="text-[10px] text-text-faint uppercase tracking-wider">{c.subjectType}</p>
                      </div>
                    </td>

                    {/* Case Type */}
                    <td className="py-2.5 px-3">
                      <span className="text-xs text-text-muted whitespace-nowrap">
                        {CASE_TYPE_LABELS[c.caseType] ?? c.caseType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                          badge.cls,
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {badge.label}
                      </span>
                      {c.isOverdue && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          SLA
                        </span>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                          prio.cls,
                        )}
                      >
                        {c.priority} {prio.label}
                      </span>
                    </td>

                    {/* Assigned */}
                    <td className="py-2.5 px-3">
                      {c.assignedReviewerId ? (
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          <Users className="h-3 w-3" />
                          {c.assignedReviewerId.slice(0, 8)}
                        </span>
                      ) : (
                        <span className="text-xs text-text-faint/50">Unassigned</span>
                      )}
                    </td>

                    {/* Age */}
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          c.isOverdue ? "text-red-400 font-semibold" : "text-text-faint",
                        )}
                      >
                        {formatAge(c.ageHours)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 pl-3 pr-4 text-right">
                      <Link
                        href={getCaseDetailHref(c)}
                        className="inline-flex items-center gap-1 rounded border border-border bg-surface-3 px-2 py-1 text-[10px] font-medium text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
                      >
                        Open
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-text-faint">
            <span>{filtered.length} of {cases.length} cases</span>
            <span className="tabular-nums">
              {cases.filter((c) => c.isOverdue).length} overdue
            </span>
          </div>
        </div>
      )}
    </RequireRole>
  );
}
