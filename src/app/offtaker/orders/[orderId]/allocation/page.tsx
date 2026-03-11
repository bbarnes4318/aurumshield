"use client";

/* ================================================================
   VAULT ALLOCATION MANIFEST
   ================================================================
   Post-settlement proof of physical allocation. Displays the
   exact bar-level custody details as an immutable asset registry
   card — serial, refiner, weight, fineness, vault jurisdiction.
   ================================================================ */

import { Shield, Landmark } from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

/* ----------------------------------------------------------------
   MOCK ALLOCATION DATA
   ---------------------------------------------------------------- */
const ALLOCATION = {
  orderId: "ORD-8842-XAU",
  offtakerOrgId: "ACP-0042",
  offtakerEntity: "Aureus Capital Partners Ltd.",
  allocationTimestamp: "2026-03-11T14:30:00Z",
  bar: {
    serialNumber: "MOC-883492",
    refinerHallmark: "Valcambi Suisse",
    lbmaStatus: "LBMA Good Delivery",
    grossWeight: "401.125 tr oz",
    fineness: "999.9",
    castingYear: "2025",
    vaultJurisdiction: "Zurich Free Trade Zone (Malca-Amit)",
  },
};

/* ── Cryptographic Hash Badge ── */
function HashBadge({ value }: { value: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };
  return (
    <span className="bg-black border border-slate-800 px-2 py-1 text-gold-primary font-mono text-sm flex items-center gap-2 w-fit">
      {value}
      <button
        onClick={handleCopy}
        className="text-slate-600 text-[9px] hover:text-slate-400 transition-colors cursor-pointer"
      >
        [ COPY ]
      </button>
    </span>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function AllocationRegistryPage() {
  const { bar } = ALLOCATION;

  return (
    <div className="min-h-screen bg-slate-950 pb-14">
      <div className="max-w-5xl mx-auto p-8 pt-12">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="h-4 w-4 text-gold-primary" />
            <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
              Vault Allocation Manifest
            </span>
          </div>
          <h1 className="text-3xl text-white font-bold tracking-tight">
            Allocated Physical Assets
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <HashBadge value={ALLOCATION.orderId} />
            <span className="font-mono text-slate-600 text-xs">·</span>
            <span className="font-mono text-slate-600 text-xs tracking-wider">
              {ALLOCATION.offtakerEntity}
            </span>
          </div>
        </div>

        {/* ── Asset Card ── */}
        <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6">
          {/* Card Header */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800">
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
              400-oz Good Delivery Bar — Registry Detail
            </span>
          </div>

          {/* Specifics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
            {/* Serial Number — Hash Badge */}
            <div>
              <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">
                Serial Number
              </span>
              <HashBadge value={bar.serialNumber} />
            </div>
            <RegistryField
              label="Refiner Hallmark"
              value={`${bar.refinerHallmark} (${bar.lbmaStatus})`}
            />
            <RegistryField
              label="Exact Gross Weight"
              value={bar.grossWeight}
            />
            <RegistryField label="Fineness" value={bar.fineness} />
            <RegistryField label="Casting Year" value={bar.castingYear} />
            <RegistryField
              label="Vault Jurisdiction"
              value={bar.vaultJurisdiction}
            />
          </div>

          {/* Allocation Badge */}
          <div className="mt-8 pt-5 border-t border-slate-800">
            <div className="bg-emerald-500/10 border border-emerald-500/40 px-4 py-3 inline-flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-mono text-emerald-400 text-xs tracking-wider">
                {`ALLOCATED TO: ${ALLOCATION.offtakerOrgId} // TIMESTAMP: ${ALLOCATION.allocationTimestamp}`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="mt-12 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Custody · LBMA Good Delivery · Malca-Amit Zurich ·
          Segregated Allocated Storage
        </p>
      </div>

      <TelemetryFooter />
    </div>
  );
}

/* ── Inline Helper: Registry Field ── */
function RegistryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1">
        {label}
      </span>
      <span className="font-mono text-sm text-white block">{value}</span>
    </div>
  );
}
