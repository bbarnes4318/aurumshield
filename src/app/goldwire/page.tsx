"use client";

/* ================================================================
   GOLDWIRE PORTAL — Standalone Settlement Network Page
   ================================================================
   Full-bleed informational page about the Goldwire settlement
   protocol. Accessible independently from the buyer flow.
   ================================================================ */

import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Zap,
  Globe,
  Lock,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const BRAND_GOLD = "#c6a86b";
const BG = "#0a1128";

/* ── How It Works Steps ── */
const STEPS = [
  {
    step: "01",
    title: "Initiate",
    description:
      "Corporate treasury initiates a settlement request specifying gold weight, counterparty, and jurisdiction.",
    icon: Zap,
  },
  {
    step: "02",
    title: "Execute",
    description:
      "Goldwire calculates gold equivalents at live medianized spot and instantly reassigns legal title with zero kinetic movement.",
    icon: Globe,
  },
  {
    step: "03",
    title: "Settle",
    description:
      "SHA-256 clearing certificate issued. Append-only ledger sealed. T+0 settlement finality achieved.",
    icon: CheckCircle2,
  },
];

/* ── Features ── */
const FEATURES = [
  {
    title: "T+0 Settlement",
    description: "Same-day finality. No 45-day bank underwriting delays.",
    icon: Clock,
  },
  {
    title: "Sovereign Custody",
    description: "Assets sequestered in Tier-1 vaults (Malca-Amit, Brink's).",
    icon: Shield,
  },
  {
    title: "Zero Counterparty Risk",
    description:
      "Deterministic state machine. Every transaction follows a strict, auditable lifecycle.",
    icon: Lock,
  },
  {
    title: "Cross-Border",
    description:
      "Bypass SWIFT/Fedwire friction. Settle cross-border obligations with allocated physical gold.",
    icon: Globe,
  },
];

export default function GoldwirePortalPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>
      {/* ── Navigation ── */}
      <header className="border-b border-slate-800/60 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Shield className="h-5 w-5" style={{ color: BRAND_GOLD }} />
            <span
              className="text-base font-bold tracking-tight"
              style={{ color: BRAND_GOLD }}
            >
              Goldwire
            </span>
          </Link>
          <Link
            href="/buy/register"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all"
            style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
          >
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/50 px-4 py-1.5">
            <TrendingUp className="h-3.5 w-3.5" style={{ color: BRAND_GOLD }} />
            <span className="text-xs font-semibold text-slate-400">
              Deterministic Settlement Protocol
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            The{" "}
            <span style={{ color: BRAND_GOLD }}>Goldwire</span>{" "}
            Network
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400">
            A high-velocity transport layer that uses allocated physical gold to
            settle cross-border obligations with T+0 finality. Replace
            probabilistic SWIFT rails with deterministic settlement.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/buy/register"
              className="flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold transition-all active:scale-[0.98]"
              style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
            >
              Start Buying Gold
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/technical-overview"
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-4 text-sm font-semibold text-slate-300 transition-all hover:border-slate-600 hover:text-white"
            >
              Technical Overview
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t border-slate-800/60 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              How Goldwire Works
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Three steps to deterministic settlement finality.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="rounded-2xl border border-slate-800 bg-[#0d1829] p-6 transition-all hover:border-slate-700"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="font-mono text-2xl font-bold"
                      style={{ color: BRAND_GOLD }}
                    >
                      {s.step}
                    </span>
                    <Icon className="h-5 w-5 text-slate-500" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-white">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    {s.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="border-t border-slate-800/60 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Built for Institutional Scale
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="flex gap-4 rounded-xl border border-slate-800/60 bg-[#0d1829] p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/40">
                    <Icon className="h-5 w-5" style={{ color: BRAND_GOLD }} />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-bold text-white">
                      {f.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-400">
                      {f.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-slate-800/60 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-white">
            Ready to get started?
          </h2>
          <p className="mb-8 text-sm text-slate-400">
            Create your account and purchase physical gold in minutes, not
            weeks.
          </p>
          <Link
            href="/buy/register"
            className="inline-flex items-center gap-2 rounded-xl px-10 py-4 text-sm font-bold transition-all active:scale-[0.98]"
            style={{ backgroundColor: BRAND_GOLD, color: "#0a1128" }}
          >
            Create Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" style={{ color: BRAND_GOLD }} />
            <span className="text-xs font-semibold text-slate-500">
              AurumShield · Goldwire Settlement Network
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3 text-slate-600" />
            <span className="text-[10px] text-slate-600">
              256-bit TLS · All data encrypted in transit and at rest
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
