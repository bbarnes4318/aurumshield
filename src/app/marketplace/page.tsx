"use client";

/* ================================================================
   MARKETPLACE — Gold Product Selection
   ================================================================
   Clean product cards with real-time spot pricing. Three products:
   Bullion, Nuggets, Doré. On select → navigate to /checkout.
   ================================================================ */

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useGoldPrice } from "@/hooks/use-gold-price";

/* ── Format USD ── */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ── Product Data ── */
interface Product {
  id: string;
  type: "bullion" | "nuggets" | "dore";
  title: string;
  description: string;
  features: string[];
  premiumPct: number;
  weightOz: number;
  weightLabel: string;
}

const PRODUCTS: Product[] = [
  {
    id: "refined-bullion",
    type: "bullion",
    title: "Refined Bullion",
    description:
      "400-oz LBMA Good Delivery bars. 99.99% fine gold. Vaulted or delivered via Brink's armored transit.",
    features: [
      "99.99% purity",
      "LBMA Good Delivery certified",
      "T+0 vaulted settlement",
      "Brink's armored delivery available",
    ],
    premiumPct: 2.5,
    weightOz: 400,
    weightLabel: "400 troy oz",
  },
  {
    id: "gold-nuggets",
    type: "nuggets",
    title: "Gold Nuggets",
    description:
      "Natural placer gold from vetted mine originators. Variable purity requires assay on receipt.",
    features: [
      "Natural alluvial gold",
      "Provenance-verified sourcing",
      "Independent assay included",
      "Wholesale pricing",
    ],
    premiumPct: 5.0,
    weightOz: 100,
    weightLabel: "100 troy oz",
  },
  {
    id: "dore-bars",
    type: "dore",
    title: "Gold Doré",
    description:
      "Semi-purified alloy bars direct from refinery pipeline. Highest margin potential for institutional buyers.",
    features: [
      "80-90% typical purity",
      "Refinery pipeline direct",
      "Lowest cost basis",
      "Requires final refinery assay",
    ],
    premiumPct: 1.5,
    weightOz: 200,
    weightLabel: "200 troy oz",
  },
];

export default function MarketplacePage() {
  const router = useRouter();
  const { data: priceData, isLoading } = useGoldPrice();

  const spotPrice = priceData?.spotPriceUsd ?? 2650.0;

  const handleSelect = useCallback(
    (product: Product) => {
      // Store selection in sessionStorage for checkout
      sessionStorage.setItem(
        "aurumshield:selectedProduct",
        JSON.stringify({
          type: product.type,
          weightOz: product.weightOz,
          premiumPct: product.premiumPct,
          title: product.title,
        }),
      );
      router.push("/checkout");
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Marketplace
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Select a product. All prices include the real-time spot rate.
          </p>
        </div>

        {/* Live Spot Price */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-4 py-2.5">
          <TrendingUp className="h-4 w-4 text-gold" />
          <span className="text-xs text-slate-400">Spot:</span>
          <span className="font-mono text-sm font-bold tabular-nums text-white">
            {isLoading ? "---" : `$${fmtUSD(spotPrice)}`}
          </span>
          <span className="text-xs text-slate-500">/oz</span>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {PRODUCTS.map((product) => {
          const pricePerOz = spotPrice * (1 + product.premiumPct / 100);
          const totalPrice = pricePerOz * product.weightOz;

          return (
            <div
              key={product.id}
              className="flex flex-col rounded-xl border border-border bg-surface-1 transition-all hover:border-gold/30"
            >
              {/* Card Header */}
              <div className="border-b border-border p-5">
                <h2 className="text-lg font-bold text-white">
                  {product.title}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {product.description}
                </p>
              </div>

              {/* Pricing */}
              <div className="border-b border-border p-5">
                <div className="mb-1 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    ${fmtUSD(pricePerOz)}
                  </span>
                  <span className="text-xs text-slate-500">/oz</span>
                </div>
                <p className="text-xs text-slate-500">
                  Spot + {product.premiumPct}% premium · {product.weightLabel}
                </p>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-2/50 px-3 py-2">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="font-mono text-sm font-bold tabular-nums text-gold">
                    ${fmtUSD(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="flex-1 p-5">
                <ul className="space-y-2">
                  {product.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                      <span className="text-xs text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-bg transition-all hover:bg-gold-hover active:scale-[0.98]"
                >
                  Select
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
