/* ================================================================
   /onboarding — Enterprise KYB Onboarding Wizard Page
   ================================================================
   Premium white-glove onboarding experience for institutional
   partners. Six-step progressive disclosure flow:
     1. Entity Registration & LEI Verification
     2. KYB & Sanctions Screening
     3. WebAuthn & SSO Enrollment
     4. Maker-Checker Role Assignment
     5. DocuSign CLM & Attestation
     6. Verification Complete
   ================================================================ */

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata = {
  title: "Onboarding — AurumShield Institutional Enrollment",
  description:
    "Complete your institutional KYB verification, WebAuthn enrollment, and maker-checker role assignment to access AurumShield's sovereign gold clearing platform.",
};

export default function OnboardingPage() {
  return (
    <div className="w-full max-w-[640px]">
      {/* Frosted glass card */}
      <div className="glass-panel px-8 py-8 shadow-xl">
        <OnboardingWizard />
      </div>

      {/* Footer trust line */}
      <p className="mt-6 text-center text-[10px] text-color-3/25 tracking-wide">
        AurumShield Clearing · Sovereign Financial Infrastructure · All data
        encrypted in transit and at rest · GLEIF · Persona · DocuSign CLM
      </p>
    </div>
  );
}
