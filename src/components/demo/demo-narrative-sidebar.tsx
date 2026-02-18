"use client";

/* ================================================================
   DEMO NARRATIVE SIDEBAR — Visual seller flow explanation
   
   Purely visual panel. No logic changes. Explains:
   - Evidence Pack validation
   - Publish gates
   - Capital guardrails interaction
   - Inventory allocation
   ================================================================ */

interface NarrativeStep {
  label: string;
  description: string;
  status: "complete" | "active" | "pending";
}

const SELLER_NARRATIVE_STEPS: NarrativeStep[] = [
  {
    label: "Evidence Pack Submission",
    description:
      "Seller submits three mandatory artifacts: certified assay report, chain of custody certificate, and seller attestation. Each artifact is validated for format integrity and issuer attribution.",
    status: "complete",
  },
  {
    label: "Seller Identity Verification",
    description:
      "The platform verifies the seller's KYB status via the identity perimeter. Verification must be in VERIFIED state. Sellers in IN_PROGRESS, NEEDS_REVIEW, or REJECTED states are blocked from publishing.",
    status: "complete",
  },
  {
    label: "Publish Gate Evaluation",
    description:
      "An automated publish gate evaluates evidence completeness, seller verification status, and active capital control constraints. All checks must pass for the listing to transition from draft to available.",
    status: "complete",
  },
  {
    label: "Capital Guardrails Check",
    description:
      "The system evaluates whether publishing violates current capital control policy. In CAUTION or BREACH modes, new listings may be blocked unless an active override exists for PUBLISH_LISTING.",
    status: "complete",
  },
  {
    label: "Inventory Position Created",
    description:
      "Upon successful publish, the system allocates a deterministic inventory position. The position tracks total, available, reserved, and allocated weight. Available weight decreases as buyers reserve.",
    status: "complete",
  },
];

export function DemoNarrativeSidebar() {
  return (
    <div className="card-base p-5 space-y-4">
      <h3 className="text-sm font-semibold text-text">
        Seller Supply Chain — Narrative
      </h3>
      <p className="text-xs text-text-muted leading-relaxed">
        The seller flow enforces a strict publish pipeline. No inventory enters
        the marketplace without verified evidence, confirmed identity, and
        cleared capital controls.
      </p>

      <div className="space-y-0 pt-2">
        {SELLER_NARRATIVE_STEPS.map((step, idx) => {
          const isLast = idx === SELLER_NARRATIVE_STEPS.length - 1;
          return (
            <div key={step.label} className="flex gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    step.status === "complete"
                      ? "border-success/40 bg-success/10"
                      : step.status === "active"
                        ? "border-gold/40 bg-gold/10"
                        : "border-border bg-surface-2"
                  }`}
                >
                  {step.status === "complete" ? (
                    <svg className="h-2.5 w-2.5 text-success" fill="currentColor" viewBox="0 0 8 8">
                      <path d="M6.41 1L2.64 4.63 1.18 3.22 0 4.4l2.64 2.6L7.59 2.18z" />
                    </svg>
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-text-faint" />
                  )}
                </div>
                {!isLast && <div className="w-px flex-1 bg-border" />}
              </div>

              {/* Step content */}
              <div className="pb-4 pt-0">
                <span className="text-xs font-semibold text-text">
                  {step.label}
                </span>
                <p className="mt-0.5 text-[11px] text-text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
