"use client";

/* ================================================================
   OFFTAKER ORG SELECTION — Executing Entity Perimeter Gateway
   ================================================================
   Single monolithic terminal pane. No SaaS split-card pattern.
   Establishes multi-tenant perimeter — the Offtaker must either
   attach to an existing entity via invitation code or instantiate
   a new corporate entity for clearing access.
   ================================================================ */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  KeyRound,
  ArrowRight,
  Shield,
  Lock,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  AlertTriangle,
} from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";

export default function OrgSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemoActive = searchParams.get("demo") === "active";
  const [invitationCode, setInvitationCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showAttach, setShowAttach] = useState(false);

  const handleJoinOrg = () => {
    if (!invitationCode.trim()) {
      setJoinError("Invitation code is required");
      return;
    }
    setJoinError("");
    const demoParam = isDemoActive ? "&demo=active" : "";
    router.push(
      `/offtaker/org/join?code=${encodeURIComponent(invitationCode.trim())}${demoParam}`
    );
  };

  const handleInitializeOrg = () => {
    const demoParam = isDemoActive ? "?demo=active" : "";
    router.push(`/offtaker/onboarding/intake${demoParam}`);
  };

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-xl">
        {/* ── Terminal Frame ── */}
        <div className="bg-black border border-slate-800 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
          {/* ── Title Bar ── */}
          <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-gold-primary" />
              <span className="font-mono text-gold-primary text-[10px] tracking-[0.3em] uppercase font-bold">
                Register Executing Entity
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fingerprint className="h-3 w-3 text-slate-600" />
              <span className="font-mono text-[9px] text-slate-600 tracking-wider">
                PERIMETER GATE
              </span>
            </div>
          </div>

          {/* ── Terminal Body ── */}
          <div className="p-6 space-y-5">
            {/* System Status */}
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
              <span className="font-mono text-[10px] text-emerald-400 tracking-wider uppercase">
                Clearing Engine Online — Ready for Entity Registration
              </span>
            </div>

            {/* Context */}
            <p className="font-mono text-xs text-slate-400 leading-relaxed">
              Bind your session to a verified corporate entity before accessing
              the AurumShield settlement engine. All actions within this
              perimeter are cryptographically logged.
            </p>

            {/* ── Parameter Readout ── */}
            <div className="bg-slate-950 border border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-3 w-3 text-slate-600" />
                <span className="font-mono text-[9px] text-slate-500 tracking-[0.15em] uppercase">
                  Entity Parameters
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-2">
                <span className="font-mono text-[10px] text-slate-600">
                  role_assignment
                </span>
                <span className="font-mono text-[10px] text-gold-primary text-right tabular-nums">
                  TREASURY_ADMIN
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  perimeter_type
                </span>
                <span className="font-mono text-[10px] text-slate-400 text-right">
                  INSTITUTIONAL
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  compliance_tier
                </span>
                <span className="font-mono text-[10px] text-slate-400 text-right">
                  SOVEREIGN
                </span>
                <span className="font-mono text-[10px] text-slate-600">
                  clearing_access
                </span>
                <span className="font-mono text-[10px] text-emerald-400 text-right">
                  ENABLED
                </span>
              </div>
            </div>

            {/* ── Primary CTA: Initialize Organization ── */}
            <div className="relative">
              {isDemoActive && (
                <DemoTooltip
                  text="Register your corporate entity to enter the secure perimeter ↓"
                  position="top"
                />
              )}
              <button
                onClick={handleInitializeOrg}
                className={`w-full bg-gold-primary text-slate-950 font-mono font-bold text-sm tracking-[0.15em] uppercase py-4 flex items-center justify-center gap-2 hover:bg-gold-hover transition-colors cursor-pointer ${isDemoActive ? `${DEMO_SPOTLIGHT_CLASSES} demo-cta-glow` : ""}`}
              >
                <Building2 className="h-4 w-4" />
                Initialize New Entity
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* ── Collapsible: Attach to Existing Perimeter ── */}
            <div className="border border-slate-800">
              <button
                onClick={() => setShowAttach(!showAttach)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-900/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase">
                    Attach to Existing Perimeter
                  </span>
                </div>
                {showAttach ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-600" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                )}
              </button>

              {showAttach && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-800/50">
                  <div className="pt-3">
                    <label
                      htmlFor="invitation-code"
                      className="font-mono text-slate-600 text-[9px] tracking-[0.15em] uppercase block mb-2"
                    >
                      Encrypted Invitation Code
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-gold-primary text-sm select-none">
                        $
                      </span>
                      <input
                        id="invitation-code"
                        type="text"
                        value={invitationCode}
                        onChange={(e) => {
                          setInvitationCode(e.target.value);
                          if (joinError) setJoinError("");
                        }}
                        placeholder="enter-invitation-code"
                        className="w-full bg-slate-950 border border-slate-700 px-8 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
                      />
                    </div>
                    {joinError && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                        <p className="font-mono text-[10px] text-red-400">
                          {joinError}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleJoinOrg}
                    className="w-full border border-slate-700 text-slate-300 font-mono text-xs tracking-widest uppercase py-2.5 hover:border-gold-primary/50 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Authenticate & Attach
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Terminal Footer ── */}
          <div className="bg-slate-900/50 border-t border-slate-800 px-5 py-2.5">
            <span className="font-mono text-[8px] text-slate-600 tracking-widest uppercase block text-center">
              Execution is cryptographically binding · IP address logged under
              BSA/AML protocols
            </span>
          </div>
        </div>

        {/* ── Trust Line ── */}
        <p className="mt-4 text-center font-mono text-[9px] text-slate-700 tracking-wider">
          AurumShield Clearing · Sovereign Financial Infrastructure ·
          Multi-Tenant Isolation
        </p>

        <TelemetryFooter />
      </div>
    </div>
  );
}
