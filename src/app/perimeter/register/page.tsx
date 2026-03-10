"use client";

/* ================================================================
   REGISTER TERMINAL — Compliance Perimeter Phase 1
   ================================================================
   Clerk integration mock: Institutional email + 2FA TOTP entry.
   Terminal-grade dark mode. No backend logic yet.
   ================================================================ */

import { useState, useRef, useCallback } from "react";
import { Shield, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

/* ── Constants ── */
const BRAND_GOLD = "#c6a86b";

export default function RegisterTerminalPage() {
  /* ── Step State ── */
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  /* ── TOTP State ── */
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ── Handlers ── */
  const handleEmailSubmit = useCallback(() => {
    if (!email.includes("@")) return;
    setEmailSubmitted(true);
    // Simulate brief delay then advance to Step 2
    setTimeout(() => setStep(2), 600);
  }, [email]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (value.length > 1) return;
      if (value && !/^\d$/.test(value)) return;

      const next = [...digits];
      next[index] = value;
      setDigits(next);

      // Auto-advance to next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleDigitKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  const allDigitsFilled = digits.every((d) => d !== "");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      {/* ── Terminal Window ── */}
      <div className="w-full max-w-lg">
        {/* Terminal header bar */}
        <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-slate-800 bg-slate-900/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
          <span className="ml-3 font-mono text-[10px] tracking-wider text-slate-600">
            perimeter://register
          </span>
        </div>

        {/* Terminal body */}
        <div className="rounded-b-xl border border-slate-800 bg-slate-900/60 p-8">
          {/* ── Header ── */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/40">
              <Shield className="h-7 w-7" style={{ color: BRAND_GOLD }} />
            </div>
            <div className="text-center">
              <p
                className="font-mono text-xs font-bold uppercase tracking-[0.2em]"
                style={{ color: BRAND_GOLD }}
              >
                Secure Enclave // Identity Registration
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">
                All sessions are cryptographically sealed. Provide your
                institutional credentials to proceed.
              </p>
            </div>
          </div>

          {/* ── Step Indicators ── */}
          <div className="mb-8 flex items-center justify-center gap-6">
            {/* Step 1 Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-all ${
                  step === 1
                    ? "border-[#c6a86b]/60 bg-[#c6a86b]/15 text-[#c6a86b]"
                    : emailSubmitted
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-700 text-slate-600"
                }`}
              >
                {emailSubmitted ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  "1"
                )}
              </div>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  step === 1 ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Email
              </span>
            </div>

            {/* Connector */}
            <div className="h-px w-8 bg-slate-800" />

            {/* Step 2 Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[10px] font-bold transition-all ${
                  step === 2
                    ? "border-[#c6a86b]/60 bg-[#c6a86b]/15 text-[#c6a86b]"
                    : "border-slate-700 text-slate-600"
                }`}
              >
                2
              </div>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  step === 2 ? "text-slate-300" : "text-slate-500"
                }`}
              >
                2FA
              </span>
            </div>
          </div>

          {/* ════════════════════════════════════════════
               STEP 1 — Institutional Email
             ════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="institutional-email"
                  className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500"
                >
                  Institutional Email Address
                </label>
                <div className="relative">
                  <input
                    id="institutional-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEmailSubmit();
                    }}
                    placeholder="trader@institution.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3.5 font-mono text-sm text-slate-200 placeholder:text-slate-600 transition-all focus:border-[#c6a86b]/50 focus:outline-none focus:ring-1 focus:ring-[#c6a86b]/30"
                    autoComplete="email"
                    autoFocus
                  />
                  <Lock className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
                </div>
                <p className="mt-2 font-mono text-[10px] text-slate-600">
                  Only verified institutional domains are accepted.
                </p>
              </div>

              <button
                type="button"
                onClick={handleEmailSubmit}
                disabled={!email.includes("@")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-slate-300 transition-all hover:border-[#c6a86b]/40 hover:bg-slate-800 hover:text-[#c6a86b] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:bg-slate-800/80 disabled:hover:text-slate-300"
              >
                <span className="flex items-center justify-center gap-2">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Verify Email Address
                </span>
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════
               STEP 2 — 2FA TOTP Authorization
             ════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Two-Factor Authorization
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              {/* TOTP Input Grid */}
              <div className="flex items-center justify-center gap-3">
                {digits.map((digit, i) => (
                  <div key={i} className="relative">
                    {/* Separator after 3rd digit */}
                    {i === 3 && (
                      <span className="absolute -left-2 top-1/2 -translate-y-1/2 font-mono text-lg text-slate-700">
                        –
                      </span>
                    )}
                    <input
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      className={`h-14 w-12 rounded-lg border bg-slate-950 text-center font-mono text-xl font-bold tabular-nums text-white transition-all focus:outline-none ${
                        digit
                          ? "border-[#c6a86b]/50 shadow-[0_0_12px_rgba(198,168,107,0.1)]"
                          : "border-slate-700 focus:border-[#c6a86b]/40 focus:ring-1 focus:ring-[#c6a86b]/20"
                      }`}
                      autoFocus={i === 0}
                    />
                  </div>
                ))}
              </div>

              {/* ── INITIALIZE SESSION Button ── */}
              <Link href="/perimeter/verify">
                <button
                  type="button"
                  disabled={!allDigitsFilled}
                  className="w-full rounded-lg px-6 py-4 font-mono text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
                  style={{
                    backgroundColor: allDigitsFilled ? BRAND_GOLD : undefined,
                    color: allDigitsFilled ? "#0f172a" : undefined,
                    boxShadow: allDigitsFilled
                      ? `0 0 20px rgba(198,168,107,0.2), 0 4px 12px rgba(198,168,107,0.15)`
                      : undefined,
                  }}
                >
                  [ INITIALIZE SESSION ]
                </button>
              </Link>

              <p className="text-center font-mono text-[10px] text-slate-600">
                Session will be bound to your institutional identity and 2FA
                device.
              </p>
            </div>
          )}
        </div>

        {/* ── Terminal status bar ── */}
        <div className="mt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-600">
              TLS 1.3 Encrypted
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-700">
            Perimeter v1.0.0
          </span>
        </div>
      </div>
    </div>
  );
}
