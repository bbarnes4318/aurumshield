"use client";

/* ================================================================
   SHIPMENT DETAIL CARD — Metadata + event timeline
   Displays tracking number, carrier, delivery address (masked),
   and reverse-chronological event log.
   ================================================================ */

import { cn } from "@/lib/utils";
import {
  Truck,
  Hash,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { Shipment, ShipmentEvent } from "@/lib/delivery/delivery-types";
import { SHIPMENT_STATUS_LABELS } from "@/lib/delivery/delivery-types";

/* ---------- Helpers ---------- */

function maskAddress(shipment: Shipment): string {
  const { city, postalCode, country } = shipment.address;
  const maskedZip = postalCode.length > 4
    ? "•".repeat(postalCode.length - 4) + postalCode.slice(-4)
    : postalCode;
  return `${city}, ${maskedZip}, ${country}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ---------- Event Timeline Item ---------- */

function TimelineItem({
  event,
  isFirst,
}: {
  event: ShipmentEvent;
  isFirst: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Left: dot + connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "h-2 w-2 rounded-full mt-1.5 shrink-0",
            isFirst ? "bg-gold" : "bg-border",
          )}
        />
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Right: content */}
      <div className="pb-4 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-xs font-semibold",
              isFirst ? "text-gold" : "text-text-muted",
            )}
          >
            {SHIPMENT_STATUS_LABELS[event.status]}
          </span>
          <span className="text-[10px] tabular-nums text-text-faint">
            {formatDateTime(event.timestamp)}
          </span>
        </div>
        <p className="text-[11px] text-text-faint mt-0.5 leading-relaxed">
          {event.description}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <MapPin className="h-2.5 w-2.5 text-text-faint" />
          <span className="text-[10px] text-text-faint">{event.location}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Component ---------- */

interface ShipmentDetailCardProps {
  shipment: Shipment;
  className?: string;
}

export function ShipmentDetailCard({
  shipment,
  className,
}: ShipmentDetailCardProps) {
  // Reverse chronological events
  const sortedEvents = [...shipment.events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-border bg-surface-1",
        className,
      )}
    >
      {/* Metadata Section */}
      <div className="px-5 py-4 space-y-3 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-gold" />
          <span className="text-sm font-semibold text-text">
            Shipment Details
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          {/* Tracking Number */}
          <div className="flex items-start gap-2">
            <Hash className="h-3.5 w-3.5 text-text-faint mt-0.5 shrink-0" />
            <div>
              <p className="typo-label">Tracking Number</p>
              <p className="typo-mono text-text mt-0.5">
                {shipment.trackingNumber}
              </p>
            </div>
          </div>

          {/* Carrier */}
          <div className="flex items-start gap-2">
            <Truck className="h-3.5 w-3.5 text-text-faint mt-0.5 shrink-0" />
            <div>
              <p className="typo-label">Carrier</p>
              <p className="text-xs text-text mt-0.5">{shipment.carrier}</p>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="flex items-start gap-2">
            <Calendar className="h-3.5 w-3.5 text-text-faint mt-0.5 shrink-0" />
            <div>
              <p className="typo-label">
                {shipment.deliveredAt ? "Delivered" : "Est. Delivery"}
              </p>
              <p className="text-xs text-text mt-0.5 tabular-nums">
                {formatDate(
                  shipment.deliveredAt ?? shipment.estimatedDelivery,
                )}
              </p>
            </div>
          </div>

          {/* Delivery Address (masked) */}
          <div className="flex items-start gap-2">
            <MapPin className="h-3.5 w-3.5 text-text-faint mt-0.5 shrink-0" />
            <div>
              <p className="typo-label">Destination</p>
              <p className="text-xs text-text mt-0.5">
                {maskAddress(shipment)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-3.5 w-3.5 text-text-faint" />
          <span className="typo-label">Event Timeline</span>
        </div>

        <div className="space-y-0">
          {sortedEvents.map((event, i) => (
            <TimelineItem key={event.id} event={event} isFirst={i === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
