"use client";

import { cn } from "@/lib/utils";
import type { VerificationCase } from "@/lib/mock-data";
import { ScrollText } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CASE_INITIATED: "text-info",
  STEP_SUBMITTED: "text-text-muted",
  CASE_VERIFIED: "text-success",
  CASE_REJECTED: "text-danger",
  CASE_ESCALATED: "text-warning",
};

interface AuditLogProps {
  audit: VerificationCase["audit"];
  maxItems?: number;
  className?: string;
}

export function AuditLog({ audit, maxItems = 10, className }: AuditLogProps) {
  const items = [...audit].reverse().slice(0, maxItems);

  return (
    <div className={cn("rounded-[var(--radius)] border border-border bg-surface-1", className)}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-text-faint" />
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
            Decision Log ({audit.length})
          </p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="p-4 text-xs text-text-faint">No audit entries recorded.</div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((entry, i) => (
            <div key={i} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className={cn("text-[10px] font-bold uppercase tracking-wide", ACTION_COLORS[entry.action] ?? "text-text-faint")}>
                  {entry.action.replace(/_/g, " ")}
                </span>
                <span className="text-[10px] tabular-nums text-text-faint">
                  {new Date(entry.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">{entry.detail}</p>
              <p className="text-[10px] text-text-faint font-mono mt-0.5">Actor: {entry.actor}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
