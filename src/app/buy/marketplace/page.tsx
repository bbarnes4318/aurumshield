"use client";

/* ================================================================
   PHASE 3: MARKETPLACE — Gold Product Selection
   ================================================================
   Three product categories with real-time pricing.
   Clean, premium card layout.
   ================================================================ */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Shield,
  Award,
  Gem,
  Flame,
} from "lucide-react";
import { useBuyerFlow } from "@/stores/buyer-flow-store";
import { useGoldPrice } from "@/hooks/use-gold-price";

const BRAND_GOLD = "#c6a86b";

/* ── Product Data ── */
interface GoldProduct {
  id: string;
  type: "bullion" | "nuggets" | "dore";
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  purity: string;
  minWeightOz: number;
  premiumPct: number;
  features: string[];
}

const PRODUCTS: GoldProduct[] = [
  {
    id: "refined-bullion",
    type: "bullion",
    title: "Gold Bullion",
    subtitle: "Investment Grade",
    description:
      "LBMA Good Delivery bars. The gold standard for institutional investors. Available in 1 oz, 10 oz, 1 kg, and 400 oz formats.",
    icon: Shield,
    purity: "99.99%",
    minWeightOz: 1,
    premiumPct: 2.5,
    features: [
      "LBMA certified",
      "Vaulted or shipped",
      "T+0 settlement",
      "Full insurance",
    ],
  },
  {
    id: "raw-nuggets",
    type: "nuggets",
    title: "Gold Nuggets",
    subtitle: "Natural Yield",
    description:
      "Natural geological specimens from verified mine sources. Each nugget authenticated with chain-of-custody documentation.",
    icon: Gem,
    purity: "Variable",
    minWeightOz: 0.5,
    premiumPct: 5.0,
    features: [
      "Origin certified",
      "Assay verified",
      "Collector grade",
      "Insured transit",
    ],
  },
  {
    id: "dore-bars",
    type: "dore",
    title: "Gold Doré",
    subtitle: "Refinery Pipeline",
    description:
      "Semi-refined alloy direct from mine operators. Ideal for refiners and industrial buyers seeking raw material at competitive spreads.",
    icon: Flame,
    purity: "80-90%",
    minWeightOz: 10,
    premiumPct: 1.5,
    features: [
      "Mine-direct sourcing",
      "Competitive spread",
      "Refinery ready",
      "Bulk available",
    ],
  },
];

/* ── Format USD ── */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ── Product Card ── */
function ProductCard({
  product,
  spotPrice,
  onSelect,
}: {
  product: GoldProduct;
  spotPrice: number;
  onSelect: (product: GoldProduct) => void;
}) {
  const pricePerOz = spotPrice * (1 + product.premiumPct / 100);
  const Icon = product.icon;

  return (
    <div className="group flex flex-col rounded-2xl border border-slate-800 bg-[#0d1829] transition-all duration-200 hover:border-[#c6a86b]/40 hover:shadow-[0_0_30px_rgba(198,168,107,0.06)]">
      {/* Card Header */}
      <div className="border-b border-slate-800/60 px-6 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/40">
              <Icon className="h-5 w-5" style={{ color: BRAND_GOLD }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {product.title}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                {product.subtitle}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold text-slate-400">
            {product.purity} pure
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col px-6 py-5">
        <p className="mb-5 text-sm leading-relaxed text-slate-400">
          {product.description}
        </p>

        {/* Features */}
        <div className="mb-6 grid grid-cols-2 gap-2">
          {product.features.map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <Award className="h-3 w-3 text-emerald-500/60" />
              <span className="text-[11px] text-slate-500">{f}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="mt-auto border-t border-slate-800/60 pt-4">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Price per oz
            </span>
            <div className="text-right">
              <span
                className="font-mono text-xl font-bold tabular-nums"
                style={{ color: BRAND_GOLD }}
              >
                ${fmtUSD(pricePerOz)}
              </span>
              <p className="text-[10px] text-slate-600">
                Spot + {product.premiumPct}% premium
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(product)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all active:scale-[0.98]"
            style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
          >
            Select {product.title}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function MarketplacePage() {
  const router = useRouter();
  const { canAccess, setSelectedProduct, completePhase } = useBuyerFlow();
  const { data: priceData } = useGoldPrice();

  if (!canAccess("shop")) {
    router.replace("/buy/verify");
    return null;
  }

  const spotPrice = priceData?.spotPriceUsd ?? 2650.0;

  const handleSelect = useCallback(
    (product: GoldProduct) => {
      setSelectedProduct({
        id: product.id,
        type: product.type,
        weightOz: product.minWeightOz,
      });
      completePhase("shop");
      router.push("/buy/checkout");
    },
    [setSelectedProduct, completePhase, router],
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Select Your Gold
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Choose from three product categories. All prices reflect live spot
          market rates.
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            spotPrice={spotPrice}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Trust Footer */}
      <div className="mt-8 text-center">
        <p className="text-[11px] text-slate-600">
          All allocations are settlement-gated. Pricing determined at order
          execution against live spot + published premium schedule.
        </p>
      </div>
    </div>
  );
}
