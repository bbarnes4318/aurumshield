"use client";

import { useState } from "react";
import Image from "next/image";
import { Shield, TrendingUp, ArrowRight, Award } from "lucide-react";
import { BuyPanel, type RetailProduct } from "@/components/retail/buy-panel";

/* ================================================================
   MOCK SPOT PRICE & PREMIUM CALCULATIONS
   ================================================================ */

const MOCK_SPOT_PRICE = 5171.92;

const UNSPLASH_GOLD_BAR =
  "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=800";

/**
 * Product 1: 1 oz Minted Gold Bar — Spot + 2.00% premium
 * Product 2: 10 oz Cast Gold Bar  — (Spot × 10) + 1.00% premium
 * Product 3: 1 Kilogram Gold Bar  — (Spot × 32.15) + 0.50% premium
 * Product 4: 400 oz Good Delivery — (Spot × 400) + 0.10% premium
 */

function calcPrice(spotPrice: number, weightOz: number, premiumPct: number): number {
  const basePrice = spotPrice * weightOz;
  return Math.round((basePrice * (1 + premiumPct / 100)) * 100) / 100;
}

const PRODUCTS: RetailProduct[] = [
  {
    id: "1oz-bar",
    name: "1 oz Minted Gold Bar",
    shortName: "1 oz Bar",
    weightOz: 1,
    purity: "99.99% Pure Gold",
    subtext: "The standard retail starting point.",
    priceUsd: calcPrice(MOCK_SPOT_PRICE, 1, 2.0),
    image: UNSPLASH_GOLD_BAR,
  },
  {
    id: "10oz-bar",
    name: "10 oz Cast Gold Bar",
    shortName: "10 oz Bar",
    weightOz: 10,
    purity: "99.99% Pure Gold",
    subtext: "Lower premium over spot.",
    priceUsd: calcPrice(MOCK_SPOT_PRICE, 10, 1.0),
    image: UNSPLASH_GOLD_BAR,
  },
  {
    id: "1kg-bar",
    name: "1 Kilogram Gold Bar",
    shortName: "1 Kilo Bar",
    weightOz: 32.15,
    purity: "99.99% Pure Gold",
    subtext: "The wealth builder's choice.",
    priceUsd: calcPrice(MOCK_SPOT_PRICE, 32.15, 0.5),
    image: UNSPLASH_GOLD_BAR,
  },
  {
    id: "400oz-bar",
    name: "400 oz Good Delivery Bar",
    shortName: "400 oz Bar",
    weightOz: 400,
    purity: "99.5%+ LBMA Certified",
    subtext: "THE INSTITUTIONAL STANDARD. Highest capital efficiency.",
    priceUsd: calcPrice(MOCK_SPOT_PRICE, 400, 0.1),
    image: UNSPLASH_GOLD_BAR,
    featured: true,
  },
];

/* ================================================================
   FORMAT HELPERS
   ================================================================ */

function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPremium(premiumPct: number): string {
  return `+${premiumPct.toFixed(2)}%`;
}

/* ================================================================
   PREMIUM METADATA PER PRODUCT (for display)
   ================================================================ */

const PREMIUM_MAP: Record<string, { premiumPct: number; specs: string }> = {
  "1oz-bar": {
    premiumPct: 2.0,
    specs: "1 troy oz | 99.99% Pure Gold",
  },
  "10oz-bar": {
    premiumPct: 1.0,
    specs: "10 troy oz | 99.99% Pure Gold",
  },
  "1kg-bar": {
    premiumPct: 0.5,
    specs: "32.15 troy oz | 99.99% Pure Gold",
  },
  "400oz-bar": {
    premiumPct: 0.1,
    specs: "400 troy oz | LBMA Accredited | Zero Counterparty Risk",
  },
};

/* ================================================================
   PRODUCT CARD — Dark glassmorphism with gold hover border
   ================================================================ */

function ProductCard({
  product,
  onBuy,
}: {
  product: RetailProduct;
  onBuy: (product: RetailProduct) => void;
}) {
  const isFeatured = product.featured === true;
  const meta = PREMIUM_MAP[product.id];

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#c6a86b]/8 ${
        isFeatured
          ? "border-2 border-[#c6a86b]/60 bg-slate-900/50 shadow-lg shadow-[#c6a86b]/10 backdrop-blur-sm"
          : "border border-white/10 bg-slate-900/50 backdrop-blur-sm hover:border-[#c6a86b]"
      }`}
      data-interactive
    >
      {/* ── Apex Asset Badge (400oz only) ── */}
      {isFeatured && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-[#c6a86b]/40 bg-[#c6a86b]/15 px-3 py-1 backdrop-blur-sm">
          <Award className="h-3 w-3 text-[#c6a86b]" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#c6a86b]">
            Apex Asset
          </span>
        </div>
      )}

      {/* ── Image with dark overlay ── */}
      <div className="relative overflow-hidden">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={UNSPLASH_GOLD_BAR}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(min-width: 1536px) 25vw, (min-width: 640px) 50vw, 100vw"
          />
          {/* Dark overlay — bg-black/40 per mandate */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Weight stamp on image */}
          <div className="absolute bottom-4 left-4 z-10">
            <span className="font-mono text-2xl font-black tabular-nums text-white drop-shadow-lg">
              {product.weightOz >= 32
                ? product.weightOz >= 400
                  ? "400 OZ"
                  : "1 KG"
                : `${product.weightOz} OZ`}
            </span>
          </div>

          {/* Premium % badge on image */}
          {meta && (
            <div className="absolute top-4 left-4 z-10 rounded-md border border-white/20 bg-black/50 px-2.5 py-1 backdrop-blur-sm">
              <span className="font-mono text-[11px] font-bold tabular-nums text-emerald-400">
                {formatPremium(meta.premiumPct)} over spot
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-white">{product.name}</h3>
        <p className="mt-1 text-sm text-gray-400">{product.subtext}</p>

        {/* Specs badge */}
        {meta && (
          <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-[#c6a86b]/20 bg-[#c6a86b]/5 px-3 py-1">
            <Shield className="h-3 w-3 text-[#c6a86b]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c6a86b]/80">
              {meta.specs}
            </span>
          </div>
        )}

        {/* Price — Live ticker style */}
        <div className="mt-auto pt-5">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-400/70">
              Live Price
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold tabular-nums text-white">
              ${formatUSD(product.priceUsd)}
            </span>
            <span className="text-xs text-gray-500">/bar</span>
          </div>
        </div>

        {/* ── Acquire This Asset — Premium gold button ── */}
        <button
          id={`buy-${product.id}`}
          type="button"
          onClick={() => onBuy(product)}
          className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-lg px-6 py-4 text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
            isFeatured
              ? "bg-[#c6a86b] text-slate-950 shadow-lg shadow-[#c6a86b]/15 hover:bg-[#d4b97a]"
              : "border border-[#c6a86b]/30 bg-[#c6a86b]/10 text-[#c6a86b] hover:bg-[#c6a86b]/20 hover:border-[#c6a86b]/50"
          }`}
        >
          Acquire This Asset
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   RETAIL DASHBOARD PAGE
   ================================================================ */

export default function RetailDashboardPage() {
  const [selectedProduct, setSelectedProduct] = useState<RetailProduct | null>(null);

  const handleBuy = (product: RetailProduct) => {
    setSelectedProduct(product);
  };

  const handleClosePanel = () => {
    setSelectedProduct(null);
  };

  return (
    <div className="relative min-h-screen bg-[#0A1128] -mx-5 -mt-5 -mb-5 lg:-mx-8 px-4 sm:px-8 py-10">
      <div className="mx-auto max-w-6xl">

        {/* ── Spot Price Ticker ── */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="inline-flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/50 px-5 py-2.5 backdrop-blur-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <TrendingUp className="h-4 w-4 text-[#c6a86b]" />
            <span className="text-xs font-semibold tracking-wide text-gray-400">
              XAU/USD
            </span>
            <div className="h-4 w-px bg-white/10" />
            <span className="font-mono text-lg font-bold tabular-nums text-white">
              ${formatUSD(MOCK_SPOT_PRICE)}
            </span>
            <span className="font-mono text-[10px] text-gray-500">/oz</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] font-bold text-emerald-400">LIVE</span>
            </span>
          </div>
        </div>

        {/* ── Hero Header ── */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-[#c6a86b]/50" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#c6a86b]">
              Sovereign Asset Catalog
            </p>
            <div className="h-px w-8 bg-[#c6a86b]/50" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Your Gold
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-gray-400">
            Select from LBMA-accredited bullion. Vault securely or schedule armored delivery.
          </p>
        </div>

        {/* ── Product Grid — 2×2 (4-col on massive screens) ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-4">
          {PRODUCTS.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onBuy={handleBuy}
            />
          ))}
        </div>

        {/* ── Trust Footer ── */}
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-4">
            <div className="h-px w-12 bg-white/10" />
            <Shield className="h-5 w-5 text-[#c6a86b]/40" />
            <div className="h-px w-12 bg-white/10" />
          </div>
          <p className="max-w-lg text-xs leading-relaxed text-gray-500">
            All gold is allocated, insured, and stored in LBMA-certified Malca-Amit vaults.
            Settlements execute via Fedwire through Column N.A. — a nationally chartered bank.
            Every transaction is cryptographically sealed with a SHA-256 clearing certificate.
          </p>
        </div>
      </div>

      {/* ── Slide-Out Buy Panel ── */}
      {selectedProduct && (
        <BuyPanel product={selectedProduct} onClose={handleClosePanel} />
      )}
    </div>
  );
}
