"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/state-views";
import { RequireAuth } from "@/components/auth/require-auth";
import { useSettlements } from "@/hooks/use-mock-queries";
import type { SettlementCase, SettlementStatus, SettlementRail } from "@/lib/mock-data";

/* ---------- Status Chip ---------- */
const STATUS_CONFIG: Record<SettlementStatus, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-surface-3 text-text-faint border-border" },
  ESCROW_OPEN: { label: "Escrow Open", color: "bg-info/10 text-info border-info/20" },
  AWAITING_FUNDS: { label: "Awaiting Funds", color: "bg-warning/10 text-warning border-warning/20" },
  AWAITING_GOLD: { label: "Awaiting Gold", color: "bg-gold/10 text-gold border-gold/20" },
  AWAITING_VERIFICATION: { label: "Awaiting Verification", color: "bg-warning/10 text-warning border-warning/20" },
  READY_TO_SETTLE: { label: "Ready to Settle", color: "bg-success/10 text-success border-success/20" },
  AUTHORIZED: { label: "Authorized", color: "bg-info/10 text-info border-info/20" },
  SETTLED: { label: "Settled", color: "bg-success/10 text-success border-success/20" },
  FAILED: { label: "Failed", color: "bg-danger/10 text-danger border-danger/20" },
  CANCELLED: { label: "Cancelled", color: "bg-surface-3 text-text-faint border-border" },
  AMBIGUOUS_STATE: { label: "Ambiguous State", color: "bg-danger/10 text-danger border-danger/20 animate-pulse" },
};

const RAIL_LABEL: Record<SettlementRail, string> = {
  WIRE: "WIRE",
  RTGS: "RTGS",
};

export default function SettlementsPage() {
  return (
    <RequireAuth>
      <SettlementsContent />
    </RequireAuth>
  );
}

function SettlementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: settlements, isLoading } = useSettlements();

  const statusFilter = searchParams.get("status") as SettlementStatus | null;
  const railFilter = searchParams.get("rail") as SettlementRail | null;
  const searchQ = searchParams.get("q") ?? "";

  const filtered = useMemo(() => {
    if (!settlements) return [];
    let list = [...settlements];
    if (statusFilter) list = list.filter((s) => s.status === statusFilter);
    if (railFilter) list = list.filter((s) => s.rail === railFilter);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.orderId.toLowerCase().includes(q) ||
          s.listingId.toLowerCase().includes(q),
      );
    }
    // Sort newest first
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  }, [settlements, statusFilter, railFilter, searchQ]);

  const uniqueStatuses = useMemo(() => {
    if (!settlements) return [];
    return [...new Set(settlements.map((s) => s.status))];
  }, [settlements]);

  const uniqueRails = useMemo(() => {
    if (!settlements) return [];
    return [...new Set(settlements.map((s) => s.rail))];
  }, [settlements]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`/settlements?${params.toString()}`);
  }

  if (isLoading) return <LoadingState message="Loading settlements…" />;

  return (
    <>
      <PageHeader
        title="Settlement Console"
        description="Escrow lifecycle management and DvP clearing operations"
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mt-4 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
          <input
            id="settlements-search"
            type="text"
            placeholder="Search ID, order, listing…"
            value={searchQ}
            onChange={(e) => setParam("q", e.target.value || null)}
            className="h-8 w-56 rounded-md border border-border bg-surface-2 pl-8 pr-3 text-xs text-text placeholder-text-faint focus:border-gold/50 focus:ring-1 focus:ring-gold/30 outline-none transition-colors"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-text-faint" />
          <select
            id="settlements-status-filter"
            value={statusFilter ?? ""}
            onChange={(e) => setParam("status", e.target.value || null)}
            className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs text-text outline-none focus:border-gold/50 transition-colors"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
            ))}
          </select>
        </div>

        {/* Rail filter */}
        <select
          id="settlements-rail-filter"
          value={railFilter ?? ""}
          onChange={(e) => setParam("rail", e.target.value || null)}
          className="h-8 rounded-md border border-border bg-surface-2 px-2 text-xs text-text outline-none focus:border-gold/50 transition-colors"
        >
          <option value="">All Rails</option>
          {uniqueRails.map((r) => (
            <option key={r} value={r}>{RAIL_LABEL[r]}</option>
          ))}
        </select>

        <span className="ml-auto text-xs text-text-faint tabular-nums">{filtered.length} settlement{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── DataTable ── */}
      <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" id="settlements-table">
            <thead>
              <tr className="border-b border-border bg-surface-2/60">
                <Th>Settlement ID</Th>
                <Th>Order</Th>
                <Th>Rail</Th>
                <Th align="right">Notional</Th>
                <Th align="right">Weight</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-faint text-sm">No settlements match the current filters.</td>
                </tr>
              ) : (
                filtered.map((s) => <SettlementRow key={s.id} settlement={s} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------- Table header ---------- */
function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 font-medium text-text-muted whitespace-nowrap select-none",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 opacity-30" />
      </span>
    </th>
  );
}

/* ---------- Table row ---------- */
function SettlementRow({ settlement: s }: { settlement: SettlementCase }) {
  const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.DRAFT;
  const isDemoBuyer = s.buyerUserId === "demo-buyer";

  return (
    <tr
      className="group hover:bg-surface-2/40 transition-colors cursor-pointer"
      {...(isDemoBuyer ? { "data-tour": "settlement-row-demo" } : {})}
    >
      <td className="px-3 py-2.5 whitespace-nowrap">
        <Link
          href={`/settlements/${s.id}${isDemoBuyer ? "?demo=true" : ""}`}
          className="font-mono text-gold hover:underline"
          {...(isDemoBuyer ? { "data-tour": "settlement-row-demo" } : {})}
        >
          {s.id}
        </Link>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap font-mono text-text-muted">{s.orderId}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className={cn(
          "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold",
          s.rail === "RTGS" ? "bg-info/10 text-info" : "bg-surface-3 text-text-muted"
        )}>
          {s.rail}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-text">
        ${s.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-right tabular-nums text-text">{s.weightOz} oz</td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.color)}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {cfg.label}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-text-muted tabular-nums">
        {new Date(s.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        {" "}
        {new Date(s.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </td>
    </tr>
  );
}
