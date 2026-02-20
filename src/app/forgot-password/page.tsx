"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, CheckCircle2 } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ResetForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = (_data: ResetForm) => {
    // Mock: always succeed (no email enumeration)
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4">
            <AppLogo size="normal" variant="white" priority />
          </div>
          <h1 className="text-xl font-semibold text-text tracking-tight">Reset Password</h1>
          <p className="mt-1 text-sm text-text-faint">AurumShield Identity Perimeter</p>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-surface-1 p-6 shadow-md">
          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <h2 className="text-base font-semibold text-text mb-1">Reset Link Sent</h2>
              <p className="text-sm text-text-faint mb-4">
                If an account exists for this email, a password reset link has been dispatched. Check your institutional inbox.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-input)] bg-gold px-4 py-2 text-sm font-medium text-bg hover:bg-gold-hover transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold text-text mb-1">Forgot your password?</h2>
              <p className="text-sm text-text-faint mb-6">
                Enter the email address associated with your institutional account. We&apos;ll send a secure reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-medium text-text-muted mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="name@institution.com"
                    className="w-full rounded-[var(--radius-input)] border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors"
                    {...register("email")}
                  />
                  {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-input)] bg-gold px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-gold-hover active:bg-gold-pressed disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-text-faint">
                <Link href="/login" className="text-gold hover:text-gold-hover transition-colors font-medium">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
