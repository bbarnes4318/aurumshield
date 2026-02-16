"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { RiskBadge, type RiskLevel } from "@/components/ui/risk-badge";
import type { Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/* ================================================================
   STATUS CHIP
   ================================================================ */
const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  completed:  { dot: "bg-success",    bg: "bg-success/10",    text: "text-success" },
  pending:    { dot: "bg-warning",    bg: "bg-warning/10",    text: "text-warning" },
  processing: { dot: "bg-info",       bg: "bg-info/10",       text: "text-info" },
  failed:     { dot: "bg-danger",     bg: "bg-danger/10",     text: "text-danger" },
  reversed:   { dot: "bg-text-faint", bg: "bg-text-faint/10", text: "text-text-faint" },
};

export { STATUS_STYLES };

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize tracking-wide",
        s.bg, s.text, "border-current/20"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden="true" />
      {status}
    </span>
  );
}

/* ================================================================
   TYPE BADGE
   ================================================================ */
const TYPE_LABELS: Record<string, string> = {
  wire: "Wire",
  swift: "SWIFT",
  settlement: "Settlement",
  collateral: "Collateral",
  "margin-call": "Margin Call",
  dividend: "Dividend",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-[6px] bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-text-muted">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

/* ================================================================
   FORMAT HELPERS
   ================================================================ */
export function fmtAmount(amount: number, currency: string): string {
  if (amount >= 1e9) return `${currency} ${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `${currency} ${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${currency} ${(amount / 1e3).toFixed(0)}K`;
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

/* ================================================================
   COLUMN DEFINITIONS
   ================================================================ */
export function getColumns(
  cpRiskMap: Record<string, RiskLevel>
): ColumnDef<Transaction, unknown>[] {
  return [
    // Selection checkbox
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="h-3.5 w-3.5 rounded-[4px] border-border bg-surface-2 accent-gold cursor-pointer"
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-3.5 w-3.5 rounded-[4px] border-border bg-surface-2 accent-gold cursor-pointer"
          aria-label={`Select row ${row.original.reference}`}
        />
      ),
      enableSorting: false,
      size: 36,
    },
    // Reference
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <Link
          href={`/transactions/${row.original.id}`}
          className="typo-mono font-medium text-gold hover:text-gold-hover transition-colors"
        >
          {row.getValue("reference")}
        </Link>
      ),
      enableSorting: true,
    },
    // Type
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <TypeBadge type={row.getValue("type")} />,
      enableSorting: true,
    },
    // Counterparty
    {
      accessorKey: "counterpartyName",
      header: "Counterparty",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/counterparties/${row.original.counterpartyId}`}
            className="truncate text-text hover:text-gold transition-colors"
          >
            {row.getValue("counterpartyName")}
          </Link>
        </div>
      ),
      enableSorting: true,
    },
    // TRI Risk
    {
      id: "risk",
      header: "TRI",
      cell: ({ row }) => {
        const risk = cpRiskMap[row.original.counterpartyId];
        return risk ? <RiskBadge level={risk} /> : <span className="text-text-faint">—</span>;
      },
      enableSorting: false,
    },
    // Amount
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-text">
          {fmtAmount(row.getValue("amount") as number, row.original.currency)}
        </span>
      ),
      enableSorting: true,
    },
    // Corridor
    {
      accessorKey: "corridorName",
      header: "Corridor",
      cell: ({ row }) => (
        <span className="text-text-muted whitespace-nowrap">
          {row.getValue("corridorName")}
        </span>
      ),
      enableSorting: true,
    },
    // Status
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusChip status={row.getValue("status")} />,
      enableSorting: true,
    },
    // Initiated
    {
      accessorKey: "initiatedDate",
      header: "Initiated",
      cell: ({ row }) => (
        <span className="typo-mono text-text-faint whitespace-nowrap">
          {new Date(row.getValue("initiatedDate") as string).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC",
          })}
        </span>
      ),
      enableSorting: true,
    },
    // Detail link
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/transactions/${row.original.id}`}
          className="text-text-faint hover:text-gold transition-colors"
          aria-label={`View transaction ${row.original.reference}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ),
      enableSorting: false,
      size: 36,
    },
  ];
}
