"use client";

/* ================================================================
   WEBAUTHN MODAL — Biometric Hardware Signing Ceremony
   ================================================================
   Full-screen dimmed overlay with a massive centered modal
   simulating a WebAuthn/FIDO2 biometric authentication for
   DvP swap execution. The glowing gold button triggers the
   final settlement ledger transition.

   Design: Institutional black + pulsing gold border.
   ================================================================ */

import { Fingerprint, Shield, Lock } from "lucide-react";
import { DEMO_SPOTLIGHT_CLASSES } from "@/hooks/use-demo-tour";
import { DemoTooltip } from "@/components/demo/DemoTooltip";

interface WebAuthnModalProps {
  /** Called when the user clicks the biometric button */
  onAuthenticated: () => void;
  /** Whether the demo tour is active */
  isDemoActive?: boolean;
}

export function WebAuthnModal({ onAuthenticated, isDemoActive }: WebAuthnModalProps) {
  return (
    <>
      {/* Full-Screen Dim */}
      <div className="fixed inset-0 z-200 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" />

      {/* Modal */}
      <div className="fixed inset-0 z-201 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in zoom-in-95 fade-in duration-300">

          {/* Pulsing gold border container */}
          <div className="relative bg-slate-950 border-2 border-gold-primary/50 rounded-sm shadow-[0_0_60px_rgba(198,168,107,0.15)] overflow-hidden">
            {/* Animated gold pulse border */}
            <div className="absolute inset-0 rounded-sm border-2 border-gold-primary/30 animate-pulse pointer-events-none" />

            <div className="p-8 md:p-12 text-center">
              {/* Lock icon */}
              <div className="flex items-center justify-center mb-6">
                <div className="h-16 w-16 rounded-sm bg-slate-900 border border-gold-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(198,168,107,0.1)]">
                  <Lock className="h-8 w-8 text-gold-primary" />
                </div>
              </div>

              {/* Header */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-gold-primary" />
                <h2 className="font-mono text-gold-primary text-xs tracking-[0.3em] uppercase">
                  Awaiting Biometric WebAuthn Signature
                </h2>
              </div>

              <p className="font-mono text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto mb-3">
                Dual-authorization verified. The settlement engine requires a
                FIDO2/WebAuthn hardware attestation to execute the Delivery versus
                Payment swap. Your private key never leaves the secure enclave.
              </p>

              {/* Security Parameters */}
              <div className="bg-slate-900 border border-slate-800 rounded-sm p-4 mb-8 text-left shadow-[inset_0_1px_0_0_rgba(198,168,107,0.15)]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-mono text-[9px] text-slate-600 uppercase block mb-1">Protocol</span>
                    <span className="font-mono text-xs text-white">FIDO2 / WebAuthn L3</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-600 uppercase block mb-1">Attestation</span>
                    <span className="font-mono text-xs text-white">Direct (Full)</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-600 uppercase block mb-1">Algorithm</span>
                    <span className="font-mono text-xs text-white">ES256 (P-256)</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-600 uppercase block mb-1">Challenge</span>
                    <span className="font-mono text-xs text-gold-primary tabular-nums">
                      {crypto.randomUUID().slice(0, 16).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* The Big Gold Button */}
              <div className="relative">
                {isDemoActive && <DemoTooltip text="Execute the DvP Swap with biometric authentication ↓" position="top" />}
                <button
                  onClick={onAuthenticated}
                  className={`
                    w-full py-5 bg-gold-primary text-slate-950 font-bold text-sm tracking-[0.15em] uppercase
                    rounded-sm cursor-pointer transition-all duration-300
                    hover:bg-gold-hover hover:shadow-[0_0_40px_rgba(198,168,107,0.3)]
                    active:scale-[0.98]
                    flex items-center justify-center gap-3
                    shadow-[0_0_25px_rgba(198,168,107,0.2)]
                    ${isDemoActive ? DEMO_SPOTLIGHT_CLASSES : ""}
                  `}
                >
                  <Fingerprint className="h-5 w-5" />
                  INSERT YUBIKEY / USE TOUCHID TO EXECUTE DvP SWAP
                </button>
              </div>

              {/* Legal footer */}
              <p className="font-mono text-[9px] text-slate-600 mt-4 leading-relaxed">
                By authenticating, you confirm execution of a legally binding
                Delivery versus Payment swap under English Law & UCC Article 7.
                Transaction hash will be recorded on an append-only settlement ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
