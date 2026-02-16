"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useAuditEvents } from "@/hooks/use-mock-queries";
import type { AuditEvent } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const categoryStyles: Record<string, string> = {
  auth: "bg-info/10 text-info",
  data: "bg-gold/10 text-gold",
  config: "bg-warning/10 text-warning",
  export: "bg-success/10 text-success",
  system: "bg-text-faint/10 text-text-faint",
};

const columns: ColumnDef<AuditEvent, unknown>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ row }) => (
      <span className="tabular-nums text-text-muted whitespace-nowrap">
        {new Date(row.getValue("timestamp") as string).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const cat = row.getValue("category") as string;
      return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase", categoryStyles[cat])}>
          {cat}
        </span>
      );
    },
    enableSorting: true,
  },
  { accessorKey: "action", header: "Action", cell: ({ row }) => <span className="font-medium text-text">{row.getValue("action")}</span>, enableSorting: true },
  { accessorKey: "actor", header: "Actor", enableSorting: true },
  { accessorKey: "actorRole", header: "Role", cell: ({ row }) => <span className="text-text-muted">{row.getValue("actorRole")}</span>, enableSorting: true },
  { accessorKey: "resource", header: "Resource", enableSorting: true },
  {
    accessorKey: "detail",
    header: "Detail",
    cell: ({ row }) => (
      <span className="text-text-muted line-clamp-1 max-w-xs" title={row.getValue("detail") as string}>
        {row.getValue("detail")}
      </span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "ipAddress",
    header: "IP",
    cell: ({ row }) => <span className="font-mono text-xs tabular-nums text-text-faint">{row.getValue("ipAddress")}</span>,
    enableSorting: true,
  },
];

export default function AuditPage() {
  const auditQ = useAuditEvents();

  return (
    <>
      <PageHeader title="Audit Log" description="Comprehensive activity log — authentication, data changes, configuration updates, and system events." />

      {auditQ.isLoading && <LoadingState message="Loading audit log…" />}
      {auditQ.isError && <ErrorState message="Failed to load audit log." onRetry={() => auditQ.refetch()} />}
      {auditQ.data && <DataTable columns={columns} data={auditQ.data} dense />}
    </>
  );
}
