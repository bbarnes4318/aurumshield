"use client";

/* ================================================================
   SELLER HOME — Listing & Settlement Console

   Dedicated sell-side surface showing:
   - Listings view (with thumbnail & publish status)
   - Incoming reservations
   - Settlement participation overview
   - Placeholder slots for Phase 3 visual components:
     • SettlementRailsVisualization
     • SupportBanner
   ================================================================ */

import Link from "next/link";
import Image from "next/image";
import {
  Store,
  Package,
  CheckCircle2,
  ArrowRight,
  Eye,
  ShieldCheck,
  Landmark,
  Clock,
} from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import {
  useMyListings,
  useSettlements,
} from "@/hooks/use-mock-queries";
import { DEMO_IDS } from "@/lib/demo-seeder";
import { PageHeader } from "@/components/ui/page-header";

/* ---------- Status chips ---------- */
const LISTING_STATUS: Record<string, { label: string; style: string }> = {
  available: {
    label: "Published",
    style: "bg-success/10 text-success border-success/20",
  },
  draft: {
    label: "Draft",
    style: "bg-surface-3 text-text-faint border-border",
  },
  sold: {
    label: "Sold",
    style: "bg-gold/10 text-gold border-gold/20",
  },
  reserved: {
    label: "Reserved",
    style: "bg-warning/10 text-warning border-warning/20",
  },
  suspended: {
    label: "Suspended",
    style: "bg-danger/10 text-danger border-danger/20",
  },
};

const SETTLEMENT_STATUS: Record<string, string> = {
  SETTLED: "bg-success/10 text-success border-success/20",
  AUTHORIZED: "bg-info/10 text-info border-info/20",
  ESCROW_OPEN: "bg-info/10 text-info border-info/20",
  AWAITING_FUNDS: "bg-warning/10 text-warning border-warning/20",
  DRAFT: "bg-surface-3 text-text-faint border-border",
};

/** Deterministic gold image assignment for listings */
function getListingImage(index: number): string {
  return `/${(index % 5) + 1}.png`;
}

function SellerContent() {
  const { user } = useAuth();
  const userId = user?.id ?? DEMO_IDS.seller;

  /* ---------- Data queries ---------- */
  const { data: listings = [] } = useMyListings(userId);
  const { data: settlements = [] } = useSettlements();

  // Filter settlements relevant to THIS seller
  const mySettlements = settlements.filter((s) => s.sellerUserId === userId);

  // Active settlement count
  const activeSettlementCount = mySettlements.filter(
    (s) => s.status !== "SETTLED" && s.status !== "CANCELLED" && s.status !== "FAILED",
  ).length;

  const settledCount = mySettlements.filter((s) => s.status === "SETTLED").length;
  const publishedCount = listings.filter((l) => l.status === "available").length;

  return (
    <>
      <PageHeader
        title="Listing & Settlement Console"
        description="Sell-side overview — manage listings, track incoming reservations, and monitor settlement activity"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">

        {/* ── Column 1: Listings ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Listings Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-text-muted" />
                <h3 className="text-sm font-semibold text-text">My Listings</h3>
              </div>
              <Link
                href="/sell"
                className="text-xs text-gold hover:underline flex items-center gap-1"
              >
                Create new <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {listings.length === 0 ? (
              <div className="card-base border border-border p-8 text-center">
                <Package className="h-8 w-8 text-text-faint/40 mx-auto mb-2" />
                <p className="text-sm text-text-faint">No listings yet</p>
                <Link
                  href="/sell"
                  className="text-xs text-gold hover:underline mt-2 inline-flex items-center gap-1"
                >
                  Create your first listing <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map((listing, i) => {
                  const statusInfo = LISTING_STATUS[listing.status] ?? LISTING_STATUS.draft;
                  return (
                    <Link
                      key={listing.id}
                      href={`/sell/listings/${listing.id}`}
                      className="card-base border border-border p-4 flex gap-4 hover:border-gold/30 transition-colors group"
                      data-tour={i === 0 ? "seller-listing-card" : undefined}
                    >
                      {/* Thumbnail */}
                      <div className="relative h-20 w-20 shrink-0 rounded-sm overflow-hidden bg-surface-2">
                        <Image
                          src={getListingImage(i)}
                          alt={listing.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-text truncate pr-2">
                            {listing.title}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${statusInfo.style}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-faint">
                          <span>{listing.totalWeightOz} oz</span>
                          <span className="font-mono tabular-nums">
                            ${listing.pricePerOz.toLocaleString("en-US", { minimumFractionDigits: 2 })}/oz
                          </span>
                          <span>{listing.jurisdiction}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-[10px] text-text-faint">
                            <Eye className="h-3 w-3" />
                            <span>Views: —</span>
                          </div>
                          {listing.evidenceIds && listing.evidenceIds.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-success">
                              <ShieldCheck className="h-3 w-3" />
                              <span>{listing.evidenceIds.length} evidence</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Phase 3 Slot: SettlementRailsVisualization ── */}
          {/* TODO: Phase 3 will insert <SettlementRailsVisualization /> here */}
        </div>

        {/* ── Column 2: Summary & Settlements ── */}
        <div className="space-y-6">

          {/* Summary cards */}
          <div className="space-y-3">
            <Link
              href="/sell/listings"
              className="card-base border border-border p-4 flex items-center gap-3 hover:border-gold/30 transition-colors"
              data-tour="seller-published-count"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10">
                <Store className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-faint">Published Listings</p>
                <p className="text-lg font-semibold tabular-nums text-text">{publishedCount}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-text-faint" />
            </Link>

            <div className="card-base border border-border p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-info/10">
                <Clock className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-faint">Active Settlements</p>
                <p className="text-lg font-semibold tabular-nums text-text">{activeSettlementCount}</p>
              </div>
            </div>

            <div className="card-base border border-border p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-faint">Settled</p>
                <p className="text-lg font-semibold tabular-nums text-text">{settledCount}</p>
              </div>
            </div>
          </div>

          {/* Settlement Activity */}
          <div className="card-base border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-text-muted" />
              <h3 className="text-sm font-semibold text-text">Settlement Activity</h3>
            </div>
            {mySettlements.length === 0 ? (
              <p className="text-xs text-text-faint">No settlements yet</p>
            ) : (
              <div className="space-y-2">
                {mySettlements.slice(0, 5).map((s) => (
                  <Link
                    key={s.id}
                    href={`/settlements/${s.id}`}
                    className="flex items-center justify-between py-2 px-2 rounded-sm hover:bg-surface-2 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-text">
                        {s.weightOz} oz — ${s.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-text-faint font-mono">{s.id}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        SETTLEMENT_STATUS[s.status] ?? SETTLEMENT_STATUS.DRAFT
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Phase 3 Slot: SupportBanner ── */}
          {/* TODO: Phase 3 will insert <SupportBanner /> here */}
        </div>
      </div>
    </>
  );
}

export default function SellerPage() {
  return (
    <RequireAuth>
      <SellerContent />
    </RequireAuth>
  );
}
