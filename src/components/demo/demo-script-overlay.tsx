"use client";

/* ================================================================
   DEMO SCRIPT OVERLAY — Presenter Notes Panel
   
   Collapsible right-side panel with institutional talking points.
   - Shown only in demo mode.
   - Hidden automatically in presentation mode.
   - Toggleable via button.
   ================================================================ */

import { useState } from "react";
import { X, BookOpen } from "lucide-react";
import { useDemo } from "@/providers/demo-provider";

interface ScriptSection {
  id: string;
  title: string;
  bullets: [string, string, string];
  takeaway: string;
  riskPrevention: string;
}

const SCRIPT_SECTIONS: ScriptSection[] = [
  {
    id: "overview",
    title: "System Overview",
    bullets: [
      "Dashboard consolidates capital, settlement queue, and governance into a single surface.",
      "All metrics are derived from real-time settlement state — no static mock numbers.",
      "Breach events and capital adequacy are computed deterministically.",
    ],
    takeaway: "This is the command-and-control surface for a clearing authority — not an analytics dashboard.",
    riskPrevention: "Prevents fragmented awareness across siloed clearing functions.",
  },
  {
    id: "marketplace",
    title: "Marketplace & Reservation",
    bullets: [
      "Reservation locks bilateral exposure into the capital-aware perimeter.",
      "Policy gates enforce TRI, ECR, and hardstop checks before order creation.",
      "No exposure is created without passing capital adequacy validation.",
    ],
    takeaway: "Reservations convert market intent into risk-managed positions.",
    riskPrevention: "Prevents uncollateralized off-ledger agreements from entering the settlement pipeline.",
  },
  {
    id: "seller",
    title: "Seller Supply Controls",
    bullets: [
      "Three-part evidence pack: assay report, chain of custody, seller attestation.",
      "Publish gate validates seller verification, evidence completeness, and capital controls.",
      "Only verified sellers with complete evidence can enter the marketplace.",
    ],
    takeaway: "Inventory integrity is enforced before any buyer can see or reserve product.",
    riskPrevention: "Prevents unverified or under-documented inventory from reaching counterparties.",
  },
  {
    id: "settlement",
    title: "Settlement Lifecycle",
    bullets: [
      "Six deterministic stages: escrow, funds, allocation, verification, authorization, DvP.",
      "Each transition is role-gated with an append-only ledger entry.",
      "DvP execution is atomic — simultaneous title and payment transfer.",
    ],
    takeaway: "Settlement finality is guaranteed by deterministic state machine — not human judgment.",
    riskPrevention: "Prevents settlement failure from incomplete or out-of-sequence lifecycle transitions.",
  },
  {
    id: "capital",
    title: "Capital Adequacy",
    bullets: [
      "Live snapshot: gross exposure, ECR, TVaR₉₉ buffer, hardstop utilization.",
      "Breach levels are triggered deterministically when thresholds are exceeded.",
      "Top exposure drivers are ranked for concentration risk visibility.",
    ],
    takeaway: "Continuous monitoring replaces periodic reporting — breaches are immediate.",
    riskPrevention: "Prevents unmonitored accumulation of gross exposure beyond capital buffers.",
  },
  {
    id: "controls",
    title: "Capital Guardrails",
    bullets: [
      "NORMAL → THROTTLE → HALT → EMERGENCY_HALT escalation ladder.",
      "Overrides require documented authorization with time-limited scope.",
      "Override trail creates an auditable exception record.",
    ],
    takeaway: "Automated policy enforcement removes discretionary intervention from critical risk decisions.",
    riskPrevention: "Prevents systemic exposure accumulation and undocumented override abuse.",
  },
  {
    id: "supervisory",
    title: "Supervisory Oversight",
    bullets: [
      "Case dossiers present settlement details with full ledger history.",
      "Capital snapshot frozen at time of authorization is preserved.",
      "Immutable audit trail demonstrates governance integrity.",
    ],
    takeaway: "The supervisory console is the regulator-ready evidence package.",
    riskPrevention: "Prevents opacity in settlement authorization and capital conditions.",
  },
  {
    id: "certificate",
    title: "Clearing Certificate",
    bullets: [
      "Issued automatically upon DvP execution — no manual trigger.",
      "Contains deterministic identifiers, canonical signature hash, and fee structure.",
      "Independently verifiable against ledger state at time of issuance.",
    ],
    takeaway: "The certificate is the authoritative proof of settlement finality.",
    riskPrevention: "Prevents post-settlement reconciliation disputes via cryptographic proof.",
  },
];

export function DemoScriptOverlay() {
  const { isDemo, presentationMode } = useDemo();
  const [isOpen, setIsOpen] = useState(false);

  // Only render in demo mode and NOT in presentation mode
  if (!isDemo || presentationMode) return null;

  return (
    <>
      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-muted shadow-sm transition-colors hover:bg-surface-3 hover:text-text"
          title="Open Presenter Notes"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Notes</span>
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 z-40 flex h-screen w-80 flex-col border-l border-border bg-bg shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint">
              Presenter Notes
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-faint hover:text-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
            {SCRIPT_SECTIONS.map((section, idx) => (
              <div key={section.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tabular-nums text-text-faint">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs font-semibold text-text">
                    {section.title}
                  </span>
                </div>

                {/* Bullet points */}
                <ul className="space-y-1 pl-5">
                  {section.bullets.map((bullet, i) => (
                    <li key={i} className="text-[11px] text-text-muted leading-relaxed list-disc">
                      {bullet}
                    </li>
                  ))}
                </ul>

                {/* Takeaway */}
                <div className="rounded border border-gold/20 bg-gold/5 px-2.5 py-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-gold/60 font-semibold">
                    Key Takeaway
                  </span>
                  <p className="text-[11px] text-gold/90 mt-0.5">
                    {section.takeaway}
                  </p>
                </div>

                {/* Risk Prevention */}
                <div className="text-[10px] text-text-faint italic">
                  ↳ {section.riskPrevention}
                </div>

                {/* Divider (not on last) */}
                {idx < SCRIPT_SECTIONS.length - 1 && (
                  <div className="border-t border-border/50 pt-1" />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2">
            <p className="text-[9px] text-text-faint text-center uppercase tracking-widest">
              Institutional Demo — {SCRIPT_SECTIONS.length} Sections
            </p>
          </div>
        </div>
      )}
    </>
  );
}
