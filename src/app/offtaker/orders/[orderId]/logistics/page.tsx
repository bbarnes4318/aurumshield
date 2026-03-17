"use client";

/* ================================================================
   ARMORED LOGISTICS RADAR — Mission Control Terminal
   ================================================================
   Dedicated tracking terminal for Offtakers to monitor high-value
   gold shipments in transit. Displays chain-of-custody events and
   real-time geospatial data from sovereign carriers (Malca-Amit,
   Brink's).

   Aesthetic: Heavy, dark, military/terminal feel (bg-slate-950).
   Think Bloomberg terminal tracking an armored convoy.

   ZERO-SCROLL POLICY: The entire page must fit within the viewport.
   ================================================================ */

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, MapPin, Radio, Lock } from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ----------------------------------------------------------------
   MOCK SHIPMENT DATA
   ----------------------------------------------------------------
   Realistic London → Zurich sovereign carrier transit simulation.
   ---------------------------------------------------------------- */

const SHIPMENT = {
  id: "SHP-2026-0042",
  trackingNumber: "MA-GLD-2026-884201",
  carrier: "Malca-Amit",
  status: "IN_TRANSIT",
  estimatedDelivery: "2026-03-15T14:00:00Z",
  settlementId: "ORD-8842-XAU",
  currentLocation: {
    name: "LHR Tarmac Secure Sector — Gate 7B",
    lat: 51.4700223,
    lng: -0.4542955,
  },
};

interface CustodyEvent {
  id: string;
  status: string;
  timestamp: string;
  locationName: string;
  lat: number;
  lng: number;
  custodianSignatureHash: string;
}

const CUSTODY_EVENTS: CustodyEvent[] = [
  {
    id: "evt-001",
    status: "PICKED_UP",
    timestamp: "2026-03-14T06:15:00Z",
    locationName: "LBMA Vault — London EC2R",
    lat: 51.5142,
    lng: -0.0931,
    custodianSignatureHash:
      "0x8f4a2b1c9d3e5f6a7b8c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f3a",
  },
  {
    id: "evt-002",
    status: "IN_TRANSIT",
    timestamp: "2026-03-14T07:42:00Z",
    locationName: "Malca-Amit Armored Convoy — A4 Westbound",
    lat: 51.4892,
    lng: -0.2176,
    custodianSignatureHash:
      "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  },
  {
    id: "evt-003",
    status: "IN_TRANSIT",
    timestamp: "2026-03-14T08:30:00Z",
    locationName: "LHR Tarmac Secure Sector — Gate 7B",
    lat: 51.4700223,
    lng: -0.4542955,
    custodianSignatureHash:
      "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
  },
  {
    id: "evt-004",
    status: "IN_TRANSIT",
    timestamp: "2026-03-14T10:15:00Z",
    locationName: "Airborne — BA Flight 714 (LHR→ZRH)",
    lat: 48.3581,
    lng: 4.0219,
    custodianSignatureHash:
      "0xd5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6",
  },
];

/* ── Helpers ─── */

function truncateHash(hash: string): string {
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

function formatCoordinate(value: number, axis: "lat" | "lng"): string {
  const abs = Math.abs(value);
  const dir =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${abs.toFixed(7)}° ${dir}`;
}

function statusColor(status: string): string {
  switch (status) {
    case "PICKED_UP":
      return "text-amber-400";
    case "IN_TRANSIT":
      return "text-cyan-400";
    case "OUT_FOR_DELIVERY":
      return "text-emerald-400";
    case "DELIVERED":
      return "text-emerald-500";
    default:
      return "text-slate-400";
  }
}

function statusBg(status: string): string {
  switch (status) {
    case "PICKED_UP":
      return "bg-amber-500/10 border-amber-500/40 text-amber-400";
    case "IN_TRANSIT":
      return "bg-cyan-500/10 border-cyan-500/40 text-cyan-400";
    case "OUT_FOR_DELIVERY":
      return "bg-emerald-500/10 border-emerald-500/40 text-emerald-400";
    case "DELIVERED":
      return "bg-emerald-500/20 border-emerald-500/60 text-emerald-400";
    default:
      return "bg-slate-800/50 border-slate-700 text-slate-400";
  }
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function LogisticsRadarPage() {
  const params = useParams();
  const orderId = params?.orderId as string;

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col max-w-7xl w-full mx-auto px-5 py-3">
        {/* ════════════════════════════════════════════════════════
            NAVIGATION
            ════════════════════════════════════════════════════════ */}
        <Link
          href={`/offtaker/orders/${orderId}`}
          className="inline-flex items-center gap-2 font-mono text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2 group shrink-0"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
          SETTLEMENT LEDGER
        </Link>

        {/* ════════════════════════════════════════════════════════
            HEADER RIBBON
            ════════════════════════════════════════════════════════ */}
        <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4 mb-2 shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <span className="font-mono text-slate-500 uppercase text-[10px] tracking-[0.3em] block mb-1">
                Armored Logistics Radar
              </span>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gold-primary" />
                <span className="font-mono text-lg text-white font-bold tracking-wide">
                  {SHIPMENT.trackingNumber}
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-600 mt-0.5 block">
                Carrier: {SHIPMENT.carrier} · Settlement: {SHIPMENT.settlementId}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`border font-mono px-3 py-1 text-xs whitespace-nowrap ${statusBg(SHIPMENT.status)}`}
              >
                {SHIPMENT.status.replace(/_/g, " ")}
              </div>
              <div className="font-mono text-[10px] text-slate-600">
                ETA:{" "}
                <span className="text-slate-400 tabular-nums">
                  {formatTimestamp(SHIPMENT.estimatedDelivery)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            2-COLUMN RADAR GRID — flex-1 min-h-0 to fill remaining space
            ════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* ──────────────────────────────────────────────────────
              LEFT COLUMN — Chain of Custody Ledger
              ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 min-h-0 overflow-y-auto">
            <div className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4 h-full">
              <span className="font-mono text-gold-primary text-xs tracking-[0.2em] uppercase block mb-4">
                Chain of Custody
              </span>

              <div className="relative ml-3">
                {/* Vertical timeline connector */}
                <div className="absolute left-[5px] top-0 bottom-0 border-l border-slate-800" />

                <div className="space-y-4">
                  {CUSTODY_EVENTS.map((event, idx) => (
                    <CustodyEventNode
                      key={event.id}
                      event={event}
                      isLatest={idx === CUSTODY_EVENTS.length - 1}
                    />
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="border-t border-slate-800 mt-4 pt-3">
                <span className="font-mono text-[9px] text-slate-700 tracking-wider uppercase block mb-1">
                  Custodian Signature = Cryptographic Handoff Proof
                </span>
                <span className="font-mono text-[9px] text-slate-700 block">
                  Each hash proves an authenticated guard-to-guard custody
                  transfer.
                </span>
              </div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────
              RIGHT COLUMN — Geospatial Radar
              ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 min-h-0">
            <div data-tour="cinematic-transit-map" className="bg-black border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-4 h-full flex flex-col">
              <span className="font-mono text-gold-primary text-xs tracking-[0.2em] uppercase block mb-4">
                Geospatial Radar
              </span>

              {/* ── Radar Display ── */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
                {/* Concentric radar rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[280px] h-[280px] rounded-full border border-slate-800/40" />
                  <div className="absolute w-[210px] h-[210px] rounded-full border border-slate-800/30" />
                  <div className="absolute w-[140px] h-[140px] rounded-full border border-slate-800/20" />
                  <div className="absolute w-[70px] h-[70px] rounded-full border border-slate-800/20" />
                  {/* Crosshairs */}
                  <div className="absolute w-[280px] h-px bg-slate-800/30" />
                  <div className="absolute w-px h-[280px] bg-slate-800/30" />
                </div>

                {/* Live beacon pulse */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative mb-4">
                    <span className="absolute inline-flex h-5 w-5 rounded-full bg-cyan-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-5 w-5 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
                  </div>

                  {/* Location Name */}
                  <span className="font-mono text-sm text-cyan-400 text-center mb-3 max-w-md leading-relaxed">
                    {SHIPMENT.currentLocation.name}
                  </span>

                  {/* Coordinates */}
                  <div className="bg-slate-900/80 border border-slate-800 px-5 py-3 min-w-[280px]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase">
                        Latitude
                      </span>
                      <span className="font-mono text-sm text-white tabular-nums">
                        {formatCoordinate(
                          SHIPMENT.currentLocation.lat,
                          "lat",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase">
                        Longitude
                      </span>
                      <span className="font-mono text-sm text-white tabular-nums">
                        {formatCoordinate(
                          SHIPMENT.currentLocation.lng,
                          "lng",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Carrier Telemetry Strip ── */}
              <div className="border-t border-slate-800 mt-3 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                <TelemetryField label="Carrier" value={SHIPMENT.carrier} />
                <TelemetryField
                  label="Tracking"
                  value={SHIPMENT.trackingNumber}
                  mono
                />
                <TelemetryField
                  label="Events"
                  value={`${CUSTODY_EVENTS.length} recorded`}
                />
                <TelemetryField
                  label="Last Update"
                  value={formatTimestamp(
                    CUSTODY_EVENTS[CUSTODY_EVENTS.length - 1].timestamp,
                  )}
                  mono
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Security Footer ── */}
        <p className="mt-2 text-center font-mono text-[10px] text-slate-700 tracking-wider shrink-0">
          AurumShield Clearing · Sovereign Carrier Logistics · HMAC-SHA256
          Verified · Immutable Chain of Custody
        </p>
      </div>

      <TelemetryFooter />
    </div>
  );
}

/* ================================================================
   INLINE COMPONENTS
   ================================================================ */

/* ── Custody Event Timeline Node ── */
function CustodyEventNode({
  event,
  isLatest,
}: {
  event: CustodyEvent;
  isLatest: boolean;
}) {
  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div className="absolute left-0 top-[3px] flex items-center justify-center">
        {isLatest ? (
          <span className="relative flex h-[11px] w-[11px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <Radio className="relative inline-flex h-[11px] w-[11px] text-cyan-400" />
          </span>
        ) : (
          <MapPin className="h-[11px] w-[11px] text-slate-600" />
        )}
      </div>

      {/* Event content */}
      <div>
        {/* Status + Timestamp */}
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`font-mono text-[10px] font-semibold tracking-wider uppercase ${statusColor(event.status)}`}
          >
            {event.status.replace(/_/g, " ")}
          </span>
          <span className="font-mono text-[9px] text-slate-600 tabular-nums">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>

        {/* Location */}
        <span
          className={`font-mono text-xs block leading-snug ${
            isLatest ? "text-white" : "text-slate-500"
          }`}
        >
          {event.locationName}
        </span>

        {/* Coordinates */}
        <span className="font-mono text-[10px] text-slate-600 tabular-nums block mt-0.5">
          {formatCoordinate(event.lat, "lat")} ·{" "}
          {formatCoordinate(event.lng, "lng")}
        </span>

        {/* Custodian Signature Hash */}
        <div className="mt-1 flex items-center gap-2">
          <Lock className="h-[9px] w-[9px] text-slate-700" />
          <span className="font-mono text-[9px] text-gold-primary tabular-nums">
            {truncateHash(event.custodianSignatureHash)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Telemetry Field ── */
function TelemetryField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">
        {label}
      </span>
      <span
        className={`font-mono text-xs text-white block truncate ${mono ? "tabular-nums" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
