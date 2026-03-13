"use client";

/* ================================================================
   OFFTAKER ORG SELECTION GATEWAY
   ================================================================
   First screen after basic auth. Establishes the multi-tenant
   perimeter — the Offtaker must either join an existing org via
   encrypted invitation code or instantiate a new corporate entity.
   ================================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, Plus, ArrowRight, Shield } from "lucide-react";
import TelemetryFooter from "@/components/offtaker/TelemetryFooter";

export default function OrgSelectPage() {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleJoinOrg = () => {
    if (!invitationCode.trim()) {
      setJoinError("Invitation code is required");
      return;
    }
    // TODO: Validate invitation code against API
    setJoinError("");
    router.push(`/offtaker/org/join?code=${encodeURIComponent(invitationCode.trim())}`);
  };

  const handleInitializeOrg = () => {
    router.push("/offtaker/onboarding/intake");
  };

  return (
    <div className="h-full bg-slate-950 flex items-center justify-center px-4 py-4">
      <div className="w-full max-w-4xl">
        {/* ── Eyebrow ── */}
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-4 w-4 text-gold-primary" />
          <span className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
            Establish Institutional Perimeter
          </span>
        </div>

        {/* ── Title ── */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          Select or Form Legal Entity
        </h1>

        {/* ── Subtext ── */}
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mb-5 leading-relaxed">
          You must bind your active session to a verified corporate organization
          before accessing the AurumShield settlement engine.
        </p>

        {/* ── Bento Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ─── Card A: Join Existing ─── */}
          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 rounded-sm transition-colors duration-200 hover:border-gold-primary/50 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-sm bg-slate-800 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-gold-primary" />
              </div>
              <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-slate-300">
                Join Existing Organization
              </h2>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
              Access an existing treasury perimeter via encrypted invitation code.
            </p>

            {/* Terminal-style input */}
            <div className="mb-4">
              <label
                htmlFor="invitation-code"
                className="font-mono text-slate-500 text-[10px] tracking-[0.15em] uppercase block mb-2"
              >
                Invitation Code
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-sm px-8 py-3 font-mono text-sm text-white placeholder:text-slate-600 focus:border-gold-primary focus:ring-1 focus:ring-gold-primary/30 focus:outline-none transition-colors"
                />
              </div>
              {joinError && (
                <p className="mt-2 font-mono text-xs text-red-400">{joinError}</p>
              )}
            </div>

            <button
              onClick={handleJoinOrg}
              className="w-full border border-slate-700 text-slate-300 font-mono text-sm tracking-wide py-3 rounded-sm hover:border-gold-primary/50 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Authenticate & Join
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
              EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER BSA/AML PROTOCOLS.
            </span>
          </div>

          {/* ─── Card B: Form New ─── */}
          <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 rounded-sm transition-colors duration-200 hover:border-gold-primary/50 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-sm bg-slate-800 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-gold-primary" />
              </div>
              <h2 className="font-mono text-xs tracking-[0.2em] uppercase text-slate-300">
                Form New Organization
              </h2>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
              Instantiate a new corporate organization. You will be assigned the
              Treasury Admin role.
            </p>

            {/* Decorative detail */}
            <div className="bg-slate-950 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] rounded-sm p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Plus className="h-3.5 w-3.5 text-gold-primary" />
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-slate-500">
                  New Entity Parameters
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-slate-600">role_assignment</span>
                  <span className="font-mono text-xs text-gold-primary">TREASURY_ADMIN</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-slate-600">perimeter_type</span>
                  <span className="font-mono text-xs text-slate-400">INSTITUTIONAL</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-xs text-slate-600">compliance_tier</span>
                  <span className="font-mono text-xs text-slate-400">SOVEREIGN</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleInitializeOrg}
              className="w-full bg-gold-primary text-slate-950 font-bold text-sm tracking-wide py-3.5 rounded-sm hover:bg-gold-hover transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              Initialize Organization
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wide mt-2 text-center block">
              EXECUTION IS CRYPTOGRAPHICALLY BINDING. IP ADDRESS LOGGED UNDER BSA/AML PROTOCOLS.
            </span>
          </div>
        </div>

        {/* ── Footer trust line ── */}
        <p className="mt-4 text-center font-mono text-[10px] text-slate-700 tracking-wider">
          AurumShield Clearing · Sovereign Financial Infrastructure ·
          Multi-Tenant Isolation · End-to-End Encryption
        </p>

        <TelemetryFooter />
      </div>
    </div>
  );
}


