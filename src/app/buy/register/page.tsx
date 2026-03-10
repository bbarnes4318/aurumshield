"use client";

/* ================================================================
   PHASE 1: REGISTRATION — Clerk SignUp
   ================================================================
   Uses Clerk's built-in SignUp component for real email verification
   and 2FA. No custom auth code. After sign-up completes, marks
   the register phase as complete and redirects to /buy/verify.
   ================================================================ */

import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Create Your Account
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Secure registration with email verification and two-factor
          authentication.
        </p>
      </div>

      {/* Clerk SignUp Component */}
      <div className="w-full max-w-md">
        <SignUp
          routing="hash"
          afterSignUpUrl="/buy/verify"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#0d1829] border border-slate-800 rounded-2xl shadow-none",
              headerTitle: "text-white",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton:
                "border-slate-700 bg-[#070e1a] text-slate-300 hover:bg-slate-800",
              formFieldLabel: "text-slate-400",
              formFieldInput:
                "bg-[#070e1a] border-slate-700 text-white placeholder:text-slate-600 focus:border-[#c6a86b]/50 focus:ring-[#c6a86b]/30",
              formButtonPrimary:
                "bg-[#c6a86b] hover:bg-[#b89a5f] text-[#0a1128] font-bold",
              footerActionLink: "text-[#c6a86b] hover:text-[#b89a5f]",
              identityPreviewEditButton: "text-[#c6a86b]",
              formFieldAction: "text-[#c6a86b]",
              otpCodeFieldInput:
                "bg-[#070e1a] border-slate-700 text-white",
            },
            variables: {
              colorPrimary: "#c6a86b",
              colorBackground: "#0d1829",
              colorText: "white",
              colorTextSecondary: "#94a3b8",
              colorInputBackground: "#070e1a",
              colorInputText: "white",
              borderRadius: "0.75rem",
            },
          }}
        />
      </div>
    </div>
  );
}
