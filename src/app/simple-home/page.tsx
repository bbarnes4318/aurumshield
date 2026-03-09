"use client";

/* ================================================================
   GOLDWIRE — ELI5 LANDING PAGE (A/B Variant: simple-home)
   ================================================================
   Radically simplified, retail-focused landing page for A/B testing
   against the institutional terminal at /.

   Dark Brutalism Lite aesthetic. Massive Outfit typography.
   Database-wired waitlist form via joinWaitlist server action.
   ================================================================ */

import { useActionState, useRef } from "react";
import { motion } from "framer-motion";
import { joinWaitlist, type WaitlistResult } from "@/actions/leads";
import {
  Shield,
  Truck,
  Vault,
  Lock,
  CheckCircle2,
  ArrowRight,
  Gem,
  Flame,
  Mountain,
  Send,
  PackageCheck,
  Banknote,
  Eye,
  FileCheck,
  ChevronRight,
} from "lucide-react";

/* ── Framer Motion shared variants ── */

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ── Reusable motion wrapper for sections ── */
function RevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ================================================================
   1. HERO
   ================================================================ */
function HeroSection() {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden px-6 py-32">
      {/* Subtle radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.08),transparent)]" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="relative z-10 mx-auto max-w-3xl text-center"
      >
        <motion.p
          variants={fadeUp}
          className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400"
        >
          Physical Gold Platform
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="font-heading text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Buy Real Gold.
          <br />
          <span className="text-emerald-400">Safely. Simply.</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 sm:text-xl"
        >
          No confusing charts. No hidden fees. Just real physical gold, vaulted
          securely or delivered to your door in an armored truck.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <a
            href="/onboarding"
            id="hero-buy-gold"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30"
          >
            Buy Gold <ArrowRight size={18} />
          </a>
          <a
            href="/onboarding"
            id="hero-sell-gold"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-8 py-4 text-base font-semibold text-slate-300 transition-all hover:border-emerald-500 hover:text-white"
          >
            Sell Gold
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ================================================================
   2. THE ASSET GRID
   ================================================================ */
const ASSETS = [
  {
    title: "Gold Bullion",
    desc: "Standard 99.99% pure gold bars. The ultimate safe haven.",
    Icon: Gem,
    accent: "from-amber-500/20 to-transparent",
    border: "hover:border-amber-500/40",
  },
  {
    title: "Gold Doré",
    desc: "Unrefined gold for high-volume buyers.",
    Icon: Flame,
    accent: "from-orange-500/20 to-transparent",
    border: "hover:border-orange-500/40",
  },
  {
    title: "Gold Nuggets",
    desc: "Raw, natural gold straight from the earth.",
    Icon: Mountain,
    accent: "from-yellow-500/20 to-transparent",
    border: "hover:border-yellow-500/40",
  },
] as const;

function AssetGrid() {
  return (
    <RevealSection className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          variants={fadeUp}
          className="font-heading text-center text-3xl font-bold text-white sm:text-4xl"
        >
          What You Can Buy
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-3 max-w-lg text-center text-slate-400"
        >
          Three forms of physical gold — pick the one that fits your goals.
        </motion.p>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {ASSETS.map((a) => (
            <motion.div
              key={a.title}
              variants={fadeUp}
              className={`group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-8 transition-all duration-300 ${a.border}`}
            >
              {/* Gradient glow */}
              <div
                className={`pointer-events-none absolute inset-0 bg-linear-to-b ${a.accent} opacity-0 transition-opacity group-hover:opacity-100`}
              />
              <div className="relative z-10">
                <a.Icon
                  size={40}
                  className="mb-5 text-slate-500 transition-colors group-hover:text-amber-400"
                  strokeWidth={1.5}
                />
                <h3 className="font-heading text-xl font-bold text-white">
                  {a.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
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
   3. HOW TO BUY & SELL
   ================================================================ */
const BUY_STEPS = [
  { num: "01", label: "Pick your gold", Icon: Gem },
  { num: "02", label: "Wire the funds to our secure bank", Icon: Banknote },
  {
    num: "03",
    label: "We lock it in a vault or ship it to you",
    Icon: PackageCheck,
  },
];
const SELL_STEPS = [
  { num: "01", label: "Tell us what you have", Icon: Eye },
  {
    num: "02",
    label: "Send it via our insured armored trucks",
    Icon: Truck,
  },
  {
    num: "03",
    label: "Get paid instantly once verified",
    Icon: Banknote,
  },
];

function StepList({
  title,
  steps,
  accentColor,
}: {
  title: string;
  steps: typeof BUY_STEPS;
  accentColor: string;
}) {
  return (
    <motion.div variants={fadeUp} className="flex-1">
      <h3 className="font-heading mb-8 text-2xl font-bold text-white">
        {title}
      </h3>
      <div className="space-y-6">
        {steps.map((s) => (
          <div key={s.num} className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${accentColor} text-sm font-bold text-white`}
            >
              {s.num}
            </div>
            <div className="flex items-center gap-3 pt-2.5">
              <s.Icon size={18} className="shrink-0 text-slate-500" />
              <p className="text-base text-slate-300">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function HowItWorksSection() {
  return (
    <RevealSection className="border-y border-slate-800/60 bg-slate-900/30 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          variants={fadeUp}
          className="font-heading text-center text-3xl font-bold text-white sm:text-4xl"
        >
          How to Buy & Sell
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-3 max-w-lg text-center text-slate-400"
        >
          Three steps. That&apos;s it.
        </motion.p>

        <div className="mt-14 flex flex-col gap-16 lg:flex-row lg:gap-20">
          <StepList
            title="Buying Gold"
            steps={BUY_STEPS}
            accentColor="bg-emerald-600"
          />
          <div className="hidden w-px bg-slate-800 lg:block" />
          <StepList
            title="Selling Gold"
            steps={SELL_STEPS}
            accentColor="bg-amber-600"
          />
        </div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   4. YOUR GOLD. YOUR RULES. (Delivery vs. Vaulting)
   ================================================================ */
function DeliveryVaultingSection() {
  return (
    <RevealSection className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          variants={fadeUp}
          className="font-heading text-center text-3xl font-bold text-white sm:text-4xl"
        >
          Your Gold. Your Rules.
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-3 max-w-lg text-center text-slate-400"
        >
          Keep it stored or hold it in your hands — the choice is always yours.
        </motion.p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {/* Vault */}
          <motion.div
            variants={fadeUp}
            className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-8 transition-all duration-300 hover:border-emerald-500/40"
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <Vault
                size={44}
                className="mb-5 text-slate-500 transition-colors group-hover:text-emerald-400"
                strokeWidth={1.5}
              />
              <h3 className="font-heading text-xl font-bold text-white">
                The Swiss Vault
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Don&apos;t want to hide it under your mattress? We will store it
                for you in a world-class, high-security vault. It&apos;s fully
                insured and legally in your name.
              </p>
            </div>
          </motion.div>

          {/* Delivery */}
          <motion.div
            variants={fadeUp}
            className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-8 transition-all duration-300 hover:border-amber-500/40"
          >
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <Truck
                size={44}
                className="mb-5 text-slate-500 transition-colors group-hover:text-amber-400"
                strokeWidth={1.5}
              />
              <h3 className="font-heading text-xl font-bold text-white">
                The Armored Truck
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Want to hold it in your hands? We use professional armored
                trucks (like Brink&apos;s) to deliver your gold straight to your
                door, fully insured the entire ride.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   5. DIGITAL WARRANT OF TITLE (Proof of Ownership)
   ================================================================ */
function DigitalTitleSection() {
  return (
    <RevealSection className="border-y border-slate-800/60 bg-slate-900/30 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          variants={fadeUp}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10"
        >
          <FileCheck size={32} className="text-emerald-400" />
        </motion.div>

        <motion.h2
          variants={fadeUp}
          className="font-heading text-3xl font-bold text-white sm:text-4xl"
        >
          How do you know it&apos;s really yours?
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400"
        >
          When you buy gold with us and leave it in the vault, you don&apos;t
          just get a receipt. You get a{" "}
          <span className="font-semibold text-emerald-400">
            &quot;Digital Warrant of Title.&quot;
          </span>{" "}
          It is an unforgeable, mathematical document proving exactly which gold
          bars belong to you, right down to the serial numbers.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mx-auto mt-10 flex max-w-md items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-5"
        >
          <Lock size={24} className="shrink-0 text-emerald-400" />
          <p className="text-left text-sm text-slate-400">
            Cryptographically signed. Tamper-proof. Verifiable by anyone,
            anywhere, at any time.
          </p>
        </motion.div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   6. THE GOLDWIRE GUARANTEE (DvP Escrow)
   ================================================================ */
function GoldwireGuaranteeSection() {
  return (
    <RevealSection className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          variants={fadeUp}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10"
        >
          <Shield size={32} className="text-amber-400" />
        </motion.div>

        <motion.h2
          variants={fadeUp}
          className="font-heading text-3xl font-bold text-white sm:text-4xl"
        >
          The Goldwire Guarantee
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400"
        >
          Think of Goldwire like a giant, unbreakable vending machine. You put
          your money in one side, the gold is on the other. The machine only
          swaps them when{" "}
          <span className="font-semibold text-amber-400">
            BOTH are safely inside.
          </span>{" "}
          Nobody gets cheated. Ever.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mx-auto mt-10 flex max-w-md items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-5"
        >
          <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
          <p className="text-left text-sm text-slate-400">
            Delivery-versus-Payment escrow. Your funds and the gold are
            exchanged simultaneously. Zero counterparty risk.
          </p>
        </motion.div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   7. LEAD CAPTURE FOOTER (Database-Wired)
   ================================================================ */
function WaitlistSection() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState<
    WaitlistResult | null,
    FormData
  >(joinWaitlist, null);
  const showSuccess = state?.success === true;

  return (
    <RevealSection className="border-t border-slate-800/60 bg-slate-900/30 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-xl text-center">
        <motion.h2
          variants={fadeUp}
          className="font-heading text-3xl font-bold text-white sm:text-4xl"
        >
          Want early access?
          <br />
          <span className="text-emerald-400">Join the waitlist.</span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-4 text-slate-400"
        >
          Be the first to know when we launch. No spam. Just gold.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10">
          {showSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8"
            >
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="text-lg font-bold text-white">
                You&apos;re on the list!
              </p>
              <p className="text-sm text-slate-400">
                We&apos;ll let you know as soon as early access opens.
              </p>
            </motion.div>
          ) : (
            <form
              ref={formRef}
              action={formAction}
              className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1">
                <label htmlFor="waitlist-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="waitlist-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-white placeholder-slate-500 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                />
                {state?.error && !state.success && (
                  <p className="mt-2 text-left text-sm text-red-400">
                    {state.error}
                  </p>
                )}
              </div>
              <button
                id="waitlist-submit"
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Joining…
                  </span>
                ) : (
                  <>
                    Secure My Spot <Send size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </RevealSection>
  );
}

/* ================================================================
   SIMPLE FOOTER
   ================================================================ */
function SimpleFooter() {
  return (
    <footer className="border-t border-slate-800/60 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-emerald-400" />
          <span className="font-heading text-lg font-bold text-white">
            Goldwire
          </span>
        </div>
        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Goldwire Inc. All rights reserved.
        </p>
        <div className="flex gap-4 text-xs text-slate-500">
          <a href="/legal" className="transition-colors hover:text-slate-300">
            Legal
          </a>
          <a href="/legal" className="transition-colors hover:text-slate-300">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   NAV BAR
   ================================================================ */
function SimpleNav() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <a href="/simple-home" className="flex items-center gap-2">
          <Shield size={22} className="text-emerald-400" />
          <span className="font-heading text-lg font-bold text-white">
            Goldwire
          </span>
        </a>
        <div className="flex items-center gap-6">
          <a
            href="/login"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Sign In
          </a>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-500"
          >
            Get Started <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ================================================================
   PAGE EXPORT
   ================================================================ */
export default function SimpleHomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SimpleNav />
      <main className="pt-16">
        <HeroSection />
        <AssetGrid />
        <HowItWorksSection />
        <DeliveryVaultingSection />
        <DigitalTitleSection />
        <GoldwireGuaranteeSection />
        <WaitlistSection />
      </main>
      <SimpleFooter />
    </div>
  );
}
