"use client";

import {
  ShieldCheck,
  BarChart3,
  Truck,
  Lock,
  Landmark,
  Shield,
  Check,
  MapPinned,
  CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizardStore } from "./wizard-store";
import type { WizardStep } from "./wizard-store";

/* ── Step Components ── */
import { InstitutionalPortalWrapper } from "./InstitutionalPortalWrapper";
import { TrustAndSecuritySidebar } from "./TrustAndSecuritySidebar";
import { KycAmlGateway } from "./KycAmlGateway";
import { TradeExecutionTerminal } from "./TradeExecutionTerminal";
import { SecureLogisticsRouting } from "./SecureLogisticsRouting";
import { VaultingLegalStructuring } from "./VaultingLegalStructuring";
import { FundingSettlementPanel } from "./FundingSettlementPanel";
import { ChainOfCustodyDashboard } from "./ChainOfCustodyDashboard";
import { SecureTransitHandoff } from "./SecureTransitHandoff";
import GoldwireLiquidityNexus from "./GoldwireLiquidityNexus";

/* ================================================================
   InstitutionalWizard — V2 Orchestrator
   ================================================================
   7 views (6 wizard steps + tracking handoff).
   Zustand for all state. Horizontal stepper. Zero scroll.
   ================================================================ */

const STEPS = [
  { step: 1 as WizardStep, label: "KYC / AML",       icon: ShieldCheck },
  { step: 2 as WizardStep, label: "Trade Exec",       icon: BarChart3 },
  { step: 3 as WizardStep, label: "Logistics",        icon: Truck },
  { step: 4 as WizardStep, label: "Vaulting",         icon: Lock },
  { step: 5 as WizardStep, label: "Funding",          icon: Landmark },
  { step: 6 as WizardStep, label: "Custody",          icon: Shield },
  { step: 7 as WizardStep, label: "Transit",          icon: MapPinned },
  { step: 8 as WizardStep, label: "Liquidity",        icon: CreditCard },
];

function StepContent({ step }: { step: WizardStep }) {
  switch (step) {
    case 1: return <KycAmlGateway />;
    case 2: return <TradeExecutionTerminal />;
    case 3: return <SecureLogisticsRouting />;
    case 4: return <VaultingLegalStructuring />;
    case 5: return <FundingSettlementPanel />;
    case 6: return <ChainOfCustodyDashboard />;
    case 7: return <SecureTransitHandoff />;
    case 8: return <GoldwireLiquidityNexus />;
    default: return null;
  }
}

export default function InstitutionalWizard() {
  const { currentStep, goTo } = useWizardStore();
  const isFullBleedView = currentStep === 7 || currentStep === 8;

  return (
    <InstitutionalPortalWrapper sidebar={<TrustAndSecuritySidebar />}>
      {/* ── Stepper (hidden in tracking view for full-bleed map) ── */}
      {!isFullBleedView && (
        <div className="shrink-0 h-12 border-b border-slate-800/60 bg-[#060d1b] px-4 flex items-center gap-1 overflow-hidden">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = s.step === currentStep;
            const isCompleted = s.step < currentStep;
            const isClickable = isCompleted;

            return (
              <div key={s.step} className="flex items-center">
                <button
                  type="button"
                  onClick={isClickable ? () => goTo(s.step) : undefined}
                  disabled={!isClickable}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all text-[10px] ${
                    isActive
                      ? "bg-gold/10 border border-gold/30 text-gold font-semibold"
                      : isCompleted
                        ? "text-emerald-400 hover:bg-slate-800/50 cursor-pointer"
                        : "text-slate-600 cursor-default"
                  }`}
                >
                  {isCompleted ? (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20">
                      <Check className="h-2.5 w-2.5 text-emerald-400" />
                    </div>
                  ) : (
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-gold" : "text-slate-600"}`} />
                  )}
                  <span className="hidden xl:inline">{s.label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className={`mx-1 h-px w-4 ${s.step < currentStep ? "bg-emerald-500/30" : "bg-slate-800"}`} />
                )}
              </div>
            );
          })}

          {/* Back button */}
          {currentStep > 1 && currentStep <= 6 && (
            <button type="button" onClick={() => goTo((currentStep - 1) as WizardStep)}
              className="ml-auto rounded-lg border border-slate-700/40 px-3 py-1.5 text-[10px] text-slate-500 hover:text-white hover:bg-slate-800/50 transition">
              ← Back
            </button>
          )}
        </div>
      )}

      {/* ── Step Content with transitions ── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <StepContent step={currentStep} />
          </motion.div>
        </AnimatePresence>
      </div>
    </InstitutionalPortalWrapper>
  );
}
