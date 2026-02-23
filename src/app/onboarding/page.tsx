/* ================================================================
   /onboarding — KYC/KYB Onboarding Wizard Page
   ================================================================
   Premium white-glove onboarding experience for institutional
   buyers. Three-step progressive disclosure flow:
     1. Corporate Identity & Contact
     2. UBO Document Upload
     3. Biometric Liveness Check
   ================================================================ */

import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata = {
  title: "Onboarding — AurumShield Identity Verification",
  description:
    "Complete your institutional KYC/KYB verification to access AurumShield's sovereign gold clearing platform.",
};

export default function OnboardingPage() {
  return (
    <div className="w-full max-w-[560px]">
      {/* Frosted glass card */}
      <div className="glass-panel px-8 py-8 shadow-xl">
        <OnboardingWizard />
      </div>

      {/* Footer trust line */}
      <p className="mt-6 text-center text-[10px] text-color-3/25 tracking-wide">
        AurumShield Clearing · Sovereign Financial Infrastructure · All data
        encrypted in transit and at rest
      </p>
    </div>
  );
}
