"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useGovernanceAuditEvents } from "@/hooks/use-mock-queries";
import type { GovernanceAuditEvent, AuditSeverity, AuditAction, AuditResourceType, AuditActorRole } from "@/lib/mock-data";
import type { AuditEventFilters } from "@/lib/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useCallback, Suspense } from "react";

/* ---------- constants ---------- */

const SEV_COLORS: Record<AuditSeverity, string> = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

const RESULT_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-400",
  DENIED: "text-amber-400",
  ERROR: "text-red-400",
};

const ACTIONS: AuditAction[] = [
  "LOGIN", "LOGOUT", "SESSION_CREATED", "SESSION_EXPIRED",
  "VERIFICATION_STEP_SUBMITTED", "VERIFICATION_STATUS_CHANGED",
  "RESERVATION_CREATED", "RESERVATION_EXPIRED", "RESERVATION_CONVERTED",
  "ORDER_CREATED", "SETTLEMENT_OPENED", "SETTLEMENT_ACTION_APPLIED",
  "RECEIPT_GENERATED", "LISTING_DRAFT_CREATED", "LISTING_PUBLISHED",
  "CLAIM_OPENED", "CLAIM_DECIDED", "EXPORT_REQUESTED",
  "CLEARING_CERTIFICATE_ISSUED",
];

const RESOURCE_TYPES: AuditResourceType[] = [
  "order", "settlement", "transaction", "listing", "claim", "counterparty", "reservation", "receipt", "CERTIFICATE",
];

const SEVERITIES: AuditSeverity[] = ["info", "warning", "critical"];
const RESULTS = ["SUCCESS", "DENIED", "ERROR"] as const;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

/* ---------- filter bar ---------- */
function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-text-muted focus:outline-none focus:ring-1 focus:ring-gold/50"
    >
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ---------- main ---------- */
function AuditEventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters: AuditEventFilters = useMemo(() => ({
    action: (searchParams.get("action") as AuditAction) || undefined,
    severity: (searchParams.get("severity") as AuditSeverity) || undefined,
    resourceType: (searchParams.get("resourceType") as AuditResourceType) || undefined,
    resourceId: searchParams.get("resourceId") || undefined,
    actorRole: (searchParams.get("actorRole") as AuditActorRole) || undefined,
    result: (searchParams.get("result") as "SUCCESS" | "DENIED" | "ERROR") || undefined,
    search: searchParams.get("q") || undefined,
  }), [searchParams]);

  const { data: events, isLoading } = useGovernanceAuditEvents(filters);

  const updateFilter = useCallback((key: string, val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    router.push(`/audit/events?${params.toString()}`);
  }, [searchParams, router]);

  const clearFilters = useCallback(() => {
    router.push("/audit/events");
  }, [router]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    searchParams.forEach(() => n++);
    return n;
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Audit Event Log</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {events ? `${events.length} events` : "Loading…"}
            {activeFilterCount > 0 && <span className="ml-2 text-gold">({activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active)</span>}
          </p>
        </div>
        <Link href="/audit" className="text-xs text-text-muted hover:text-gold transition-colors">← Back to overview</Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-1 p-3">
        <input
          type="text"
          placeholder="Search events…"
          defaultValue={filters.search ?? ""}
          onKeyDown={(e) => { if (e.key === "Enter") updateFilter("q", (e.target as HTMLInputElement).value); }}
          className="flex-1 min-w-[200px] rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-text placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-gold/50"
        />
        <FilterSelect label="Action" value={filters.action ?? ""} options={ACTIONS} onChange={(v) => updateFilter("action", v)} />
        <FilterSelect label="Severity" value={filters.severity ?? ""} options={SEVERITIES} onChange={(v) => updateFilter("severity", v)} />
        <FilterSelect label="Resource" value={filters.resourceType ?? ""} options={RESOURCE_TYPES} onChange={(v) => updateFilter("resourceType", v)} />
        <FilterSelect label="Result" value={filters.result ?? ""} options={RESULTS} onChange={(v) => updateFilter("result", v)} />
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-text-muted">Loading events…</div>
      ) : (
        <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2/50">
                  <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Time</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Sev</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Action</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Resource</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Actor</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Result</th>
                  <th className="px-3 py-2 text-left font-semibold text-text-faint uppercase tracking-widest">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(events ?? []).map((e: GovernanceAuditEvent) => (
                  <tr key={e.id} className="hover:bg-surface-2/50 transition-colors cursor-pointer" onClick={() => router.push(`/audit/events/${e.id}`)}>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-text-faint">{fmtTime(e.occurredAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV_COLORS[e.severity]}`}>{e.severity}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-text">{e.action}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="text-text-faint">{e.resourceType}/</span>
                      <span className="font-mono text-text">{e.resourceId}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-text-muted">{e.actorRole}{e.actorUserId ? ` (${e.actorUserId})` : ""}</td>
                    <td className="px-3 py-2">
                      <span className={`font-mono font-semibold ${RESULT_COLORS[e.result]}`}>{e.result}</span>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-text-muted">{e.message}</td>
                  </tr>
                ))}
                {(events ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-text-faint">No events match the current filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditEventsPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div className="flex h-96 items-center justify-center text-text-muted">Loading…</div>}>
        <AuditEventsContent />
      </Suspense>
    </RequireAuth>
  );
}
