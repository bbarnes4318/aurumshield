"use client";

/* ================================================================
   OFFTAKER MARKETPLACE — Sovereign Asset Execution Terminal
   ================================================================
   Bloomberg-class institutional execution interface. Dense tabular
   grids, terminal-efficiency, zero consumer shopping-cart patterns.
   The Offtaker selects an asset tier, then locks a deterministic
   60-second quote in the Execution Ticket sidebar.

   VISUAL: Hyper-premium card redesign with photorealistic gold
   asset imagery, radial gradient showcases, market depth overlays,
   and CLS-safe Next.js <Image /> rendering.
   ================================================================ */

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Radio,
  ChevronRight,
  Lock,
  Zap,
  BarChart3,
  Shield,
  Activity,
  Clock,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";

/* ----------------------------------------------------------------
   ASSET CATALOG — 4-Tier Sovereign Liquidity Pool
   ---------------------------------------------------------------- */
interface AssetTier {
  id: string;
  tier: number;
  name: string;
  shortName: string;
  description: string;
  weightOz: number;
  fineness: string;
  premiumPct: number;
  pricePerOz: number;
  totalNotional: number;
  custody: string;
  isApex: boolean;
  imageUrl: string;
}

const SPOT_PRICE = 2650.0;

const ASSET_CATALOG: AssetTier[] = [
  {
    id: "lbma-400oz",
    tier: 1,
    name: "400 oz LBMA Good Delivery Bar",
    shortName: "LBMA 400oz",
    description: "350–430 oz range, ≥995 fineness. Allocated custody.",
    weightOz: 400,
    fineness: "≥995.0",
    premiumPct: 0.1,
    pricePerOz: SPOT_PRICE * 1.001,
    totalNotional: SPOT_PRICE * 1.001 * 400,
    custody: "ALLOCATED",
    isApex: true,
    imageUrl: "/assets/gold-400oz.png",
  },
  {
    id: "kilo-bar",
    tier: 2,
    name: "1 Kilogram Gold Bar",
    shortName: "1kg Bar",
    description: "32.15 troy oz, 999.9 fineness. Institutional standard.",
    weightOz: 32.15,
    fineness: "999.9",
    premiumPct: 0.35,
    pricePerOz: SPOT_PRICE * 1.0035,
    totalNotional: SPOT_PRICE * 1.0035 * 32.15,
    custody: "ALLOCATED",
    isApex: false,
    imageUrl: "/assets/gold-1kg.png",
  },
  {
    id: "10oz-cast",
    tier: 3,
    name: "10 oz Cast Gold Bar",
    shortName: "10oz Cast",
    description: "999.9 fineness. Cast ingot format.",
    weightOz: 10,
    fineness: "999.9",
    premiumPct: 0.75,
    pricePerOz: SPOT_PRICE * 1.0075,
    totalNotional: SPOT_PRICE * 1.0075 * 10,
    custody: "ALLOCATED",
    isApex: false,
    imageUrl: "/assets/gold-10oz.png",
  },
  {
    id: "1oz-minted",
    tier: 4,
    name: "1 oz Minted Gold Bar",
    shortName: "1oz Minted",
    description: "999.9 fineness. Serialized minted bar.",
    weightOz: 1,
    fineness: "999.9",
    premiumPct: 1.5,
    pricePerOz: SPOT_PRICE * 1.015,
    totalNotional: SPOT_PRICE * 1.015 * 1,
    custody: "ALLOCATED",
    isApex: false,
    imageUrl: "/assets/gold-1oz.png",
  },
];

/* ----------------------------------------------------------------
   CURRENCY FORMATTER
   ---------------------------------------------------------------- */
function fmt(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function OfftakerMarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";
  const [selectedAsset, setSelectedAsset] = useState<AssetTier | null>(isDemoActive ? ASSET_CATALOG[0] : null);
  const [quantity, setQuantity] = useState(1);

  const handleSelectAsset = useCallback((asset: AssetTier) => {
    setSelectedAsset(asset);
    setQuantity(1);
  }, []);

  const hasSelection = selectedAsset !== null;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden pb-8">
      {/* ──────────────────────────────────────────────────────────
         TOP TICKER BAR
         ────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border-b border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] h-12 flex items-center px-4 shrink-0">
        <div className="flex items-center gap-6 w-full">
          {/* Spot Price */}
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-mono text-xs text-slate-500">XAU/USD SPOT:</span>
            <span className="font-mono text-sm text-white font-bold tabular-nums">
              ${fmt(SPOT_PRICE)}
            </span>
            <span className="font-mono text-[10px] text-emerald-400 animate-pulse flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          </div>

          {/* Separator */}
          <div className="h-4 w-px bg-slate-800" />

          {/* Session Info */}
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
              Offtaker Terminal · Perimeter Cleared
            </span>
          </div>

          {/* Right-side timestamp */}
          <div className="ml-auto flex items-center gap-2">
            <Clock className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[10px] text-slate-600 tabular-nums">
              {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
         MAIN BODY — Grid + Execution Panel
         ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Central Catalog Grid ─── */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-400 font-mono uppercase tracking-widest text-xs">
                Sovereign Asset Liquidity
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-700">
              {ASSET_CATALOG.length} INSTRUMENTS
            </span>
          </div>

          {/* ── The 4-Tier Catalog Grid ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {ASSET_CATALOG.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;

              return (
                <button
                  key={asset.id}
                  onClick={() => handleSelectAsset(asset)}
                  className={`
                    bg-black border rounded-none text-left transition-all duration-200 cursor-pointer overflow-hidden flex flex-col
                    ${asset.isApex ? "border-l-[#C6A86B] border-l-2" : ""}
                    ${isSelected
                      ? "border-[#C6A86B]/60 ring-1 ring-[#C6A86B]/40 shadow-[0_0_20px_rgba(198,168,107,0.15)]"
                      : "border-slate-800 hover:border-[#C6A86B]/40 hover:shadow-[0_0_12px_rgba(198,168,107,0.08)]"
                    }
                  `}
                >
                  {/* ── VISUAL SHOWCASE — Top Half ── */}
                  <div
                    className="relative w-full h-52 flex items-center justify-center overflow-hidden"
                    style={{
                      background: "radial-gradient(ellipse at center, #1e293b 0%, #020617 70%)",
                    }}
                  >
                    {/* Gold Asset Image — CLS-safe with explicit dimensions */}
                    <div className="relative h-36 w-36">
                      <Image
                        src={asset.imageUrl}
                        alt={asset.name}
                        width={144}
                        height={144}
                        className="object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]"
                        priority={asset.tier <= 2}
                      />
                    </div>

                    {/* APEX Badge */}
                    {asset.isApex && (
                      <span className="absolute top-3 left-3 font-mono text-[9px] bg-[#C6A86B]/15 text-[#C6A86B] px-2 py-0.5 tracking-wider uppercase border border-[#C6A86B]/20">
                        APEX
                      </span>
                    )}

                    {/* Tier Badge */}
                    <span className="absolute top-3 right-3 font-mono text-[10px] text-slate-500 tracking-wider">
                      TIER {asset.tier}
                    </span>

                    {/* Market Depth Indicator — Glowing Green Overlay */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm border border-emerald-500/30 px-2 py-1 rounded-sm">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                      <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase">
                        Liquidity: {fmt(asset.weightOz * 37.5, 0)} oz
                      </span>
                    </div>

                    {/* Selection Radio */}
                    <div className="absolute bottom-3 right-3">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-[#C6A86B] bg-[#C6A86B]"
                            : "border-slate-600 bg-transparent"
                        }`}
                      >
                        {isSelected && (
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── DATA GRID — Bottom Half ── */}
                  <div className="p-5">
                    {/* Asset Name */}
                    <h3 className="font-mono text-sm text-white font-bold mb-1">
                      {asset.name}
                    </h3>
                    <p className="font-mono text-[11px] text-slate-600 mb-4">
                      {asset.description}
                    </p>

                    {/* Tabular Data Grid */}
                    <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-3">
                      <div>
                        <span className="font-mono text-[9px] text-slate-600 uppercase block mb-1">
                          Premium
                        </span>
                        <span className="font-mono text-xs text-[#C6A86B] font-bold tabular-nums">
                          +{asset.premiumPct.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] text-slate-600 uppercase block mb-1">
                          Price/oz
                        </span>
                        <span className="font-mono text-xs text-white tabular-nums">
                          ${fmt(asset.pricePerOz)}
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[9px] text-slate-600 uppercase block mb-1">
                          Total Notional
                        </span>
                        <span className="font-mono text-xs text-white font-bold tabular-nums">
                          ${fmt(asset.totalNotional)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Metadata */}
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-800/50">
                      <span className="font-mono text-[9px] text-slate-700">
                        WT: {asset.weightOz} oz
                      </span>
                      <span className="font-mono text-[9px] text-slate-700">
                        FIN: {asset.fineness}
                      </span>
                      <span className="font-mono text-[9px] text-slate-700">
                        {asset.custody}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Right-Side Execution Ticket ─── */}
        <div className="w-96 bg-slate-900 border-l border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 flex flex-col shrink-0">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
            <Zap className="h-3.5 w-3.5 text-slate-500" />
            <h2 className="font-mono text-slate-500 text-xs tracking-[0.15em] uppercase">
              Execution Ticket
            </h2>
          </div>

          {/* Ticket Body */}
          <div className="flex-1 flex flex-col">
            {hasSelection ? (
              /* ── Selected Asset Details ── */
              <>
                {/* ── Thumbnail + Instrument Header ── */}
                <div className="flex items-center gap-3 mb-5 bg-black/40 border border-slate-800 p-3">
                  <div className="relative h-12 w-12 shrink-0 rounded-sm overflow-hidden bg-slate-800">
                    <Image
                      src={selectedAsset.imageUrl}
                      alt={selectedAsset.shortName}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
                      Instrument
                    </span>
                    <span className="font-mono text-sm text-white font-bold">
                      {selectedAsset.shortName}
                    </span>
                  </div>
                  {selectedAsset.isApex && (
                    <span className="ml-auto font-mono text-[8px] bg-[#C6A86B]/15 text-[#C6A86B] px-1.5 py-0.5 tracking-wider uppercase border border-[#C6A86B]/20">
                      APEX
                    </span>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <TicketRow label="Tier" value={String(selectedAsset.tier)} />
                  <TicketRow
                    label="Spot Reference"
                    value={`$${fmt(SPOT_PRICE)}`}
                    mono
                  />
                  <TicketRow
                    label="Premium"
                    value={`+${selectedAsset.premiumPct.toFixed(2)}%`}
                    highlight
                  />
                  <TicketRow
                    label="Indicative Price/oz"
                    value={`$${fmt(selectedAsset.pricePerOz)}`}
                    mono
                  />

                  {/* Quantity Input */}
                  <div>
                    <span className="font-mono text-[10px] text-slate-600 tracking-[0.15em] uppercase block mb-2">
                      Quantity (Units)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="h-8 w-8 bg-slate-800 border border-slate-700 font-mono text-white text-sm flex items-center justify-center hover:border-slate-600 transition-colors cursor-pointer"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="h-8 w-16 bg-black border border-slate-700 text-center font-mono text-sm text-white tabular-nums focus:border-[#C6A86B] focus:outline-none"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-8 w-8 bg-slate-800 border border-slate-700 font-mono text-white text-sm flex items-center justify-center hover:border-slate-600 transition-colors cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notional Summary */}
                <div className="border-t border-slate-800 pt-4 mb-6 space-y-3">
                  <TicketRow
                    label="Weight (Total)"
                    value={`${fmt(selectedAsset.weightOz * quantity, 2)} oz`}
                    mono
                  />

                  {/* ── Massive Frosted Indicative Notional ── */}
                  <div className="bg-black/50 backdrop-blur-md border border-slate-700/50 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.1)] p-4 rounded-sm">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block mb-2">
                      Indicative Notional
                    </span>
                    <span className="font-mono text-3xl font-bold tabular-nums" style={{ color: "#C6A86B" }}>
                      ${fmt(selectedAsset.totalNotional * quantity)}
                    </span>
                  </div>
                </div>

                {/* Quote Lock Notice */}
                <div className="bg-[#C6A86B]/5 border border-[#C6A86B]/20 p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Lock className="h-3 w-3 text-[#C6A86B] mt-0.5 shrink-0" />
                    <p className="font-mono text-[10px] text-[#C6A86B]/80 leading-relaxed">
                      Requesting a quote will generate a deterministic 60-second
                      price lock. The quoted price is final and non-negotiable
                      for the lock duration.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* ── Empty State ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="h-12 w-12 rounded-sm bg-slate-800 flex items-center justify-center mb-4">
                  <Radio className="h-5 w-5 text-slate-600" />
                </div>
                <p className="font-mono text-xs text-slate-500 leading-relaxed mb-2">
                  Select an asset from the liquidity pool to generate a
                  deterministic 60-second quote lock.
                </p>
                <p className="font-mono text-[10px] text-slate-700">
                  All prices are indicative until locked.
                </p>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* ── Dynamic Rail Indicator ── */}
            {hasSelection && (
              <div className="flex items-center justify-center mb-3">
                <span className="font-mono text-[9px] text-slate-500 tracking-wider bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-sm uppercase">
                  <span className="text-slate-600">System Routing:</span>{" "}
                  <span className="text-emerald-400">Turnkey MPC</span>{" "}
                  <span className="text-slate-700">/</span>{" "}
                  <span className="text-blue-400">Column RTGS</span>
                </span>
              </div>
            )}

            {/* CTA Button */}
            <div className="relative">
              {isDemoActive && hasSelection && <DemoTooltip text="Initiate a cryptographic 30-second execution quote ↓" position="top" />}
              <button
                disabled={!hasSelection}
                onClick={() => {
                  if (!selectedAsset) return;
                  const demoParam = isDemoActive ? "?demo=active" : "";
                  router.push(`/offtaker/orders${demoParam}`);
                }}
                className={`w-full font-bold text-sm tracking-[0.15em] uppercase py-3.5 flex items-center justify-center gap-2 font-mono transition-colors ${
                  hasSelection
                    ? "bg-[#C6A86B] text-slate-950 hover:bg-[#d4b87a] cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                } ${isDemoActive && hasSelection ? DEMO_SPOTLIGHT_CLASSES : ""}`}
              >
                <Zap className="h-4 w-4" />
                INITIATE EXECUTION QUOTE
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
              EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER BSA/AML PROTOCOLS.
            </span>

            {/* Disclaimer */}
            <p className="font-mono text-[9px] text-slate-700 text-center mt-3 leading-relaxed">
              Settlement via Goldwire · T+0 Digital Rail · T+2 Wire Rail
            </p>
          </div>
        </div>
      </div>

      <TelemetryFooter />
    </div>
  );
}

/* ── Inline Helper: Ticket Data Row ── */
function TicketRow({
  label,
  value,
  mono = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
        {label}
      </span>
      <span
        className={`font-mono text-xs tabular-nums ${
          highlight ? "text-[#C6A86B] font-bold" : "text-white"
        } ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
