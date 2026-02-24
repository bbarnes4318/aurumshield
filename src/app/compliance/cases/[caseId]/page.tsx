"use client";

/* ================================================================
   /compliance/cases/[caseId] — Compliance Case Detail Page
   ================================================================
   Displays a single ComplianceCase with:
     - Status badge & tier indicator
     - Timeline of all compliance events (CaseTimeline)
     - In-app message thread (CaseMessageThread)
     - SSE subscription for live updates
     - Navigation back to buyer dashboard

   This page replaces out-of-band email escalation with a
   structured, audit-trailed compliance communication channel.
   ================================================================ */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CaseTimeline,
  type TimelineEvent,
} from "@/components/compliance/CaseTimeline";
import { CaseMessageThread } from "@/components/compliance/CaseMessageThread";

/* ── Types ── */

interface ComplianceCaseData {
  id: string;
  userId: string;
  orgId: string | null;
  status: string;
  tier: string;
  orgType: string | null;
  jurisdiction: string | null;
  providerInquiryId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CaseApiResponse {
  case: ComplianceCaseData | null;
  events: TimelineEvent[];
}

/* ── Status Badge Config ── */

const STATUS_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  OPEN: { icon: Clock, color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Open" },
  PENDING_USER: { icon: AlertTriangle, color: "text-amber-400 bg-amber-400/10 border-amber-400/20", label: "Action Required" },
  PENDING_PROVIDER: { icon: Loader2, color: "text-purple-400 bg-purple-400/10 border-purple-400/20", label: "Provider Processing" },
  UNDER_REVIEW: { icon: Shield, color: "text-orange-400 bg-orange-400/10 border-orange-400/20", label: "Under Review" },
  APPROVED: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", label: "Approved" },
  REJECTED: { icon: XCircle, color: "text-red-400 bg-red-400/10 border-red-400/20", label: "Rejected" },
  CLOSED: { icon: Shield, color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", label: "Closed" },
};

/* ── Tier Labels ── */

const TIER_LABELS: Record<string, string> = {
  BROWSE: "Browse",
  QUOTE: "Quote",
  LOCK: "Lock Prices",
  EXECUTE: "Full Access",
};

/* ── Component ── */

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  /* ── Fetch case data ── */
  const {
    data,
    isLoading,
    error,
  } = useQuery<CaseApiResponse>({
    queryKey: ["compliance-case", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/compliance/cases/me`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 5_000,
  });

  /* ── SSE subscription for live updates ── */
  useEffect(() => {
    const es = new EventSource("/api/compliance/stream");
    eventSourceRef.current = es;

    es.onopen = () => setSseConnected(true);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "case_event" && payload.caseId === caseId) {
          // Invalidate the query to refetch with the new event
          queryClient.invalidateQueries({ queryKey: ["compliance-case", caseId] });
        }
      } catch {
        // Ignore malformed SSE data
      }
    };

    es.onerror = () => {
      setSseConnected(false);
      // EventSource auto-reconnects by default
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [caseId, queryClient]);

  /* ── Message sent callback ── */
  const handleMessageSent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["compliance-case", caseId] });
  }, [queryClient, caseId]);

  /* ── Render ── */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-color-2 animate-spin" />
      </div>
    );
  }

  if (error || !data?.case) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertTriangle className="h-10 w-10 text-warning" />
        <p className="text-sm text-color-3/60">
          {error ? "Failed to load case details" : "Case not found"}
        </p>
        <Link
          href="/buyer"
          className="inline-flex items-center gap-1.5 text-xs text-color-2 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const cc = data.case;
  const events = data.events;
  const messages = events.filter((e) => e.action === "MESSAGE");
  const statusCfg = STATUS_CONFIG[cc.status] ?? STATUS_CONFIG.OPEN;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/buyer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-color-5/15 text-color-3/40 hover:text-color-3/60 hover:bg-color-3/5 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-color-3 tracking-tight truncate">
              Compliance Case
            </h1>

            {/* Status badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                statusCfg.color,
              )}
            >
              <StatusIcon className={cn("h-3 w-3", cc.status === "PENDING_PROVIDER" && "animate-spin")} />
              {statusCfg.label}
            </span>

            {/* Tier badge */}
            <span className="rounded-md bg-color-3/5 border border-color-3/10 px-2 py-0.5 text-[10px] font-semibold text-color-3/40 uppercase tracking-wider">
              Tier: {TIER_LABELS[cc.tier] ?? cc.tier}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-1 text-[10px] text-color-3/30 tabular-nums">
            <span>ID: {cc.id.slice(0, 8)}…</span>
            <span>Created: {new Date(cc.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(cc.updatedAt).toLocaleDateString()}</span>
            {sseConnected && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        <Link
          href="/onboarding/compliance"
          className="inline-flex items-center gap-1 text-xs text-color-3/40 hover:text-color-2 transition-colors"
        >
          Verification
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Timeline */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-color-5/15 bg-color-1 p-5">
            <h2 className="text-sm font-semibold text-color-3 tracking-tight mb-4">
              Event Timeline
            </h2>
            <CaseTimeline events={events} />
          </div>
        </div>

        {/* Right: Message thread */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-color-5/15 bg-color-1 h-[500px] flex flex-col overflow-hidden">
            <CaseMessageThread
              caseId={caseId}
              messages={messages}
              onMessageSent={handleMessageSent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
