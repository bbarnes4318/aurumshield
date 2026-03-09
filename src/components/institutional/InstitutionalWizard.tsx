"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { InstitutionalPortalWrapper } from "@/components/institutional/InstitutionalPortalWrapper";
import { TrustAndSecuritySidebar } from "@/components/institutional/TrustAndSecuritySidebar";
import { TradeExecutionTerminal } from "@/components/institutional/TradeExecutionTerminal";
import { LogisticsAndVaultingPanel } from "@/components/institutional/LogisticsAndVaultingPanel";
import { FundingSettlementPanel } from "@/components/institutional/FundingSettlementPanel";
import { ChainOfCustodyDashboard } from "@/components/institutional/ChainOfCustodyDashboard";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Truck,
  Landmark,
  Shield,
  Check,
} from "lucide-react";

/* ================================================================
   InstitutionalWizard — Orchestrator
   ================================================================
   Manages wizard state across all 5 steps with full data retention.
   Clicking "Back" never loses mock inputs. Desktop-only (1080p/1440p).
   
   State model:
   - barCount: number of 400-oz bars (default 48 for $100M demo)
   - carrier: "brinks" | "loomis"
   - jurisdiction: "london" | "zurich" | "new_york"
   - storageType: "allocated" | "unallocated"
   - paymentMethod: "wire" | "goldwire" | null
   ================================================================ */

const WIZARD_STEPS = [
  { id: 1, label: "Trade Execution", sublabel: "Asset Allocation", icon: BarChart3 },
  { id: 2, label: "Logistics & Vaulting", sublabel: "Routing & Custody", icon: Truck },
  { id: 3, label: "Funding", sublabel: "Settlement", icon: Landmark },
  { id: 4, label: "Chain of Custody", sublabel: "Audit Receipt", icon: Shield },
] as const;

type WizardStep = 1 | 2 | 3 | 4;

export function InstitutionalWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // ── Retained State Across Steps ──
  const [barCount, setBarCount] = useState(48); // ~$100M default
  const [carrier, setCarrier] = useState<"brinks" | "loomis">("brinks");
  const [jurisdiction, setJurisdiction] = useState<"london" | "zurich" | "new_york">("london");
  const [storageType, setStorageType] = useState<"allocated" | "unallocated">("allocated");
  const [paymentMethod, setPaymentMethod] = useState<"wire" | "goldwire" | null>(null);

  // ── Derived ──
  const BASE_SPOT = 5171.92;
  const totalOz = barCount * 400;
  const grossValue = totalOz * BASE_SPOT;
  const totalAmount = grossValue + grossValue * 0.0005 + grossValue * 0.0003; // spot + premium + platform

  const goTo = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  return (
    <InstitutionalPortalWrapper sidebar={<TrustAndSecuritySidebar />}>
      {/* ── Horizontal Stepper ── */}
      <div className="shrink-0 border-b border-slate-800/60 bg-[#060d1b] px-6 py-4">
        <div className="flex items-center">
          {WIZARD_STEPS.map((step, idx) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            const isPending = step.id > currentStep;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => goTo(step.id as WizardStep)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all",
                    isActive && "bg-gold/10 border border-gold/30",
                    isCompleted && "cursor-pointer hover:bg-slate-800/50",
                    isPending && "cursor-pointer hover:bg-slate-800/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                      isActive && "bg-gold/20 text-gold",
                      isCompleted && "bg-emerald-500/10 text-emerald-400",
                      isPending && "bg-slate-800 text-slate-500"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        isActive && "text-gold",
                        isCompleted && "text-emerald-400",
                        isPending && "text-slate-500"
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-slate-600">{step.sublabel}</p>
                  </div>
                </button>

                {/* Connector */}
                {idx < WIZARD_STEPS.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={cn(
                        "h-px w-full",
                        step.id < currentStep ? "bg-emerald-500/30" : "bg-slate-800"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Active Panel ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1100px]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <TradeExecutionTerminal
                key="trade"
                barCount={barCount}
                onBarCountChange={setBarCount}
                onPriceLocked={() => goTo(2)}
              />
            )}
            {currentStep === 2 && (
              <LogisticsAndVaultingPanel
                key="logistics"
                carrier={carrier}
                onCarrierChange={setCarrier}
                jurisdiction={jurisdiction}
                onJurisdictionChange={setJurisdiction}
                storageType={storageType}
                onStorageTypeChange={setStorageType}
                onContinue={() => goTo(3)}
              />
            )}
            {currentStep === 3 && (
              <FundingSettlementPanel
                key="funding"
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                onContinue={() => goTo(4)}
                totalAmount={totalAmount}
              />
            )}
            {currentStep === 4 && (
              <ChainOfCustodyDashboard key="custody" barCount={barCount} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Back Button (steps 2-4) ── */}
      {currentStep > 1 && (
        <div className="shrink-0 border-t border-slate-800/60 bg-[#060d1b] px-6 py-3">
          <button
            type="button"
            onClick={() => goTo((currentStep - 1) as WizardStep)}
            className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-300"
          >
            ← Back to {WIZARD_STEPS[currentStep - 2].label}
          </button>
        </div>
      )}
    </InstitutionalPortalWrapper>
  );
}
