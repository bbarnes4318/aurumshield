"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useGovernanceAuditEvents, useExportAuditCSV } from "@/hooks/use-mock-queries";
import type { AuditSeverity, AuditResourceType } from "@/lib/mock-data";
import Link from "next/link";
import { useMemo, useState } from "react";

/* ---------- helpers ---------- */

const SEV_COLORS: Record<AuditSeverity, string> = {
  info: "bg-blue-500/10 text-blue-400",
  warning: "bg-amber-500/10 text-amber-400",
  critical: "bg-red-500/10 text-red-400",
};

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-400",
  DENIED: "text-amber-400",
  ERROR: "text-red-400",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

/* ---------- metric card ---------- */
function MetricCard({ label, value, severity }: { label: string; value: number; severity?: AuditSeverity }) {
  const ring = severity === "critical" ? "border-red-500/40" : severity === "warning" ? "border-amber-500/30" : "border-border";
  return (
    <div className={`rounded-lg border ${ring} bg-surface-1 p-4`}>
      <p className="text-xs uppercase tracking-widest text-text-faint mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-text">{value}</p>
    </div>
  );
}

/* ---------- main ---------- */
function AuditOverview() {
  const { data: events, isLoading } = useGovernanceAuditEvents();
  const exportCSV = useExportAuditCSV();

  /* Filter state */
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | "all">("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  /* Derive unique resource types from events */
  const resourceTypes = useMemo(() => {
    if (!events) return [];
    const types = new Set<string>();
    for (const e of events) types.add(e.resourceType);
    return [...types].sort();
  }, [events]);

  /* Apply filters */
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => {
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      if (resourceFilter !== "all" && e.resourceType !== resourceFilter) return false;
      return true;
    });
  }, [events, severityFilter, resourceFilter]);

  const metrics = useMemo(() => {
    if (!events) return { total24h: 0, critical24h: 0, denied24h: 0, exports7d: 0 };
    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last24 = events.filter((e) => e.occurredAt >= h24);
    return {
      total24h: last24.length,
      critical24h: last24.filter((e) => e.severity === "critical").length,
      denied24h: last24.filter((e) => e.result === "DENIED").length,
      exports7d: events.filter((e) => e.occurredAt >= d7 && e.action === "EXPORT_REQUESTED").length,
    };
  }, [events]);

  const criticalDenied = useMemo(
    () => filteredEvents.filter((e) => e.severity === "critical" || e.result === "DENIED" || e.result === "ERROR").slice(0, 12),
    [filteredEvents],
  );

  const hotResources = useMemo(() => {
    if (!filteredEvents.length) return [];
    const map = new Map<string, { type: AuditResourceType; id: string; count: number; lastAt: string }>();
    for (const e of filteredEvents) {
      const key = `${e.resourceType}:${e.resourceId}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (e.occurredAt > existing.lastAt) existing.lastAt = e.occurredAt;
      } else {
        map.set(key, { type: e.resourceType, id: e.resourceId, count: 1, lastAt: e.occurredAt });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredEvents]);

  const handleExport = () => exportCSV.mutate({ filters: {} });

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center text-text-muted">Loading audit data…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Governance Command Center</h1>
          <p className="text-sm text-text-muted mt-0.5">Audit trail, compliance events, and export controls</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exportCSV.isPending}
            className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-3 transition-colors disabled:opacity-50"
          >
            {exportCSV.isPending ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-3 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap" data-tour="audit-filters">
        <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-faint">Filters</label>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AuditSeverity | "all")}
          className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text font-medium focus:outline-none focus:ring-1 focus:ring-gold/40 transition-colors"
        >
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text font-medium focus:outline-none focus:ring-1 focus:ring-gold/40 transition-colors"
        >
          <option value="all">All Resources</option>
          {resourceTypes.map((rt) => (
            <option key={rt} value={rt}>{rt}</option>
          ))}
        </select>
        {(severityFilter !== "all" || resourceFilter !== "all") && (
          <button
            onClick={() => { setSeverityFilter("all"); setResourceFilter("all"); }}
            className="text-[10px] text-gold hover:underline font-medium"
          >
            Clear Filters
          </button>
        )}
        <span className="ml-auto text-[10px] text-text-faint font-mono">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Events (24 h)" value={metrics.total24h} />
        <MetricCard label="Critical (24 h)" value={metrics.critical24h} severity="critical" />
        <MetricCard label="Denied (24 h)" value={metrics.denied24h} severity="warning" />
        <MetricCard label="Exports (7 d)" value={metrics.exports7d} />
      </div>

      {/* Two-panel layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Critical / Denied */}
        <div className="rounded-lg border border-border bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Critical &amp; Denied</h2>
            <Link href="/audit/events?severity=critical" className="text-xs text-gold hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {criticalDenied.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-text-faint">No critical events</p>
            )}
            {criticalDenied.map((e) => (
              <Link key={e.id} href={`/audit/events/${e.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2 transition-colors">
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV_COLORS[e.severity]}`}>{e.severity}</span>
                <span className={`font-mono text-[11px] ${RESULT_COLORS[e.result]}`}>{e.result}</span>
                <span className="flex-1 truncate text-xs text-text-muted">{e.message}</span>
                <span className="shrink-0 text-[10px] text-text-faint font-mono">{fmtTime(e.occurredAt)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Hot Resources */}
        <div className="rounded-lg border border-border bg-surface-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Hot Resources</h2>
            <Link href="/audit/events" className="text-xs text-gold hover:underline">Browse events →</Link>
          </div>
          <div className="divide-y divide-border">
            {hotResources.map((r) => (
              <Link key={`${r.type}:${r.id}`} href={`/audit/events?resourceType=${r.type}&resourceId=${r.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-2 transition-colors">
                <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-mono uppercase text-text-faint">{r.type}</span>
                <span className="font-mono text-xs text-text">{r.id}</span>
                <span className="ml-auto text-xs font-bold text-gold">{r.count}</span>
                <span className="text-[10px] text-text-faint font-mono">{fmtTime(r.lastAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Event Log", href: "/audit/events" },
          { label: "Ledger Index", href: "/audit/ledger" },
          { label: "Receipts", href: "/audit/receipts" },
          { label: "Supervisory", href: "/supervisory" },
        ].map((n) => (
          <Link key={n.href} href={n.href} className="group rounded-lg border border-border bg-surface-1 px-4 py-3 hover:border-gold/30 transition-colors">
            <span className="text-sm font-medium text-text-muted group-hover:text-gold transition-colors">{n.label}</span>
            <span className="block text-[10px] text-text-faint mt-0.5">{n.href}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RequireAuth>
      <AuditOverview />
    </RequireAuth>
  );
}
