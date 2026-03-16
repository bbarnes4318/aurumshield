"use client";

/* ================================================================
   COMPONENT 9 — FOOTER & FINAL CTA (v2 — Premium)
   ================================================================
   Dramatic closing block with shield emblem, gradient glow CTA,
   and trust indicator strip.
   ================================================================ */

import { motion } from "framer-motion";
import { ArrowRight, Shield, Lock, Globe, Scale } from "lucide-react";
import { useKycModal } from "../KycModal";

const TRUST_SIGNALS = [
  { icon: Lock, label: "Bank-Grade Encryption" },
  { icon: Scale, label: "Full Legal Bailment" },
  { icon: Globe, label: "Global Settlement" },
] as const;

export function LandingFooterCta() {
  const { open } = useKycModal();

  return (
    <section
      className="relative py-28 md:py-36 lg:py-44 overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* Dramatic radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[900px] w-[900px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(198,168,107,0.06) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        {/* Shield Emblem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-[#C6A86B]/30 bg-[#C6A86B]/5 shadow-[0_0_40px_rgba(198,168,107,0.15)]"
        >
          <Shield className="h-9 w-9 text-[#C6A86B]" strokeWidth={1.2} />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-5"
        >
          Stop gambling with paper.{" "}
          <span className="text-[#C6A86B]">
            Secure your legacy in physical gold.
          </span>
        </motion.h2>

        {/* Copy */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-base md:text-lg text-slate-400 leading-relaxed mb-10"
        >
          Build a crisis-resistant financial foundation with enterprise-grade
          security and mitigated counterparty risk.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <button
            onClick={open}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C6A86B] hover:bg-[#d9b96e] text-[#0A1128] font-bold px-10 py-4 text-base transition-all duration-200 shadow-[0_8px_30px_rgba(198,168,107,0.3)] hover:shadow-[0_12px_50px_rgba(198,168,107,0.45)]"
          >
            Create an Institutional Account
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-12 flex items-center justify-center gap-8 md:gap-10 flex-wrap"
        >
          {TRUST_SIGNALS.map((signal) => (
            <span
              key={signal.label}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500"
            >
              <signal.icon className="h-3.5 w-3.5 text-slate-600" strokeWidth={1.5} />
              {signal.label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
