"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { usePolicies } from "@/hooks/use-mock-queries";
import type { Policy } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const policyStatusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-info/10 text-info",
  "under-review": "bg-warning/10 text-warning",
  deprecated: "bg-text-faint/10 text-text-faint",
};

const columns: ColumnDef<Policy, unknown>[] = [
  { accessorKey: "name", header: "Policy", cell: ({ row }) => <span className="font-semibold text-text">{row.getValue("name")}</span>, enableSorting: true },
  { accessorKey: "category", header: "Category", cell: ({ row }) => <span className="capitalize">{row.getValue("category")}</span>, enableSorting: true },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.getValue("status") as string;
      return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", policyStatusStyles[s])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {s.replace("-", " ")}
        </span>
      );
    },
    enableSorting: true,
  },
  { accessorKey: "version", header: "Version", cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{row.getValue("version")}</span>, enableSorting: true },
  {
    accessorKey: "effectiveDate",
    header: "Effective",
    cell: ({ row }) => <span className="tabular-nums text-text-muted">{new Date(row.getValue("effectiveDate") as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>,
    enableSorting: true,
  },
  {
    accessorKey: "reviewDate",
    header: "Next Review",
    cell: ({ row }) => <span className="tabular-nums text-text-muted">{new Date(row.getValue("reviewDate") as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>,
    enableSorting: true,
  },
  { accessorKey: "owner", header: "Owner", enableSorting: true },
];

export default function PolicyPage() {
  const polQ = usePolicies();

  return (
    <>
      <PageHeader title="Policy Management" description="Governance policies — risk, compliance, operational, security, and financial standards." />

      {polQ.isLoading && <LoadingState message="Loading policies…" />}
      {polQ.isError && <ErrorState message="Failed to load policies." onRetry={() => polQ.refetch()} />}
      {polQ.data && <DataTable columns={columns} data={polQ.data} />}
    </>
  );
}
