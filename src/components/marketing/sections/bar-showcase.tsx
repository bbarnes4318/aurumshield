"use client";

import { motion } from "framer-motion";

/* ================================================================
   INSTITUTIONAL BAR SHOWCASE
   ================================================================
   Photorealistic 400-oz gold bullion bar with data annotation
   tooltips. Replaces the old Three.js 3D spinning canvas.
   ================================================================ */

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.65, ease: "easeOut" as const },
  }),
};

/* ── Hallmark annotation data ── */
const HALLMARKS = [
  {
    label: "SERIAL NUMBER",
    value: "GD-2026-049817",
    detail: "Unique identifier assigned at pour. Cross-referenced against LBMA vault records for chain-of-custody verification.",
    position: { top: "18%", left: "8%" },
    lineAngle: "to-br",
  },
  {
    label: "REFINERY HALLMARK",
    value: "ARGOR-HERAEUS SA",
    detail: "LBMA-accredited since 1978. One of only 34 refiners worldwide authorized to produce Good Delivery bars. ISO 9001 certified.",
    position: { top: "18%", right: "8%" },
    lineAngle: "to-bl",
  },
  {
    label: "PURITY",
    value: "999.9",
    detail: "Minimum 995.0 per LBMA standard. Verified via non-destructive Ultrasonic Thickness Gauging and Four-Point Conductivity Scanning. Zero tolerance for deviation.",
    position: { bottom: "22%", left: "8%" },
    lineAngle: "to-tr",
  },
  {
    label: "ASSAY YEAR",
    value: "2026",
    detail: "Year of assay certification. Determines eligibility for Good Delivery status and positions the bar within the global refinery audit cycle.",
    position: { bottom: "22%", right: "8%" },
    lineAngle: "to-tl",
  },
] as const;

/* ── Spec card data ── */
const SPEC_CARDS = [
  {
    label: "Gross Weight",
    value: "400.000",
    unit: "troy oz",
    detail: "Cast ingot, LBMA tolerance ±0.025%",
  },
  {
    label: "Purity",
    value: "999.9",
    unit: "fineness",
    detail: "Minimum 995.0 per Good Delivery standard",
  },
  {
    label: "Standard",
    value: "LBMA GD",
    unit: "certified",
    detail: "London Bullion Market Association accredited",
  },
  {
    label: "Refinery",
    value: "Argor-Heraeus",
    unit: "SA, Switzerland",
    detail: "LBMA-accredited since 1978, ISO 9001 certified",
  },
] as const;

export function InstitutionalBarShowcase() {
  return (
    <section
      className="py-28 lg:py-40 relative overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Section Header ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          custom={0}
          variants={reveal}
          className="mb-16 max-w-3xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-px w-10"
              style={{ backgroundColor: "rgba(212,175,55,0.5)" }}
            />
            <p
              className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "#D4AF37" }}
            >
              400-OZ GOOD DELIVERY STANDARD
            </p>
          </div>
          <h2
            className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight leading-[1.15]"
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              color: "#f1f5f9",
            }}
          >
            Industrial Scale.{" "}
            <span style={{ color: "#94a3b8" }}>Institutional Precision.</span>
          </h2>
          <p
            className="mt-6 text-lg max-w-2xl"
            style={{ lineHeight: 1.75, color: "#cbd5e1" }}
          >
            This system categorically rejects ETFs, paper derivatives, and
            synthetic exposure. Every bar settled through the Goldwire network
            is a cast 400-troy-ounce LBMA Good Delivery bar — verified via
            Ultrasonic Thickness Gauging and Four-Point Conductivity Scanning
            — for absolute allocated sovereignty.
          </p>
        </motion.div>

        {/* ── Gold Bar with Annotations ── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          custom={1}
          variants={reveal}
          className="relative rounded-xl border border-slate-800/80 overflow-hidden"
          style={{ backgroundColor: "#060A10" }}
        >
          {/* Background ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 60%)",
            }}
          />

          {/* Annotation + Image Container */}
          <div className="relative w-full aspect-16/10 lg:aspect-16/8 flex items-center justify-center">
            {/* The Gold Bar Image */}
            <div className="relative z-10 w-[55%] sm:w-[50%] lg:w-[40%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gold-bar-400oz.png"
                alt="400 oz LBMA Good Delivery Gold Bar"
                className="w-full h-auto drop-shadow-[0_20px_60px_rgba(212,175,55,0.15)]"
              />
            </div>

            {/* ── Annotation Tooltips ── */}
            {HALLMARKS.map((hm, i) => (
              <motion.div
                key={hm.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                className="absolute z-20 group hidden md:block"
                style={{
                  ...hm.position,
                  maxWidth: "220px",
                }}
              >
                {/* Connecting dot */}
                <div
                  className="absolute h-2 w-2 rounded-full border border-gold/40 bg-gold/20 pointer-events-none"
                  style={{
                    ...(hm.lineAngle.includes("b")
                      ? { bottom: -4 }
                      : { top: -4 }),
                    ...(hm.lineAngle.includes("l")
                      ? { left: "50%" }
                      : { right: "50%" }),
                    transform: "translateX(-50%)",
                  }}
                />

                {/* Tooltip card */}
                <div
                  className="rounded-lg border border-white/8 px-4 py-3 transition-all duration-300 hover:border-gold/30 hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.1)] cursor-default"
                  style={{
                    backgroundColor: "rgba(10,17,40,0.90)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
                    {hm.label}
                  </span>
                  <span className="block font-mono text-sm font-bold text-white mb-1.5">
                    {hm.value}
                  </span>

                  {/* Expanded detail on hover */}
                  <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-[100px] group-hover:opacity-100 transition-all duration-300 ease-out">
                    <p className="text-[11px] leading-relaxed text-slate-400 pt-2 border-t border-white/6">
                      {hm.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Bottom HUD ── */}
          <div
            className="relative z-20 flex items-center justify-between px-6 py-3.5 border-t border-slate-800"
            style={{
              backgroundColor: "rgba(10,10,10,0.85)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                HOVER ANNOTATIONS FOR DETAILS
              </span>
            </div>
            <span
              className="hidden sm:block font-mono text-[9px] uppercase tracking-wider"
              style={{ color: "rgba(212,175,55,0.5)" }}
            >
              INSTITUTIONAL VIEW
            </span>
          </div>
        </motion.div>

        {/* ── Mobile Annotation Cards (visible below md) ── */}
        <div className="md:hidden mt-6 grid grid-cols-2 gap-3">
          {HALLMARKS.map((hm) => (
            <div
              key={hm.label}
              className="rounded-lg border border-white/8 px-4 py-3"
              style={{
                backgroundColor: "rgba(10,17,40,0.90)",
              }}
            >
              <span className="block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">
                {hm.label}
              </span>
              <span className="block font-mono text-sm font-bold text-white mb-1.5">
                {hm.value}
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {hm.detail}
              </p>
            </div>
          ))}
        </div>

        {/* ── Spec Card Grid ── */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SPEC_CARDS.map((card, i) => (
            <motion.div
              key={card.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              custom={i + 3}
              variants={reveal}
              className="group relative rounded-lg border border-slate-800/80 p-6 transition-all duration-300 hover:border-[rgba(212,175,55,0.3)]"
              style={{ backgroundColor: "#0D1320" }}
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-b from-[rgba(212,175,55,0.03)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-3">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-2xl font-bold tabular-nums text-white">
                    {card.value}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {card.unit}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-400 mt-3">
                  {card.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
