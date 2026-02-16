"use client";

import { Suspense } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StateChip } from "@/components/ui/state-chip";
import { RiskBadge } from "@/components/ui/risk-badge";
import { FilterBar, useFilterValues, type FilterConfig } from "@/components/ui/filter-bar";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/state-views";
import { useCounterparties } from "@/hooks/use-mock-queries";
import type { Counterparty } from "@/lib/mock-data";
import { ExternalLink } from "lucide-react";

const columns: ColumnDef<Counterparty, unknown>[] = [
  {
    accessorKey: "entity",
    header: "Entity",
    cell: ({ row }) => (
      <Link href={`/counterparties/${row.original.id}`} className="font-medium text-gold hover:text-gold-hover transition-colors">
        {row.getValue("entity")}
      </Link>
    ),
    enableSorting: true,
  },
  { accessorKey: "type", header: "Type", cell: ({ row }) => <span className="capitalize text-text-muted">{(row.getValue("type") as string).replace("-", " ")}</span>, enableSorting: true },
  { accessorKey: "jurisdiction", header: "Jurisdiction", enableSorting: true },
  { accessorKey: "riskLevel", header: "Risk", cell: ({ row }) => <RiskBadge level={row.getValue("riskLevel")} />, enableSorting: true },
  { accessorKey: "status", header: "Status", cell: ({ row }) => <StateChip status={row.getValue("status")} />, enableSorting: true },
  {
    accessorKey: "exposure",
    header: "Exposure",
    cell: ({ row }) => <span className="tabular-nums">${((row.getValue("exposure") as number) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 })}M</span>,
    enableSorting: true,
  },
  {
    accessorKey: "lastReview",
    header: "Last Review",
    cell: ({ row }) => <span className="tabular-nums text-text-muted">{new Date(row.getValue("lastReview") as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>,
    enableSorting: true,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link href={`/counterparties/${row.original.id}`} className="text-text-faint hover:text-text transition-colors">
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    ),
    enableSorting: false,
  },
];

const filters: FilterConfig[] = [
  { key: "riskLevel", label: "Risk", options: [
    { label: "Low", value: "low" }, { label: "Medium", value: "medium" },
    { label: "High", value: "high" }, { label: "Critical", value: "critical" },
  ]},
  { key: "status", label: "Status", options: [
    { label: "Active", value: "active" }, { label: "Pending", value: "pending" },
    { label: "Under Review", value: "under-review" }, { label: "Closed", value: "closed" },
    { label: "Suspended", value: "suspended" },
  ]},
  { key: "type", label: "Type", options: [
    { label: "Sovereign Fund", value: "sovereign-fund" }, { label: "Bank", value: "bank" },
    { label: "Reinsurer", value: "reinsurer" }, { label: "Asset Manager", value: "asset-manager" },
    { label: "Trade Finance", value: "trade-finance" },
  ]},
];

function CounterpartiesContent() {
  const cpQ = useCounterparties();
  const fv = useFilterValues(["riskLevel", "status", "type"]);

  const filtered = cpQ.data?.filter((cp) => {
    if (fv.riskLevel && cp.riskLevel !== fv.riskLevel) return false;
    if (fv.status && cp.status !== fv.status) return false;
    if (fv.type && cp.type !== fv.type) return false;
    return true;
  });

  return (
    <>
      <PageHeader title="Counterparties" description="Entity-level risk management, exposure tracking, and compliance status." />
      <FilterBar filters={filters} />

      {cpQ.isLoading && <LoadingState message="Loading counterparties…" />}
      {cpQ.isError && <ErrorState message="Failed to load counterparties." onRetry={() => cpQ.refetch()} />}
      {filtered && filtered.length === 0 && <EmptyState title="No counterparties" message="No counterparties match the current filters." />}
      {filtered && filtered.length > 0 && <DataTable columns={columns} data={filtered} />}
    </>
  );
}

export default function CounterpartiesPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
      <CounterpartiesContent />
    </Suspense>
  );
}
