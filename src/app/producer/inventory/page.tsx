"use client";

/* ================================================================
   PRODUCER INVENTORY — /producer/inventory
   ================================================================
   Sovereign inventory ledger. Shows all ingested assets (digital
   twins) with their status, serial, weight, and vault location.
   
   CTA button routes to /producer/inventory/new for new ingestion.
   ================================================================ */

import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Fingerprint,
  Activity,
} from "lucide-react";
import { useState, useMemo } from "react";

/* ── Types ── */
type AssetStatus = "MINTED" | "PENDING_ASSAY" | "IN_REFINERY" | "ALLOCATED" | "RESERVED";

interface InventoryAsset {
  id: string;
  serial: string;
  form: "GOOD_DELIVERY_BULLION" | "RAW_DORE";
  weightOz: number;
  fineness: string;
  vault: string;
  status: AssetStatus;
  mintedAt: string;
  titleHash: string;
}

/* ── Mock inventory data ── */
const MOCK_INVENTORY: InventoryAsset[] = [
  {
    id: "INV-001",
    serial: "VCB-2025-883492",
    form: "GOOD_DELIVERY_BULLION",
    weightOz: 401.125,
    fineness: "999.9",
    vault: "Zurich — Malca-Amit FTZ",
    status: "ALLOCATED",
    mintedAt: "2026-03-15T09:30:00Z",
    titleHash: "0x7a3b9c1d4e5f6a2b8c9d0e1f2a3b4c5d",
  },
  {
    id: "INV-002",
    serial: "VCB-2025-883493",
    form: "GOOD_DELIVERY_BULLION",
    weightOz: 399.850,
    fineness: "999.9",
    vault: "London — Brink's LBMA",
    status: "MINTED",
    mintedAt: "2026-03-16T14:15:00Z",
    titleHash: "0x8b4c0d2e5f6a7b3c9d1e2f3a4b5c6d7e",
  },
  {
    id: "INV-003",
    serial: "DOR-2026-001204",
    form: "RAW_DORE",
    weightOz: 312.500,
    fineness: "≈850",
    vault: "Dubai — DMCC Vault",
    status: "IN_REFINERY",
    mintedAt: "2026-03-18T11:00:00Z",
    titleHash: "0x9c5d1e3f6a7b8c4d0e2f3a4b5c6d7e8f",
  },
  {
    id: "INV-004",
    serial: "VCB-2025-883501",
    form: "GOOD_DELIVERY_BULLION",
    weightOz: 400.750,
    fineness: "999.9",
    vault: "Singapore — Le Freeport",
    status: "RESERVED",
    mintedAt: "2026-03-19T08:45:00Z",
    titleHash: "0xad6e2f4a7b8c9d5e1f3a4b5c6d7e8f9a",
  },
  {
    id: "INV-005",
    serial: "VCB-2025-883510",
    form: "GOOD_DELIVERY_BULLION",
    weightOz: 402.300,
    fineness: "999.9",
    vault: "New York — HSBC Vault",
    status: "PENDING_ASSAY",
    mintedAt: "2026-03-20T16:20:00Z",
    titleHash: "0xbe7f3a5b8c9d0e6f2a4b5c6d7e8f9a0b",
  },
  {
    id: "INV-006",
    serial: "VCB-2025-883515",
    form: "GOOD_DELIVERY_BULLION",
    weightOz: 398.200,
    fineness: "999.9",
    vault: "Zurich — Malca-Amit FTZ",
    status: "ALLOCATED",
    mintedAt: "2026-03-21T10:00:00Z",
    titleHash: "0xcf8a4b6c9d0e1f7a3b5c6d7e8f9a0b1c",
  },
];

/* ── Status styles ── */
const STATUS_META: Record<AssetStatus, { label: string; color: string; bg: string }> = {
  MINTED:        { label: "Minted",        color: "text-[#C6A86B]",   bg: "bg-[#C6A86B]/10" },
  PENDING_ASSAY: { label: "Pending Assay", color: "text-yellow-400",  bg: "bg-yellow-500/10" },
  IN_REFINERY:   { label: "In Refinery",   color: "text-purple-400",  bg: "bg-purple-500/10" },
  ALLOCATED:     { label: "Allocated",     color: "text-emerald-400", bg: "bg-emerald-500/10" },
  RESERVED:      { label: "Reserved",      color: "text-blue-400",    bg: "bg-blue-500/10" },
};

const FILTER_OPTIONS: { value: AssetStatus | "all"; label: string }[] = [
  { value: "all",           label: "All" },
  { value: "ALLOCATED",     label: "Allocated" },
  { value: "MINTED",        label: "Minted" },
  { value: "RESERVED",      label: "Reserved" },
  { value: "PENDING_ASSAY", label: "Pending" },
  { value: "IN_REFINERY",   label: "Refinery" },
];

export default function ProducerInventoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AssetStatus | "all">("all");

  const filtered = useMemo(() => {
    return MOCK_INVENTORY.filter((asset) => {
      const matchesSearch =
        search === "" ||
        asset.serial.toLowerCase().includes(search.toLowerCase()) ||
        asset.id.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || asset.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const totalWeightOz = MOCK_INVENTORY.reduce((s, a) => s + a.weightOz, 0);
  const allocatedCount = MOCK_INVENTORY.filter((a) => a.status === "ALLOCATED").length;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C6A86B]/10">
              <Package className="h-4.5 w-4.5 text-[#C6A86B]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Sovereign Inventory Ledger
              </h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                ERC-3643 Digital Twins · Allocated Custody
              </p>
            </div>
          </div>
          <Link
            href="/producer/inventory/new"
            className="flex items-center gap-2 bg-[#C6A86B] text-slate-950 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2.5 hover:bg-[#d4b94d] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ingest New Asset
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="shrink-0 grid grid-cols-4 gap-3 px-6 py-3 border-b border-slate-800 bg-slate-900/20">
        <div className="rounded border border-slate-800 bg-black/30 px-3 py-2.5">
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">Total Assets</p>
          <p className="font-mono text-lg font-bold text-white mt-1 leading-none">{MOCK_INVENTORY.length}</p>
        </div>
        <div className="rounded border border-slate-800 bg-black/30 px-3 py-2.5">
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">Total Weight</p>
          <p className="font-mono text-lg font-bold text-[#C6A86B] mt-1 leading-none tabular-nums">
            {totalWeightOz.toLocaleString("en-US", { maximumFractionDigits: 2 })} oz
          </p>
        </div>
        <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <p className="font-mono text-[9px] text-emerald-400/60 uppercase tracking-widest">Allocated</p>
          <p className="font-mono text-lg font-bold text-emerald-400 mt-1 leading-none">{allocatedCount}</p>
          <p className="font-mono text-[10px] text-slate-600 mt-0.5">custody confirmed</p>
        </div>
        <div className="rounded border border-slate-800 bg-black/30 px-3 py-2.5">
          <p className="font-mono text-[9px] text-slate-600 uppercase tracking-widest">Pending</p>
          <p className="font-mono text-lg font-bold text-yellow-400 mt-1 leading-none">
            {MOCK_INVENTORY.filter((a) => a.status === "PENDING_ASSAY" || a.status === "IN_REFINERY").length}
          </p>
          <p className="font-mono text-[10px] text-slate-600 mt-0.5">assay / refinery</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/30 px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by serial or ID..."
              className="w-full bg-black border border-slate-700 pl-9 pr-3 py-2 font-mono text-xs text-white placeholder:text-slate-600 focus:border-[#C6A86B] focus:ring-1 focus:ring-[#C6A86B]/30 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors border ${
                  filter === opt.value
                    ? "border-[#C6A86B]/40 bg-[#C6A86B]/10 text-[#C6A86B]"
                    : "border-slate-800 bg-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="shrink-0 grid grid-cols-12 gap-2 px-6 py-3 border-b border-slate-800 bg-black/40">
          <span className="col-span-1 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">ID</span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Serial</span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Form</span>
          <span className="col-span-1 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">Weight</span>
          <span className="col-span-1 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">Fineness</span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Vault</span>
          <span className="col-span-2 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold">Status</span>
          <span className="col-span-1 font-mono text-[9px] text-slate-600 tracking-wider uppercase font-bold text-right">Minted</span>
        </div>

        {/* Scrollable Rows */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-600">
              <span className="font-mono text-xs">No assets match current filters</span>
            </div>
          ) : (
            filtered.map((asset) => {
              const meta = STATUS_META[asset.status];
              return (
                <div
                  key={asset.id}
                  className="grid grid-cols-12 gap-2 px-6 py-3.5 border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors"
                >
                  <span className="col-span-1 font-mono text-xs text-slate-400">{asset.id}</span>
                  <span className="col-span-2 font-mono text-xs text-white font-bold flex items-center gap-1.5">
                    <Fingerprint className="h-3 w-3 text-slate-600 shrink-0" />
                    {asset.serial}
                  </span>
                  <span className="col-span-2 font-mono text-[10px] text-slate-300">
                    {asset.form === "RAW_DORE" ? "Raw Doré" : "Good Delivery"}
                  </span>
                  <span className="col-span-1 font-mono text-xs text-white text-right tabular-nums">
                    {asset.weightOz.toLocaleString("en-US", { minimumFractionDigits: 3 })}
                  </span>
                  <span className="col-span-1 font-mono text-xs text-slate-400 text-right">{asset.fineness}</span>
                  <span className="col-span-2 font-mono text-[10px] text-slate-400 truncate">{asset.vault}</span>
                  <span className="col-span-2 flex items-center gap-1.5">
                    {asset.status === "ALLOCATED" ? (
                      <CheckCircle2 className={`h-3 w-3 ${meta.color} shrink-0`} />
                    ) : (
                      <Clock className={`h-3 w-3 ${meta.color} shrink-0`} />
                    )}
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
                      {meta.label}
                    </span>
                  </span>
                  <span className="col-span-1 font-mono text-[10px] text-slate-500 text-right">
                    {new Date(asset.mintedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-800 bg-black/60 px-6 py-2 flex items-center justify-between">
        <p className="font-mono text-[9px] text-slate-700 tracking-wider">
          AurumShield Supply Network · ERC-3643 Digital Twin Registry · Immutable Provenance Ledger
        </p>
        <div className="flex items-center gap-2 text-slate-600">
          <Activity className="h-3 w-3" />
          <span className="font-mono text-[10px] tracking-wider uppercase">
            {filtered.length} / {MOCK_INVENTORY.length} Assets
          </span>
        </div>
      </div>
    </div>
  );
}
