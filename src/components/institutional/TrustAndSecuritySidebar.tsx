"use client";

import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Lock,
  Award,
  TrendingUp,
  Fingerprint,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useWizardStore, computeFees } from "./wizard-store";

/* ================================================================
   TrustAndSecuritySidebar — V2 ""Bloomberg Terminal"" Redesign
   ================================================================
   High-density, glassmorphism panels, premium iconography,
   dark-mode contrast. Fits entirely in sidebar with no scroll.
   ================================================================ */

function useLiveSpotPrice(base: number) {
  const [price, setPrice] = useState(base);
  const [delta, setDelta] = useState(0);
  const setSpot = useWizardStore((s) => s.setSpotPrice);

  useEffect(() => {
    const t = setInterval(() => {
      const f = (Math.random() - 0.48) * 2.5;
      setPrice((prev) => {
        const next = prev + f;
        setDelta(next - base);
        setSpot(next);
        return next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [base, setSpot]);

  return { price, delta };
}

export function TrustAndSecuritySidebar() {
  const { price, delta } = useLiveSpotPrice(5171.92);
  const isPositive = delta >= 0;
  const { barCount, logisticsCost } = useWizardStore();
  const fees = computeFees(barCount, price, logisticsCost);

  return (
    <div className="flex flex-col gap-2.5 p-3.5 h-full overflow-hidden">
      {/* ── Section Header ── */}
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-0.5">
        Trust Perimeter
      </p>

      {/* ── Live Spot Price ── */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 backdrop-blur-sm p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="h-3 w-3 text-gold" />
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-gold/70">
            Gold Spot XAU/USD
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-lg font-bold tabular-nums text-white">
            ${price.toFixed(2)}
          </span>
          <span
            className={cn(
              "font-mono text-[10px] font-semibold tabular-nums",
              isPositive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {isPositive ? "+" : ""}{delta.toFixed(2)}
          </span>
        </div>
        <p className="font-mono text-[8px] text-slate-600 mt-0.5">Per troy oz · 3s refresh</p>
      </div>

      {/* ── Running Total ── */}
      <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm p-3">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500 mb-1.5">
          Allocation Summary
        </p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-[9px] text-slate-500">{barCount} × 400oz Bars</span>
            <span className="font-mono text-[9px] tabular-nums text-slate-300">{(barCount * 400).toLocaleString()} oz</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[9px] text-slate-500">Gross Value</span>
            <span className="font-mono text-[9px] tabular-nums text-white">${(fees.grossValue / 1e6).toFixed(2)}M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[9px] text-slate-500">All-in Fee</span>
            <span className="font-mono text-[9px] tabular-nums text-gold">
              {((fees.platformFeeBps + fees.physicalPremiumBps) / 100).toFixed(2)}%
            </span>
          </div>
          {fees.totalWithLogistics > fees.subtotal && (
            <div className="flex justify-between">
              <span className="text-[9px] text-slate-500">Logistics</span>
              <span className="font-mono text-[9px] tabular-nums text-slate-300">
                +${logisticsCost.toLocaleString()}
              </span>
            </div>
          )}
          <hr className="border-slate-700/50" />
          <div className="flex justify-between">
            <span className="text-[9px] font-semibold text-white">Total</span>
            <span className="font-mono text-[10px] font-bold tabular-nums text-gold">
              ${(fees.totalWithLogistics / 1e6).toFixed(3)}M
            </span>
          </div>
        </div>
      </div>

      {/* ── AML / KYC Status ── */}
      <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/15 backdrop-blur-sm p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <p className="text-[10px] font-semibold text-emerald-300">AML / KYC Cleared</p>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {[
            ["Entity", "PASS"],
            ["UBO", "CLEARED"],
            ["Sanctions", "NO MATCH"],
            ["PEP Screen", "CLEAR"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[8px] text-slate-600">{k}</span>
              <span className="font-mono text-[8px] font-semibold text-emerald-400">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Lloyd's Insurance ── */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-800/20 backdrop-blur-sm p-3">
        <div className="flex items-center gap-2 mb-1">
          <Award className="h-3.5 w-3.5 text-gold" />
          <p className="text-[10px] font-semibold text-white">Lloyd&apos;s Specie Insurance</p>
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-[8px] text-slate-600">Coverage</span>
            <span className="font-mono text-[8px] font-semibold text-gold">$100,000,000</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[8px] text-slate-600">Type</span>
            <span className="font-mono text-[8px] text-slate-400">All-Risk Specie</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[8px] text-slate-600">Deductible</span>
            <span className="font-mono text-[8px] text-slate-400">$0 (First-Loss)</span>
          </div>
        </div>
      </div>

      {/* ── LBMA Badge ── */}
      <div className="rounded-lg border border-slate-700/40 bg-slate-800/20 backdrop-blur-sm p-3">
        <div className="flex items-center gap-2 mb-0.5">
          <Award className="h-3 w-3 text-gold" />
          <p className="text-[10px] font-semibold text-white">LBMA Good Delivery</p>
        </div>
        <p className="text-[8px] text-slate-500 leading-relaxed">
          995+ fine gold. Responsible Gold Guidance compliant. Accredited refiner sourcing.
        </p>
      </div>

      {/* ── Session & Encryption ── */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-800/40 bg-slate-900/20 px-3 py-2 mt-auto">
        <Lock className="h-3 w-3 text-emerald-400/60" />
        <div>
          <p className="text-[8px] font-medium text-slate-500">E2E Encrypted</p>
          <p className="font-mono text-[7px] text-slate-600">TLS 1.3 · AES-256 · HSM</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Fingerprint className="h-3 w-3 text-gold/40" />
          <span className="font-mono text-[7px] text-slate-600">WebAuthn</span>
        </div>
      </div>

      {/* ── Compliance Badges ── */}
      <div className="flex gap-1.5">
        {["SOC 2 II", "ISO 27001", "PCI DSS"].map((b) => (
          <span
            key={b}
            className="rounded border border-slate-800/40 bg-slate-900/30 px-1.5 py-0.5 font-mono text-[7px] text-slate-600"
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}
