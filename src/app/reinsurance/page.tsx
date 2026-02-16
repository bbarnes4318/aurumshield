"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useReinsurance, useDashboardData } from "@/hooks/use-mock-queries";
import type { ReinsuranceTreaty } from "@/lib/mock-data";
import { Printer, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { CapitalWaterfall } from "./capital-waterfall";
import { ExposureTable } from "./exposure-table";
import { VarTvarTable } from "./var-tvar-table";
import { StressScenarios } from "./stress-scenarios";
import { ReportExportStub } from "./report-export-stub";

/* ------------------------------------------------------------------ */
/*  Treaty DataTable columns                                           */
/* ------------------------------------------------------------------ */

const statusStyles: Record<string, string> = {
  "in-force": "bg-success/10 text-success", expired: "bg-text-faint/10 text-text-faint",
  "pending-renewal": "bg-warning/10 text-warning", terminated: "bg-danger/10 text-danger",
};

const columns: ColumnDef<ReinsuranceTreaty, unknown>[] = [
  { accessorKey: "treatyName", header: "Treaty", cell: ({ row }) => <span className="font-semibold text-text">{row.getValue("treatyName")}</span>, enableSorting: true },
  { accessorKey: "counterpartyName", header: "Counterparty", enableSorting: true },
  { accessorKey: "type", header: "Type", cell: ({ row }) => <span className="capitalize">{(row.getValue("type") as string).replace("-", " ")}</span>, enableSorting: true },
  {
    accessorKey: "status", header: "Status",
    cell: ({ row }) => {
      const s = row.getValue("status") as string;
      return (<span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", statusStyles[s])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s.replace("-", " ")}</span>);
    },
    enableSorting: true,
  },
  { accessorKey: "limit", header: "Limit", cell: ({ row }) => <span className="tabular-nums">{row.original.currency} {((row.getValue("limit") as number) / 1e6).toFixed(0)}M</span>, enableSorting: true },
  { accessorKey: "retention", header: "Retention", cell: ({ row }) => <span className="tabular-nums">{row.original.currency} {((row.getValue("retention") as number) / 1e6).toFixed(0)}M</span>, enableSorting: true },
  { accessorKey: "premium", header: "Premium", cell: ({ row }) => <span className="tabular-nums">{row.original.currency} {((row.getValue("premium") as number) / 1e6).toFixed(1)}M</span>, enableSorting: true },
  {
    accessorKey: "claimsRatio", header: "Loss Ratio",
    cell: ({ row }) => {
      const r = row.getValue("claimsRatio") as number;
      return (<span className={cn("tabular-nums font-medium", r > 100 ? "text-danger" : r > 60 ? "text-warning" : "text-success")}>{r}%</span>);
    },
    enableSorting: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReinsurancePage() {
  const [printMode, setPrintMode] = useState(false);
  const riQ = useReinsurance();
  const dashQ = useDashboardData("phase1");

  const treaties = riQ.data ?? [];
  const capital = dashQ.data?.capital;

  const inForce = treaties.filter((t) => t.status === "in-force");
  const totalLimit = inForce.reduce((a, t) => a + t.limit, 0);
  const totalPremium = inForce.reduce((a, t) => a + t.premium, 0);
  const weightedLossRatio = totalPremium > 0 ? inForce.reduce((a, t) => a + t.claimsRatio * t.premium, 0) / totalPremium : 0;

  const isLoading = riQ.isLoading || dashQ.isLoading;
  const isError = riQ.isError || dashQ.isError;

  return (
    <div className={cn(printMode && "print-preview")}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader title="Reinsurance Capital Report" description="Treaty portfolio and capital adequacy — deterministic reconciliation." />
        <div className="flex items-center gap-2 print:hidden">
          {capital && treaties.length > 0 && <ReportExportStub capital={capital} treaties={treaties} />}
          <button type="button" onClick={() => setPrintMode(!printMode)} className={cn("flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs font-medium transition-colors border", printMode ? "bg-gold/10 text-gold border-gold/30" : "bg-surface-2 text-text-muted border-border hover:text-text")}>
            {printMode ? <><EyeOff className="h-3.5 w-3.5" /> Exit Print</> : <><Printer className="h-3.5 w-3.5" /> Print Preview</>}
          </button>
        </div>
      </div>

      {isLoading && <LoadingState message="Loading capital data…" />}
      {isError && <ErrorState message="Failed to load capital data." onRetry={() => { riQ.refetch(); dashQ.refetch(); }} />}

      {capital && (
        <div className="space-y-6">
          {/* Metric strip */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <MetricCard label="In-Force Treaties" value={String(inForce.length)} change={0} trend="flat" period="active" />
            <MetricCard label="Aggregate Limit" value={`$${(totalLimit / 1e9).toFixed(2)}B`} change={0} trend="flat" period="in-force" />
            <MetricCard label="Total Premium" value={`$${(totalPremium / 1e6).toFixed(1)}M`} change={0} trend="flat" period="annualized" />
            <MetricCard label="Capital Buffer" value={`$${(capital.bufferVsTvar99 / 1e6).toFixed(1)}M`} change={0} trend={capital.bufferVsTvar99 > 0 ? "up" : "down"} period="vs TVaR99" />
            <MetricCard label="Wtd Loss Ratio" value={`${weightedLossRatio.toFixed(0)}%`} change={0} trend={weightedLossRatio > 60 ? "down" : "flat"} period="premium-weighted" />
          </div>

          {/* Capital Waterfall */}
          <CapitalWaterfall capital={capital} />

          {/* 2-column: VaR/TVaR | Stress Scenarios */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <VarTvarTable capital={capital} />
            <StressScenarios capital={capital} />
          </div>

          {/* Exposure Table */}
          <ExposureTable treaties={treaties} capital={capital} />

          {/* Treaty DataTable */}
          <div className="card-base overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text">Treaty Portfolio</h3>
            </div>
            <DataTable columns={columns} data={treaties} />
          </div>
        </div>
      )}
    </div>
  );
}
