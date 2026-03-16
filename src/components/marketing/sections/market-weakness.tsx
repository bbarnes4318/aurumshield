"use client";

import { motion } from "framer-motion";
import { FileWarning, SearchX, HandCoins } from "lucide-react";

/* ================================================================
   THE PROBLEM WITH BUYING GOLD — 3-Card Risk Layout
   ================================================================ */

const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" as const },
  },
};

const RISKS = [
  {
    icon: FileWarning,
    tag: "RISK 01",
    title: 'The "Paper Gold" Trap',
    body: "When you buy gold through a regular bank or ETF, you don\u2019t actually own the physical metal. You just own a promise from a bank. If that bank runs into financial trouble or goes bankrupt, your money is trapped, and you could lose your entire investment.",
  },
  {
    icon: SearchX,
    tag: "RISK 02",
    title: "The Risk of Fakes",
    body: "The physical gold market has a major problem with sophisticated counterfeits. Scammers often hollow out real gold bars and fill them with cheap, heavy metals (like tungsten). Unless you have access to advanced scanning technology, it is incredibly difficult to know if you\u2019ve been ripped off.",
  },
  {
    icon: HandCoins,
    tag: "RISK 03",
    title: "Middlemen Taking Your Money",
    body: "Buying through traditional brokers means paying hidden fees and high retail markups. Worse, it means handing over your private financial information to a long chain of unnecessary third parties.",
  },
] as const;

export function MarketWeaknessSection() {
  return (
    <section
      id="market-weakness"
      className="pt-24 lg:pt-32 pb-24 lg:pb-32"
      style={{ backgroundColor: "#0A1128" }}
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* ── Section Header ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={reveal}
          className="mb-16 max-w-3xl"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="h-px w-8 bg-gold/50" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
              THE PROBLEM
            </p>
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
            The Problem With Buying Gold the &ldquo;Normal&rdquo; Way
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
            When you buy precious metals through traditional channels, you are
            forced to accept three massive risks with your money:
          </p>
        </motion.div>

        {/* ── 3-Card Risk Grid ── */}
        <div className="grid gap-6 md:grid-cols-3">
          {RISKS.map((risk, i) => {
            const Icon = risk.icon;
            return (
              <motion.div
                key={risk.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { delay: i * 0.12, duration: 0.6 },
                  },
                }}
                className="group relative rounded-md border border-slate-800 bg-white/[0.02] p-8 transition-all duration-300 hover:border-rose-500/30 hover:bg-rose-500/[0.03]"
              >
                {/* Icon */}
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-slate-800 bg-white/[0.03] group-hover:border-rose-500/20 transition-colors">
                  <Icon className="h-5 w-5 text-rose-400" />
                </div>

                {/* Risk tag */}
                <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400/70">
                  {risk.tag}
                </span>

                {/* Title */}
                <h3 className="mb-3 text-lg font-semibold text-white">
                  {risk.title}
                </h3>

                {/* Body */}
                <p className="text-sm leading-relaxed text-gray-300">
                  {risk.body}
                </p>

                {/* Bottom accent */}
                <div className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-md bg-gradient-to-r from-transparent via-rose-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
