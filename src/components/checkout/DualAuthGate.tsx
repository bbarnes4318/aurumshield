"use client";

/* ================================================================
   DUAL AUTHORIZATION GATE — Maker-Checker Approval UI
   ================================================================
   Simulates institutional Maker-Checker authorization for $100M+
   trades. The Maker (current user) auto-approves, then the Checker
   (Treasury Officer) auto-approves after a simulated 3s delay.
   
   Both approvals trigger the WebAuthn signing ceremony.
   ================================================================ */

import { useState, useEffect, useRef } from "react";
import { Shield, CheckCircle2, Clock, User, UserCheck } from "lucide-react";

interface DualAuthGateProps {
  /** Called when both Maker and Checker have approved */
  onBothApproved: () => void;
  /** Whether we're in demo mode */
  isDemoActive?: boolean;
}

export function DualAuthGate({ onBothApproved }: DualAuthGateProps) {
  const [makerApproved, setMakerApproved] = useState(false);
  const [checkerApproved, setCheckerApproved] = useState(false);
  const advanceFired = useRef(false);

  /* Auto-approve maker after mount (simulated: user already clicked) */
  useEffect(() => {
    const t = setTimeout(() => setMakerApproved(true), 800);
    return () => clearTimeout(t);
  }, []);

  /* Simulate checker approval after maker approves */
  useEffect(() => {
    if (!makerApproved) return;
    const t = setTimeout(() => setCheckerApproved(true), 3000);
    return () => clearTimeout(t);
  }, [makerApproved]);

  /* Advance once both are approved */
  useEffect(() => {
    if (makerApproved && checkerApproved && !advanceFired.current) {
      advanceFired.current = true;
      const t = setTimeout(() => onBothApproved(), 600);
      return () => clearTimeout(t);
    }
  }, [makerApproved, checkerApproved, onBothApproved]);

  return (
    <div className="bg-slate-900 border border-slate-800 shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)] p-6 rounded-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-4 w-4 text-gold-primary" />
        <h3 className="font-mono text-xs tracking-[0.2em] uppercase text-gold-primary">
          Dual-Authorization Gate
        </h3>
      </div>

      <p className="font-mono text-[11px] text-slate-500 leading-relaxed mb-6">
        A single user cannot execute a trade exceeding $50,000,000 USD. Both the
        Maker and an independent Treasury Officer (Checker) must cryptographically
        approve execution before the DvP swap is committed to the settlement ledger.
      </p>

      <div className="space-y-4">
        {/* Maker */}
        <div className={`flex items-center gap-4 p-4 rounded-sm border transition-all duration-500 ${
          makerApproved
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-slate-700 bg-slate-950"
        }`}>
          <div className={`h-10 w-10 rounded-sm flex items-center justify-center ${
            makerApproved ? "bg-emerald-500/15" : "bg-slate-800"
          }`}>
            {makerApproved ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <User className="h-5 w-5 text-slate-500 animate-pulse" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-mono text-xs text-white font-bold">
              MAKER — Primary Signatory
            </p>
            <p className="font-mono text-[10px] text-slate-500 mt-0.5">
              {makerApproved ? "Approval recorded at " + new Date().toISOString().slice(0, 19) + " UTC" : "Awaiting cryptographic approval…"}
            </p>
          </div>
          <div className={`font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-sm ${
            makerApproved
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-gold-primary/10 text-gold-primary border border-gold-primary/20 animate-pulse"
          }`}>
            {makerApproved ? "✓ APPROVED" : "SIGNING…"}
          </div>
        </div>

        {/* Checker */}
        <div className={`flex items-center gap-4 p-4 rounded-sm border transition-all duration-500 ${
          checkerApproved
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-slate-700 bg-slate-950"
        }`}>
          <div className={`h-10 w-10 rounded-sm flex items-center justify-center ${
            checkerApproved ? "bg-emerald-500/15" : "bg-slate-800"
          }`}>
            {checkerApproved ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : makerApproved ? (
              <Clock className="h-5 w-5 text-gold-primary animate-pulse" />
            ) : (
              <UserCheck className="h-5 w-5 text-slate-600" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-mono text-xs text-white font-bold">
              CHECKER — Treasury Officer
            </p>
            <p className="font-mono text-[10px] text-slate-500 mt-0.5">
              {checkerApproved
                ? "Counter-signature verified at " + new Date().toISOString().slice(0, 19) + " UTC"
                : makerApproved
                  ? "Awaiting independent Treasury Officer counter-signature…"
                  : "Queued — requires Maker approval first"}
            </p>
          </div>
          <div className={`font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-sm ${
            checkerApproved
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : makerApproved
                ? "bg-gold-primary/10 text-gold-primary border border-gold-primary/20 animate-pulse"
                : "bg-slate-800 text-slate-600 border border-slate-700"
          }`}>
            {checkerApproved ? "✓ APPROVED" : makerApproved ? "PENDING…" : "QUEUED"}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-slate-600 tracking-wider uppercase">
            Authorization Status
          </span>
          <span className={`font-mono text-[10px] tracking-wider uppercase ${
            makerApproved && checkerApproved
              ? "text-emerald-400"
              : "text-gold-primary animate-pulse"
          }`}>
            {makerApproved && checkerApproved
              ? "DUAL-AUTH COMPLETE — PROCEEDING TO BIOMETRIC SIGNING"
              : makerApproved
                ? "1 OF 2 SIGNATURES COLLECTED"
                : "COLLECTING SIGNATURES…"}
          </span>
        </div>
      </div>
    </div>
  );
}
