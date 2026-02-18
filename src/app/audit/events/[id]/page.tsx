"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useGovernanceAuditEvent } from "@/hooks/use-mock-queries";
import type { AuditSeverity } from "@/lib/mock-data";
import Link from "next/link";
import { useParams } from "next/navigation";

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span className="w-28 shrink-0 text-[10px] uppercase tracking-widest text-text-faint font-semibold pt-0.5">{label}</span>
      <span className="text-xs text-text">{children}</span>
    </div>
  );
}

function EventDetailContent() {
  const params = useParams();
  const id = params.id as string;
  const { data: event, isLoading } = useGovernanceAuditEvent(id);

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center text-text-muted">Loading event…</div>;
  }

  if (!event) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <p className="text-text-faint">Event not found</p>
        <Link href="/audit/events" className="text-xs text-gold hover:underline">← Back to events</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text flex items-center gap-2">
            <span className="font-mono text-text-muted">{event.id}</span>
            <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV_COLORS[event.severity]}`}>{event.severity}</span>
            <span className={`font-mono text-xs font-semibold ${RESULT_COLORS[event.result]}`}>{event.result}</span>
          </h1>
          <p className="text-sm text-text-muted mt-0.5">{event.message}</p>
        </div>
        <Link href="/audit/events" className="text-xs text-text-muted hover:text-gold transition-colors">← Back to events</Link>
      </div>

      {/* Three-panel layout */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Event Summary */}
        <div className="rounded-lg border border-border bg-surface-1">
          <div className="border-b border-border px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Event Summary</h2>
          </div>
          <div className="px-4 py-2">
            <DetailRow label="ID"><span className="font-mono">{event.id}</span></DetailRow>
            <DetailRow label="Occurred"><span className="font-mono">{fmtTime(event.occurredAt)}</span></DetailRow>
            <DetailRow label="Action"><span className="font-mono">{event.action}</span></DetailRow>
            <DetailRow label="Actor Role">{event.actorRole}</DetailRow>
            <DetailRow label="Actor User">{event.actorUserId ?? <span className="text-text-faint">system</span>}</DetailRow>
            <DetailRow label="Severity">
              <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${SEV_COLORS[event.severity]}`}>{event.severity}</span>
            </DetailRow>
            <DetailRow label="Result">
              <span className={`font-mono font-semibold ${RESULT_COLORS[event.result]}`}>{event.result}</span>
            </DetailRow>
            {event.ip && <DetailRow label="IP"><span className="font-mono">{event.ip}</span></DetailRow>}
          </div>
        </div>

        {/* Center: Resource Snapshot */}
        <div className="rounded-lg border border-border bg-surface-1">
          <div className="border-b border-border px-4 py-2.5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Resource</h2>
          </div>
          <div className="px-4 py-2">
            <DetailRow label="Type"><span className="font-mono uppercase">{event.resourceType}</span></DetailRow>
            <DetailRow label="ID"><span className="font-mono">{event.resourceId}</span></DetailRow>
            {event.corridorId && <DetailRow label="Corridor"><span className="font-mono">{event.corridorId}</span></DetailRow>}
            {event.hubId && <DetailRow label="Hub"><span className="font-mono">{event.hubId}</span></DetailRow>}
            <div className="pt-3">
              {(event.resourceType === "settlement" || event.resourceType === "order") && (
                <Link
                  href={`/supervisory/case/${event.resourceType}/${event.resourceId}`}
                  className="inline-flex items-center gap-1 rounded-md bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
                >
                  Open Supervisory Case →
                </Link>
              )}
              {event.resourceType === "settlement" && (
                <Link
                  href={`/settlements/${event.resourceId}`}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
                >
                  View Settlement →
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right: Metadata + Links */}
        <div className="space-y-4">
          {/* Metadata */}
          <div className="rounded-lg border border-border bg-surface-1">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Metadata</h2>
            </div>
            <div className="px-4 py-2">
              {Object.entries(event.metadata).map(([k, v]) => (
                <DetailRow key={k} label={k}>
                  <span className="font-mono">{String(v)}</span>
                </DetailRow>
              ))}
              {Object.keys(event.metadata).length === 0 && (
                <p className="py-4 text-center text-[10px] text-text-faint">No metadata</p>
              )}
            </div>
          </div>

          {/* Evidence + Ledger Links */}
          <div className="rounded-lg border border-border bg-surface-1">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint">Linkages</h2>
            </div>
            <div className="px-4 py-2">
              {event.ledgerEntryId && (
                <DetailRow label="Ledger Entry">
                  <Link href={`/audit/ledger`} className="font-mono text-gold hover:underline">{event.ledgerEntryId}</Link>
                </DetailRow>
              )}
              {event.evidenceIds && event.evidenceIds.length > 0 && (
                <DetailRow label="Evidence">
                  {event.evidenceIds.map((eid) => (
                    <span key={eid} className="mr-1.5 font-mono text-gold">{eid}</span>
                  ))}
                </DetailRow>
              )}
              {!event.ledgerEntryId && (!event.evidenceIds || event.evidenceIds.length === 0) && (
                <p className="py-4 text-center text-[10px] text-text-faint">No linkages</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuditEventDetailPage() {
  return (
    <RequireAuth>
      <EventDetailContent />
    </RequireAuth>
  );
}
