"use client";

import { useState } from "react";
import { Shield, TrendingUp, Sparkles } from "lucide-react";
import { BuyPanel, type RetailProduct } from "@/components/retail/buy-panel";

/* ================================================================
   MOCK SPOT PRICE & PRODUCT CATALOG
   ================================================================ */

const MOCK_SPOT_PRICE = 2650.0;

const PRODUCTS: RetailProduct[] = [
  {
    id: "1oz-bar",
    name: "1 oz Gold Bar",
    shortName: "1 oz Bar",
    weightOz: 1,
    purity: "99.99% Pure Gold",
    subtext: "The standard starting point.",
    priceUsd: 2650,
  },
  {
    id: "10oz-bar",
    name: "10 oz Gold Bar",
    shortName: "10 oz Bar",
    weightOz: 10,
    purity: "99.99% Pure Gold",
    subtext: "Better value. Lower premium over spot.",
    priceUsd: 26280,
  },
  {
    id: "1kg-bar",
    name: "1 Kilo Gold Bar",
    shortName: "1 Kilo Bar",
    weightOz: 32.1507,
    purity: "99.99% Pure Gold",
    subtext: "The wealth builder's choice.",
    priceUsd: 84950,
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

/* ================================================================
   GOLD BAR VISUAL PLACEHOLDER
   ================================================================
   Large image container with gradient simulating gold bar appearance.
   Replace with actual product photography for production.
   ================================================================ */

function GoldBarVisual({ product }: { product: RetailProduct }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/30 via-yellow-800/20 to-amber-950/40 border border-amber-700/20">
      {/* Abstract gold bar silhouette */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Bar shape */}
          <div className="h-24 w-36 rounded-lg bg-gradient-to-br from-amber-400/60 via-yellow-500/50 to-amber-600/40 shadow-[inset_0_2px_20px_rgba(255,215,0,0.3),0_8px_32px_rgba(0,0,0,0.4)] border border-amber-400/30 sm:h-28 sm:w-40">
            {/* Surface sheen */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
            {/* Weight stamp */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-black text-amber-200/90 drop-shadow-lg sm:text-3xl">
                {product.weightOz >= 32 ? "1 KG" : `${product.weightOz} OZ`}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-300/60">
                .9999 Fine Gold
              </span>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-8 -z-10 rounded-full bg-amber-500/10 blur-2xl" />
        </div>
      </div>
      {/* Subtle noise overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}

/* ================================================================
   PRODUCT CARD
   ================================================================ */

function ProductCard({
  product,
  onBuy,
}: {
  product: RetailProduct;
  onBuy: (product: RetailProduct) => void;
}) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 transition-all duration-300 hover:border-slate-700 hover:shadow-2xl hover:shadow-amber-900/10 hover:-translate-y-1"
      data-interactive
    >
      {/* Image */}
      <div className="p-4 pb-0">
        <GoldBarVisual product={product} />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 pt-4">
        <h3 className="text-xl font-semibold text-slate-100">{product.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{product.subtext}</p>

        {/* Purity badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-amber-800/30 bg-amber-950/20 px-3 py-1">
          <Shield className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
            {product.purity}
          </span>
        </div>

        {/* Price */}
        <div className="mt-auto pt-5">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold tabular-nums text-white">
              ${formatUSD(product.priceUsd)}
            </span>
            <span className="text-sm text-slate-600">/bar</span>
          </div>
        </div>

        {/* Buy Button */}
        <button
          id={`buy-${product.id}`}
          type="button"
          onClick={() => onBuy(product)}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-500 hover:shadow-emerald-800/40 active:scale-[0.97]"
        >
          <Sparkles className="h-5 w-5" />
          Buy This Bar
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
    <div className="relative min-h-screen bg-slate-950 -mx-5 -mt-5 -mb-5 lg:-mx-8 px-4 sm:px-8 py-10">
      {/* ── Spot Price Ticker ── */}
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-amber-800/30 bg-amber-950/20 px-5 py-2.5 backdrop-blur-sm">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold tracking-wide text-amber-400/80">
              Live Spot
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-amber-400">
              ${formatUSD(MOCK_SPOT_PRICE)}
            </span>
            <span className="text-[10px] font-medium text-amber-600">/oz</span>
          </div>
        </div>

        {/* ── Hero Header ── */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
            Your Gold
          </h1>
          <p className="mt-3 text-lg text-slate-500">
            Pick a bar. Choose delivery. Get your wire instructions.
          </p>
        </div>

        {/* ── Product Grid ── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="h-px w-12 bg-slate-800" />
            <Shield className="h-5 w-5 text-slate-700" />
            <div className="h-px w-12 bg-slate-800" />
          </div>
          <p className="max-w-md text-xs leading-relaxed text-slate-600">
            All gold is allocated, insured, and stored in LBMA-certified vaults.
            Settlements execute via Fedwire through Column N.A. — a nationally chartered bank.
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
