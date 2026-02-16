"use client";

import { Suspense, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable } from "@/components/ui/data-table";
import { FilterBar, useFilterValues, type FilterConfig } from "@/components/ui/filter-bar";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/state-views";
import { useClaims } from "@/hooks/use-mock-queries";
import type { Claim } from "@/lib/mock-data";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const claimStatusStyles: Record<string, string> = {
  open: "bg-info/10 text-info", investigating: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success", escalated: "bg-danger/10 text-danger",
  denied: "bg-text-faint/10 text-text-faint",
};

const priorityStyles: Record<string, string> = {
  low: "text-text-faint", medium: "text-warning", high: "text-danger", urgent: "text-danger font-bold",
};

const columns: ColumnDef<Claim, unknown>[] = [
  {
    accessorKey: "reference", header: "Reference",
    cell: ({ row }) => (
      <Link href={`/claims/${row.original.id}`} className="typo-mono font-medium text-gold hover:text-gold-hover transition-colors">
        {row.getValue("reference")}
      </Link>
    ),
    enableSorting: true,
  },
  { accessorKey: "title", header: "Title", enableSorting: true },
  { accessorKey: "counterpartyName", header: "Counterparty", enableSorting: true },
  { accessorKey: "type", header: "Type", cell: ({ row }) => <span className="capitalize">{(row.getValue("type") as string).replace("-", " ")}</span>, enableSorting: true },
  {
    accessorKey: "priority", header: "Priority",
    cell: ({ row }) => {
      const p = row.getValue("priority") as string;
      return <span className={cn("text-xs font-semibold uppercase tracking-wider", priorityStyles[p])}>{p}</span>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "status", header: "Status",
    cell: ({ row }) => {
      const s = row.getValue("status") as string;
      return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", claimStatusStyles[s])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />{s}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "amount", header: "Amount",
    cell: ({ row }) => {
      const a = row.getValue("amount") as number;
      return a > 0
        ? <span className="tabular-nums">{row.original.currency} {(a / 1e6).toFixed(1)}M</span>
        : <span className="text-text-faint">—</span>;
    },
    enableSorting: true,
  },
  { accessorKey: "assignee", header: "Assignee", enableSorting: true },
  {
    id: "actions", header: "",
    cell: ({ row }) => (
      <Link href={`/claims/${row.original.id}`} className="text-text-faint hover:text-text transition-colors">
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    ),
    enableSorting: false,
  },
];

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: [
    { label: "Open", value: "open" }, { label: "Investigating", value: "investigating" },
    { label: "Resolved", value: "resolved" }, { label: "Escalated", value: "escalated" },
    { label: "Denied", value: "denied" },
  ]},
  { key: "type", label: "Type", options: [
    { label: "Credit Event", value: "credit-event" }, { label: "Settlement Failure", value: "settlement-failure" },
    { label: "Operational", value: "operational" }, { label: "Counterparty Default", value: "counterparty-default" },
    { label: "Regulatory", value: "regulatory" },
  ]},
  { key: "priority", label: "Priority", options: [
    { label: "Low", value: "low" }, { label: "Medium", value: "medium" },
    { label: "High", value: "high" }, { label: "Urgent", value: "urgent" },
  ]},
];

function ClaimsContent() {
  const clmQ = useClaims();
  const fv = useFilterValues(["status", "type", "priority"]);
  const claims = useMemo(() => clmQ.data ?? [], [clmQ.data]);

  const filtered = useMemo(() => claims.filter((c) => {
    if (fv.status && c.status !== fv.status) return false;
    if (fv.type && c.type !== fv.type) return false;
    if (fv.priority && c.priority !== fv.priority) return false;
    return true;
  }), [claims, fv.status, fv.type, fv.priority]);

  const openCount = useMemo(() => claims.filter((c) => c.status === "open" || c.status === "investigating").length, [claims]);
  const escalatedCount = useMemo(() => claims.filter((c) => c.status === "escalated").length, [claims]);
  const avgResolutionDays = useMemo(() => {
    const resolved = claims.filter((c) => c.resolvedDate);
    if (resolved.length === 0) return 0;
    const totalDays = resolved.reduce((acc, c) => {
      return acc + Math.floor((new Date(c.resolvedDate!).getTime() - new Date(c.filedDate).getTime()) / 86_400_000);
    }, 0);
    return Math.round(totalDays / resolved.length);
  }, [claims]);

  return (
    <>
      <PageHeader title="Claims" description="Credit events, settlement failures, and operational claims — deterministic adjudication protocol." />

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Total Claims" value={String(claims.length)} change={0} trend="flat" period="all time" />
        <MetricCard label="Open / Active" value={String(openCount)} change={0} trend={openCount > 0 ? "down" : "flat"} period="investigating + open" />
        <MetricCard label="Escalated" value={String(escalatedCount)} change={0} trend={escalatedCount > 0 ? "down" : "flat"} period="requires escalation" />
        <MetricCard label="Avg Resolution" value={`${avgResolutionDays}d`} change={0} trend="flat" period="filed → resolved" />
      </div>

      <FilterBar filters={filters} />

      {clmQ.isLoading && <LoadingState message="Loading claims…" />}
      {clmQ.isError && <ErrorState message="Failed to load claims." onRetry={() => clmQ.refetch()} />}
      {filtered.length === 0 && !clmQ.isLoading && <EmptyState title="No claims" message="No claims match the current filters." />}
      {filtered.length > 0 && <DataTable columns={columns} data={filtered} />}
    </>
  );
}

export default function ClaimsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
      <ClaimsContent />
    </Suspense>
  );
}
