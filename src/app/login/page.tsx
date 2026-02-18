"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/state-views";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";

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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
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
            <Image
              src="/arum-logo-white.png"
              alt="AurumShield"
              width={280}
              height={64}
              className="h-12 w-auto"
              priority
            />
          </div>
          <p className="mt-1 text-sm text-text-faint">Sovereign Financial Infrastructure</p>
        </div>

        {/* Form card */}
        <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
          <h2 className="text-base font-semibold text-text mb-1">Sign in</h2>
          <p className="text-sm text-text-faint mb-6">Enter your institutional credentials to access the platform.</p>

          {serverError && (
            <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-text-muted mb-1.5">
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
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-text-muted mb-1.5">
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
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
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
            <Link href="/forgot-password" className="text-text-faint hover:text-gold transition-colors">
              Forgot password?
            </Link>
            <Link href="/signup" className="text-gold hover:text-gold-hover transition-colors font-medium">
              Register institution →
            </Link>
          </div>
        </div>

        {/* Demo hint */}
        <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold mb-1.5">Demo Accounts</p>
          <div className="space-y-1 text-xs text-text-muted font-mono">
            <p>m.reynolds@aurelia.lu <span className="text-text-faint">(buyer, verified)</span></p>
            <p>a.clarke@meridian.co.uk <span className="text-text-faint">(seller, in_progress)</span></p>
            <p>admin@aurumshield.io <span className="text-text-faint">(admin, verified)</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
