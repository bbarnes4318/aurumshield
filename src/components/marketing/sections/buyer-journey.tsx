"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Fingerprint,
  FlaskConical,
  Lock,
  Zap,
  Truck,
  Vault,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ================================================================
   THE ULTIMATE BUYER'S JOURNEY: FROM PERIMETER TO VAULT
   ================================================================
   6-step institutional narrative that walks the investor through
   the entire gold procurement lifecycle, addressing every
   institutional concern at each stage.
   ================================================================ */

interface JourneyStep {
  icon: LucideIcon;
  phase: string;
  title: string;
  systemAction: string;
  investorCopy: string;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    icon: Fingerprint,
    phase: "Perimeter",
    title: "The Front Door",
    systemAction:
      "The system physically rejects passwords and SMS codes. It requires a biometric hardware-key signature (WebAuthn) and instantly runs automated OFAC and global sanctions screening.",
    investorCopy:
      "You aren't just logging into a website — you are stepping inside a mathematically sealed perimeter. By requiring a physical hardware key and running instant background checks, we ensure every actor inside this network is verified, solvent, and safe to trade with. You are protected before you even see the gold.",
  },
  {
    icon: FlaskConical,
    phase: "Marketplace",
    title: "Browsing the Gold",
    systemAction:
      "Every listed asset has already been filtered. Computer vision and direct refinery integrations verify that each bar has been melted, tested, and certified by an LBMA-accredited facility. Conflict-zone sourcing is structurally eliminated.",
    investorCopy:
      "You aren't guessing if the gold is pure or worrying about conflict sourcing. By the time an asset reaches this screen, we have mathematically verified its exact purity directly with the Swiss refinery. The supply chain fraud risk has already been eliminated.",
  },
  {
    icon: Lock,
    phase: "Execution",
    title: "Locking the Trade",
    systemAction:
      "The system instantly freezes the live XAU/USD spot price to prevent slippage and legally initiates the binding 100% indemnification contract.",
    investorCopy:
      "You aren't just locking in a price — you are locking in our full indemnity guarantee. From this exact millisecond forward, the fraud risk, the counterparty risk, and the supply chain risk belong to us, not you. Once you execute, your capital is fully protected.",
  },
  {
    icon: Zap,
    phase: "Settlement",
    title: "Paying for the Gold",
    systemAction:
      "An isolated, hardware-secured digital wallet is generated inside a secure enclave for this trade only. The system monitors the blockchain, and the instant funds arrive, legal title of the gold transfers atomically. No 3-day wire delays.",
    investorCopy:
      "You aren't wiring millions into a three-day banking black hole and hoping the seller doesn't go bankrupt over the weekend. This is an instant atomic swap. The exact second your funds clear, the physical gold legally becomes yours. The window for counterparty failure is reduced to absolute zero.",
  },
  {
    icon: Truck,
    phase: "Transit",
    title: "The Armored Radar",
    systemAction:
      "The platform automatically upgrades to a Tier-1 armored carrier (Malca-Amit, Brink's) for large orders, pulls live GPS telemetry, and instantly binds a customized Lloyd's of London insurance policy to the exact value of the metal in transit.",
    investorCopy:
      "You can watch the armored truck move live on your screen — but you don't have to stress about it. Because of our 100% indemnity coverage, if that truck disappears off the map, gets hijacked, or crashes, our clause triggers immediately. You are made whole. You lose nothing.",
  },
  {
    icon: Vault,
    phase: "Custody",
    title: "Final Delivery",
    systemAction:
      "The system logs final delivery into a cryptographically sealed, append-only audit trail. It guarantees 1-to-1 allocated custody — that specific, serial-numbered bar belongs to the buyer, completely walled off from any balance sheet.",
    investorCopy:
      "You receive the physical asset with zero anxiety from start to finish. You aren't buying a paper promise or a fractional share of a bank's vault — you own that exact physical bar. We have completely removed the risk of the physical commodities market, delivering pure capital preservation.",
  },
];

/* ── Motion Variants ── */
const sectionFade = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: "easeOut" as const,
    },
  }),
};

export function BuyerJourneySection() {
  return (
    <section
      id="buyer-journey"
      className="relative overflow-hidden"
      style={{ backgroundColor: "#070B14" }}
    >
      {/* Ambient gold glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(198,168,107,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:py-36">
        {/* ── Section Header ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={sectionFade}
          className="text-center max-w-3xl mx-auto mb-20 lg:mb-28"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-12 bg-[#C6A86B]/40" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#C6A86B]">
              The Buyer&apos;s Journey
            </p>
            <div className="h-px w-12 bg-[#C6A86B]/40" />
          </div>

          <h2
            className="text-[clamp(1.75rem,4vw,3rem)] font-bold tracking-tight leading-[1.15] text-white mb-6"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            From Perimeter to Vault.{" "}
            <span className="bg-linear-to-r from-[#D4AF37] to-[#F5EACF] bg-clip-text text-transparent">
              Zero Risk at Every Step.
            </span>
          </h2>

          <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Six phases. Six layers of protection. Every institutional concern —
            counterparty risk, supply chain fraud, transit loss, custody
            ambiguity — eliminated before you ever feel it.
          </p>
        </motion.div>

        {/* ── Journey Steps ── */}
        <div className="relative">
          {/* Vertical gold timeline rail (desktop) */}
          <div
            className="absolute left-[28px] top-0 bottom-0 w-px hidden lg:block"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(198,168,107,0.3) 10%, rgba(198,168,107,0.3) 90%, transparent 100%)",
            }}
          />

          <div className="space-y-6 lg:space-y-8">
            {JOURNEY_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.phase}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  variants={cardReveal}
                  className="group relative lg:pl-20"
                >
                  {/* ── Step Number Node (timeline dot) ── */}
                  <div className="hidden lg:flex absolute left-0 top-8 h-14 w-14 items-center justify-center rounded-xl border border-[#C6A86B]/40 bg-[#0A1128] z-20 transition-all duration-300 group-hover:border-[#C6A86B] group-hover:shadow-[0_0_20px_rgba(198,168,107,0.15)]">
                    <span className="font-mono text-lg font-bold text-[#C6A86B] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* ── Card ── */}
                  <div
                    className="relative rounded-2xl border border-white/6 overflow-hidden transition-all duration-500 group-hover:border-[#C6A86B]/30 group-hover:shadow-[0_4px_40px_rgba(198,168,107,0.06)]"
                    style={{
                      backgroundColor: "rgba(15, 20, 35, 0.5)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                    }}
                  >
                    {/* Top gold accent line on hover */}
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-linear-to-r from-transparent via-[#C6A86B]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="p-6 lg:p-8">
                      {/* Mobile step number + phase label */}
                      <div className="flex items-center gap-4 mb-5 lg:mb-0">
                        <div className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-[#C6A86B]/40 bg-[#0A1128]">
                          <span className="font-mono text-sm font-bold text-[#C6A86B] tabular-nums">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]/60">
                          Phase {i + 1} — {step.phase}
                        </span>
                      </div>

                      {/* Two-column: title + system / investor copy */}
                      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
                        {/* Left: What the system does */}
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C6A86B]/8 border border-[#C6A86B]/20 transition-colors duration-300 group-hover:bg-[#C6A86B]/12 group-hover:border-[#C6A86B]/40">
                              <Icon
                                className="h-5 w-5 text-[#C6A86B] transition-colors duration-300"
                                strokeWidth={1.5}
                              />
                            </div>
                            <h3
                              className="text-xl font-bold text-white tracking-tight"
                              style={{
                                fontFamily: "var(--font-inter), sans-serif",
                              }}
                            >
                              {step.title}
                            </h3>
                          </div>

                          <div className="pl-[52px]">
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                              What the system does
                            </p>
                            <p className="text-sm leading-relaxed text-slate-400">
                              {step.systemAction}
                            </p>
                          </div>
                        </div>

                        {/* Right: What it means for you */}
                        <div className="lg:border-l lg:border-white/6 lg:pl-12">
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldCheck
                              className="h-4 w-4 text-emerald-500/80"
                              strokeWidth={2}
                            />
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-500/70">
                              What this means for you
                            </p>
                          </div>
                          <p className="text-[0.9375rem] leading-[1.8] text-slate-300 italic">
                            &ldquo;{step.investorCopy}&rdquo;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Bottom CTA ── */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={sectionFade}
            className="mt-16 lg:mt-20 text-center"
          >
            <div className="inline-flex flex-col sm:flex-row items-center gap-4">
              <a
                href="/perimeter/register"
                className="inline-flex items-center gap-2 rounded-lg bg-[#C6A86B] hover:bg-[#d9b96e] text-[#0A1128] font-bold px-8 py-4 text-sm transition-all duration-200"
              >
                Request Institutional Access
              </a>
              <a
                href="#pipeline"
                className="inline-flex items-center gap-2 rounded-lg border border-[#C6A86B]/30 hover:border-[#C6A86B]/60 text-[#C6A86B] font-bold px-8 py-4 text-sm transition-all duration-200"
              >
                Review Settlement Lifecycle
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
