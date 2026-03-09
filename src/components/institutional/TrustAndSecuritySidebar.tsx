"use client";

import { cn } from "@/lib/utils";
import {
  Shield,
  ShieldCheck,
  Lock,
  BadgeCheck,
  TrendingUp,
  Fingerprint,
  Award,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ================================================================
   TrustAndSecuritySidebar
   ================================================================
   Persistent right sidebar that stays on screen during the entire
   wizard. Reminds the buyer of AML/KYC cleared status, Lloyd's
   insurance coverage, LBMA accreditation, and live spot price.
   ================================================================ */

/* ── Live Spot Price Simulation ── */
function useLiveSpotPrice(base: number) {
  const [price, setPrice] = useState(base);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const fluctuation = (Math.random() - 0.48) * 2.5;
      setPrice((prev) => {
        const next = prev + fluctuation;
        setDelta(next - base);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [base]);

  return { price, delta };
}

export function TrustAndSecuritySidebar() {
  const { price, delta } = useLiveSpotPrice(5171.92);
  const isPositive = delta >= 0;

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* ── Section Header ── */}
      <div className="mb-1">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
          — Trust Perimeter
        </p>
      </div>

      {/* ── AML / KYC Status ── */}
      <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-300">
              AML / KYC Cleared
            </p>
            <p className="font-mono text-[9px] text-emerald-500/70">
              Active ✓ Verified
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Entity Verification</span>
            <span className="font-mono text-[10px] font-medium text-emerald-400">
              PASSED
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">UBO Screening</span>
            <span className="font-mono text-[10px] font-medium text-emerald-400">
              CLEARED
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Sanctions Check</span>
            <span className="font-mono text-[10px] font-medium text-emerald-400">
              NO MATCH
            </span>
          </div>
        </div>
      </div>

      {/* ── Lloyd's Insurance ── */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10">
            <Shield className="h-4 w-4 text-gold" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              Lloyd&apos;s Specie Insurance
            </p>
            <p className="font-mono text-[9px] text-gold/60">
              Policy Active
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Coverage Limit</span>
            <span className="font-mono text-[10px] font-semibold text-gold">
              $100,000,000
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Underwriter</span>
            <span className="font-mono text-[10px] text-slate-400">
              Lloyd&apos;s of London
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Deductible</span>
            <span className="font-mono text-[10px] text-slate-400">
              $0 (First-Loss Wavier)
            </span>
          </div>
        </div>
      </div>

      {/* ── LBMA Accreditation ── */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10">
            <Award className="h-4 w-4 text-gold" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              LBMA Good Delivery
            </p>
            <p className="font-mono text-[9px] text-slate-500">
              Accredited Dealer
            </p>
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          All bars sourced from LBMA-accredited refiners. 995+ fine gold
          purity. Fully compliant with Responsible Gold Guidance.
        </p>
      </div>

      {/* ── Live Spot Price ── */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-3.5 w-3.5 text-gold" />
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-gold/70">
            Live Gold Spot (XAU/USD)
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold tabular-nums text-white">
            ${price.toFixed(2)}
          </span>
          <span
            className={cn(
              "font-mono text-xs font-semibold tabular-nums",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {isPositive ? "+" : ""}
            {delta.toFixed(2)}
          </span>
        </div>
        <p className="mt-1 font-mono text-[9px] text-slate-500">
          Per troy oz · Updated every 3s
        </p>
      </div>

      {/* ── Encrypted Session ── */}
      <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-3">
        <Lock className="h-3.5 w-3.5 text-emerald-400/70" />
        <div>
          <p className="text-[10px] font-medium text-slate-400">
            End-to-End Encrypted Session
          </p>
          <p className="font-mono text-[9px] text-slate-600">
            TLS 1.3 · AES-256-GCM · HSM-backed
          </p>
        </div>
      </div>

      {/* ── Compliance Badges ── */}
      <div className="mt-1 flex flex-wrap gap-2">
        {["SOC 2 Type II", "ISO 27001", "PCI DSS"].map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-slate-800 bg-slate-900/50 px-2.5 py-1 font-mono text-[9px] font-medium text-slate-500"
          >
            {badge}
          </span>
        ))}
      </div>
    </div>
  );
}
