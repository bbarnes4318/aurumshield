"use client";

import { useMemo } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { useMyOrders, useListings } from "@/hooks/use-mock-queries";
import type { Order, Listing, OrderStatus } from "@/lib/mock-data";

const MOCK_USER_ID = "user-1";

/* ---------- Status Chip Colors ---------- */
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-surface-3 text-text-faint border-border" },
  pending_verification: { label: "Pending Verification", color: "bg-warning/10 text-warning border-warning/20" },
  reserved: { label: "Reserved", color: "bg-info/10 text-info border-info/20" },
  settlement_pending: { label: "Settlement Pending", color: "bg-gold/10 text-gold border-gold/20" },
  completed: { label: "Completed", color: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Cancelled", color: "bg-danger/10 text-danger border-danger/20" },
};

/* ---------- Row Type ---------- */
interface OrderRow extends Order {
  listingRef: string;
  listingTitle: string;
}

/* ================================================================ */
export default function OrdersPage() {
  const ordersQ = useMyOrders(MOCK_USER_ID);
  const listingsQ = useListings();

  const rows: OrderRow[] = useMemo(() => {
    if (!ordersQ.data || !listingsQ.data) return [];
    return ordersQ.data.map((o) => {
      const listing = listingsQ.data.find((l: Listing) => l.id === o.listingId);
      return {
        ...o,
        listingRef: listing?.id ?? o.listingId,
        listingTitle: listing?.title ?? "Unknown Listing",
      };
    });
  }, [ordersQ.data, listingsQ.data]);

  const columns: ColumnDef<OrderRow, unknown>[] = useMemo(() => [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
    },
    {
      accessorKey: "listingRef",
      header: "Listing",
      cell: ({ row }) => (
        <div>
          <span className="font-mono text-xs text-text">{row.original.listingRef}</span>
          <p className="text-[11px] text-text-faint mt-0.5">{row.original.listingTitle}</p>
        </div>
      ),
    },
    {
      accessorKey: "weightOz",
      header: "Weight (oz)",
      cell: ({ getValue }) => <span className="tabular-nums">{getValue<number>()}</span>,
    },
    {
      accessorKey: "notional",
      header: "Notional",
      cell: ({ getValue }) => <span className="tabular-nums">${getValue<number>().toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = getValue<OrderStatus>();
        const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.draft;
        return (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.color)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {cfg.label}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => (
        <span className="text-xs text-text-muted tabular-nums">
          {new Date(getValue<string>()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      ),
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <Link
          href={`/orders/${row.original.id}`}
          className="text-xs text-gold hover:text-gold-hover transition-colors"
        >
          Detail →
        </Link>
      ),
    },
  ], []);

  if (ordersQ.isLoading || listingsQ.isLoading) return <LoadingState message="Loading orders…" />;
  if (ordersQ.isError) return <ErrorState message="Failed to load orders." onRetry={() => ordersQ.refetch()} />;

  return (
    <>
      <PageHeader
        title="Buyer Order Console"
        description="All orders with deterministic status tracking"
      />

      <div className="mt-4">
        <DataTable
          columns={columns}
          data={rows}
          dense
          emptyMessage="No orders found."
        />
      </div>
    </>
  );
}
