"use client";

/* ================================================================
   GUIDED WALKTHROUGH HUB — Executive demo control room
   Structured navigation with institutional explanations
   ================================================================ */

import Link from "next/link";
import {
  Store,
  ClipboardList,
  Landmark,
  Activity,
  ShieldOff,
  Gavel,
  Award,
  LayoutDashboard,
} from "lucide-react";

interface WalkthroughSection {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  explanation: string;
  riskObjective: string;
  href: string;
}

const SECTIONS: WalkthroughSection[] = [
  {
    id: "overview",
    icon: LayoutDashboard,
    title: "System Overview",
    explanation:
      "The AurumShield dashboard presents the clearing authority's command surface. Capital adequacy, counterparty risk distribution, settlement queue depth, and governance events are consolidated into a single institutional view.",
    riskObjective:
      "Provide real-time systemic awareness to clearing authority operators.",
    href: "/dashboard?demo=true",
  },
  {
    id: "marketplace",
    icon: Store,
    title: "Marketplace Flow",
    explanation:
      "The institutional marketplace surfaces published gold listings from verified sellers. Buyers reserve inventory, locking price for a defined window. Reservation-to-order conversion enforces policy gates including TRI scoring, ECR impact, and hardstop utilization thresholds.",
    riskObjective:
      "Enforce capital adequacy checks before any exposure is created.",
    href: "/marketplace?demo=true",
  },
  {
    id: "seller",
    icon: ClipboardList,
    title: "Seller Supply Controls",
    explanation:
      "Sellers must submit a complete evidence pack — certified assay report, chain of custody certificate, and seller attestation — before publishing. The system runs a publish gate that validates seller verification status, evidence completeness, and capital control constraints.",
    riskObjective:
      "Prevent unverified or under-documented inventory from entering the marketplace.",
    href: "/sell/listings?demo=true",
  },
  {
    id: "settlement",
    icon: Landmark,
    title: "Settlement Lifecycle",
    explanation:
      "Each order generates a deterministic settlement case. The lifecycle follows escrow open → funds confirmation → gold allocation → verification clearance → authorization → atomic DvP execution. Status transitions are action-driven with role-based enforcement.",
    riskObjective:
      "Ensure bilateral settlement finality through atomic delivery-versus-payment.",
    href: "/settlements?demo=true",
  },
  {
    id: "capital",
    icon: Activity,
    title: "Capital Adequacy",
    explanation:
      "The intraday capital console computes a live capital snapshot from all active exposures — reservations, orders, settlements. Metrics include gross exposure, ECR, TVaR₉₉ buffer, and hardstop utilization. Breach events are generated deterministically when thresholds are exceeded.",
    riskObjective:
      "Maintain sovereign-grade capital buffers against intraday concentration risk.",
    href: "/intraday?demo=true",
  },
  {
    id: "controls",
    icon: ShieldOff,
    title: "Capital Guardrails",
    explanation:
      "Capital controls enforce operational restrictions based on breach level. In CAUTION mode, new reservations are throttled. In BREACH mode, settlement execution is blocked. EMERGENCY_HALT suspends all marketplace activity. Overrides require documented authorization with time-limited scope.",
    riskObjective:
      "Prevent systemic exposure accumulation through automated policy enforcement.",
    href: "/capital-controls?demo=true",
  },
  {
    id: "supervisory",
    icon: Gavel,
    title: "Supervisory Oversight",
    explanation:
      "The supervisory console presents case dossiers for regulatory review. Each case includes settlement details, ledger history, capital snapshot at time of authorization, and an append-only audit trail. Designed for regulator, compliance officer, and clearing authority review.",
    riskObjective:
      "Provide a regulator-ready view of clearing governance and settlement integrity.",
    href: "/supervisory?demo=true",
  },
  {
    id: "certificate",
    icon: Award,
    title: "Clearing Certificate",
    explanation:
      "Upon atomic DvP execution, the system issues a cryptographically verifiable clearing certificate. The certificate contains deterministic identifiers, a canonical signature hash, settlement details, and fee structure. It serves as the official proof of settlement finality.",
    riskObjective:
      "Provide cryptographic settlement proof for bilateral reconciliation and audit.",
    href: "/certificates?demo=true",
  },
];

export default function DemoWalkthroughPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      {/* Header */}
      <div>
        <h1 className="typo-h2 mb-2">Guided Walkthrough</h1>
        <p className="text-sm text-text-muted leading-relaxed">
          Structured executive demonstration of AurumShield sovereign clearing
          infrastructure. Each section highlights a critical risk control
          function. Select a section to navigate to the live operational view.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className="card-base p-5"
              id={`walkthrough-${section.id}`}
            >
              <div className="flex items-start gap-4">
                {/* Step number + icon */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 text-gold">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-bold text-text-faint tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-semibold text-text">
                    {section.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {section.explanation}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
                      Risk Objective
                    </span>
                    <span className="text-xs text-gold">
                      {section.riskObjective}
                    </span>
                  </div>
                </div>

                {/* Launch button */}
                <Link
                  href={section.href}
                  className="shrink-0 rounded-sm border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-gold/10 hover:text-gold hover:border-gold/30"
                >
                  Launch Live View
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
