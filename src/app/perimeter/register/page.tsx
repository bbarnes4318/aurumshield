"use client";

/* ================================================================
   REGISTRATION — Clerk SignUp
   ================================================================
   Uses Clerk's actual <SignUp /> component for real email
   verification and 2FA. Themed to match the platform's dark design.
   After sign-up → redirects to /perimeter/verify.
   ================================================================ */

import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-lg py-8">
      {/* Header */}
      <div className="mb-8 text-center" data-tour="perimeter-auth">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Create Your Account
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Secure registration with email verification and two-factor
          authentication.
        </p>
      </div>

      {/* Clerk SignUp Component */}
      <div data-tour="perimeter-email">
      <SignUp
        routing="hash"
        fallbackRedirectUrl="/perimeter/verify"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-surface-1 border border-border rounded-xl shadow-none w-full",
            headerTitle: "text-white font-bold",
            headerSubtitle: "text-slate-400",
            socialButtonsBlockButton:
              "border-border bg-surface-2 text-slate-300 hover:bg-surface-2/80",
            socialButtonsBlockButtonText: "text-slate-300 font-medium",
            formFieldLabel: "text-slate-400",
            formFieldInput:
              "bg-surface-2 border-border text-white placeholder:text-slate-600 focus:border-gold/50 focus:ring-gold/30",
            formButtonPrimary:
              "bg-gold hover:bg-gold-hover text-bg font-bold",
            footerActionLink: "text-gold hover:text-gold-hover",
            identityPreviewEditButton: "text-gold",
            formFieldAction: "text-gold",
            otpCodeFieldInput:
              "bg-surface-2 border-border text-white",
            dividerLine: "bg-border",
            dividerText: "text-slate-500",
          },
          variables: {
            colorPrimary: "#c6a86b",
            colorBackground: "hsl(var(--surface-1))",
            colorText: "white",
            colorTextSecondary: "#94a3b8",
            colorInputBackground: "hsl(var(--surface-2))",
            colorInputText: "white",
            borderRadius: "0.5rem",
          },
        }}
      />
      </div>
      {/* Autopilot target — WebAuthn verification badge */}
      <div data-tour="perimeter-webauthn" className="mt-4 text-center text-xs text-slate-600 font-mono" />
    </div>
  );
}
