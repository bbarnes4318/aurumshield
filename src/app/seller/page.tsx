"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Package,
  ChevronRight,
  CheckCircle2,
  Clock,
  Ban,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState } from "@/components/ui/state-views";
import { ListingReadinessRail } from "@/components/seller/ListingReadinessRail";
import { useAuth } from "@/providers/auth-provider";
import {
  useMyListings,
  useSettlements,
} from "@/hooks/use-mock-queries";
import type { Listing, SettlementCase } from "@/lib/mock-data";

/* ================================================================
   SELLER MISSION CONTROL
   Two-column layout: Published listings + settlements in main column,
   Listing Readiness Rail for drafts in the right column.
   ================================================================ */

/* ---------- Status Configuration ---------- */

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  available: {
    label: "Published",
    color: "border-success/20 bg-success/10 text-success",
    icon: CheckCircle2,
  },
  reserved: {
    label: "Reserved",
    color: "border-gold/20 bg-gold/10 text-gold",
    icon: Clock,
  },
  allocated: {
    label: "Allocated",
    color: "border-info/20 bg-info/10 text-info",
    icon: Package,
  },
  sold: {
    label: "Sold",
    color: "border-text-faint/20 bg-text-faint/10 text-text-faint",
    icon: CheckCircle2,
  },
  suspended: {
    label: "Suspended",
    color: "border-danger/20 bg-danger/10 text-danger",
    icon: Ban,
  },
  draft: {
    label: "Draft",
    color: "border-warning/20 bg-warning/10 text-warning",
    icon: Clock,
  },
};

/* ---------- Summary Cards ---------- */

function SummaryCards({
  published,
  drafts,
  activeSettlements,
  totalValue,
}: {
  published: number;
  drafts: number;
  activeSettlements: number;
  totalValue: number;
}) {
  const cards = [
    {
      label: "Published Listings",
      value: published.toString(),
      accent: "text-success",
    },
    {
      label: "Drafts Pending",
      value: drafts.toString(),
      accent: "text-warning",
    },
    {
      label: "Active Settlements",
      value: activeSettlements.toString(),
      accent: "text-gold",
    },
    {
      label: "Total Listed Value",
      value: `$${totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      accent: "text-text",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="card-base border border-border p-4"
        >
          <p className="text-[11px] font-medium uppercase tracking-widest text-text-faint">
            {card.label}
          </p>
          <p className={cn("text-xl font-semibold tabular-nums mt-1", card.accent)}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Published Listing Card ---------- */

function PublishedListingCard({ listing }: { listing: Listing }) {
  const config = STATUS_CONFIG[listing.status] ?? STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Link
      href={`/sell/listings/${listing.id}`}
      className="block card-base border border-border p-4 hover:border-gold/20 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">
              {listing.title}
            </p>
            <p className="text-[11px] text-text-faint mt-0.5">
              {listing.totalWeightOz} oz · .{listing.purity} · $
              {listing.pricePerOz.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
              /oz
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              config.color,
            )}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
          <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-gold transition-colors" />
        </div>
      </div>
    </Link>
  );
}

/* ---------- Settlement Activity Card ---------- */

function SettlementCard({ settlement }: { settlement: SettlementCase }) {
  const isSettled = settlement.status === "SETTLED";
  return (
    <Link
      href={`/settlements/${settlement.id}`}
      className="block card-base border border-border p-3 hover:border-gold/20 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">
            {settlement.id}
          </p>
          <p className="text-[11px] text-text-faint mt-0.5">
            {settlement.weightOz} oz · $
            {settlement.notionalUsd.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              isSettled
                ? "border-success/20 bg-success/10 text-success"
                : "border-gold/20 bg-gold/10 text-gold",
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {settlement.status.replace(/_/g, " ")}
          </span>
          <ChevronRight className="h-4 w-4 text-text-faint group-hover:text-gold transition-colors" />
        </div>
      </div>
    </Link>
  );
}

/* ---------- Empty State ---------- */

function EmptyListings() {
  return (
    <div className="card-base border border-border p-8 text-center space-y-4">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
          <Package className="h-7 w-7 text-gold" />
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-text">
          No listings yet
        </h3>
        <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
          Create your first gold listing. Three steps to publication: specify
          your asset, upload evidence, and publish.
        </p>
      </div>
      <Link
        href="/sell"
        className={cn(
          "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
          "bg-gold px-5 py-2.5 text-sm font-medium text-bg",
          "transition-colors hover:bg-gold-hover",
        )}
      >
        <Plus className="h-4 w-4" />
        Create Listing
      </Link>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function SellerPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const listingsQ = useMyListings(userId);
  const settlementsQ = useSettlements();

  const isLoading = listingsQ.isLoading || settlementsQ.isLoading;

  // Partition listings into draft and published
  const { draftListings, publishedListings, totalValue } = useMemo(() => {
    if (!listingsQ.data)
      return { draftListings: [], publishedListings: [], totalValue: 0 };

    const drafts: Listing[] = [];
    const published: Listing[] = [];
    let value = 0;

    for (const l of listingsQ.data) {
      if (l.status === "draft") {
        drafts.push(l);
      } else {
        published.push(l);
        value += l.pricePerOz * l.totalWeightOz;
      }
    }

    return {
      draftListings: drafts,
      publishedListings: published,
      totalValue: value,
    };
  }, [listingsQ.data]);

  // Filter settlements for this seller
  const sellerSettlements = useMemo(() => {
    if (!settlementsQ.data) return [];
    return settlementsQ.data.filter(
      (s: SettlementCase) => s.sellerUserId === userId,
    );
  }, [settlementsQ.data, userId]);

  const activeSettlements = useMemo(
    () => sellerSettlements.filter((s) => s.status !== "SETTLED"),
    [sellerSettlements],
  );

  if (isLoading) return <LoadingState message="Loading seller console…" />;
  if (listingsQ.isError)
    return (
      <ErrorState
        message="Failed to load listings."
        onRetry={() => listingsQ.refetch()}
      />
    );

  return (
    <>
      <PageHeader
        title="Seller Mission Control"
        description="Manage listings, track readiness, and monitor settlements"
        actions={
          <Link
            href="/sell"
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius-input)]",
              "bg-gold px-4 py-2 text-sm font-medium text-bg",
              "transition-colors hover:bg-gold-hover",
            )}
          >
            <Plus className="h-4 w-4" />
            New Listing
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="mt-4">
        <SummaryCards
          published={publishedListings.length}
          drafts={draftListings.length}
          activeSettlements={activeSettlements.length}
          totalValue={totalValue}
        />
      </div>

      {/* Two-Column Layout: Main + Readiness Rail */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main Column */}
        <div className="space-y-6">
          {/* Published Listings */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint mb-3 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Published Listings
            </h2>
            {publishedListings.length > 0 ? (
              <div className="space-y-2">
                {publishedListings.map((listing) => (
                  <PublishedListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <EmptyListings />
            )}
          </section>

          {/* Settlement Activity */}
          {sellerSettlements.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-faint mb-3">
                Settlement Activity
              </h2>
              <div className="space-y-2">
                {sellerSettlements.map((settlement) => (
                  <SettlementCard key={settlement.id} settlement={settlement} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Listing Readiness Rail */}
        <aside>
          <ListingReadinessRail
            draftListings={draftListings}
            userId={userId}
          />
        </aside>
      </div>
    </>
  );
}
