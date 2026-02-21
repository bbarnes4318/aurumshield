"use client";

import { cn } from "@/lib/utils";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from "lucide-react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  className?: string;
  /** Tighter row padding for dashboards/reports */
  dense?: boolean;
  /** Show zebra striping for readability */
  striped?: boolean;
  /** Enable hover state on rows (use for interactive/clickable rows) */
  interactiveRows?: boolean;
  /** Callback fired when a row is clicked — receives the raw row data */
  onRowClick?: (row: TData) => void;
  /** Contextual message when data is empty */
  emptyMessage?: string;
  /** Action node to show in empty state (e.g. "Reset filters" button) */
  emptyAction?: React.ReactNode;
  /** Branded empty-state: custom icon rendered above the title */
  emptyStateIcon?: React.ReactNode;
  /** Branded empty-state: headline text */
  emptyStateTitle?: string;
  /** Branded empty-state: supporting description below the title */
  emptyStateDescription?: string;
  /** Branded empty-state: action CTA (e.g. a button or link) */
  emptyStateAction?: React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data,
  className,
  dense = false,
  striped = true,
  interactiveRows = true,
  onRowClick,
  emptyMessage = "No records match the current view.",
  emptyAction,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateAction,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const cellPad = dense ? "px-3 py-1.5" : "px-4 py-3";
  const headPad = dense ? "px-3 py-2" : "px-4 py-3";

  /* Determine whether the caller opted into the branded empty-state API */
  const hasBrandedEmpty = !!(emptyStateTitle || emptyStateDescription || emptyStateIcon || emptyStateAction);

  return (
    <div className={cn("card-base overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse text-sm", striped && "row-stripe", dense && "dense-table")}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b-2 border-border bg-surface-2">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const ariaSort = sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : canSort ? "none" : undefined;

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "typo-label sticky top-0 bg-surface-2 text-left",
                        headPad,
                        canSort && "cursor-pointer select-none"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={ariaSort}
                      tabIndex={canSort ? 0 : undefined}
                      onKeyDown={canSort ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); header.column.getToggleSortingHandler()?.(e); } } : undefined}
                      role={canSort ? "columnheader" : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {canSort && (
                          <span className="text-text-faint" aria-hidden="true">
                            {sorted === "asc" ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3" />
                            )}
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
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  {hasBrandedEmpty ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      {emptyStateIcon && (
                        <div className="text-gray-500 opacity-80">{emptyStateIcon}</div>
                      )}
                      {emptyStateTitle && (
                        <h3 className="mt-4 text-lg font-medium text-white">{emptyStateTitle}</h3>
                      )}
                      {emptyStateDescription && (
                        <p className="mt-1 max-w-sm text-sm text-gray-400">{emptyStateDescription}</p>
                      )}
                      {emptyStateAction && <div className="mt-5">{emptyStateAction}</div>}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
                        <Inbox className="h-5 w-5 text-text-faint" aria-hidden="true" />
                      </div>
                      <p className="text-sm text-text-muted">{emptyMessage}</p>
                      {emptyAction && <div className="mt-2">{emptyAction}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={cn(
                    "border-b border-border transition-colors last:border-b-0",
                    interactiveRows && "hover:bg-surface-2/50",
                    onRowClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cellPad}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
