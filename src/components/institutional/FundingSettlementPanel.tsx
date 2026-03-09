"use client";

import { cn } from "@/lib/utils";
import {
  Landmark,
  Zap,
  Clock,
  Shield,
  CheckCircle2,
  ArrowRight,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ================================================================
   FundingSettlementPanel — Step 4
   ================================================================
   Side-by-side: Traditional Wire vs Goldwire Instant Settlement.
   
   The Goldwire "Pop": when the user clicks Goldwire, a distinct
   gold glow + "SETTLED" stamp animation fires immediately to
   contrast with the slow traditional wire option.
   ================================================================ */

type PaymentMethod = "wire" | "goldwire" | null;

interface FundingSettlementPanelProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  onContinue: () => void;
  totalAmount: number;
}

export function FundingSettlementPanel({
  paymentMethod,
  onPaymentMethodChange,
  onContinue,
  totalAmount,
}: FundingSettlementPanelProps) {
  const [goldwireSettled, setGoldwireSettled] = useState(false);

  const handleGoldwireClick = () => {
    onPaymentMethodChange("goldwire");
    // Trigger the "pop" animation after a brief delay
    setTimeout(() => setGoldwireSettled(true), 600);
  };

  const handleWireClick = () => {
    onPaymentMethodChange("wire");
    setGoldwireSettled(false);
  };

  const fmtUSD = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 p-6"
    >
      {/* ── Step Header ── */}
      <div>
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gold/60">
          — Step 4 of 5
        </p>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-white mt-1">
          Funding & Settlement
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Select your settlement rail. Goldwire offers instant T+0 finality.
          Traditional wire settles T+2.
        </p>
      </div>

      {/* ── Payment Amount Banner ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
            Total Settlement Amount
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-white mt-1">
            {fmtUSD(totalAmount)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/5 px-3 py-1">
          <Shield className="h-3 w-3 text-gold" />
          <span className="font-mono text-[9px] text-gold">ESCROW PROTECTED</span>
        </div>
      </div>

      {/* ── Side-by-side Payment Options ── */}
      <div className="grid grid-cols-2 gap-5">
        {/* Traditional Wire */}
        <button
          type="button"
          onClick={handleWireClick}
          className={cn(
            "rounded-xl border p-6 text-left transition-all relative overflow-hidden",
            paymentMethod === "wire"
              ? "border-slate-600 bg-slate-900/80"
              : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                paymentMethod === "wire" ? "bg-slate-700" : "bg-slate-800"
              )}
            >
              <Landmark
                className={cn(
                  "h-6 w-6",
                  paymentMethod === "wire" ? "text-slate-300" : "text-slate-500"
                )}
              />
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                Institutional Wire
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                Traditional Banking Rail
              </p>
            </div>
            {paymentMethod === "wire" && (
              <CheckCircle2 className="ml-auto h-5 w-5 text-slate-400" />
            )}
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Settlement Type</span>
              <span className="font-mono text-xs text-slate-300">
                Fedwire / SWIFT
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Settlement Time</span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-amber-400" />
                <span className="font-mono text-xs text-amber-300">T+2 Business Days</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Wire Fee</span>
              <span className="font-mono text-xs text-slate-300">$25.00</span>
            </div>
          </div>

          {paymentMethod === "wire" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-lg border border-slate-700 bg-slate-950/80 p-4 mt-3"
            >
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                Wire Instructions
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bank</span>
                  <span className="font-mono text-slate-300">
                    Column N.A.
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Routing #</span>
                  <span className="font-mono text-slate-300">
                    091311229
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Account #</span>
                  <span className="font-mono text-slate-300">
                    ••••••7842
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono text-gold text-[10px]">
                    GW-2026-03-09-INS-001
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Slow indicator */}
          <div className="mt-4 flex items-center gap-2 rounded border border-slate-800 bg-slate-950/50 px-3 py-2">
            <Clock className="h-3 w-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">
              Subject to banking hours and correspondent bank processing
            </span>
          </div>
        </button>

        {/* Goldwire Instant Settlement */}
        <button
          type="button"
          onClick={handleGoldwireClick}
          className={cn(
            "rounded-xl border p-6 text-left transition-all relative overflow-hidden",
            paymentMethod === "goldwire"
              ? "border-gold/60 bg-gold/5 shadow-[0_0_40px_rgba(198,168,107,0.12)]"
              : "border-slate-800 bg-slate-900/50 hover:border-gold/30"
          )}
        >
          {/* Gold glow effect when selected */}
          <AnimatePresence>
            {paymentMethod === "goldwire" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-linear-to-br from-gold/5 via-transparent to-gold/3 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl transition-all",
                  paymentMethod === "goldwire"
                    ? "bg-gold/15 shadow-[0_0_20px_rgba(198,168,107,0.2)]"
                    : "bg-slate-800"
                )}
              >
                <Zap
                  className={cn(
                    "h-6 w-6",
                    paymentMethod === "goldwire"
                      ? "text-gold"
                      : "text-slate-500"
                  )}
                />
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  Goldwire Network
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-gold">
                    Instant Settlement
                  </span>
                  <span className="rounded bg-gold/20 px-1.5 py-0.5 font-mono text-[8px] font-bold text-gold">
                    T+0
                  </span>
                </div>
              </div>
              {paymentMethod === "goldwire" && (
                <CheckCircle2 className="ml-auto h-5 w-5 text-gold" />
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Settlement Type</span>
                <span className="font-mono text-xs text-gold">
                  Atomic · Instant
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Settlement Time</span>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  <span className="font-mono text-xs text-emerald-300">
                    Instant (T+0 Finality)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Network Fee</span>
                <span className="font-mono text-xs text-gold">$0.00</span>
              </div>
            </div>

            {/* ── Goldwire "SETTLED" Stamp Animation ── */}
            <AnimatePresence>
              {goldwireSettled && paymentMethod === "goldwire" && (
                <motion.div
                  initial={{ scale: 3, opacity: 0, rotate: -15 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 18,
                    duration: 0.5,
                  }}
                  className="my-4 flex flex-col items-center justify-center rounded-xl border-2 border-emerald-500/50 bg-emerald-950/30 py-5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 mb-3"
                  >
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-emerald-300"
                  >
                    Settled
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="font-mono text-[10px] text-emerald-500/60 mt-1"
                  >
                    T+0 Finality · Atomic Execution
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>

            {!goldwireSettled && (
              <div className="mt-4 flex items-center gap-2 rounded border border-gold/20 bg-gold/5 px-3 py-2">
                <Globe className="h-3 w-3 text-gold" />
                <span className="text-[10px] text-gold">
                  Dual-authorization via WebAuthn required for amounts over
                  $10M
                </span>
              </div>
            )}
          </div>

          {/* Pulsing glow border animation */}
          {paymentMethod === "goldwire" && !goldwireSettled && (
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(198,168,107,0)",
                  "0 0 0 4px rgba(198,168,107,0.15)",
                  "0 0 0 0 rgba(198,168,107,0)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-xl pointer-events-none"
            />
          )}
        </button>
      </div>

      {/* ── Continue CTA ── */}
      <button
        type="button"
        onClick={onContinue}
        disabled={!paymentMethod}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-xl py-4 text-sm font-bold uppercase tracking-wider transition-all",
          paymentMethod
            ? "bg-gold text-black hover:bg-gold-hover hover:shadow-[0_0_30px_rgba(198,168,107,0.25)]"
            : "bg-slate-800 text-slate-500 cursor-not-allowed"
        )}
      >
        <ArrowRight className="h-4 w-4" />
        Proceed to Chain of Custody
      </button>
    </motion.div>
  );
}
