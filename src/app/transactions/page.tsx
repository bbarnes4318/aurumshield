"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, type FilterConfig } from "@/components/ui/filter-bar";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/state-views";
import { useTransactions, useCounterparties } from "@/hooks/use-mock-queries";
import type { Transaction, TransactionStatus, TransactionType } from "@/lib/mock-data";
import type { RiskLevel } from "@/components/ui/risk-badge";
import { Plus, Ban, RotateCcw, Download, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getColumns } from "./transactions-columns";
import { StatsStrip } from "./transactions-stats-strip";

/* ================================================================
   ALLOWED FILTER VALUES (for hardened parsing)
   ================================================================ */
const VALID_STATUSES: Set<string> = new Set<string>([
  "completed", "pending", "processing", "failed", "reversed",
]);
const VALID_TYPES: Set<string> = new Set<string>([
  "wire", "swift", "settlement", "collateral", "margin-call", "dividend",
]);
const VALID_CORRIDORS: Set<string> = new Set<string>([
  "US → UK", "CH → UK", "DE → LU", "SG → HK", "AE → US", "NO → LU", "AR → US",
]);

/** Reads a search param and returns it only if it's in the allowed set, else "" */
function safeParam(params: URLSearchParams, key: string, allowed: Set<string>): string {
  const raw = params.get(key) ?? "";
  return allowed.has(raw) ? raw : "";
}

/* ================================================================
   CSV EXPORT
   ================================================================ */
function exportCSV(rows: Transaction[]) {
  const headers = [
    "Reference", "Type", "Counterparty", "Amount", "Currency",
    "Corridor", "Status", "Initiated", "Settled", "Initiated By", "Description",
  ];
  const csvRows = [headers.join(",")];
  for (const r of rows) {
    csvRows.push([
      r.reference,
      r.type,
      `"${r.counterpartyName}"`,
      r.amount.toString(),
      r.currency,
      `"${r.corridorName}"`,
      r.status,
      r.initiatedDate,
      r.settledDate ?? "",
      `"${r.initiatedBy}"`,
      `"${r.description.replace(/"/g, '""')}"`,
    ].join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ================================================================
   BULK ACTIONS BAR
   ================================================================ */
function BulkActionsBar({
  selectedCount,
  onExport,
  onClearSelection,
}: {
  selectedCount: number;
  onExport: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-gold/30 bg-gold/5 px-4 py-2.5 animate-in slide-in-from-top-2 fade-in-0 duration-200">
      <div className="flex items-center gap-2">
        <CheckSquare className="h-4 w-4 text-gold" />
        <span className="text-sm font-medium tabular-nums text-text">
          {selectedCount} selected
        </span>
      </div>
      <div className="h-4 w-px bg-border" />
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 rounded-[var(--radius-input)] bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
      >
        <Download className="h-3 w-3" />
        Export CSV
      </button>
      {/* TODO: Wire to real bulk retry endpoint */}
      <button className="flex items-center gap-1.5 rounded-[var(--radius-input)] bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-3 hover:text-text">
        <RotateCcw className="h-3 w-3" />
        Retry
      </button>
      {/* TODO: Wire to real bulk cancel endpoint */}
      <button className="flex items-center gap-1.5 rounded-[var(--radius-input)] bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20">
        <Ban className="h-3 w-3" />
        Cancel
      </button>
      <div className="flex-1" />
      <button
        onClick={onClearSelection}
        className="text-xs text-text-faint transition-colors hover:text-text"
      >
        Clear selection
      </button>
    </div>
  );
}

/* ================================================================
   FILTER DEFINITIONS
   ================================================================ */
const filters: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { label: "Completed", value: "completed" },
      { label: "Pending", value: "pending" },
      { label: "Processing", value: "processing" },
      { label: "Failed", value: "failed" },
      { label: "Reversed", value: "reversed" },
    ],
  },
  {
    key: "type",
    label: "Type",
    options: [
      { label: "Wire", value: "wire" },
      { label: "SWIFT", value: "swift" },
      { label: "Settlement", value: "settlement" },
      { label: "Collateral", value: "collateral" },
      { label: "Margin Call", value: "margin-call" },
      { label: "Dividend", value: "dividend" },
    ],
  },
  {
    key: "corridor",
    label: "Corridor",
    options: [
      { label: "US → UK", value: "US → UK" },
      { label: "CH → UK", value: "CH → UK" },
      { label: "DE → LU", value: "DE → LU" },
      { label: "SG → HK", value: "SG → HK" },
      { label: "AE → US", value: "AE → US" },
      { label: "NO → LU", value: "NO → LU" },
      { label: "AR → US", value: "AR → US" },
    ],
  },
];

/* ================================================================
   SKELETON
   ================================================================ */
function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 flex-1 rounded-[var(--radius-sm)] bg-surface-3" />
        ))}
      </div>
      <div className="card-base p-4 space-y-3 animate-pulse">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="h-4 flex-1 rounded bg-surface-3" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   ARIA SORT MAPPING
   ================================================================ */
function ariaSortValue(
  sorted: false | "asc" | "desc"
): "ascending" | "descending" | "none" {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
}

/* ================================================================
   MAIN CONTENT
   ================================================================ */
function TransactionsContent() {
  const router = useRouter();
  const txQ = useTransactions();
  const cpQ = useCounterparties();
  const searchParams = useSearchParams();

  // Hardened filter parsing — invalid values silently fall back to ""
  const statusFilter = safeParam(searchParams, "status", VALID_STATUSES);
  const typeFilter = safeParam(searchParams, "type", VALID_TYPES);
  const corridorFilter = safeParam(searchParams, "corridor", VALID_CORRIDORS);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "initiatedDate", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Map counterpartyId → riskLevel for TRI column
  const cpRiskMap = useMemo<Record<string, RiskLevel>>(() => {
    if (!cpQ.data) return {};
    return cpQ.data.reduce<Record<string, RiskLevel>>((acc, cp) => {
      acc[cp.id] = cp.riskLevel;
      return acc;
    }, {});
  }, [cpQ.data]);

  // Filter data with sanitized params
  const filtered = useMemo(() => {
    if (!txQ.data) return [];
    return txQ.data.filter((tx) => {
      if (statusFilter && tx.status !== statusFilter) return false;
      if (typeFilter && tx.type !== typeFilter) return false;
      if (corridorFilter && tx.corridorName !== corridorFilter) return false;
      return true;
    });
  }, [txQ.data, statusFilter, typeFilter, corridorFilter]);

  const columns = useMemo(() => getColumns(cpRiskMap), [cpRiskMap]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  const selectedCount = Object.keys(rowSelection).length;
  const clearSelection = useCallback(() => setRowSelection({}), []);

  // Export: selected rows if any, else all filtered+sorted rows
  const handleExport = useCallback(() => {
    const sortedRows = table.getSortedRowModel().rows;
    const selectedIds = new Set(Object.keys(rowSelection));

    let exportRows: Transaction[];
    if (selectedIds.size > 0) {
      exportRows = sortedRows
        .filter((r) => selectedIds.has(r.id))
        .map((r) => r.original);
    } else {
      exportRows = sortedRows.map((r) => r.original);
    }

    exportCSV(exportRows);
  }, [table, rowSelection]);

  if (txQ.isLoading || cpQ.isLoading) return <TableSkeleton />;
  if (txQ.isError) {
    return (
      <ErrorState
        message="Failed to load transactions."
        onRetry={() => txQ.refetch()}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Cross-border payment flows, settlements, and margin operations."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <Link
              href="/transactions/new"
              className="flex items-center gap-2 rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed"
            >
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          </div>
        }
      />

      {/* Stats Strip */}
      <StatsStrip data={filtered} />

      {/* Filters */}
      <FilterBar filters={filters} />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedCount}
        onExport={handleExport}
        onClearSelection={clearSelection}
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Active Transactions"
          message="Initiate a new physical gold trade to see it tracked on the ledger."
          action={
            <Link
              href="/transactions/new"
              className="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed"
            >
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          }
        />
      ) : (
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" role="grid">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-border bg-surface-2"
                  >
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={canSort ? ariaSortValue(sorted) : undefined}
                          tabIndex={canSort ? 0 : undefined}
                          role={canSort ? "columnheader" : undefined}
                          className={cn(
                            "typo-label sticky top-0 z-10 bg-surface-2 text-left px-4 py-2.5",
                            canSort &&
                              "cursor-pointer select-none hover:text-text transition-colors",
                            canSort &&
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset"
                          )}
                          style={
                            header.column.columnDef.size
                              ? { width: header.column.columnDef.size }
                              : undefined
                          }
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            if (canSort && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                            {canSort && sorted === "asc" && (
                              <span className="text-gold" aria-hidden="true">
                                ↑
                              </span>
                            )}
                            {canSort && sorted === "desc" && (
                              <span className="text-gold" aria-hidden="true">
                                ↓
                              </span>
                            )}
                            {canSort && !sorted && (
                              <span
                                className="text-text-faint/50"
                                aria-hidden="true"
                              >
                                ⇅
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/transactions/${row.original.id}`)}
                    className={cn(
                      "border-b border-border/60 transition-colors last:border-b-0 cursor-pointer",
                      row.getIsSelected()
                        ? "bg-gold/[0.04]"
                        : "hover:bg-surface-2/50"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <p className="text-[11px] tabular-nums text-text-faint">
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              {selectedCount > 0 && (
                <span className="text-gold">
                  {" "}
                  · {selectedCount} selected
                </span>
              )}
            </p>
            <p className="text-[10px] tabular-nums text-text-faint">
              Sorted by{" "}
              {sorting.length > 0
                ? `${sorting[0].id} ${sorting[0].desc ? "desc" : "asc"}`
                : "default"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================
   PAGE EXPORT
   ================================================================ */
export default function TransactionsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <TransactionsContent />
    </Suspense>
  );
}
