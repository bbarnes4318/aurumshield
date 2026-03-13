"use client";

/* ================================================================
   AURUMSHIELD — 12-SECTION HYBRID LANDING PAGE
   ================================================================
   Complete rewrite: Tier-1 institutional copy architecture.
   Preserves: Navigation, TelemetryTerminal, SystemComparisonChart,
              Footer. All new sections are inline.
   ================================================================ */

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  Lock,
  Menu,
  X,
  ShieldCheck,
  AlertTriangle,
  Shield,
  Fingerprint,
  Banknote,
  Truck,
  Zap,
} from "lucide-react";

/* ── Section Imports ── */
import { HeroSection } from "./sections/hero";
import { TrustBand } from "./sections/trust-band";
import { TelemetryTerminal } from "./telemetry-terminal";
import SystemComparisonChart from "./SystemComparisonChart";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://app.aurumshield.vip";

/* ── Shared glass card class ── */
const GLASS_CARD =
  "bg-white/[0.02] border border-slate-800 rounded-md hover:border-gold/30 transition-all duration-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/* ── Shared eyebrow component ── */
function Eyebrow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="h-px w-8 bg-gold/50" />
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
        {text}
      </p>
    </div>
  );
}

/* ================================================================
   NAVIGATION — Glassmorphism sticky nav with institutional links
   ================================================================ */
const NAV_LINKS = [
  { label: "Platform Dossier", href: "/platform-overview" },
  { label: "System Architecture", href: "/technical-overview" },
] as const;

export function Navigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen || !menuRef.current) return;
    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a, button, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <nav className="fixed top-0 z-50 w-full backdrop-blur-md border-b border-slate-800 bg-[#0A1128]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-8 lg:gap-12">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/arum-logo-gold.svg"
                alt="AurumShield"
                width={120}
                height={28}
                className="h-6 lg:h-7 w-auto"
                priority
                unoptimized
              />
            </Link>
            <div className="hidden lg:flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[13px] font-medium text-slate-400 transition-colors duration-200 hover:text-white tracking-wide"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 sm:gap-8 shrink-0">
            <a href={APP_URL} className="hidden lg:inline-flex text-[13px] font-medium text-slate-400 transition-colors duration-200 hover:text-white tracking-wide">
              Client Portal
            </a>
            <a href="/buy/register" className="hidden sm:inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-[#0A1128] transition-colors bg-gold hover:bg-gold-hover">
              Get Started
            </a>
            <a href="/perimeter/verify?demo=active" className="hidden lg:inline-flex items-center gap-2 rounded-md border border-gold/30 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-gold transition-all hover:border-gold/60 hover:bg-gold/10">
              Initiate Institutional Demo
            </a>
            <button onClick={() => setMobileOpen(true)} className="lg:hidden touch-target rounded-md text-gray-400 hover:text-white transition-colors active:scale-95" aria-label="Open navigation menu" aria-expanded={mobileOpen}>
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-60 bg-black/80 transition-opacity duration-200 lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Mobile panel */}
      <div
        ref={menuRef}
        className={`fixed inset-y-0 right-0 z-60 w-72 max-w-[85vw] bg-[#0A1128] border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Navigation</span>
          <button onClick={closeMobile} className="touch-target rounded-md text-gray-400 hover:text-white transition-colors active:scale-95" aria-label="Close navigation menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col px-5 py-6 gap-1">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} onClick={closeMobile} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
              {link.label}
            </a>
          ))}
          <a href={APP_URL} onClick={closeMobile} className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
            Client Portal
          </a>
          <div className="h-px bg-slate-800 my-3" />
          <a href="/buy/register" onClick={closeMobile} className="mt-4 flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-bold text-[#0A1128] transition-colors active:scale-[0.98] bg-gold hover:bg-gold-hover">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </>
  );
}

/* ================================================================
   SECTION 1 — THE PROBLEM
   ================================================================ */
function ProblemSection() {
  const bullets = [
    "Counterfeit bullion entering the supply chain",
    "Breakdowns in physical chain of custody",
    "Uninsured loss during armored transit",
    "Counterparty default before settlement (Herstatt Risk)",
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="THE PROBLEM" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          Physical Gold Transactions Carry Serious Risk.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 mb-8 max-w-3xl">
          In physical gold trade, price is only one part of the equation. The
          greater challenge is managing the temporal and logistical risks that
          derail legitimate deals.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {bullets.map((b) => (
            <div key={b} className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-400/70 mt-0.5 shrink-0" />
              <span className="text-sm text-gray-300">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 2 — THE SOLUTION
   ================================================================ */
function SolutionSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#070B16]">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="THE SOLUTION" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          A Deterministic Protection Layer for Large Gold Transactions.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 max-w-3xl">
          AurumShield provides a mathematically enforced transaction framework
          designed for serious physical gold deals. Before capital moves, the
          platform establishes the controls that matter most: verified
          counterparties, LBMA-authenticated assets, cryptographic custody
          records, and indemnified Malca-Amit transit.
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 3 — BUYER PSYCHOLOGY GRID
   ================================================================ */
function BuyerPsychologySection() {
  const grid = [
    {
      label: "Counterparty",
      question: "Are participants OFAC-cleared and verified?",
      icon: Shield,
    },
    {
      label: "Asset",
      question: "Is the bullion LBMA-certified and ultrasonically assayed?",
      icon: CheckCircle,
    },
    {
      label: "Custody",
      question: "Is there an unbroken, cryptographically sealed record from release to receipt?",
      icon: Lock,
    },
    {
      label: "Capital",
      question: "Are funds held in bankruptcy-remote FBO accounts prior to execution?",
      icon: Banknote,
    },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <Eyebrow text="BUYER REQUIREMENTS" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-3">
          What Serious Gold Buyers Need Before They Commit Capital.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 mb-12 max-w-3xl">
          Professional buyers do not rely on slogans. They require structures
          that are verifiable and legally defensible.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {grid.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`${GLASS_CARD} p-6`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-gold" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-gold">
                    {item.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-gray-300">
                  {item.question}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 4 — MARKET REALITY
   ================================================================ */
function MarketRealitySection() {
  return (
    <section className="py-20 lg:py-28 bg-[#070B16]">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="MARKET REALITY" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          Gold Deals Should Not Depend on Blind Trust.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 max-w-3xl">
          Legacy physical trade relies on fragmented communication and
          asynchronous payment rails. AurumShield replaces trust with
          cryptographic execution, combining verification, transit logistics,
          and atomic settlement into one deterministic framework.
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 5 — HOW IT WORKS (4 STEPS)
   ================================================================ */
function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      label: "Identity Perimeter",
      description: "Participants undergo strict KYB/AML vetting via Veriff before market entry.",
      icon: Fingerprint,
    },
    {
      step: "02",
      label: "Capital Confinement",
      description: "Commercial terms are locked and funds are escrowed via Fedwire, eliminating non-payment risk.",
      icon: Banknote,
    },
    {
      step: "03",
      label: "Armored Logistics",
      description: "Physical custody is verified via Brink's/Malca-Amit. Every movement is logged into an append-only audit ledger.",
      icon: Truck,
    },
    {
      step: "04",
      label: "Atomic Execution (DvP)",
      description: "The engine executes a Delivery-versus-Payment atomic swap. Title transfers the exact millisecond funds clear.",
      icon: Zap,
    },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <Eyebrow text="THE MECHANISM" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-14">
          How It Works
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="relative">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border-2 border-gold/40 bg-[#0A1128]">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <span className="font-mono text-[10px] text-gold/60 tracking-widest block mb-2">
                  STEP {s.step}
                </span>
                <h3 className="text-base font-bold uppercase tracking-wide text-white mb-2">
                  {s.label}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 6 — POSITIONING
   ================================================================ */
function PositioningSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#070B16]">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="POSITIONING" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          Built for the Realities of Physical Gold.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 max-w-3xl">
          AurumShield is built for a market where process failure is
          catastrophic. We focus on the fundamentals that withstand scrutiny
          from treasury, compliance, and legal: authenticated bullion, Turnkey
          MPC custody, and disciplined execution.
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 7 — TRADE ARCHITECTURE
   ================================================================ */
function TradeArchitectureSection() {
  const columns = [
    {
      label: "Capital Controls",
      body: "Payment conditions confirmed via API before asset release.",
    },
    {
      label: "Asset Controls",
      body: "Bullion status and custody conditions mathematically established before release.",
    },
    {
      label: "Coordinated Execution",
      body: "Aligning both sides through a strict Delivery-versus-Payment protocol.",
    },
  ];

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <Eyebrow text="INFRASTRUCTURE PROOF" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-12">
          Trade Architecture Built to Eliminate Counterparty Exposure.
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.label} className={`${GLASS_CARD} p-6`}>
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest text-gold mb-3">
                {col.label}
              </h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {col.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 8 — CUSTODY
   ================================================================ */
function CustodySection() {
  return (
    <section className="py-20 lg:py-28 bg-[#070B16]">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="CUSTODY FRAMEWORK" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          Chain of Custody That Can Be Legally Defended.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 max-w-3xl">
          AurumShield enforces documented custody handling governed by strict
          English Law and UCC Article 7 bailment jurisprudence. Every handoff,
          every seal, every transit event is cryptographically logged and
          insured.
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 9 — AUTHENTICITY
   ================================================================ */
function AuthenticitySection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="ASSET INTEGRITY" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          Absolute Asset Integrity.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 max-w-3xl">
          We structurally eliminate counterfeit exposure by enforcing mandatory
          four-point conductivity and ultrasonic thickness gauging prior to
          vault allocation. Every bar is assayed against LBMA Good Delivery
          standards before it enters the settlement engine.
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 10 — SETTLEMENT LOGIC (DvP)
   ================================================================ */
function SettlementLogicSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#070B16]">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="SETTLEMENT FINALITY" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          Delivery-Versus-Payment (DvP) Finality.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 max-w-3xl">
          Legacy transactions suffer from T+2 temporal risk. Our architecture
          collapses the settlement window to zero, achieving T+0 atomic
          finality where neither side performs without the other.
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 11 — CROSS-BORDER
   ================================================================ */
function CrossBorderSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <Eyebrow text="GLOBAL SETTLEMENT" />
        <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight text-white mb-5">
          Bypassing Legacy Cross-Border Friction.
        </h2>
        <p className="text-base leading-relaxed text-gray-400 max-w-3xl">
          Legacy correspondent banking and SWIFT networks introduce multi-day
          delays and FX friction. AurumShield utilizes vaulted physical gold as
          a direct transport layer for instant, frictionless global settlement.
        </p>
      </div>
    </section>
  );
}

/* ================================================================
   SECTION 12 — AUDIENCE & FINAL CTA
   ================================================================ */
function AudienceAndCTA() {
  const audiences = [
    "Sovereign Wealth Funds",
    "Commodity Trading Firms",
    "Refineries & Bullion Suppliers",
    "Institutional Treasuries",
  ];

  return (
    <section className="py-24 lg:py-32 bg-[#0A1128]">
      <div className="mx-auto max-w-4xl px-6">
        <div className="border border-slate-800 bg-[#0B0E14] rounded-md overflow-hidden shadow-2xl">
          <div className="p-10 sm:p-16 text-center flex flex-col items-center">
            <ShieldCheck className="h-10 w-10 text-gold mb-6 opacity-80" />

            <Eyebrow text="QUALIFIED PARTICIPANTS" />
            <h2 className="text-[clamp(1.75rem,3.5vw,2.25rem)] font-bold tracking-tight text-white mb-6">
              Designed for Qualified Market Participants.
            </h2>

            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {audiences.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-white/2 px-4 py-2 text-xs font-medium text-gray-300"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-gold/60" />
                  {a}
                </span>
              ))}
            </div>

            <p className="text-sm text-slate-500 max-w-xl mb-10 leading-relaxed">
              Access is restricted to qualified counterparties engaged in
              legitimate physical gold transactions.
            </p>

            <div className="border-t border-slate-800 pt-10 w-full flex flex-col items-center">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-6">
                Bring Absolute Finality to Every Gold Transaction.
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/buy/register"
                  className="inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-slate-950 font-bold px-10 py-4 rounded-md transition-all duration-200"
                >
                  Request Access
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href="/perimeter/verify?demo=active"
                  className="inline-flex items-center justify-center gap-2 border-2 border-gold/40 text-gold font-bold px-10 py-4 rounded-md transition-all duration-200 hover:border-gold/70 hover:bg-gold/10"
                >
                  Initiate Demo
                  <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 bg-white/2 px-6 py-5 text-center">
            <p className="font-mono text-[10px] sm:text-xs text-gold tracking-[0.15em] uppercase font-semibold">
              [ VERIFIED ]: All architectural state transitions are bound by
              comprehensive underwritten indemnification.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   FOOTER
   ================================================================ */
function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-[#0A1128] pt-16 pb-8 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <Image src="/arum-logo-gold.svg" alt="AurumShield" width={120} height={28} className="h-7 w-auto mb-4" unoptimized />
            <p className="text-sm leading-relaxed text-slate-500">
              Deterministic clearing layer and sovereign custody infrastructure for physical bullion.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-gold/50" />
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Infrastructure</h4>
            </div>
            <ul className="space-y-4 text-sm font-medium text-gray-400">
              <li><Link href="/platform-overview" className="hover:text-white transition-colors">Platform Dossier</Link></li>
              <li><Link href="/technical-overview" className="hover:text-white transition-colors">System Architecture</Link></li>
              <li><a href={`${APP_URL}/login`} className="hover:text-white transition-colors">Client Portal</a></li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-gold/50" />
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Compliance</h4>
            </div>
            <ul className="space-y-4 text-sm font-medium text-gray-400">
              <li><Link href="/legal/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/legal/aml-kyc" className="hover:text-white transition-colors">AML &amp; KYC Policy</Link></li>
              <li><Link href="/legal/risk-reinsurance" className="hover:text-white transition-colors">Risk &amp; Reinsurance</Link></li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-6 bg-gold/50" />
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Global Operations</h4>
            </div>
            <div className="bg-[#0B0E14] border border-slate-800 rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-gold/70 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-gold/70 font-semibold">24/7 Automated Desk</span>
              </div>
              <a href="tel:+18652757300" className="text-lg font-mono font-bold text-white hover:text-gold transition-colors block mt-1">
                +1.865.275.7300
              </a>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">Voice-automated clearing concierge.</p>
            </div>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600 font-mono">
            &copy; {new Date().getFullYear()} AurumShield Platform. All rights reserved.
          </p>
          <p className="text-xs text-slate-600 font-mono uppercase tracking-widest">
            Institutional Access Only
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================
   MAIN EXPORT — 12-Section Hybrid Architecture
   ================================================================ */
export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white antialiased font-sans">
      <Navigation />
      <HeroSection />
      <TrustBand />

      {/* §1 — The Problem */}
      <ProblemSection />

      {/* §2 — The Solution */}
      <SolutionSection />

      {/* §3 — Buyer Psychology Grid */}
      <BuyerPsychologySection />

      {/* §4 — Market Reality */}
      <MarketRealitySection />

      {/* §5 — How It Works (4 Steps) */}
      <HowItWorksSection />

      {/* §6 — Positioning */}
      <PositioningSection />

      {/* §7 — Trade Architecture */}
      <TradeArchitectureSection />

      {/* ── PRESERVED: SWIFT vs Goldwire Comparison ── */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SystemComparisonChart />
        </div>
      </section>

      {/* §8 — Custody */}
      <CustodySection />

      {/* ── PRESERVED: Live Engine Telemetry ── */}
      <section className="py-16 lg:py-24 bg-[#0A1128] border-b border-slate-800/50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(198,168,107,0.03)_0%,transparent_70%)] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 w-full relative z-10">
          <div className="flex flex-col items-start text-left max-w-2xl mb-12">
            <Eyebrow text="LIVE ENGINE TELEMETRY" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Deterministic Settlement. Zero Counterparty Risk.
            </h2>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed text-left">
              Trust is a liability in physical markets. Watch our clearing
              engine in real-time as it locks capital, verifies sovereign vault
              provenance, and executes a flawless Delivery-versus-Payment (DvP)
              swap with absolute finality.
            </p>
          </div>
          <TelemetryTerminal />
        </div>
      </section>

      {/* §9 — Authenticity */}
      <AuthenticitySection />

      {/* §10 — Settlement Logic (DvP) */}
      <SettlementLogicSection />

      {/* §11 — Cross-Border */}
      <CrossBorderSection />

      {/* §12 — Audience & Final CTA */}
      <AudienceAndCTA />

      <SiteFooter />
    </div>
  );
}
