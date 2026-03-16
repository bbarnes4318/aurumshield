"use client";

/* ================================================================
   KYC GATE MODAL — Global Restricted Access Overlay
   ================================================================
   React Context + Modal. Any CTA on the landing page can call
   `useKycModal().open()` to trigger this without prop drilling.
   ================================================================ */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, ArrowRight, X } from "lucide-react";

/* ── Context ── */
interface KycModalContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const KycModalContext = createContext<KycModalContextValue | null>(null);

export function useKycModal(): KycModalContextValue {
  const ctx = useContext(KycModalContext);
  if (!ctx) {
    throw new Error("useKycModal must be used within <KycModalProvider>");
  }
  return ctx;
}

/* ── Provider (wraps MarketingLanding) ── */
export function KycModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <KycModalContext.Provider value={{ open, close, isOpen }}>
      {children}
      <KycModalOverlay isOpen={isOpen} onClose={close} />
    </KycModalContext.Provider>
  );
}

/* ── Modal Overlay ── */
function KycModalOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="kyc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-100 bg-black/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="kyc-modal"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-101 flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-lg rounded-xl border border-[--mk-border] bg-[--mk-bg] p-8 md:p-10 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="kyc-modal-title"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-md p-1.5 text-[--mk-faint] transition-colors hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Padlock Icon */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[--mk-gold]/30 bg-[--mk-gold]/5">
                <Lock className="h-9 w-9 text-[--mk-gold]" strokeWidth={1.5} />
              </div>

              {/* Title */}
              <h2
                id="kyc-modal-title"
                className="mb-3 text-center font-heading text-2xl font-bold tracking-tight text-white"
              >
                Restricted Access
              </h2>

              {/* Body */}
              <p className="mb-8 text-center text-sm leading-relaxed text-[--mk-muted]">
                AurumShield operates a closed-loop ecosystem. Please complete
                strict KYC/AML verification to view active tier-one liquidity.
              </p>

              {/* Compliance Badge */}
              <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-[--mk-border] bg-[--mk-surface] px-4 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[--mk-gold]" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[--mk-faint]">
                  Bank-Grade KYC · AML Compliant
                </span>
              </div>

              {/* CTA */}
              <a
                href="/perimeter/register"
                className="mk-btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
              >
                Initiate KYC Onboarding
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
