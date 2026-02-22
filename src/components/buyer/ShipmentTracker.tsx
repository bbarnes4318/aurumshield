"use client";

/* ================================================================
   SHIPMENT TRACKER — Horizontal visual progress stepper
   Shows 6 stages of the Brink's delivery pipeline with
   animated indicators, timestamps, and connecting lines.
   ================================================================ */

import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  CircleDot,
  Shield,
} from "lucide-react";
import type { ShipmentStatus, Shipment } from "@/lib/delivery/delivery-types";
import { SHIPMENT_STATUS_ORDER, SHIPMENT_STATUS_LABELS } from "@/lib/delivery/delivery-types";

/* ---------- Step Configuration ---------- */

const STEP_ICONS: Record<ShipmentStatus, typeof CheckCircle2> = {
  pending: CheckCircle2,
  packaging: Package,
  dispatched: Shield,
  in_transit: Truck,
  out_for_delivery: MapPin,
  delivered: CheckCircle2,
};

const STEP_SUBLABELS: Record<ShipmentStatus, string> = {
  pending: "DvP finalized",
  packaging: "Tamper-evident seal",
  dispatched: "Armed escort assigned",
  in_transit: "GPS tracked",
  out_for_delivery: "Signature required",
  delivered: "Chain of custody complete",
};

/* ---------- Helpers ---------- */

function getStepState(
  stepStatus: ShipmentStatus,
  currentStatus: ShipmentStatus,
): "completed" | "active" | "pending" {
  const stepIdx = SHIPMENT_STATUS_ORDER.indexOf(stepStatus);
  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(currentStatus);
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

function getTimestampForStep(
  stepStatus: ShipmentStatus,
  shipment: Shipment,
): string | null {
  const event = shipment.events.find((e) => e.status === stepStatus);
  if (!event) return null;
  return new Date(event.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------- Component ---------- */

interface ShipmentTrackerProps {
  shipment: Shipment;
  className?: string;
}

export function ShipmentTracker({ shipment, className }: ShipmentTrackerProps) {
  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(shipment.status);

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between relative">
          {/* Background Connector Line */}
          <div className="absolute top-5 left-[calc(8.33%)] right-[calc(8.33%)] h-0.5 bg-border" />
          {/* Progress Fill Line */}
          <div
            className="absolute top-5 left-[calc(8.33%)] h-0.5 bg-gold transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(0, (currentIdx / (SHIPMENT_STATUS_ORDER.length - 1)) * (100 - 16.66))}%`,
            }}
          />

          {SHIPMENT_STATUS_ORDER.map((status) => {
            const state = getStepState(status, shipment.status);
            const Icon = STEP_ICONS[status];
            const timestamp = getTimestampForStep(status, shipment);

            return (
              <div
                key={status}
                className="relative flex flex-col items-center text-center"
                style={{ width: `${100 / SHIPMENT_STATUS_ORDER.length}%` }}
              >
                {/* Icon Circle */}
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                    state === "completed" &&
                      "border-success bg-success/10 text-success",
                    state === "active" &&
                      "border-gold bg-gold/10 text-gold shadow-lg shadow-gold/20",
                    state === "pending" &&
                      "border-border bg-surface-2 text-text-faint",
                  )}
                >
                  {state === "completed" ? (
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  ) : (
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        state === "active" && "animate-pulse",
                      )}
                    />
                  )}

                  {/* Active pulse ring */}
                  {state === "active" && (
                    <div className="absolute inset-0 rounded-full border-2 border-gold/30 animate-ping" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "mt-2 text-[11px] font-semibold leading-tight",
                    state === "completed" && "text-success",
                    state === "active" && "text-gold",
                    state === "pending" && "text-text-faint",
                  )}
                >
                  {SHIPMENT_STATUS_LABELS[status]}
                </span>

                {/* Sublabel */}
                <span className="mt-0.5 text-[10px] text-text-faint leading-tight">
                  {STEP_SUBLABELS[status]}
                </span>

                {/* Timestamp */}
                {timestamp && (
                  <span className="mt-1 text-[10px] tabular-nums text-text-muted">
                    {timestamp}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical Layout */}
      <div className="md:hidden space-y-0">
        {SHIPMENT_STATUS_ORDER.map((status, i) => {
          const state = getStepState(status, shipment.status);
          const Icon = STEP_ICONS[status];
          const timestamp = getTimestampForStep(status, shipment);
          const isLast = i === SHIPMENT_STATUS_ORDER.length - 1;

          return (
            <div key={status} className="flex gap-3">
              {/* Left column: icon + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 shrink-0 transition-all",
                    state === "completed" &&
                      "border-success bg-success/10 text-success",
                    state === "active" &&
                      "border-gold bg-gold/10 text-gold",
                    state === "pending" &&
                      "border-border bg-surface-2 text-text-faint",
                  )}
                >
                  {state === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : state === "active" ? (
                    <CircleDot className="h-3.5 w-3.5 animate-pulse" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[24px]",
                      state === "completed" || state === "active"
                        ? "bg-gold/40"
                        : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* Right column: text */}
              <div className="pb-4 pt-0.5">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    state === "completed" && "text-success",
                    state === "active" && "text-gold",
                    state === "pending" && "text-text-faint",
                  )}
                >
                  {SHIPMENT_STATUS_LABELS[status]}
                </span>
                <p className="text-[10px] text-text-faint mt-0.5">
                  {STEP_SUBLABELS[status]}
                </p>
                {timestamp && (
                  <p className="text-[10px] tabular-nums text-text-muted mt-0.5">
                    {timestamp}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
