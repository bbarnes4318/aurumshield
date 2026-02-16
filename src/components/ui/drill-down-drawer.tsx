"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/lib/mock-data";

const STATUS_DOT: Record<string, string> = {
  completed: "bg-success", pending: "bg-warning", processing: "bg-info", failed: "bg-danger", reversed: "bg-text-faint",
};

function fmt(n: number) { return n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n.toLocaleString()}`; }

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  transactions: Transaction[];
}

export function DrillDownDrawer({ open, onClose, title, subtitle, transactions }: Props) {
  if (!open) return null;

  const totalVol = transactions.reduce((a, t) => a + t.amount, 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-bg/60" onClick={onClose} aria-hidden="true" />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border bg-surface-1 shadow-xl",
          "flex flex-col animate-in slide-in-from-right duration-200"
        )}
        role="dialog"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text">{title}</h2>
            {subtitle && <p className="text-xs text-text-faint mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-[var(--radius-sm)] p-1.5 text-text-faint hover:text-text hover:bg-surface-2 transition-colors" aria-label="Close drawer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-surface-2 text-xs">
          <span className="text-text-faint">{transactions.length} transaction(s)</span>
          <span className="text-text-faint">Total: <span className="font-semibold text-gold tabular-nums">{fmt(totalVol)}</span></span>
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {transactions.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-text-faint">No transactions found.</div>
          )}
          {transactions.map((tx) => (
            <Link key={tx.id} href={`/transactions/${tx.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors group">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[tx.status])} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text font-mono group-hover:text-gold transition-colors">{tx.reference}</span>
                  <span className="text-xs tabular-nums font-semibold text-text-muted">{tx.currency} {fmt(tx.amount)}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text-faint mt-0.5">
                  <span className="capitalize">{tx.status}</span>
                  <span>·</span>
                  <span className="capitalize">{tx.type.replace("-", " ")}</span>
                  <span>·</span>
                  <span>{tx.counterpartyName}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
}
