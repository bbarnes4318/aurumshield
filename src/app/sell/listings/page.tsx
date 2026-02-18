"use client";

/* ================================================================
   SELLER LISTING CONSOLE — /sell/listings
   ================================================================
   Table view of all listings owned by the current seller, with
   status badges, filterable by status, and links to detail pages.
   ================================================================ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState, EmptyState, ErrorState } from "@/components/ui/state-views";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { useMyListings } from "@/hooks/use-mock-queries";
import type { Listing, ListingStatus } from "@/lib/mock-data";
import { Plus, AlertTriangle, ExternalLink } from "lucide-react";

/* ---------- Status badge config ---------- */
const STATUS_CONFIG: Record<ListingStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-surface-3 text-text-faint border-border" },
  available: { label: "Available", color: "bg-success/10 text-success border-success/20" },
  reserved: { label: "Reserved", color: "bg-warning/10 text-warning border-warning/20" },
  allocated: { label: "Allocated", color: "bg-gold/10 text-gold border-gold/20" },
  sold: { label: "Sold", color: "bg-info/10 text-info border-info/20" },
  suspended: { label: "Suspended", color: "bg-danger/10 text-danger border-danger/20" },
};

/* ---------- Filter tabs ---------- */
const STATUS_TABS: { label: string; value: ListingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Available", value: "available" },
  { label: "Reserved", value: "reserved" },
  { label: "Allocated", value: "allocated" },
  { label: "Sold", value: "sold" },
  { label: "Suspended", value: "suspended" },
];

/* ---------- Column definitions (static, outside component) ---------- */
const columns: ColumnDef<Listing, unknown>[] = [
  {
    accessorKey: "id",
    header: "Listing ID",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ getValue }) => (
      <span className="text-sm font-medium text-text truncate max-w-[200px] inline-block">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "form",
    header: "Form",
    cell: ({ getValue }) => (
      <span className="text-sm capitalize">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "purity",
    header: "Purity",
    cell: ({ getValue }) => (
      <span className="tabular-nums text-sm">.{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "totalWeightOz",
    header: "Weight (oz)",
    cell: ({ getValue }) => (
      <span className="tabular-nums text-sm">{getValue<number>().toLocaleString()}</span>
    ),
  },
  {
    accessorKey: "pricePerOz",
    header: "Price / oz",
    cell: ({ getValue }) => {
      const v = getValue<number>();
      if (v === 0) return <span className="text-text-faint text-sm">—</span>;
      return <span className="tabular-nums text-sm">${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const s = getValue<ListingStatus>();
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
      <span className="text-xs tabular-nums text-text-muted">
        {new Date(getValue<string>()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </span>
    ),
  },
  {
    id: "action",
    header: "",
    cell: ({ row }) => (
      <Link
        href={`/sell/listings/${row.original.id}`}
        className="flex items-center gap-1 text-xs text-gold hover:text-gold-hover transition-colors"
      >
        View <ExternalLink className="h-3 w-3" />
      </Link>
    ),
  },
];

/* ================================================================ */
function SellerListingConsoleContent() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const userRole = user?.role ?? "buyer";
  const listingsQ = useMyListings(userId);
  const [activeTab, setActiveTab] = useState<ListingStatus | "all">("all");

  /* Filter by status tab */
  const rows = useMemo(() => {
    if (!listingsQ.data) return [];
    if (activeTab === "all") return listingsQ.data;
    return listingsQ.data.filter((l) => l.status === activeTab);
  }, [listingsQ.data, activeTab]);

  /* Role gate — placed AFTER all hooks */
  if (userRole !== "seller" && userRole !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-warning mb-3" />
        <h2 className="text-sm font-semibold text-text">Access Restricted</h2>
        <p className="mt-1 text-sm text-text-muted max-w-sm">
          Only seller or admin accounts may view the listing console.
        </p>
      </div>
    );
  }

  if (listingsQ.isLoading) return <LoadingState message="Loading your listings…" />;
  if (listingsQ.isError) return <ErrorState message="Failed to load listings." onRetry={() => listingsQ.refetch()} />;

  return (
    <>
      <PageHeader
        title="My Listings"
        description="Manage your gold listings — drafts, published, and sold"
        actions={
          <Link
            href="/sell"
            className="inline-flex items-center gap-1.5 rounded-input bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover"
          >
            <Plus className="h-3.5 w-3.5" /> New Listing
          </Link>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-1 mt-6 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = listingsQ.data
            ? tab.value === "all"
              ? listingsQ.data.length
              : listingsQ.data.filter((l) => l.status === tab.value).length
            : 0;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-gold/10 text-gold border border-gold/30"
                  : "text-text-muted hover:bg-surface-2"
              )}
            >
              {tab.label}
              {count > 0 && <span className="ml-1 tabular-nums text-[10px] opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No listings"
          message={activeTab === "all" ? "Create your first gold listing to get started." : `No listings with status "${activeTab}".`}
          action={activeTab === "all" ? (
            <Link
              href="/sell"
              className="inline-flex items-center gap-1.5 rounded-input bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-hover"
            >
              <Plus className="h-3.5 w-3.5" /> Create Listing
            </Link>
          ) : undefined}
        />
      ) : (
        <DataTable columns={columns} data={rows} dense emptyMessage="No listings found." />
      )}
    </>
  );
}

export default function SellerListingsPage() {
  return (
    <RequireAuth>
      <SellerListingConsoleContent />
    </RequireAuth>
  );
}
