"use client";

/* ================================================================
   GOLDWIRE — SIMPLIFIED RETAIL LANDING PAGE
   ================================================================
   Premium retail-focused variant for A/B testing.
   Uses brand design system from marketing-landing.tsx:
   Navy #0A1128 base, gold #c6a86b accent, glassmorphism cards.

   Database-wired waitlist via joinWaitlist server action.
   ================================================================ */

import { useActionState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { joinWaitlist, type WaitlistResult } from "@/actions/leads";
import {
  Shield,
  Truck,
  Lock,
  CheckCircle2,
  ArrowRight,
  Gem,
  Banknote,
  PackageCheck,
  Send,
  ChevronRight,
  Vault,
  FileCheck,
} from "lucide-react";

/* ── Animation ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const GLASS =
  "bg-white/[0.02] border border-slate-800 rounded-md hover:border-gold/30 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/* ── Overline label (brand pattern) ── */
function Overline({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="h-px w-8 bg-gold/50" />
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
        {children}
      </p>
    </div>
  );
}

/* ── Section wrapper ── */
function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ================================================================
   1. HERO — Split-screen layout
   ================================================================ */
function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,rgba(198,168,107,0.06),transparent)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 py-28 lg:grid-cols-2 lg:gap-20 lg:py-36">
        {/* Left: Copy + CTAs */}
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-gold">
                Now accepting clients
              </span>
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-heading text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-white"
          >
            Buy Real Gold.
            <br />
            <span className="text-gold">Safely. Simply.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-lg text-lg leading-relaxed text-gray-300"
          >
            No confusing charts. No hidden fees. Just real physical gold —
            vaulted securely in Zurich or delivered to your door in an armored
            truck.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <a
              href="/onboarding"
              id="hero-buy-gold"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-8 py-4 text-base font-bold text-slate-950 shadow-lg shadow-gold/10 transition-all hover:bg-gold-hover active:scale-[0.98]"
            >
              Buy Gold <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="/onboarding"
              id="hero-sell-gold"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.12] px-8 py-4 text-base font-semibold text-white transition-all hover:border-gold/40 active:scale-[0.98]"
            >
              Sell Gold
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={fadeUp}
            className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-800 pt-8"
          >
            {[
              "LBMA Accredited Refiners",
              "Insured Custody",
              "DvP Settlement",
            ].map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 text-xs text-gray-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-gold/70" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Right: Premium visual card */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="hidden lg:block"
        >
          <div className="relative">
            {/* Glow behind */}
            <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-gold/[0.04] blur-3xl" />

            <div className="relative rounded-xl border border-slate-800 bg-[#0A1128] p-8 shadow-2xl shadow-black/40">
              {/* Mock dashboard header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <Gem className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Gold Bullion</p>
                    <p className="text-[10px] text-gray-500">99.99% Fine Gold · LBMA Certified</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-[10px] font-bold text-emerald-400">LIVE</span>
                </span>
              </div>

              {/* Price display */}
              <div className="mb-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-1">Spot Price (XAU/USD)</p>
                <p className="font-mono text-4xl font-bold tabular-nums text-white">$2,342<span className="text-xl text-gray-400">.50</span></p>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "24h Change", value: "+1.2%", color: "text-emerald-400" },
                  { label: "Vault", value: "Zurich", color: "text-white" },
                  { label: "Finality", value: "T+0", color: "text-gold" },
                ].map((s) => (
                  <div key={s.label} className="rounded-md border border-slate-800 bg-white/[0.02] p-3">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500 mb-1">{s.label}</p>
                    <p className={`font-mono text-sm font-bold tabular-nums ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ================================================================
   2. ASSET GRID — Premium glassmorphism bento cards
   ================================================================ */
const ASSETS = [
  {
    title: "Gold Bullion",
    desc: "Standard 99.99% pure gold bars from LBMA-accredited refiners. The ultimate safe-haven asset, stored in sovereign-grade vaults.",
    Icon: Gem,
    stat: "99.99%",
    statLabel: "Purity",
  },
  {
    title: "Gold Doré",
    desc: "Unrefined gold for high-volume buyers sourcing direct from vetted mine originators. Premium wholesale pricing.",
    Icon: Banknote,
    stat: "$2,342",
    statLabel: "Spot / oz",
  },
  {
    title: "Gold Nuggets",
    desc: "Raw, natural gold straight from the earth. Authenticated provenance with full chain-of-custody documentation.",
    Icon: Shield,
    stat: "100%",
    statLabel: "Insured",
  },
] as const;

function AssetGrid() {
  return (
    <RevealSection className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div variants={fadeUp}>
          <Overline>What You Can Buy</Overline>
          <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white max-w-2xl">
            Three Forms of Physical Gold
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-300">
            Pick the form that fits your goals. Every asset is fully insured, vault-stored, and backed by an unforgeable digital title.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {ASSETS.map((a) => (
            <motion.div
              key={a.title}
              variants={fadeUp}
              className={`${GLASS} group relative overflow-hidden p-8`}
            >
              {/* Hover glow */}
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-gold/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="relative z-10">
                {/* Icon + Stat */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gold/10 border border-gold/20">
                    <a.Icon className="h-6 w-6 text-gold" />
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-bold tabular-nums text-white">{a.stat}</p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">{a.statLabel}</p>
                  </div>
                </div>

                <h3 className="font-heading text-lg font-bold text-white mb-2">
                  {a.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {a.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   3. HOW TO BUY & SELL — Bento grid layout
   ================================================================ */
const BUY_STEPS = [
  { num: "01", label: "Pick Your Gold", detail: "Browse our catalog of LBMA-certified bullion, doré, or natural nuggets.", Icon: Gem },
  { num: "02", label: "Wire the Funds", detail: "Send a bank wire to our FBO escrow account. Funds held with Column N.A.", Icon: Banknote },
  { num: "03", label: "Vault or Deliver", detail: "Keep it in our insured Swiss vault or have it shipped via armored carrier.", Icon: PackageCheck },
];
const SELL_STEPS = [
  { num: "01", label: "Tell Us What You Have", detail: "Submit your gold details and provenance documentation.", Icon: FileCheck },
  { num: "02", label: "Insured Pickup", detail: "We dispatch a Brink's armored truck to securely collect your gold.", Icon: Truck },
  { num: "03", label: "Get Paid Instantly", detail: "Once assayed and verified, funds are wired directly to your bank account.", Icon: Banknote },
];

function HowItWorksSection() {
  return (
    <RevealSection className="py-20 lg:py-28 border-y border-slate-800">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-4">
              <div className="h-px w-8 bg-gold/50" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                How It Works
              </p>
              <div className="h-px w-8 bg-gold/50" />
            </div>
          </div>
          <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white">
            Three Steps. That&apos;s It.
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Buy Column */}
          <motion.div variants={fadeUp} className={`${GLASS} overflow-hidden`}>
            <div className="border-b border-slate-800 bg-gold/[0.04] px-6 py-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-gold" />
              </div>
              <h3 className="font-heading text-base font-bold text-white uppercase tracking-wide">
                Buying Gold
              </h3>
            </div>
            <div className="p-6 space-y-5">
              {BUY_STEPS.map((s) => (
                <div key={s.num} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-gold/30 bg-[#0A1128]">
                    <span className="font-mono text-xs font-bold text-gold">{s.num}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-xs leading-relaxed text-gray-400 mt-0.5">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Sell Column */}
          <motion.div variants={fadeUp} className={`${GLASS} overflow-hidden`}>
            <div className="border-b border-slate-800 bg-white/[0.02] px-6 py-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-gold rotate-180" />
              </div>
              <h3 className="font-heading text-base font-bold text-white uppercase tracking-wide">
                Selling Gold
              </h3>
            </div>
            <div className="p-6 space-y-5">
              {SELL_STEPS.map((s) => (
                <div key={s.num} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-gold/30 bg-[#0A1128]">
                    <span className="font-mono text-xs font-bold text-gold">{s.num}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-xs leading-relaxed text-gray-400 mt-0.5">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   4. VAULT VS. DELIVERY — Bento box cards
   ================================================================ */
function DeliveryVaultingSection() {
  return (
    <RevealSection className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div variants={fadeUp}>
          <Overline>Your Gold, Your Rules</Overline>
          <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white max-w-2xl">
            Keep It Stored or Hold It in Your Hands
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-300">
            The choice is always yours. Both options are fully insured and legally in your name.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {/* Vault Card */}
          <motion.div variants={fadeUp} className={`${GLASS} group relative overflow-hidden`}>
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-gold/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10 p-8 lg:p-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gold/10 border border-gold/20">
                  <Vault className="h-7 w-7 text-gold" strokeWidth={1.5} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-[10px] font-bold text-emerald-400">RECOMMENDED</span>
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-white mb-3">
                The Swiss Vault
              </h3>
              <p className="text-sm leading-relaxed text-gray-300 mb-6">
                Don&apos;t want to hide it under your mattress? We store it for you in
                a world-class, high-security vault. Fully insured by Lloyd&apos;s of
                London and legally allocated in your name.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Location", value: "Zurich, CHE" },
                  { label: "Insurance", value: "Lloyd's of London" },
                  { label: "Access", value: "24/7 Digital" },
                  { label: "Audit", value: "Annual Published" },
                ].map((f) => (
                  <div key={f.label} className="rounded border border-slate-800 bg-white/[0.02] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">{f.label}</p>
                    <p className="text-xs font-semibold text-white mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Delivery Card */}
          <motion.div variants={fadeUp} className={`${GLASS} group relative overflow-hidden`}>
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-gold/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10 p-8 lg:p-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gold/10 border border-gold/20">
                  <Truck className="h-7 w-7 text-gold" strokeWidth={1.5} />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1">
                  <span className="font-mono text-[10px] font-bold text-gold">ARMED ESCORT</span>
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-white mb-3">
                The Armored Truck
              </h3>
              <p className="text-sm leading-relaxed text-gray-300 mb-6">
                Want to hold it in your hands? We use professional armored
                carriers (Brink&apos;s Global Services) to deliver your gold
                straight to your door, fully insured the entire ride.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Carrier", value: "Brink's Global" },
                  { label: "Insurance", value: "Full Transit" },
                  { label: "Tracking", value: "Real-time GPS" },
                  { label: "Delivery", value: "Signature Req." },
                ].map((f) => (
                  <div key={f.label} className="rounded border border-slate-800 bg-white/[0.02] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">{f.label}</p>
                    <p className="text-xs font-semibold text-white mt-0.5">{f.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   5. DIGITAL TITLE + GOLDWIRE GUARANTEE — Combined trust section
   ================================================================ */
function TrustSection() {
  return (
    <RevealSection className="py-20 lg:py-28 border-y border-slate-800">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div variants={fadeUp} className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-4">
              <div className="h-px w-8 bg-gold/50" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
                Security & Trust
              </p>
              <div className="h-px w-8 bg-gold/50" />
            </div>
          </div>
          <h2 className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white">
            Built So You Never Have to Worry
          </h2>
        </motion.div>

        {/* Bento grid — 3 trust cards */}
        <div className="grid gap-5 md:grid-cols-3">
          {/* Digital warrant */}
          <motion.div variants={fadeUp} className={`${GLASS} p-8 md:col-span-2`}>
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gold/10 border border-gold/20">
                <FileCheck className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Digital Warrant of Title
                </h3>
                <p className="text-sm leading-relaxed text-gray-300 max-w-lg">
                  When you buy gold with us, you don&apos;t just get a receipt. You
                  get an unforgeable, mathematical document proving exactly
                  which gold bars belong to you — right down to the serial
                  numbers. Cryptographically signed. Tamper-proof. Verifiable by
                  anyone, anywhere, at any time.
                </p>
              </div>
            </div>
          </motion.div>

          {/* DvP Lock */}
          <motion.div variants={fadeUp} className={`${GLASS} p-8`}>
            <Lock className="h-8 w-8 text-gold mb-5" />
            <h3 className="font-heading text-lg font-semibold text-white mb-2">
              Zero Risk Settlement
            </h3>
            <p className="text-sm leading-relaxed text-gray-300">
              Your money and the gold are exchanged simultaneously inside
              our escrow engine. Nobody gets cheated. Ever.
            </p>
            <p className="mt-4 font-mono text-[10px] text-gold/70 uppercase tracking-widest">
              Delivery-vs-Payment (DvP)
            </p>
          </motion.div>

          {/* Insurance */}
          <motion.div variants={fadeUp} className={`${GLASS} p-8`}>
            <Shield className="h-8 w-8 text-gold mb-5" />
            <h3 className="font-heading text-lg font-semibold text-white mb-2">
              Fully Insured
            </h3>
            <p className="text-sm leading-relaxed text-gray-300">
              Every ounce is underwritten by Lloyd&apos;s of London syndicates.
              In transit or in the vault — coverage never stops.
            </p>
          </motion.div>

          {/* KYC/AML */}
          <motion.div variants={fadeUp} className={`${GLASS} p-8 md:col-span-2`}>
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gold/10 border border-gold/20">
                <CheckCircle2 className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Regulated & Compliant
                </h3>
                <p className="text-sm leading-relaxed text-gray-300 max-w-lg">
                  Full KYC/AML verification. OFAC, EU, and UN sanctions screening.
                  SOC 2 Type II audited infrastructure. We exceed every major
                  regulatory standard so you can buy and sell with confidence.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   6. WAITLIST — Database-wired lead capture
   ================================================================ */
function WaitlistSection() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<WaitlistResult | null, FormData>(
    joinWaitlist,
    null,
  );
  const showSuccess = state?.success === true;

  return (
    <RevealSection className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="border border-slate-800 bg-[#0B0E14] rounded-md overflow-hidden shadow-2xl">
          <div className="p-10 sm:p-16 flex flex-col items-center text-center">
            <Lock className="h-10 w-10 text-gold mb-6 opacity-80" />

            <motion.h2
              variants={fadeUp}
              className="font-heading text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white mb-4"
            >
              Want Early Access?
              <br />
              <span className="text-gold">Join the Waitlist.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-base text-gray-400 max-w-md mx-auto mb-10 leading-relaxed"
            >
              Be the first to know when we launch. No spam. Just gold.
            </motion.p>

            {showSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-8"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-lg font-bold text-white">You&apos;re on the list!</p>
                <p className="text-sm text-gray-400">We&apos;ll let you know as soon as early access opens.</p>
              </motion.div>
            ) : (
              <form
                ref={formRef}
                action={formAction}
                className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row"
              >
                <div className="flex-1">
                  <label htmlFor="waitlist-email" className="sr-only">Email address</label>
                  <input
                    id="waitlist-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-md border border-slate-700 bg-[#0A1128] px-4 py-3.5 text-white placeholder-gray-500 outline-none transition-all focus:border-gold focus:ring-2 focus:ring-gold/30 font-mono text-sm"
                  />
                  {state?.error && !state.success && (
                    <p className="mt-2 text-left text-sm text-red-400">{state.error}</p>
                  )}
                </div>
                <button
                  id="waitlist-submit"
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-gold/10 transition-all hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                      Joining…
                    </span>
                  ) : (
                    <>
                      Secure My Spot <Send className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="border-t border-slate-800 bg-white/[0.02] px-6 py-5 text-center">
            <p className="font-mono text-[10px] sm:text-xs text-gold tracking-[0.15em] uppercase font-semibold">
              [ VERIFIED ]: All transactions secured by deterministic DvP escrow and cryptographic clearing certificates.
            </p>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   NAV
   ================================================================ */
function SimpleNav() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-slate-800 bg-[#0A1128]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/simple-home" className="flex items-center gap-2">
          <Image
            src="/arum-logo-gold.svg"
            alt="Goldwire"
            width={120}
            height={28}
            className="h-6 w-auto"
            priority
            unoptimized
          />
        </Link>
        <div className="flex items-center gap-5">
          <a
            href="/login"
            className="hidden sm:inline-block text-sm font-semibold text-gray-400 transition-colors hover:text-white tracking-wide"
          >
            Sign In
          </a>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-md bg-gold px-5 py-2.5 text-sm font-bold text-slate-950 transition-all hover:bg-gold-hover active:scale-[0.98]"
          >
            Get Started <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ================================================================
   FOOTER
   ================================================================ */
function SimpleFooter() {
  return (
    <footer className="border-t border-slate-800 px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image
            src="/arum-logo-gold.svg"
            alt="Goldwire"
            width={100}
            height={24}
            className="h-5 w-auto"
            unoptimized
          />
        </div>
        <p className="text-xs text-gray-600">
          &copy; {new Date().getFullYear()} Goldwire Inc. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs text-gray-500">
          <a href="/legal" className="transition-colors hover:text-white">Legal</a>
          <a href="/legal" className="transition-colors hover:text-white">Privacy</a>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   PAGE EXPORT
   ================================================================ */
export default function SimpleHomePage() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white">
      <SimpleNav />
      <main className="pt-16">
        <HeroSection />
        <AssetGrid />
        <HowItWorksSection />
        <DeliveryVaultingSection />
        <TrustSection />
        <WaitlistSection />
      </main>
      <SimpleFooter />
    </div>
  );
}
