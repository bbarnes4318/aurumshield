"use client";

/* ================================================================
   CASE TIMELINE — Compliance Event Audit Trail
   ================================================================
   Renders a vertical timeline of ComplianceEvent entries for a
   given case. Each event shows:
     - Actor badge (USER / PROVIDER / SYSTEM)
     - Action label
     - Relative timestamp
     - Details (expandable JSON for debug)
     - Actionable CTA if the event requires user response

   Receives events as props — the parent component manages data
   fetching and SSE subscription.
   ================================================================ */

import { useState } from "react";
import {
  User,
  Bot,
  Server,
  ChevronDown,
  ChevronUp,
  FileUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */

export interface TimelineEvent {
  id: string;
  caseId: string;
  eventId: string;
  actor: "USER" | "PROVIDER" | "SYSTEM";
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface CaseTimelineProps {
  events: TimelineEvent[];
  className?: string;
  onActionRequired?: (eventId: string, action: string) => void;
}

/* ── Actor Config ── */

const ACTOR_CONFIG: Record<
  TimelineEvent["actor"],
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  USER: { icon: User, color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "You" },
  PROVIDER: { icon: Bot, color: "text-purple-400 bg-purple-400/10 border-purple-400/20", label: "Provider" },
  SYSTEM: { icon: Server, color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20", label: "System" },
};

/* ── Action Labels ── */

const ACTION_LABELS: Record<string, string> = {
  INQUIRY_COMPLETED: "Identity verification completed",
  INQUIRY_FAILED: "Identity verification failed",
  STEP_COMPLETED: "Verification step completed",
  DOCUMENT_UPLOADED: "Document uploaded",
  DOCUMENT_REQUESTED: "Document requested",
  MESSAGE: "Message",
  STATUS_CHANGED: "Case status updated",
  TIER_PROMOTED: "Verification tier upgraded",
  CASE_CREATED: "Compliance case opened",
  ADDRESS_CORRECTED: "Address corrected",
};

/* ── Actionable Event Detection ── */

const ACTIONABLE_EVENTS = new Set([
  "DOCUMENT_REQUESTED",
]);

/* ── Relative Timestamp ── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/* ── Component ── */

export function CaseTimeline({ events, className, onActionRequired }: CaseTimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (events.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <Clock className="h-10 w-10 text-color-3/20 mb-3" />
        <p className="text-sm text-color-3/40 font-medium">No events yet</p>
        <p className="text-xs text-color-3/25 mt-1">
          Events will appear here as your verification progresses
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-color-3/10" aria-hidden="true" />

      <ol className="space-y-4" role="list" aria-label="Compliance case timeline">
        {events.map((evt) => {
          const actorCfg = ACTOR_CONFIG[evt.actor];
          const Icon = actorCfg.icon;
          const isExpanded = expandedIds.has(evt.id);
          const isActionable = ACTIONABLE_EVENTS.has(evt.action);
          const label = ACTION_LABELS[evt.action] ?? evt.action;

          return (
            <li key={evt.id} className="relative pl-12">
              {/* Actor icon */}
              <div
                className={cn(
                  "absolute left-2.5 flex h-5 w-5 items-center justify-center rounded-full border",
                  actorCfg.color,
                )}
              >
                <Icon className="h-3 w-3" />
              </div>

              {/* Content */}
              <div className="rounded-lg border border-color-5/10 bg-color-1 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-color-3 leading-tight">
                      {label}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-medium text-color-3/35 uppercase tracking-wider">
                        {actorCfg.label}
                      </span>
                      <span className="text-[10px] text-color-3/25">·</span>
                      <time
                        className="text-[10px] text-color-3/30"
                        dateTime={evt.createdAt}
                        title={new Date(evt.createdAt).toLocaleString()}
                      >
                        {relativeTime(evt.createdAt)}
                      </time>
                    </div>
                  </div>

                  {/* Expand/collapse details button */}
                  {Object.keys(evt.details).length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(evt.id)}
                      className="shrink-0 p-1 text-color-3/30 hover:text-color-3/50 transition-colors"
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && Object.keys(evt.details).length > 0 && (
                  <pre className="mt-3 rounded-md bg-color-3/5 px-3 py-2 text-[11px] text-color-3/50 font-mono overflow-x-auto">
                    {JSON.stringify(evt.details, null, 2)}
                  </pre>
                )}

                {/* Actionable CTA */}
                {isActionable && onActionRequired && (
                  <button
                    type="button"
                    onClick={() => onActionRequired(evt.eventId, evt.action)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-color-2 px-3 py-1.5 text-xs font-semibold text-color-1 transition-colors hover:bg-color-2/90"
                  >
                    <FileUp className="h-3 w-3" />
                    Upload Document
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
