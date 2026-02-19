"use client";

/* ================================================================
   SELLER HOME — Listing & Settlement Console

   Dedicated sell-side surface showing:
   - Listings view (with thumbnail & publish status)
   - Incoming reservations
   - Settlement participation overview
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
} from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/providers/auth-provider";
import { useDemo } from "@/providers/demo-provider";
import {
  useMyListings,
  useSettlements,
} from "@/hooks/use-mock-queries";
import { SupportBanner } from "@/components/demo/SupportBanner";

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
    style: "bg-error/10 text-error border-error/20",
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
  const { isDemo } = useDemo();
  const userId = user?.id ?? "demo-seller";

  const listingsQ = useMyListings(userId);
  const settlementsQ = useSettlements();

  const listings = listingsQ.data ?? [];
  const allSettlements = settlementsQ.data ?? [];

  // Filter settlements where this seller is involved
  const mySettlements = allSettlements.filter(
    (s) => s.sellerUserId === userId,
  );

  // DETERMINISTIC: In demo mode, anchor to specific settlement IDs
  // stl-002 = active in-flight, stl-001 = settled (both visible)
  const activeSettlement = isDemo
    ? mySettlements.find((s) => s.id === "stl-002") ??
      mySettlements.find(
        (s) =>
          s.status !== "SETTLED" &&
          s.status !== "FAILED" &&
          s.status !== "CANCELLED",
      )
    : mySettlements.find(
        (s) =>
          s.status !== "SETTLED" &&
          s.status !== "FAILED" &&
          s.status !== "CANCELLED",
      );

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-border bg-surface-2">
            <Store className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text">
              Listing & Settlement Console
            </h1>
            <p className="text-xs text-text-faint">
              Sell-side clearing operations
            </p>
          </div>
        </div>
        {isDemo && <SupportBanner compact />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ Listings View ═══ */}
        <div
          className="card-base border border-border p-5 space-y-4"
          data-tour="seller-listings"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">My Listings</h2>
            <Link
              href="/sell?demo=true"
              className="text-xs font-medium text-text-muted hover:text-text transition-colors"
            >
              + Create Listing
            </Link>
          </div>

          {listings.length === 0 ? (
            <p className="text-xs text-text-faint">
              No listings yet. Create your first listing to begin selling.
            </p>
          ) : (
            <div className="space-y-3">
              {listings.map((listing, idx) => {
                const statusCfg =
                  LISTING_STATUS[listing.status] ?? LISTING_STATUS.draft;
                return (
                  <div
                    key={listing.id}
                    className="flex items-center gap-3 rounded-sm border border-border bg-surface-2 p-3"
                  >
                    {/* Thumbnail */}
                    <div className="h-12 w-12 rounded-sm overflow-hidden bg-surface-3 shrink-0">
                      <Image
                        src={getListingImage(idx)}
                        alt={listing.title}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">
                        {listing.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-text-faint">
                          {listing.id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusCfg.style}`}
                        >
                          {statusCfg.label}
                        </span>
                        {listing.status === "available" && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-success">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <Link
                      href={`/sell/${listing.id}?demo=true`}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors shrink-0"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {/* Publish CTA — for listings still in draft */}
          {listings.some((l) => l.status === "draft") && (
            <button
              data-tour="listing-publish-btn"
              className="flex items-center justify-center gap-2 w-full rounded-sm border border-border bg-surface-2 px-3 py-2.5 text-xs font-semibold text-text hover:bg-surface-3 transition-colors"
              onClick={() => {
                // Navigate to first draft listing for publish action
                const draft = listings.find((l) => l.status === "draft");
                if (draft) {
                  window.location.href = `/sell/${draft.id}?demo=true`;
                }
              }}
            >
              <Package className="h-3.5 w-3.5" />
              Publish Listing
            </button>
          )}
        </div>

        {/* ═══ Incoming Reservations ═══ */}
        <div
          className="card-base border border-border p-5 space-y-4"
          data-tour="seller-incoming-reservation"
        >
          <h2 className="text-sm font-semibold text-text">
            Incoming Reservations
          </h2>

          {activeSettlement ? (
            <div className="space-y-3">
              <div className="rounded-sm border border-border bg-surface-2 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-text-faint">
                    From Verified Buyer
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-success font-medium">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    KYC Verified
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-text-faint">Order</p>
                    <p className="text-xs font-mono text-text">
                      {activeSettlement.orderId}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-faint">Weight</p>
                    <p className="text-xs font-mono tabular-nums text-text">
                      {activeSettlement.weightOz} oz
                    </p>
                  </div>
                </div>
              </div>
              <Link
                href={`/settlements/${activeSettlement.id}?demo=true`}
                className="flex items-center justify-center gap-2 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted hover:text-text hover:bg-surface-3 transition-colors"
                data-tour="seller-open-settlement-cta"
              >
                Open Settlement
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <p className="text-xs text-text-faint">
              No incoming reservations at this time.
            </p>
          )}
        </div>

        {/* ═══ Settlement Participation ═══ */}
        <div
          className="card-base border border-border p-5 space-y-4 lg:col-span-2"
          data-tour="seller-settlements"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">
              Settlement Participation
            </h2>
            <Link
              href="/settlements?demo=true"
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              View All →
            </Link>
          </div>

          {mySettlements.length === 0 ? (
            <p className="text-xs text-text-faint">
              No settlements to display.
            </p>
          ) : (
            <div className="space-y-2">
              {mySettlements.map((settlement) => {
                const statusStyle =
                  SETTLEMENT_STATUS[settlement.status] ??
                  SETTLEMENT_STATUS.DRAFT;
                return (
                  <Link
                    key={settlement.id}
                    href={`/settlements/${settlement.id}?demo=true`}
                    className="flex items-center justify-between rounded-sm border border-border bg-surface-2 p-3 hover:bg-surface-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-mono text-text">
                          {settlement.id}
                        </p>
                        <p className="text-[10px] text-text-faint mt-0.5">
                          {settlement.weightOz} oz · $
                          {settlement.notionalUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {settlement.status.replace(/_/g, " ")}
                      </span>
                      {settlement.status === "SETTLED" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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
