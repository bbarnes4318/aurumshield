"use client";

/* ================================================================
   OFFTAKER MARKETPLACE — Single-Page Execution Terminal
   ================================================================
   Complete buy flow in one page: asset selection → delivery mode →
   destination → transparent cost breakdown → quote lock → execution.

   Execution panel uses a horizontal stepper so only one step is
   visible at a time — zero-scroll enforced.
   ================================================================ */

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  ChevronLeft,
  Lock,
  Zap,
  BarChart3,
  Shield,
  Activity,
  Clock,
  Vault,
  Truck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe,
  Wallet,
  Landmark,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { useGoldPrice } from "@/hooks/use-gold-price";
import { checkTransactionLimits } from "@/lib/transaction-limits";

/* ────────────────────────────────────────────────────────────────
   TYPES & CONSTANTS
   ──────────────────────────────────────────────────────────────── */

type DeliveryMode = "VAULT" | "PHYSICAL";
type SettlementRail = "FEDWIRE" | "TURNKEY_USDT";

interface AssetTier {
  id: string;
  tier: number;
  name: string;
  shortName: string;
  description: string;
  weightOz: number;
  fineness: string;
  premiumBps: number;
  custody: string;
  isApex: boolean;
  imageUrl: string;
}

/** Sovereign freeport destinations for vaulting */
const VAULT_DESTINATIONS = [
  { value: "zurich-malcaamit-1", label: "Zurich — Malca-Amit Hub 1", region: "EMEA", transitBps: 12, annualCustodyBps: 8 },
  { value: "london-brinks-sovereign", label: "London — Brink's Sovereign", region: "EMEA", transitBps: 10, annualCustodyBps: 8 },
  { value: "singapore-malcaamit-asia", label: "Singapore — Malca-Amit Asia", region: "APAC", transitBps: 14, annualCustodyBps: 10 },
  { value: "newyork-brinks-conus", label: "New York — Brink's CONUS", region: "AMER", transitBps: 8, annualCustodyBps: 6 },
  { value: "dubai-brinks-dmcc", label: "Dubai — Brink's DMCC Freeport", region: "MENA", transitBps: 11, annualCustodyBps: 9 },
] as const;

/** Physical delivery destinations */
const DELIVERY_DESTINATIONS = [
  { value: "us-conus", label: "Continental United States (CONUS)", region: "AMER", transitBps: 15, insuranceBps: 8 },
  { value: "uk-mainland", label: "United Kingdom Mainland", region: "EMEA", transitBps: 12, insuranceBps: 7 },
  { value: "ch-switzerland", label: "Switzerland", region: "EMEA", transitBps: 10, insuranceBps: 6 },
  { value: "sg-singapore", label: "Singapore", region: "APAC", transitBps: 18, insuranceBps: 9 },
  { value: "ae-uae", label: "United Arab Emirates", region: "MENA", transitBps: 14, insuranceBps: 8 },
  { value: "hk-hongkong", label: "Hong Kong SAR", region: "APAC", transitBps: 16, insuranceBps: 9 },
] as const;

/** Execution premium charged by AurumShield (1% fee sweep) */
const PLATFORM_FEE_BPS = 100;

/** Physical delivery premium (above spot) */
const PHYSICAL_PREMIUM_BPS = 5;

/* ── Asset Catalog ── */
const ASSET_CATALOG: AssetTier[] = [
  {
    id: "lbma-400oz",
    tier: 1,
    name: "400 oz LBMA Good Delivery Bar",
    shortName: "LBMA 400oz",
    description: "350–430 oz range, ≥995 fineness. Allocated custody.",
    weightOz: 400,
    fineness: "≥995.0",
    premiumBps: 10,
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
    premiumBps: 35,
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
    premiumBps: 75,
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
    premiumBps: 150,
    custody: "ALLOCATED",
    isApex: false,
    imageUrl: "/assets/gold-1oz.png",
  },
];

/** Pool liquidity in troy ounces */
const POOL_LIQUIDITY_OZ = 48_000;

/* ── Formatters ── */
function fmt(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ── Execution state machine ── */
type ExecutionPhase = "CONFIGURING" | "QUOTE_LOCKED" | "EXECUTING";

/* ── Panel step (horizontal wizard) ── */
type PanelStep = 1 | 2 | 3;
const PANEL_STEP_LABELS: Record<PanelStep, string> = {
  1: "Execution Config",
  2: "Capital Routing",
  3: "Review & Execute",
};

/* ================================================================
   PAGE COMPONENT
   ================================================================ */
export default function OfftakerMarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";
  const { data: goldPrice, isLoading: priceLoading, isError: priceError, isLive: priceLive } = useGoldPrice();

  /* ── Core state ── */
  const [selectedAsset, setSelectedAsset] = useState<AssetTier | null>(
    isDemoActive ? ASSET_CATALOG[0] : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("VAULT");
  const [destination, setDestination] = useState("");
  const [phase, setPhase] = useState<ExecutionPhase>("CONFIGURING");
  const [settlementRail, setSettlementRail] = useState<SettlementRail>("FEDWIRE");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [limitBlocked, setLimitBlocked] = useState(false);

  /* ── Horizontal stepper state ── */
  const [panelStep, setPanelStep] = useState<PanelStep>(1);

  /* ── Live spot price ── */
  const spotPrice = goldPrice?.spotPriceUsd ?? 0;

  /* ── Derived values ── */
  const hasSelection = selectedAsset !== null;
  const destinations = deliveryMode === "VAULT" ? VAULT_DESTINATIONS : DELIVERY_DESTINATIONS;
  const selectedDest = destinations.find((d) => d.value === destination);

  const totalWeightOz = hasSelection ? selectedAsset.weightOz * quantity : 0;
  const baseSpotValue = totalWeightOz * spotPrice;
  const assetPremium = baseSpotValue * (selectedAsset?.premiumBps ?? 0) / 10000;
  const physicalPremium = deliveryMode === "PHYSICAL" ? baseSpotValue * PHYSICAL_PREMIUM_BPS / 10000 : 0;
  const transitCost = selectedDest ? baseSpotValue * selectedDest.transitBps / 10000 : 0;
  const insuranceCost = deliveryMode === "PHYSICAL" && selectedDest
    ? baseSpotValue * ((selectedDest as typeof DELIVERY_DESTINATIONS[number]).insuranceBps ?? 0) / 10000
    : 0;
  const platformFee = baseSpotValue * PLATFORM_FEE_BPS / 10000;
  const totalExecutionAmount = baseSpotValue + assetPremium + physicalPremium + transitCost + insuranceCost + platformFee;

  const canLockQuote = hasSelection && destination !== "" && quantity > 0;
  const step1Complete = hasSelection && destination !== "" && quantity > 0;

  /* ── Asset selection ── */
  const handleSelectAsset = useCallback((asset: AssetTier) => {
    setSelectedAsset(asset);
    setQuantity(1);
    setPhase("CONFIGURING");
    setSecondsLeft(0);
    setPanelStep(1);
  }, []);

  /* ── Reset destination when delivery mode changes ── */
  const handleDeliveryModeChange = useCallback((mode: DeliveryMode) => {
    setDeliveryMode(mode);
    setDestination("");
    setPhase("CONFIGURING");
  }, []);

  /* ── Quote lock (with transaction limit enforcement) ── */
  const handleLockQuote = useCallback(() => {
    if (!canLockQuote) return;

    // Enforce transaction limits
    const amountCents = Math.round(totalExecutionAmount * 100);
    const limitCheck = checkTransactionLimits(amountCents);

    if (!limitCheck.allowed) {
      setLimitWarning(limitCheck.reason);
      setLimitBlocked(true);
      return;
    }

    if (limitCheck.requiresReview) {
      setLimitWarning(limitCheck.reason);
      setLimitBlocked(false);
    } else {
      setLimitWarning(null);
      setLimitBlocked(false);
    }

    setPhase("QUOTE_LOCKED");
    setSecondsLeft(60);
    setPanelStep(3);
  }, [canLockQuote, totalExecutionAmount]);

  /* ── Countdown timer ── */
  useEffect(() => {
    if (phase !== "QUOTE_LOCKED" || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPhase("CONFIGURING");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, secondsLeft]);

  const timerDisplay = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  /* ── Execute ── */
  const handleConfirmExecution = useCallback(() => {
    if (phase !== "QUOTE_LOCKED" || isExecuting) return;
    setIsExecuting(true);
    setPhase("EXECUTING");

    const orderId = `ORD-${String(Math.floor(Math.random() * 9000) + 1000)}-XAU`;
    const executionRecord = {
      orderId,
      asset: selectedAsset,
      deliveryMode,
      destination,
      rail: settlementRail,
      requiresManualReview: limitWarning !== null && !limitBlocked,
      executedAt: new Date().toISOString(),
      // TODO: POST to /api/goldwire/execute for DB persistence + settlement case
      // Defined interface: { orderId, asset, deliveryMode, destination, rail, quoteSnapshot }
    };
    sessionStorage.setItem("aurumshield:execution", JSON.stringify(executionRecord));

    const demoParam = isDemoActive ? "?demo=active" : "";
    setTimeout(() => {
      router.push(`/offtaker/orders/${orderId}${demoParam}`);
    }, 800);
  }, [phase, isExecuting, isDemoActive, router, selectedAsset, deliveryMode, destination, settlementRail, limitWarning, limitBlocked]);

  return (
    <div className="flex flex-col overflow-hidden bg-slate-950 -mx-6 -my-6 lg:-mx-8 h-[calc(100%+3rem)]">
      {/* ══════════════════════════════════════════════════════════
         TOP TICKER BAR
         ══════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900 border-b border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] h-10 flex items-center px-4 shrink-0">
        <div className="flex items-center gap-6 w-full">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-slate-500" />
            <span className="font-mono text-[10px] text-slate-500">XAU/USD:</span>
            {priceError ? (
              <span className="font-mono text-xs text-red-500 font-bold tracking-wider">[PRICING OFFLINE]</span>
            ) : priceLoading ? (
              <span className="font-mono text-xs text-slate-600 animate-pulse">SYNCING...</span>
            ) : (
              <>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                <span className="font-mono text-xs text-white font-bold tabular-nums">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(spotPrice)}
                </span>
              </>
            )}
            {priceLive && (
              <span className="font-mono text-[9px] text-emerald-400 animate-pulse flex items-center gap-1">
                LIVE
              </span>
            )}
          </div>
          <div className="h-3 w-px bg-slate-800" />
          {goldPrice && !priceError && (
            <span className={`font-mono text-[10px] tabular-nums ${goldPrice.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {goldPrice.change24h >= 0 ? "+" : ""}{goldPrice.change24h} ({goldPrice.changePct24h}%)
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Shield className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[9px] text-slate-600 tracking-wider uppercase">
              Offtaker Terminal · Perimeter Cleared
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
         MAIN BODY — Catalog Grid + Execution Panel
         ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* ─── LEFT: Asset Catalog Grid ─── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-400 font-mono uppercase tracking-widest text-[10px]">
                Sovereign Asset Liquidity
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-700">
              {ASSET_CATALOG.length} INSTRUMENTS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ASSET_CATALOG.map((asset) => {
              const isSelected = selectedAsset?.id === asset.id;
              const pricePerOz = spotPrice * (1 + asset.premiumBps / 10000);

              return (
                <button
                  key={asset.id}
                  data-tour={asset.id === "lbma-400oz" ? "cinematic-lbma-400oz" : undefined}
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
                  {/* Visual Showcase */}
                  <div
                    className="relative w-full h-36 flex items-center justify-center overflow-hidden"
                    style={{ background: "radial-gradient(ellipse at center, #1e293b 0%, #020617 70%)" }}
                  >
                    <div className="relative h-28 w-28">
                      <Image
                        src={asset.imageUrl}
                        alt={asset.name}
                        width={112}
                        height={112}
                        className="object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]"
                        priority={asset.tier <= 2}
                      />
                    </div>
                    {asset.isApex && (
                      <span className="absolute top-2 left-2 font-mono text-[8px] bg-[#C6A86B]/15 text-[#C6A86B] px-1.5 py-0.5 tracking-wider uppercase border border-[#C6A86B]/20">
                        APEX
                      </span>
                    )}
                    <span className="absolute top-2 right-2 font-mono text-[9px] text-slate-500 tracking-wider">
                      TIER {asset.tier}
                    </span>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-emerald-500/30 px-1.5 py-0.5 rounded-sm">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                      <span className="font-mono text-[8px] text-emerald-400 tracking-wider uppercase">
                        {Math.floor(POOL_LIQUIDITY_OZ / asset.weightOz)} Bars
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? "border-[#C6A86B] bg-[#C6A86B]" : "border-slate-600 bg-transparent"
                      }`}>
                        {isSelected && <div className="h-1 w-1 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                  </div>

                  {/* Data Grid */}
                  <div className="p-3">
                    <h3 className="font-mono text-xs text-white font-bold mb-0.5">{asset.name}</h3>
                    <p className="font-mono text-[10px] text-slate-600 mb-2">{asset.description}</p>
                    <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-2">
                      <div>
                        <span className="font-mono text-[8px] text-slate-600 uppercase block mb-0.5">Premium</span>
                        <span className="font-mono text-[11px] text-[#C6A86B] font-bold tabular-nums">
                          +{(asset.premiumBps / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-mono text-[8px] text-slate-600 uppercase block mb-0.5">Price/oz</span>
                        <span className="font-mono text-[11px] text-white tabular-nums">${fmt(pricePerOz)}</span>
                      </div>
                      <div>
                        <span className="font-mono text-[8px] text-slate-600 uppercase block mb-0.5">Per Bar</span>
                        <span className="font-mono text-[11px] text-white font-bold tabular-nums">
                          ${fmt(pricePerOz * asset.weightOz)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── RIGHT: Execution Configuration Panel (Horizontal Stepper) ─── */}
        <div className="w-[450px] shrink-0 flex flex-col border-l border-slate-800 bg-slate-900/30">
          {/* ── Panel Header + Step Indicator ── */}
          <div className="shrink-0 border-b border-slate-800 px-3 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3 w-3 text-slate-500" />
              <h2 className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase">
                {phase === "QUOTE_LOCKED" ? "Locked Execution Terms" : "Execution Configuration"}
              </h2>
            </div>
            {/* Step indicators */}
            {hasSelection && (
              <div className="flex items-center gap-1">
                {([1, 2, 3] as PanelStep[]).map((step) => (
                  <button
                    key={step}
                    onClick={() => {
                      if (phase === "QUOTE_LOCKED" && step < 3) return;
                      setPanelStep(step);
                    }}
                    disabled={phase === "QUOTE_LOCKED" && step < 3}
                    className={`flex-1 py-1.5 font-mono text-[9px] tracking-wider uppercase text-center transition-all cursor-pointer disabled:cursor-not-allowed border-b-2 ${
                      panelStep === step
                        ? "text-[#C6A86B] border-[#C6A86B]"
                        : step < panelStep
                          ? "text-emerald-500/70 border-emerald-500/30"
                          : "text-slate-600 border-slate-800 hover:text-slate-400"
                    }`}
                  >
                    {step}. {PANEL_STEP_LABELS[step]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Panel Body — renders only the active step ── */}
          <div className="flex-1 min-h-0 overflow-hidden p-4">
            {hasSelection ? (
              <>
                {/* ═══ STEP 1: Execution Config ═══ */}
                {panelStep === 1 && (
                  <div className="flex-1 min-h-0 flex flex-col gap-2">
                    {/* Selected Instrument */}
                    <div className="flex items-center gap-2.5 bg-black/40 border border-slate-800/60 px-2.5 py-2">
                      <div className="relative h-8 w-8 shrink-0 rounded-sm overflow-hidden bg-slate-800">
                        <Image src={selectedAsset.imageUrl} alt={selectedAsset.shortName} width={32} height={32} className="object-contain" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[8px] text-slate-600 tracking-wider uppercase">Instrument</span>
                        <span className="font-mono text-xs text-white font-bold">{selectedAsset.shortName}</span>
                      </div>
                      {selectedAsset.isApex && (
                        <span className="ml-auto font-mono text-[8px] bg-[#C6A86B]/15 text-[#C6A86B] px-1.5 py-0.5 tracking-wider uppercase border border-[#C6A86B]/20">
                          APEX
                        </span>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1.5">
                        Quantity (Units)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={phase === "QUOTE_LOCKED"}
                          className="h-7 w-7 bg-slate-800 border border-slate-700 font-mono text-white text-xs flex items-center justify-center hover:border-slate-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          value={quantity}
                          disabled={phase === "QUOTE_LOCKED"}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-7 w-14 bg-black border border-slate-700 text-center font-mono text-xs text-white tabular-nums focus:border-[#C6A86B] focus:outline-none disabled:opacity-40"
                        />
                        <button
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={phase === "QUOTE_LOCKED"}
                          className="h-7 w-7 bg-slate-800 border border-slate-700 font-mono text-white text-xs flex items-center justify-center hover:border-slate-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >+</button>
                        <span className="font-mono text-[9px] text-slate-500 ml-1">
                          = {fmt(totalWeightOz, 2)} oz
                        </span>
                      </div>
                    </div>

                    {/* Delivery Mode */}
                    <div>
                      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1.5">
                        Custody &amp; Delivery
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleDeliveryModeChange("VAULT")}
                          disabled={phase === "QUOTE_LOCKED"}
                          className={`p-2 border text-left transition-all duration-200 cursor-pointer disabled:cursor-not-allowed relative ${
                            deliveryMode === "VAULT"
                              ? "bg-[#C6A86B]/10 border-[#C6A86B] ring-1 ring-[#C6A86B]/40 shadow-[0_0_12px_rgba(198,168,107,0.15)]"
                              : "bg-slate-950 border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          {deliveryMode === "VAULT" && (
                            <div className="absolute top-1.5 right-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#C6A86B]" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Vault className={`h-3 w-3 ${deliveryMode === "VAULT" ? "text-[#C6A86B]" : "text-slate-400"}`} />
                            <span className={`font-mono text-[11px] font-bold ${deliveryMode === "VAULT" ? "text-[#C6A86B]" : "text-white"}`}>Vaulting</span>
                          </div>
                          <p className="font-mono text-[8px] text-slate-500 leading-relaxed">
                            Allocated sovereign freeport custody.
                          </p>
                        </button>
                        <button
                          onClick={() => handleDeliveryModeChange("PHYSICAL")}
                          disabled={phase === "QUOTE_LOCKED"}
                          className={`p-2 border text-left transition-all duration-200 cursor-pointer disabled:cursor-not-allowed relative ${
                            deliveryMode === "PHYSICAL"
                              ? "bg-[#C6A86B]/10 border-[#C6A86B] ring-1 ring-[#C6A86B]/40 shadow-[0_0_12px_rgba(198,168,107,0.15)]"
                              : "bg-slate-950 border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          {deliveryMode === "PHYSICAL" && (
                            <div className="absolute top-1.5 right-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#C6A86B]" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Truck className={`h-3 w-3 ${deliveryMode === "PHYSICAL" ? "text-[#C6A86B]" : "text-slate-400"}`} />
                            <span className={`font-mono text-[11px] font-bold ${deliveryMode === "PHYSICAL" ? "text-[#C6A86B]" : "text-white"}`}>Physical</span>
                          </div>
                          <p className="font-mono text-[8px] text-slate-500 leading-relaxed">
                            Armored transit, fully insured.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Destination */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Globe className="h-3 w-3 text-slate-500" />
                        <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase">
                          {deliveryMode === "VAULT" ? "Vault Location" : "Delivery Destination"}
                        </span>
                      </div>
                      <select
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        disabled={phase === "QUOTE_LOCKED"}
                        className="w-full bg-slate-950 border border-slate-700 px-2.5 py-2 font-mono text-xs text-white focus:border-[#C6A86B] focus:ring-1 focus:ring-[#C6A86B]/30 focus:outline-none transition-colors appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <option value="" disabled>
                          {deliveryMode === "VAULT" ? "Select vault location…" : "Select delivery destination…"}
                        </option>
                        {destinations.map((dest) => (
                          <option key={dest.value} value={dest.value}>
                            {dest.label} · {dest.region} · +{dest.transitBps} bps
                          </option>
                        ))}
                      </select>
                      {!destination && (
                        <p className="mt-1 font-mono text-[8px] text-red-400/70">
                          Required to calculate transit costs
                        </p>
                      )}
                    </div>

                    {/* Insurance Badge */}
                    <div className="border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                        <Shield className="h-3 w-3 text-emerald-400" />
                        <span className="font-mono text-[9px] text-emerald-400 tracking-wider uppercase font-bold">
                          Lloyd&apos;s Specie Policy — ACTIVE
                        </span>
                      </div>
                    </div>

                  </div>
                )}

                {/* ═══ STEP 2: Capital Routing ═══ */}
                {panelStep === 2 && (
                  <div className="flex-1 min-h-0 flex flex-col gap-3">
                    {/* Settlement Rail */}
                    <div>
                      <span className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase block mb-1.5">
                        Settlement Rail
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSettlementRail("FEDWIRE")}
                          disabled={phase === "QUOTE_LOCKED"}
                          className={`p-2.5 border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            settlementRail === "FEDWIRE"
                              ? "bg-slate-950 border-[#C6A86B]/50"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Landmark className="h-3 w-3 text-slate-400" />
                            <span className="font-mono text-[11px] text-white font-bold">Fedwire RTGS</span>
                          </div>
                          <p className="font-mono text-[8px] text-slate-500 leading-relaxed">
                            Bank wire via Federal Reserve. T+0.
                          </p>
                        </button>
                        <button
                          onClick={() => setSettlementRail("TURNKEY_USDT")}
                          disabled={phase === "QUOTE_LOCKED"}
                          className={`p-2.5 border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            settlementRail === "TURNKEY_USDT"
                              ? "bg-slate-950 border-[#C6A86B]/50"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Wallet className="h-3 w-3 text-slate-400" />
                            <span className="font-mono text-[11px] text-white font-bold">USDT (ERC-20)</span>
                          </div>
                          <p className="font-mono text-[8px] text-slate-500 leading-relaxed">
                            Stablecoin via Turnkey MPC.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Full Cost Breakdown */}
                    {destination && (
                      <div className="bg-black border border-slate-800/60 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3 w-3 text-slate-500" />
                          <h3 className="font-mono text-slate-500 text-[9px] tracking-[0.15em] uppercase font-bold">
                            Complete Cost Derivation
                          </h3>
                        </div>

                        <div className="space-y-0">
                          <CostRow
                            label={`Base Spot (${fmt(totalWeightOz, 0)} oz × $${fmt(spotPrice)})`}
                            value={baseSpotValue}
                          />
                          <CostRow
                            label={`Asset Premium (+${(selectedAsset.premiumBps / 100).toFixed(2)}%)`}
                            value={assetPremium}
                            accent
                          />
                          {deliveryMode === "PHYSICAL" && (
                            <CostRow
                              label={`Physical Premium (+${(PHYSICAL_PREMIUM_BPS / 100).toFixed(2)}%)`}
                              value={physicalPremium}
                              accent
                            />
                          )}
                          <CostRow
                            label={`${deliveryMode === "VAULT" ? "Vault Transit" : "Armored Transit"} (+${selectedDest?.transitBps ?? 0} bps)`}
                            value={transitCost}
                            accent
                          />
                          {deliveryMode === "PHYSICAL" && insuranceCost > 0 && (
                            <CostRow
                              label={`Specie Insurance (+${(selectedDest as typeof DELIVERY_DESTINATIONS[number])?.insuranceBps ?? 0} bps)`}
                              value={insuranceCost}
                              accent
                            />
                          )}
                          {deliveryMode === "VAULT" && selectedDest && (
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                              <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase pr-4">
                                Annual Custody ({(selectedDest as typeof VAULT_DESTINATIONS[number]).annualCustodyBps} bps/yr)
                              </span>
                              <span className="font-mono text-[9px] text-slate-600 tabular-nums">
                                billed separately
                              </span>
                            </div>
                          )}
                          <CostRow
                            label="Platform Fee (1.00%)"
                            value={platformFee}
                            accent
                          />

                          <div className="border-t border-[#C6A86B]/30 my-1" />

                          <div className="flex items-center justify-between py-2">
                            <span className="font-mono text-[9px] text-[#C6A86B] tracking-widest uppercase font-bold">
                              Total Execution Amount
                            </span>
                            <span className="font-mono text-lg text-[#C6A86B] font-bold tabular-nums">
                              ${fmt(totalExecutionAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* Limit Warning */}
                    {limitWarning && (
                      <div className={`border p-2.5 ${
                        limitBlocked
                          ? "bg-red-950/30 border-red-500/50"
                          : "bg-amber-950/30 border-amber-500/50"
                      }`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`h-3 w-3 mt-0.5 shrink-0 ${
                            limitBlocked ? "text-red-400" : "text-amber-400"
                          }`} />
                          <div>
                            <p className={`font-mono text-[9px] leading-relaxed ${
                              limitBlocked ? "text-red-400" : "text-amber-400"
                            }`}>
                              {limitWarning}
                            </p>
                            {!limitBlocked && (
                              <p className="font-mono text-[8px] text-amber-500/60 mt-0.5">
                                This transaction will be held for manual compliance review.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ STEP 3: Review & Execute (Quote Locked) ═══ */}
                {panelStep === 3 && (
                  <div className="flex-1 min-h-0 flex flex-col gap-3">
                    {/* Timer */}
                    {phase === "QUOTE_LOCKED" && (
                      <div className={`border p-3 ${
                        secondsLeft <= 15
                          ? "bg-red-950/30 border-red-500/50"
                          : "bg-slate-950 border-[#C6A86B]/50"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-[#C6A86B]" />
                            <span className="font-mono text-[11px] text-white tracking-wider uppercase">
                              Price Locked
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            <span className={`font-mono text-lg tabular-nums font-bold ${
                              secondsLeft <= 15 ? "text-red-400 animate-pulse" : "text-[#C6A86B]"
                            }`}>
                              {timerDisplay}
                            </span>
                          </div>
                        </div>
                        <p className="font-mono text-[8px] text-slate-500 mt-1.5">
                          All prices frozen. Execute before expiry.
                        </p>
                      </div>
                    )}

                    {/* Wire / Stablecoin Instructions */}
                    {phase === "QUOTE_LOCKED" && (
                      <div className="bg-black border border-slate-800/60 p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Lock className="h-3 w-3 text-slate-500" />
                          <span className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase">
                            {settlementRail === "TURNKEY_USDT" ? "Stablecoin Deposit (USDT)" : "Funds Routing (Fedwire)"}
                          </span>
                        </div>
                        {settlementRail === "TURNKEY_USDT" ? (
                          <div className="space-y-2">
                            <WireField label="Network" value="Ethereum Mainnet" />
                            <WireField label="Token" value="USDT (Tether) — ERC-20" />
                            <WireField label="MPC Provider" value="Turnkey (Enterprise Custody)" />
                            <WireField label="Deposit Address" value="Generated upon execution" />
                            <div className="bg-amber-500/5 border border-amber-500/20 p-2 mt-2">
                              <div className="flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                <p className="font-mono text-[8px] text-amber-400/80 leading-relaxed">
                                  Unique MPC address generated after execution. Send exact USDT on Ethereum mainnet only.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <WireField label="Receiving Institution" value="Column N.A." />
                            <WireField label="ABA Routing" value="121000248" />
                            <WireField label="Beneficiary" value="AurumShield Escrow FBO Offtaker" />
                            <WireField label="Reference" value="QTE-AURM-2026-EXEC" />
                            <div className="bg-amber-500/5 border border-amber-500/20 p-2 mt-2">
                              <div className="flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
                                <p className="font-mono text-[8px] text-amber-400/80 leading-relaxed">
                                  Funds must arrive via Fedwire before 18:45 ET for T+0 clearing.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Execution Total */}
                    <div className="bg-black/40 border border-[#C6A86B]/20 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] text-[#C6A86B] tracking-widest uppercase font-bold">
                          Total Amount
                        </span>
                        <span className="font-mono text-xl text-[#C6A86B] font-bold tabular-nums">
                          ${fmt(totalExecutionAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Legal Disclaimer */}
                    {phase === "QUOTE_LOCKED" && (
                      <div className="border border-slate-800/50 p-2.5">
                        <p className="font-mono text-[8px] text-slate-600 leading-relaxed">
                          By clicking &quot;Confirm Execution&quot; you acknowledge this constitutes a binding
                          commitment to purchase the specified asset(s) at the locked price. The settlement
                          amount must be remitted in full via {settlementRail === "TURNKEY_USDT" ? "ERC-20 USDT on Ethereum mainnet" : "Fedwire RTGS"} within the specified window.
                          AurumShield acts as principal counterparty.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* ── Empty State ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="h-10 w-10 rounded-sm bg-slate-800 flex items-center justify-center mb-3">
                  <BarChart3 className="h-4 w-4 text-slate-600" />
                </div>
                <p className="font-mono text-[11px] text-slate-500 leading-relaxed mb-1.5">
                  Select an asset from the liquidity pool to configure execution.
                </p>
                <p className="font-mono text-[9px] text-slate-700">
                  Choose delivery mode, destination, and view the full cost breakdown.
                </p>
              </div>
            )}
          </div>

          {/* ── Sticky CTA Footer — locked outside scroll area ── */}
          <div className="shrink-0 p-4 border-t border-slate-800 bg-slate-950">
            {hasSelection ? (
              <>
                {panelStep === 3 && phase === "CONFIGURING" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPanelStep(2)}
                      className="flex-1 font-mono text-xs text-slate-400 border border-slate-700 py-2.5 flex items-center justify-center gap-1.5 hover:border-slate-600 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                  </div>
                )}

                {panelStep === 3 && phase === "QUOTE_LOCKED" && (
                  <button
                    onClick={handleConfirmExecution}
                    disabled={isExecuting}
                    className={`w-full font-bold text-xs tracking-[0.15em] uppercase py-3.5 flex items-center justify-center gap-2 font-mono transition-colors ${
                      isExecuting
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                        : "bg-[#C6A86B] text-slate-950 hover:bg-[#d4b87a] cursor-pointer"
                    }`}
                  >
                    {isExecuting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Initializing Escrow...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Execution
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}

                {panelStep === 1 && (
                  <button
                    disabled={!step1Complete}
                    onClick={() => setPanelStep(2)}
                    className={`w-full font-bold text-xs tracking-[0.15em] uppercase py-3 flex items-center justify-center gap-2 font-mono transition-colors ${
                      step1Complete
                        ? "bg-[#C6A86B] text-slate-950 hover:bg-[#d4b87a] cursor-pointer"
                        : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                    }`}
                  >
                    Next: Capital Routing
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}

                {panelStep === 2 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPanelStep(1)}
                      className="flex-1 font-mono text-xs text-slate-400 border border-slate-700 py-2.5 flex items-center justify-center gap-1.5 hover:border-slate-600 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Back
                    </button>
                    <button
                      disabled={!canLockQuote || limitBlocked}
                      onClick={handleLockQuote}
                      className={`flex-2 font-bold text-xs tracking-widest uppercase py-2.5 flex items-center justify-center gap-2 font-mono transition-colors ${
                        canLockQuote && !limitBlocked
                          ? "bg-[#C6A86B] text-slate-950 hover:bg-[#d4b87a] cursor-pointer"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Lock 60s Quote
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wide text-center mt-2">
                  Cryptographically binding · IP logged · BSA/AML
                </p>
              </>
            ) : (
              <p className="font-mono text-[9px] text-slate-600 text-center">
                Select an asset to begin
              </p>
            )}
          </div>
        </div>
      </div>

      <TelemetryFooter />
    </div>
  );
}

/* ================================================================
   INLINE HELPERS
   ================================================================ */

function CostRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
      <span className="font-mono text-[9px] text-slate-500 tracking-wider uppercase pr-4">
        {label}
      </span>
      <span className={`font-mono text-xs tabular-nums font-bold ${accent ? "text-[#C6A86B]" : "text-white"}`}>
        ${fmt(value)}
      </span>
    </div>
  );
}

function WireField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-mono text-[8px] text-slate-600 tracking-[0.15em] uppercase block mb-0.5">
        {label}
      </span>
      <span className="font-mono text-[11px] text-white block">{value}</span>
    </div>
  );
}
