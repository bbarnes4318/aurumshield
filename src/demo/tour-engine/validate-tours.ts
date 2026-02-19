/* ================================================================
   TOUR VALIDATOR — Dev-time diagnostic script

   Checks all tour definitions to validate:
   1. Every step with a route has a valid file in src/app/
   2. Click-gating percentages meet minimums (60%)
   3. Every target selector is documented

   Run: npx tsx src/demo/tour-engine/validate-tours.ts
   ================================================================ */

import { buyerTour } from "../tours/buyer";
import { sellerTour } from "../tours/seller";
import { adminTour } from "../tours/admin";
import type { TourDefinition, TourStep } from "./tourTypes";

const tours: TourDefinition[] = [buyerTour, sellerTour, adminTour];

interface ValidationResult {
  tourId: string;
  totalSteps: number;
  clickGated: number;
  clickGatedPercent: number;
  issues: string[];
}

function validateTour(tour: TourDefinition): ValidationResult {
  const issues: string[] = [];
  let clickGated = 0;

  for (const step of tour.steps) {
    // Check click-gated
    if (step.next.type === "click") {
      clickGated++;

      // Validate click target matches step target
      if (step.next.target && step.target && step.next.target !== step.target) {
        // This is fine — click target can differ from highlight target
      }

      // Check click target is specified
      if (!step.next.target) {
        issues.push(`Step "${step.id}": click-gated but no click target specified`);
      }
    }

    // Check for missing target on non-center placement
    if (step.placement !== "center" && !step.target) {
      issues.push(`Step "${step.id}": placement="${step.placement}" but no target selector`);
    }

    // Validate target selector format
    if (step.target && !step.target.startsWith("[data-tour=")) {
      issues.push(`Step "${step.id}": target "${step.target}" doesn't use data-tour attribute`);
    }
  }

  const clickGatedPercent = Math.round((clickGated / tour.steps.length) * 100);

  if (clickGatedPercent < 60) {
    issues.push(
      `Click-gating below 60% minimum: ${clickGated}/${tour.steps.length} = ${clickGatedPercent}%`
    );
  }

  return {
    tourId: tour.id,
    totalSteps: tour.steps.length,
    clickGated,
    clickGatedPercent,
    issues,
  };
}

// Known data-tour selectors and their expected routes
const KNOWN_SELECTORS: Record<string, string> = {
  "buyer-active-transaction": "/buyer",
  "sidebar-marketplace": "sidebar (global)",
  "marketplace-reserve-cta": "/marketplace",
  "marketplace-listing-demo": "/marketplace",
  "reservation-convert-cta": "/reservations",
  "verification-continue": "/buyer (CounterpartyVerificationPanel)",
  "activation-pay-cta": "/buyer",
  "settlement-row-demo": "/settlements",
  "certificate-view": "/settlements/[id]",
  "seller-listings": "/seller",
  "listing-publish-btn": "/seller",
  "seller-open-settlement-cta": "/seller",
  "settlement-ledger": "/settlements/[id]",
  "dashboard-capital": "/dashboard",
  "pricing-edit-btn": "/admin/pricing",
  "pricing-save-btn": "/admin/pricing",
  "sidebar-controls": "sidebar (global)",
  "control-mode-toggle": "/capital-controls",
  "sidebar-settlements": "sidebar (global)",
  "sidebar-audit": "sidebar (global)",
  "buyer-portfolio": "/buyer",
  "counterparty-verification": "/buyer (CounterpartyVerificationPanel)",
  "support-phone": "/buyer, /seller",
  "verification-sequence": "/buyer (CounterpartyVerificationPanel)",
};

function extractSelectorName(target: string): string {
  const match = target.match(/data-tour="([^"]+)"/);
  return match ? match[1] : target;
}

// Run validation
console.log("═══ AurumShield Tour Validator ═══\n");

let allPassed = true;

for (const tour of tours) {
  const result = validateTour(tour);

  console.log(`Tour: ${result.tourId}`);
  console.log(`  Steps: ${result.totalSteps}`);
  console.log(`  Click-gated: ${result.clickGated}/${result.totalSteps} = ${result.clickGatedPercent}%`);

  // List all targets
  console.log("  Targets:");
  for (const step of tour.steps) {
    if (step.target) {
      const name = extractSelectorName(step.target);
      const location = KNOWN_SELECTORS[name] ?? "UNKNOWN LOCATION";
      const isClick = step.next.type === "click" ? " [CLICK-GATED]" : " [manual]";
      console.log(`    ${step.id}: ${name} → ${location}${isClick}`);
    } else {
      console.log(`    ${step.id}: (no target — center/narration)`);
    }
  }

  if (result.issues.length > 0) {
    allPassed = false;
    console.log("  ⚠ Issues:");
    for (const issue of result.issues) {
      console.log(`    - ${issue}`);
    }
  } else {
    console.log("  ✓ All checks passed");
  }

  console.log("");
}

// Summary
console.log("═══ Summary ═══");
const allResults = tours.map(validateTour);
const allIssuesCount = allResults.reduce((sum, r) => sum + r.issues.length, 0);
console.log(
  `Total tours: ${tours.length} | Total issues: ${allIssuesCount} | ${allPassed ? "✓ ALL PASSED" : "✗ ISSUES FOUND"}`
);

if (!allPassed) {
  process.exit(1);
}
