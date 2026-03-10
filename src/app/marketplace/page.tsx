"use client";

/* ================================================================
   SOVEREIGN ASSET CATALOG — Phase 3: Post-Verification Marketplace
   ================================================================
   Terminal-grade asset allocation interface for verified institutional
   buyers. Three asset types: Refined Bullion, Doré Bars, Raw Nuggets.
   No backend logic — structural UI only.
   ================================================================ */

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { Radio, Shield, Lock, ArrowRight } from "lucide-react";

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";
const MOCK_SPOT = "2,650.00";

/* ── Asset Data ── */
interface Asset {
  id: string;
  title: string;
  specs: { label: string; value: string }[];
  tier: string;
}

const ASSETS: Asset[] = [
  {
    id: "refined-bullion",
    title: "REFINED BULLION",
    tier: "TIER 1 — INSTITUTIONAL GRADE",
    specs: [
      { label: "Format", value: "400-oz LBMA Good Delivery / 1-Kilo" },
      { label: "Purity", value: "99.99% Fine Gold" },
      { label: "Settlement", value: "T+0 Vaulted / Armored Transit" },
    ],
  },
  {
    id: "dore-bars",
    title: "DORÉ BARS",
    tier: "TIER 2 — REFINERY PIPELINE",
    specs: [
      { label: "Format", value: "Semi-purified alloy" },
      { label: "Purity", value: "Variable (Typically 80–90%)" },
      { label: "Settlement", value: "Requires Final Refinery Assay" },
    ],
  },
  {
    id: "raw-nuggets",
    title: "RAW NUGGETS",
    tier: "TIER 3 — GEOLOGICAL YIELD",
    specs: [
      { label: "Format", value: "Natural geological yield" },
      { label: "Purity", value: "Unrefined / Origin Dependent" },
      { label: "Settlement", value: "Specialized Transit Required" },
    ],
  },
];

/* ── Asset Card Component ── */
function AssetTerminalCard({
  asset,
  onAllocate,
}: {
  asset: Asset;
  onAllocate: (id: string) => void;
}) {
  return (
    <div className="group flex flex-col border border-slate-800 bg-slate-900 transition-colors duration-200 hover:border-[#c6a86b]">
      {/* Card header bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3">
        <span className="h-2 w-2 rounded-full bg-red-500/40" />
        <span className="h-2 w-2 rounded-full bg-amber-500/40" />
        <span className="h-2 w-2 rounded-full bg-emerald-500/40" />
        <span className="ml-2 font-mono text-[9px] tracking-wider text-slate-700">
          asset://{asset.id}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-6">
        {/* Tier label */}
        <p className="mb-4 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
          {asset.tier}
        </p>

        {/* Title */}
        <h3
          className="mb-6 font-mono text-xl font-bold tracking-tight"
          style={{ color: BRAND_GOLD }}
        >
          {asset.title}
        </h3>

        {/* Specs */}
        <div className="mb-8 flex-1 space-y-3">
          {asset.specs.map((spec) => (
            <div key={spec.label} className="flex flex-col gap-0.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                {spec.label}
              </span>
              <span className="font-mono text-xs text-slate-400">
                {spec.value}
              </span>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div className="mb-5 border-t border-slate-800" />

        {/* Allocate button */}
        <button
          type="button"
          onClick={() => onAllocate(asset.id)}
          className="flex w-full items-center justify-center gap-2 px-4 py-3.5 font-mono text-sm font-bold uppercase tracking-wider transition-all duration-150 active:scale-[0.98]"
          style={{
            backgroundColor: BRAND_GOLD,
            color: "#0f172a",
          }}
        >
          [ INITIALIZE ALLOCATION ]
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function MarketplacePage() {
  const router = useRouter();

  const handleAllocate = useCallback(
    (assetId: string) => {
      router.push(`/checkout?asset=${assetId}`);
    },
    [router],
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Terminal Header ── */}
      <div className="border-b border-slate-800 px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          {/* Eyebrow */}
          <div className="mb-4 flex items-center gap-3">
            <Shield className="h-4 w-4" style={{ color: BRAND_GOLD }} />
            <p
              className="font-mono text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: BRAND_GOLD }}
            >
              Secure Enclave // Post-Verification
            </p>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Sovereign Asset Catalog
          </h1>

          {/* Live Ticker */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-slate-800 bg-slate-900/50 px-5 py-3">
            <div className="flex items-center gap-2">
              <Radio
                className="h-3 w-3 animate-pulse"
                style={{ color: BRAND_GOLD }}
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                XAU/USD Spot
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-white">
                ${MOCK_SPOT}
              </span>
            </div>

            <span className="hidden text-slate-800 sm:inline">|</span>

            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Status
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                LIQUID
              </span>
            </div>

            <span className="hidden text-slate-800 sm:inline">|</span>

            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3 text-slate-600" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Clearing
              </span>
              <span className="font-mono text-xs font-bold text-slate-300">
                FEDWIRE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Asset Terminal Grid ── */}
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ASSETS.map((asset) => (
              <AssetTerminalCard
                key={asset.id}
                asset={asset}
                onAllocate={handleAllocate}
              />
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="mt-12 border-t border-slate-800 pt-6">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="font-mono text-[10px] leading-relaxed text-slate-600">
                All allocations are settlement-gated. Pricing is determined at
                order execution against live spot + published premium schedule.
              </p>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
                  Encrypted Session Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
