"use client";

import { useState } from "react";
import Image from "next/image";
import { Shield, TrendingUp, ArrowRight } from "lucide-react";
import { BuyPanel, type RetailProduct } from "@/components/retail/buy-panel";

/* ================================================================
   MOCK SPOT PRICE & PRODUCT CATALOG
   ================================================================ */

const MOCK_SPOT_PRICE = 2650.0;

const PRODUCTS: RetailProduct[] = [
  {
    id: "1oz-bar",
    name: "1 oz Minted Gold Bar",
    shortName: "1 oz Bar",
    weightOz: 1,
    purity: "99.99% Pure Gold",
    subtext: "The standard starting point.",
    priceUsd: 2650,
    image: "/assets/gold-1oz.png",
  },
  {
    id: "10oz-bar",
    name: "10 oz Cast Gold Bar",
    shortName: "10 oz Bar",
    weightOz: 10,
    purity: "99.99% Pure Gold",
    subtext: "Lower premium over spot.",
    priceUsd: 26280,
    image: "/assets/gold-10oz.png",
  },
  {
    id: "1kg-bar",
    name: "1 Kilo Gold Bar",
    shortName: "1 Kilo Bar",
    weightOz: 32.1507,
    purity: "99.99% Pure Gold",
    subtext: "The wealth builder's choice.",
    priceUsd: 84950,
    image: "/assets/gold-1kg.png",
  },
  {
    id: "400oz-bar",
    name: "400 oz Good Delivery Bar",
    shortName: "400 oz Bar",
    weightOz: 400,
    purity: "99.5%+ LBMA Certified",
    subtext: "The institutional standard.",
    priceUsd: Math.round(MOCK_SPOT_PRICE * 400),
    image: "/assets/gold-400oz.png",
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

/* ================================================================
   PRODUCT CARD — Premium glassmorphism with photorealistic image
   ================================================================ */

function ProductCard({
  product,
  onBuy,
}: {
  product: RetailProduct;
  onBuy: (product: RetailProduct) => void;
}) {
  const isFeatured = "featured" in product && product.featured;

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-md border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-gold/5 ${
        isFeatured
          ? "border-gold/30 bg-white/[0.03] shadow-lg shadow-gold/5 lg:col-span-2 lg:flex-row"
          : "border-slate-800 bg-white/[0.02]"
      }`}
      data-interactive
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${isFeatured ? "lg:w-1/2" : ""}`}>
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={product.image!}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={isFeatured ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 640px) 50vw, 100vw"}
          />
          {/* Dark overlay for text contrast */}
          <div className="absolute inset-0 bg-linear-to-t from-[#0A1128] via-[#0A1128]/30 to-transparent" />

          {/* Weight stamp on image */}
          <div className="absolute bottom-4 left-4">
            <span className="font-mono text-2xl font-black tabular-nums text-white/90 drop-shadow-lg">
              {product.weightOz >= 32
                ? product.weightOz >= 400
                  ? "400 OZ"
                  : "1 KG"
                : `${product.weightOz} OZ`}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-1 flex-col p-6 ${isFeatured ? "lg:p-8 lg:justify-center" : ""}`}>
        {/* Featured badge */}
        {isFeatured && (
          <div className="mb-4 inline-flex items-center gap-1.5 self-start rounded-full border border-gold/30 bg-gold/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gold">
              Institutional Standard
            </span>
          </div>
        )}

        <h3 className={`font-heading font-bold text-white ${isFeatured ? "text-2xl" : "text-lg"}`}>
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-gray-400">{product.subtext}</p>

        {/* Purity badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-full border border-gold/20 bg-gold/5 px-3 py-1">
          <Shield className="h-3 w-3 text-gold" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold/80">
            {product.purity}
          </span>
        </div>

        {/* Price — Live ticker style */}
        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-400/70">
              Live Price
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`font-mono font-bold tabular-nums text-white ${isFeatured ? "text-4xl" : "text-3xl"}`}>
              ${formatUSD(product.priceUsd)}
            </span>
            <span className="text-xs text-gray-500">/bar</span>
          </div>
        </div>

        {/* Buy Button — Premium gold accent */}
        <button
          id={`buy-${product.id}`}
          type="button"
          onClick={() => onBuy(product)}
          className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-md px-6 py-4 text-sm font-bold transition-all active:scale-[0.97] ${
            isFeatured
              ? "bg-gold text-slate-950 shadow-lg shadow-gold/10 hover:bg-gold-hover"
              : "border border-gold/30 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold/50"
          }`}
        >
          Acquire This Bar
          <ArrowRight className="h-4 w-4" />
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
          <div className="inline-flex items-center gap-3 rounded-md border border-slate-800 bg-white/[0.02] px-5 py-2.5 backdrop-blur-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <TrendingUp className="h-4 w-4 text-gold" />
            <span className="text-xs font-semibold tracking-wide text-gray-400">
              XAU/USD
            </span>
            <div className="h-4 w-px bg-slate-800" />
            <span className="font-mono text-lg font-bold tabular-nums text-white">
              ${formatUSD(MOCK_SPOT_PRICE)}
            </span>
            <span className="font-mono text-[10px] text-gray-500">/oz</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] font-bold text-emerald-400">LIVE</span>
            </span>
          </div>
        </div>

        {/* ── Hero Header ── */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-8 bg-gold/50" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              Sovereign Asset Catalog
            </p>
            <div className="h-px w-8 bg-gold/50" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Your Gold
          </h1>
          <p className="mt-3 text-base text-gray-400 max-w-md mx-auto">
            Select from LBMA-accredited bullion. Vault securely or schedule armored delivery.
          </p>
        </div>

        {/* ── Product Grid — 2-col with featured spanning full width ── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
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
            <Shield className="h-5 w-5 text-gold/40" />
            <div className="h-px w-12 bg-slate-800" />
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
