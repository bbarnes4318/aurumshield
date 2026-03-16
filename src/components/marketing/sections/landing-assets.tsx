"use client";

/* ================================================================
   COMPONENT 5 — THE ASSETS (v2 — Premium Vault Manifests)
   ================================================================
   2x2 grid of dramatic Vault Manifest cards with:
   - Accent gradient top borders
   - Large format indicators
   - Numbered manifest labels with golden accents
   - Richer visual treatment
   ================================================================ */

import { motion } from "framer-motion";
import { Box, Gem, Flame, Mountain } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Asset {
  icon: LucideIcon;
  title: string;
  description: string;
  specs: { label: string; value: string }[];
  accentColor: string;
}

const ASSETS: Asset[] = [
  {
    icon: Box,
    title: "400-Ounce Good Delivery Bars",
    description:
      "The undisputed backbone of global central banks. Maximum capital efficiency with virtually zero fabrication premiums.",
    specs: [
      { label: "Format", value: "Cast" },
      { label: "Standard", value: "LBMA" },
      { label: "Weight", value: "400 ozt" },
    ],
    accentColor: "from-[#C6A86B] to-[#9f8a4c]",
  },
  {
    icon: Gem,
    title: "Standard Bullion",
    description:
      "Highly liquid, LBMA-approved minted and cast bars for flexible, divisible wealth preservation.",
    specs: [
      { label: "Format", value: "Minted / Cast" },
      { label: "Purity", value: "99.99%" },
      { label: "Range", value: "1–100 ozt" },
    ],
    accentColor: "from-[#C6A86B] to-[#d3b77d]",
  },
  {
    icon: Flame,
    title: "Doré Bars",
    description:
      "Semi-pure alloy sourced directly from our verified miners. Secure raw physical wealth before the refinery markup.",
    specs: [
      { label: "Format", value: "Rough Alloy" },
      { label: "Provenance", value: "Direct Extraction" },
      { label: "Purity", value: "Variable" },
    ],
    accentColor: "from-amber-500 to-amber-700",
  },
  {
    icon: Mountain,
    title: "Raw Nuggets",
    description:
      "Direct-extraction physical assets with unassailable, ground-to-vault provenance.",
    specs: [
      { label: "Format", value: "Raw" },
      { label: "Provenance", value: "Ground-to-Vault" },
      { label: "Chain", value: "Verified" },
    ],
    accentColor: "from-amber-600 to-yellow-800",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.12,
      duration: 0.6,
      ease: "easeOut" as const,
    },
  }),
};

export function LandingAssets() {
  return (
    <section
      className="relative py-24 md:py-32 lg:py-36 overflow-hidden"
      style={{ backgroundColor: "#0d1628" }}
    >
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(198,168,107,0.04) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6">
        {/* Overline */}
        <div className="flex items-center gap-4 mb-5">
          <div className="h-px w-10 bg-[#C6A86B]/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]">
            The Assets
          </p>
        </div>

        {/* Headline */}
        <h2 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight max-w-3xl leading-tight mb-4">
          Institutional-Grade Assets.{" "}
          <span className="text-[#C6A86B]">Direct from the Source.</span>
        </h2>

        {/* Intro */}
        <p className="text-[15px] text-slate-400 leading-relaxed max-w-2xl mb-14">
          Whether you require standard liquidity or direct-extraction
          provenance, we provide access to the exact physical formats required
          by modern treasuries:
        </p>

        {/* 2×2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ASSETS.map((asset, i) => (
            <motion.div
              key={asset.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={cardVariants}
              className="group relative rounded-xl border border-slate-800 bg-[#0A1128] overflow-hidden transition-all duration-300 hover:border-[#C6A86B]/30 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
            >
              {/* Top accent gradient */}
              <div
                className={`h-[3px] w-full bg-linear-to-r ${asset.accentColor}`}
              />

              <div className="p-7 md:p-8">
                {/* Header row: manifest label + icon */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold text-[#C6A86B] uppercase tracking-[0.15em] border border-[#C6A86B]/25 rounded px-2.5 py-1 bg-[#C6A86B]/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C6A86B]" />
                      MANIFEST {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 transition-colors group-hover:border-[#C6A86B]/30 group-hover:bg-[#C6A86B]/5">
                    <asset.icon
                      className="h-5 w-5 text-slate-500 transition-colors group-hover:text-[#C6A86B]"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white tracking-tight mb-4">
                  {asset.title}
                </h3>

                {/* Spec Sheet */}
                <div className="mb-5 rounded-lg border border-slate-800/80 bg-slate-950/60 px-4 py-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-2.5">
                    {asset.specs.map((spec) => (
                      <div key={spec.label} className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                          {spec.label}:
                        </span>
                        <span className="font-mono text-[11px] font-bold text-[#C6A86B]">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-slate-400">
                  {asset.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
