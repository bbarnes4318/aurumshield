"use client";

/* ================================================================
   SIGNUP PAGE — Dual-mode (Clerk + Demo)
   ================================================================
   When Clerk is configured: Shows Clerk's <SignUp /> component.
   When not configured: Shows the original institutional signup form.
   ================================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, AlertCircle, ShieldAlert } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { useAuth } from "@/providers/auth-provider";
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";
import { SignUp } from "@clerk/nextjs";

/** Check if Clerk is configured at build time */
const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

const signupSchema = z
  .object({
    name: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid institutional email address"),
    password: z.string().min(6, "Minimum 6 characters required"),
    confirmPassword: z.string(),
    orgName: z.string().min(2, "Legal entity name is required"),
    orgType: z.enum(["individual", "company"], {
      message: "Select entity type",
    }),
    jurisdiction: z.string().min(2, "Jurisdiction is required"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fingerprintWarning, setFingerprintWarning] = useState<string | null>(null);

  /* ── Fingerprint.com — capture visitor_id on mount ── */
  const { data: fpData } = useVisitorData(
    { extendedResult: true },
    { immediate: true },
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      orgName: "",
      orgType: "company",
      jurisdiction: "",
    },
  });

  const onSubmit = async (data: SignupForm) => {
    setServerError(null);
    setFingerprintWarning(null);

    /* ── Device fraud check (non-blocking for demo) ── */
    if (fpData?.visitorId) {
      try {
        const res = await fetch("/api/fingerprint/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId: fpData.visitorId,
            requestId: fpData.requestId,
          }),
        });
        if (res.ok) {
          const verification = await res.json();
          if (!verification.trusted) {
            setFingerprintWarning(
              verification.riskDetail ?? "Device flagged — please contact support.",
            );
            // In production, block signup entirely for untrusted devices.
            // For now, we show a warning but allow registration to proceed.
          }
        }
      } catch {
        // Fingerprint verification failure is non-fatal
        console.warn("[AurumShield] Fingerprint verification unavailable");
      }
    }

    const result = signup({
      email: data.email,
      name: data.name,
      orgName: data.orgName,
      orgType: data.orgType,
      jurisdiction: data.jurisdiction,
    });
    if (result.success) {
      router.replace("/platform");
    } else {
      setServerError(result.error ?? "Registration failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4">
            <AppLogo className="h-12 w-auto" variant="dark" />
          </div>
          <h1 className="text-xl font-semibold text-text tracking-tight">
            Register Institution
          </h1>
          <p className="mt-1 text-sm text-text-faint">
            Create an institutional account on AurumShield
          </p>
        </div>

        {/* ─── Clerk Sign-Up (when configured) ─── */}
        {CLERK_ENABLED && (
          <div className="mb-6 flex justify-center">
            <SignUp
              routing="hash"
              forceRedirectUrl="/platform"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-surface-1 border border-border shadow-md",
                  headerTitle: "text-text",
                  headerSubtitle: "text-text-muted",
                  formFieldInput:
                    "bg-surface-2 border-border text-text placeholder:text-text-faint",
                  formButtonPrimary:
                    "bg-gold hover:bg-gold-hover text-bg font-medium",
                  footerActionLink: "text-gold hover:text-gold-hover",
                },
              }}
            />
          </div>
        )}

        {/* ─── Mock Signup Form (when Clerk not configured) ─── */}
        {!CLERK_ENABLED && (
          <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
            {serverError && (
              <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {serverError}
              </div>
            )}

            {fingerprintWarning && (
              <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-400">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                {fingerprintWarning}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Personal */}
              <fieldset>
                <legend className="text-[10px] uppercase tracking-widest text-text-faint font-semibold mb-3">
                  Authorized Representative
                </legend>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-medium text-text-muted mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      autoFocus
                      placeholder="J. Smith"
                      className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-danger">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-xs font-medium text-text-muted mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@institution.com"
                      className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-danger">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-medium text-text-muted mb-1.5"
                      >
                        Password
                      </label>
                      <input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                        {...register("password")}
                      />
                      {errors.password && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.password.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="signup-confirm"
                        className="block text-xs font-medium text-text-muted mb-1.5"
                      >
                        Confirm Password
                      </label>
                      <input
                        id="signup-confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                        {...register("confirmPassword")}
                      />
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Organization */}
              <fieldset>
                <legend className="text-[10px] uppercase tracking-widest text-text-faint font-semibold mb-3 mt-2">
                  Legal Entity
                </legend>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="signup-org"
                      className="block text-xs font-medium text-text-muted mb-1.5"
                    >
                      Legal Entity Name
                    </label>
                    <input
                      id="signup-org"
                      type="text"
                      placeholder="Aurelia Sovereign Fund"
                      className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                      {...register("orgName")}
                    />
                    {errors.orgName && (
                      <p className="mt-1 text-xs text-danger">
                        {errors.orgName.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-orgtype"
                        className="block text-xs font-medium text-text-muted mb-1.5"
                      >
                        Entity Type
                      </label>
                      <select
                        id="signup-orgtype"
                        className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                        {...register("orgType")}
                      >
                        <option value="company">Company</option>
                        <option value="individual">Individual</option>
                      </select>
                      {errors.orgType && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.orgType.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="signup-jurisdiction"
                        className="block text-xs font-medium text-text-muted mb-1.5"
                      >
                        Jurisdiction
                      </label>
                      <input
                        id="signup-jurisdiction"
                        type="text"
                        placeholder="United States"
                        className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                        {...register("jurisdiction")}
                      />
                      {errors.jurisdiction && (
                        <p className="mt-1 text-xs text-danger">
                          {errors.jurisdiction.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-input)] bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring mt-2"
              >
                <UserPlus className="h-4 w-4" />
                {isSubmitting ? "Creating…" : "Register Institution"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-text-faint">
              Already registered?{" "}
              <Link
                href="/login"
                className="text-gold hover:text-gold-hover transition-colors font-medium"
              >
                Sign in →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
