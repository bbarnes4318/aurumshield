"use client";

/* ================================================================
   LOGIN PAGE — Dual-mode (Clerk + Demo)
   ================================================================
   When Clerk is configured with valid keys:
   - Shows Clerk's <SignIn /> component (handles OAuth, MFA, etc.)
   - Preserves demo account quick-login below for demo mode

   When Clerk is NOT configured:
   - Shows the original mock credential form
   - Demo accounts work via localStorage auth
   ================================================================ */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/state-views";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, AlertCircle } from "lucide-react";
import { AppLogo } from "@/components/app-logo";
import { useAuth } from "@/providers/auth-provider";
// TODO: Uncomment when @clerk/nextjs is installed
// import { SignIn } from "@clerk/nextjs";

/** Check if Clerk is configured at build time */
const CLERK_ENABLED =
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY !== "YOUR_PUBLISHABLE_KEY" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

const loginSchema = z.object({
  email: z.string().email("Enter a valid institutional email address"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading…" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginForm) => {
    setServerError(null);
    const result = login(data.email);
    if (result.success) {
      const next = searchParams.get("next");
      router.replace(next ? decodeURIComponent(next) : "/dashboard");
    } else {
      setServerError(result.error ?? "Authentication failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4">
            <AppLogo size="normal" variant="white" priority />
          </div>
          <p className="mt-1 text-sm text-text-faint">
            Sovereign Financial Infrastructure
          </p>
        </div>

        {/* ─── Clerk Sign-In (when configured) ─── */}
        {/* TODO: Uncomment when @clerk/nextjs is installed
        {CLERK_ENABLED && (
          <div className="mb-6 flex justify-center">
            <SignIn
              routing="hash"
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
        */}

        {/* ─── Demo / Mock Login Form ─── */}
        {!CLERK_ENABLED && (
          <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
            <h2 className="text-base font-semibold text-text mb-1">Sign in</h2>
            <p className="text-sm text-text-faint mb-6">
              Enter your institutional credentials to access the platform.
            </p>

            {serverError && (
              <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-text-muted mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
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

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-text-muted mb-1.5"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-input)] bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <LogIn className="h-4 w-4" />
                {isSubmitting ? "Authenticating…" : "Sign In"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs">
              <Link
                href="/forgot-password"
                className="text-text-faint hover:text-gold transition-colors"
              >
                Forgot password?
              </Link>
              <Link
                href="/signup"
                className="text-gold hover:text-gold-hover transition-colors font-medium"
              >
                Register institution →
              </Link>
            </div>
          </div>
        )}

        {/* Demo hint — always visible */}
        <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold mb-1.5">
            Demo Accounts
          </p>
          <div className="space-y-1 text-xs text-text-muted font-mono">
            <p>
              m.reynolds@aurelia.lu{" "}
              <span className="text-text-faint">(buyer, verified)</span>
            </p>
            <p>
              a.clarke@meridian.co.uk{" "}
              <span className="text-text-faint">(seller, in_progress)</span>
            </p>
            <p>
              admin@aurumshield.io{" "}
              <span className="text-text-faint">(admin, verified)</span>
            </p>
          </div>

          {/* Quick demo login when Clerk is enabled */}
          {CLERK_ENABLED && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold mb-2">
                Demo Quick Login
              </p>
              <DemoQuickLogin />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Quick demo login buttons — for use when Clerk is enabled but demo mode is needed */
function DemoQuickLogin() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = (email: string) => {
    setError(null);
    const result = login(email);
    if (result.success) {
      router.replace("/dashboard");
    } else {
      setError(result.error ?? "Demo login failed.");
    }
  };

  return (
    <div className="space-y-1.5">
      {error && (
        <p className="text-xs text-danger mb-1">{error}</p>
      )}
      <button
        onClick={() => handleDemoLogin("m.reynolds@aurelia.lu")}
        className="w-full text-left rounded-[var(--radius-sm)] border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
      >
        <span className="font-mono">m.reynolds@aurelia.lu</span>{" "}
        <span className="text-text-faint">→ Buyer</span>
      </button>
      <button
        onClick={() => handleDemoLogin("a.clarke@meridian.co.uk")}
        className="w-full text-left rounded-[var(--radius-sm)] border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
      >
        <span className="font-mono">a.clarke@meridian.co.uk</span>{" "}
        <span className="text-text-faint">→ Seller</span>
      </button>
      <button
        onClick={() => handleDemoLogin("admin@aurumshield.io")}
        className="w-full text-left rounded-[var(--radius-sm)] border border-border bg-surface-1 px-3 py-1.5 text-xs text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
      >
        <span className="font-mono">admin@aurumshield.io</span>{" "}
        <span className="text-text-faint">→ Admin</span>
      </button>
    </div>
  );
}
