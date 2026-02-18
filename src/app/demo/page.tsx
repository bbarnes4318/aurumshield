"use client";

/* ================================================================
   GUIDED WALKTHROUGH HUB — Institutional demo control room
   
   Structured navigation with systemic risk framing.
   Each section includes:
   - Title
   - Risk Addressed (systemic risk statement)
   - Control Mechanism (what this control prevents)
   - Why It Matters (clearing authority rationale)
   - Launch button
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
  riskAddressed: string;
  controlMechanism: string;
  whyItMatters: string;
  href: string;
}

const SECTIONS: WalkthroughSection[] = [
  {
    id: "overview",
    icon: LayoutDashboard,
    title: "System Overview",
    riskAddressed:
      "Fragmented operational awareness across clearing functions. Capital, settlement, and governance data siloed in separate subsystems.",
    controlMechanism:
      "The dashboard consolidates capital adequacy, counterparty risk distribution, settlement queue depth, and governance events into a single institutional command surface.",
    whyItMatters:
      "Systemic risk management requires unified observability. A central authority view ensures timely decision-making under intraday stress conditions.",
    href: "/dashboard?demo=true",
  },
  {
    id: "marketplace",
    icon: Store,
    title: "Marketplace",
    riskAddressed:
      "Bilateral counterparty exposure prior to clearing. Unpriced risk from uncollateralized off-ledger agreements.",
    controlMechanism:
      "Reservation locks exposure into a capital-aware system. Reservation-to-order conversion enforces policy gates including TRI scoring, ECR impact, and hardstop utilization thresholds.",
    whyItMatters:
      "Prevents uncollateralized off-ledger agreements. No exposure is created without passing the capital adequacy perimeter.",
    href: "/marketplace?demo=true",
  },
  {
    id: "seller",
    icon: ClipboardList,
    title: "Seller Supply Controls",
    riskAddressed:
      "Unverified or under-documented inventory entering the marketplace. Counterparty exposure to sellers with incomplete identity verification.",
    controlMechanism:
      "Sellers must submit a complete evidence pack — certified assay report, chain of custody certificate, and seller attestation. A publish gate validates seller verification status, evidence completeness, and capital control constraints.",
    whyItMatters:
      "Inventory integrity is a precondition for settlement finality. The clearing authority cannot guarantee delivery without verified provenance.",
    href: "/sell/listings?demo=true",
  },
  {
    id: "settlement",
    icon: Landmark,
    title: "Settlement Lifecycle",
    riskAddressed:
      "Settlement failure risk from incomplete or out-of-sequence lifecycle transitions. Bilateral reconciliation disputes from non-atomic execution.",
    controlMechanism:
      "Each order generates a deterministic settlement case. The lifecycle follows escrow open, funds confirmation, gold allocation, verification clearance, authorization, then atomic DvP execution. Status transitions are action-driven with role-based enforcement.",
    whyItMatters:
      "Atomic delivery-versus-payment eliminates settlement failure modes inherent in sequential bilateral transfers.",
    href: "/settlements?demo=true",
  },
  {
    id: "capital",
    icon: Activity,
    title: "Capital Adequacy",
    riskAddressed:
      "Intraday concentration risk exceeding capital buffers. Unmonitored accumulation of gross exposure relative to available capital base.",
    controlMechanism:
      "The intraday capital console computes a live capital snapshot from all active exposures — reservations, orders, settlements. Metrics include gross exposure, ECR, TVaR₉₉ buffer, and hardstop utilization. Breach events are generated deterministically when thresholds are exceeded.",
    whyItMatters:
      "Sovereign-grade clearing requires continuous capital adequacy monitoring. Breach escalation is automatic and non-discretionary.",
    href: "/intraday?demo=true",
  },
  {
    id: "controls",
    icon: ShieldOff,
    title: "Capital Guardrails",
    riskAddressed:
      "Systemic exposure accumulation beyond risk appetite. Discretionary override abuse without documented authorization.",
    controlMechanism:
      "Capital controls enforce operational restrictions based on breach level. In CAUTION mode, new reservations are throttled. In BREACH mode, settlement execution is blocked. EMERGENCY_HALT suspends all marketplace activity. Overrides require documented authorization with time-limited scope.",
    whyItMatters:
      "Automated policy enforcement removes discretionary intervention from critical risk decisions. Overrides create an auditable exception trail.",
    href: "/capital-controls?demo=true",
  },
  {
    id: "supervisory",
    icon: Gavel,
    title: "Supervisory Oversight",
    riskAddressed:
      "Lack of regulator-ready audit trails for clearing governance decisions. Opacity in settlement authorization and capital state at time of execution.",
    controlMechanism:
      "The supervisory console presents case dossiers for regulatory review. Each case includes settlement details, ledger history, capital snapshot at time of authorization, and an append-only audit trail.",
    whyItMatters:
      "Regulatory examination requires immutable evidence of governance integrity. The clearing authority must demonstrate that every settlement was authorized under documented conditions.",
    href: "/supervisory?demo=true",
  },
  {
    id: "certificate",
    icon: Award,
    title: "Clearing Certificate",
    riskAddressed:
      "Post-settlement reconciliation disputes. Lack of cryptographic proof of settlement finality.",
    controlMechanism:
      "Upon atomic DvP execution, the system issues a cryptographically verifiable clearing certificate. The certificate contains deterministic identifiers, a canonical signature hash, settlement details, and fee structure.",
    whyItMatters:
      "The clearing certificate serves as the authoritative proof of settlement finality for bilateral reconciliation, audit, and regulatory reporting.",
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
          infrastructure. Each section addresses a specific systemic risk
          control function.
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
                <div className="flex-1 space-y-3">
                  <h3 className="text-sm font-semibold text-text">
                    {section.title}
                  </h3>

                  {/* Risk Addressed */}
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
                      Risk Addressed
                    </span>
                    <p className="mt-0.5 text-xs text-text-muted leading-relaxed">
                      {section.riskAddressed}
                    </p>
                  </div>

                  {/* Control Mechanism */}
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
                      Control Mechanism
                    </span>
                    <p className="mt-0.5 text-xs text-text-muted leading-relaxed">
                      {section.controlMechanism}
                    </p>
                  </div>

                  {/* Why It Matters */}
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-text-faint font-semibold">
                      Why It Matters
                    </span>
                    <p className="mt-0.5 text-xs text-gold/80 leading-relaxed">
                      {section.whyItMatters}
                    </p>
                  </div>
                </div>

                {/* Launch button */}
                <Link
                  href={section.href}
                  className="shrink-0 rounded-sm border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-gold/10 hover:text-gold hover:border-gold/30"
                >
                  Launch
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
