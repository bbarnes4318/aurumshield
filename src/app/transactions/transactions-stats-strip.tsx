"use client";

import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "./transactions-columns";
import type { Transaction } from "@/lib/mock-data";

interface StatsStripProps {
  data: Transaction[];
}

export function StatsStrip({ data }: StatsStripProps) {
  const totalVolume = data.reduce((a, t) => a + t.amount, 0);
  const statusCounts = data.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const fmtVolume =
    totalVolume >= 1e9
      ? `$${(totalVolume / 1e9).toFixed(2)}B`
      : `$${(totalVolume / 1e6).toFixed(0)}M`;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-border bg-surface-1 px-5 py-3">
      <div className="flex items-center gap-2 border-r border-border pr-4">
        <span className="typo-label">Total</span>
        <span className="text-sm font-semibold tabular-nums text-text">
          {data.length}
        </span>
      </div>
      <div className="flex items-center gap-2 border-r border-border pr-4">
        <span className="typo-label">Volume</span>
        <span className="text-sm font-semibold tabular-nums text-gold">
          {fmtVolume}
        </span>
      </div>
      {Object.entries(statusCounts).map(([status, count]) => {
        const s = STATUS_STYLES[status];
        return (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className={cn("h-2 w-2 rounded-full", s?.dot ?? "bg-text-faint")}
              aria-hidden="true"
            />
            <span className="text-xs capitalize text-text-muted">{status}</span>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                s?.text ?? "text-text-faint"
              )}
            >
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
