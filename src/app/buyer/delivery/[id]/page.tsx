"use client";

/* ================================================================
   DELIVERY TRACKING PAGE — Full shipment tracking experience
   Shows ShipmentTracker (horizontal progress) + ShipmentDetailCard
   (metadata + event timeline) for a specific shipment.
   ================================================================ */

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  Loader2,
  AlertTriangle,
  FastForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { ShipmentTracker } from "@/components/buyer/ShipmentTracker";
import { ShipmentDetailCard } from "@/components/buyer/ShipmentDetailCard";
import { useAdvanceShipment } from "@/hooks/use-delivery-queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGetShipmentForSettlement } from "@/lib/api";
import { SHIPMENT_STATUS_LABELS } from "@/lib/delivery/delivery-types";

/* ================================================================
   Page Component
   ================================================================ */

export default function DeliveryTrackingPage() {
  const params = useParams<{ id: string }>();
  const settlementId = params.id;
  const qc = useQueryClient();

  /* --- Shipment Query --- */
  const shipmentQuery = useQuery({
    queryKey: ["delivery", "shipment", settlementId],
    queryFn: () => apiGetShipmentForSettlement(settlementId),
    enabled: !!settlementId,
    refetchInterval: 15_000, // poll every 15s
  });

  const shipment = shipmentQuery.data;
  const advanceMutation = useAdvanceShipment();

  const handleAdvance = () => {
    if (!shipment) return;
    advanceMutation.mutate(shipment.id, {
      onSuccess: () => {
        qc.invalidateQueries({
          queryKey: ["delivery", "shipment", settlementId],
        });
      },
    });
  };

  const isDelivered = shipment?.status === "delivered";

  /* --- Status Badge --- */
  const statusBadge = useMemo(() => {
    if (!shipment) return null;
    const label = SHIPMENT_STATUS_LABELS[shipment.status];
    const colors = {
      pending: "bg-info/10 text-info border-info/20",
      packaging: "bg-warning/10 text-warning border-warning/20",
      dispatched: "bg-gold/10 text-gold border-gold/20",
      in_transit: "bg-gold/10 text-gold border-gold/20",
      out_for_delivery: "bg-gold/10 text-gold border-gold/20",
      delivered: "bg-success/10 text-success border-success/20",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium",
          colors[shipment.status],
        )}
      >
        <Truck className="h-3 w-3" />
        {label}
      </span>
    );
  }, [shipment]);

  /* --- Loading State --- */
  if (shipmentQuery.isLoading) {
    return (
      <div className="page-container py-8">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <span className="ml-3 text-sm text-text-faint">
            Loading shipment…
          </span>
        </div>
      </div>
    );
  }

  /* --- Error / Not Found State --- */
  if (!shipment) {
    return (
      <div className="page-container py-8 section-gap">
        <PageHeader
          title="Delivery Tracking"
          description="Shipment not found"
        />
        <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            No shipment found for settlement{" "}
            <span className="typo-mono">{settlementId}</span>.
          </p>
          <p className="text-xs text-text-faint mt-1">
            This settlement may not have a physical delivery associated with
            it, or the delivery has not yet been initiated.
          </p>
          <Link
            href="/buyer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-input)] border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container py-8 section-gap">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <Link
            href="/buyer"
            className="inline-flex items-center gap-1 text-xs text-text-faint hover:text-text-muted transition-colors mb-3"
          >
            <ArrowLeft className="h-3 w-3" />
            Buyer Dashboard
          </Link>
          <PageHeader
            title="Delivery Tracking"
            description={`Tracking ${shipment.trackingNumber} via ${shipment.carrier}`}
          />
        </div>
        <div className="flex items-center gap-3 mt-1">
          {statusBadge}

          {/* Demo: Advance Status Button */}
          {!isDelivered && (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={advanceMutation.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-[var(--radius-input)] border border-gold/30 bg-gold/5 px-3 py-1.5 text-xs font-medium text-gold",
                "hover:bg-gold/10 hover:border-gold/50 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              {advanceMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <FastForward className="h-3 w-3" />
              )}
              Advance Status
            </button>
          )}
        </div>
      </div>

      {/* Shipment Tracker — horizontal progress */}
      <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6">
        <ShipmentTracker shipment={shipment} />
      </div>

      {/* Shipment Details + Timeline */}
      <ShipmentDetailCard shipment={shipment} />
    </div>
  );
}
