"use client";

/* ================================================================
   CHECKOUT — Transparent Order Review
   ================================================================
   Clean line-item breakdown: gold quote, transit, platform fee,
   optional assay. Soft 60s price lock. On confirm → /settlement.
   ================================================================ */

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Lock,
  Clock,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useGoldPrice } from "@/hooks/use-gold-price";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";

/* ── Format USD ── */
function fmtUSD(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ── Toggle Switch ── */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
    >
      <div
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
          checked
            ? "border-emerald-500/40 bg-emerald-500/20"
            : "border-border bg-surface-2"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full transition-transform duration-200 ${
            checked
              ? "translate-x-4 bg-emerald-400"
              : "translate-x-0.5 bg-slate-500"
          }`}
        />
      </div>
      <span className="text-xs text-slate-500">
        {checked ? "Included" : "Excluded"} — {label}
      </span>
    </button>
  );
}

/* ── Selected Product Type ── */
interface SelectedProduct {
  type: string;
  weightOz: number;
  premiumPct: number;
  title: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";
  const { data: priceData } = useGoldPrice();
  const spotPrice = priceData?.spotPriceUsd ?? 2650.0;

  const [assayEnabled, setAssayEnabled] = useState(true);
  const [lockCountdown, setLockCountdown] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  /* ── Load selected product from sessionStorage ── */
  const [selectedProduct] = useState<SelectedProduct | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("aurumshield:selectedProduct");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const weightOz = selectedProduct?.weightOz ?? 400;
  const premiumPct = selectedProduct?.premiumPct ?? 2.5;
  const productTitle = selectedProduct?.title ?? "Refined Bullion";

  /* ── Compute line items ── */
  const lineItems = useMemo(() => {
    const goldCost = spotPrice * (1 + premiumPct / 100) * weightOz;
    const transit = Math.max(1250, goldCost * 0.012);
    const platformFee = goldCost * 0.0015;
    const optionalAssay = assayEnabled ? 2400 : 0;

    return {
      goldCost,
      transit,
      platformFee,
      optionalAssay,
      grandTotal: goldCost + transit + platformFee + optionalAssay,
    };
  }, [spotPrice, premiumPct, weightOz, assayEnabled]);

  /* ── Price Lock Countdown ── */
  const handlePriceLock = useCallback(() => {
    if (lockCountdown !== null) return;
    setLockCountdown(60);
  }, [lockCountdown]);

  useEffect(() => {
    if (lockCountdown === null || lockCountdown <= 0) return;
    const timer = setTimeout(() => {
      setLockCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [lockCountdown]);

  const isLocked = lockCountdown !== null && lockCountdown > 0;

  /* ── Confirm Order ── */
  const handleConfirm = useCallback(() => {
    setConfirmed(true);

    // Persist order to sessionStorage for settlement page
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-XAU`;
    const orderSummary = {
      orderId,
      product: productTitle,
      weightOz,
      spotPrice,
      premiumPct,
      lineItems: {
        goldCost: lineItems.goldCost,
        transit: lineItems.transit,
        platformFee: lineItems.platformFee,
        assay: lineItems.optionalAssay,
        total: lineItems.grandTotal,
      },
      confirmedAt: new Date().toISOString(),
    };
    sessionStorage.setItem("aurumshield:order", JSON.stringify(orderSummary));

    // TODO: POST to /api/orders for DB persistence + settlement case creation
    // Defined interface: orderSummary object above

    const demoParam = isDemoActive ? "?demo=active" : "";
    setTimeout(() => {
      router.push(`/settlements${demoParam}`);
    }, 800);
  }, [router, isDemoActive, productTitle, weightOz, spotPrice, premiumPct, lineItems]);

  return (
    <div className="mx-auto max-w-xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Review Your Order
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Every fee is transparent. What you see is what you pay.
        </p>
      </div>

      {/* ── Line Items Card ── */}
      <div className="rounded-xl border border-border bg-surface-1 p-6">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Info className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-500">
            Order Breakdown — All values in USD
          </span>
        </div>

        <div className="divide-y divide-border">
          {/* Line 1: Gold */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {productTitle}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {weightOz} oz × ${fmtUSD(spotPrice * (1 + premiumPct / 100))}/oz
                (Spot + {premiumPct}%)
              </p>
            </div>
            <span className="font-mono text-base font-bold tabular-nums text-white">
              ${fmtUSD(lineItems.goldCost)}
            </span>
          </div>

          {/* Line 2: Transit & Insurance */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Transit &amp; Insurance
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Brink&apos;s armored delivery + Lloyd&apos;s specie insurance
              </p>
            </div>
            <span className="font-mono text-base font-bold tabular-nums text-white">
              ${fmtUSD(lineItems.transit)}
            </span>
          </div>

          {/* Line 3: Platform Fee */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                Platform Fee
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                AurumShield settlement infrastructure (15 bps)
              </p>
            </div>
            <span className="font-mono text-base font-bold tabular-nums text-white">
              ${fmtUSD(lineItems.platformFee)}
            </span>
          </div>

          {/* Line 4: Optional Assay */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p
                className={`text-sm font-semibold ${assayEnabled ? "text-slate-200" : "text-slate-600"}`}
              >
                Independent Assay &amp; Verification
              </p>
              <div className="mt-1.5">
                <Toggle
                  checked={assayEnabled}
                  onChange={setAssayEnabled}
                  label="$2,400.00"
                />
              </div>
            </div>
            <span
              className={`font-mono text-base font-bold tabular-nums ${assayEnabled ? "text-white" : "text-slate-700"}`}
            >
              ${fmtUSD(lineItems.optionalAssay)}
            </span>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-5 pb-2">
            <p className="text-sm font-bold text-white">Total</p>
            <span className="font-mono text-2xl font-bold tabular-nums text-gold">
              ${fmtUSD(lineItems.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Price Lock Section ── */}
      <div className="mt-6 rounded-xl border border-border bg-surface-1 p-6">
        {!isLocked && !confirmed ? (
          <>
            <div className="mb-4 flex items-center justify-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-center text-xs text-slate-400">
                Gold prices fluctuate. Lock your price for 60 seconds while you
                confirm.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePriceLock}
              className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-4 text-sm font-bold text-bg transition-all hover:bg-gold-hover active:scale-[0.98] ${isDemoActive ? DEMO_SPOTLIGHT_CLASSES : ""}`}
            >
              <Lock className="h-4 w-4" />
              Lock This Price
            </button>
          </>
        ) : isLocked && !confirmed ? (
          <div className="space-y-4">
            {/* Locked banner */}
            <div className="flex items-center justify-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 py-4">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">
                Price Locked
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-white">
                — {lockCountdown}s remaining
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-4 text-sm font-bold text-bg transition-all hover:bg-gold-hover active:scale-[0.98] ${isDemoActive ? DEMO_SPOTLIGHT_CLASSES : ""}`}
            >
              Confirm Order
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="text-sm font-bold text-emerald-400">
              Order Confirmed — Proceeding to Payment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
