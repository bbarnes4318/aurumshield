/* ================================================================
   VERIFICATION EVIDENCE WORKSPACE — Institutional demo environment

   Container component rendering a tabbed evidence workspace on the
   verification page when ?demo=true. Shows 5 evidence panels that
   the concierge voice agent can open/close via tool calls.

   Panel tab states are driven by:
   1. Concierge tool calls (open_demo_panel / close_demo_panel)
   2. Manual user clicks (manual override)
   3. Checklist state (conciergeSimulated checklist items)

   Staged animation: when the concierge sets checklist items to "done",
   the corresponding panel tab gains a completion indicator. This
   creates the visual progression through the KYB evidence review.

   IMPORTANT: All data is explicitly labeled as "INSTITUTIONAL DEMO CASE"
   and never presented as literal fact.
   ================================================================ */

"use client";

import { useState, useCallback, useMemo } from "react";
import {
  FileText,
  Users,
  Shield,
  DollarSign,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { useTour } from "@/demo/tour-engine/TourProvider";
import { DocumentPackagePanel } from "./DocumentPackagePanel";
import { UBOGraphPanel } from "./UBOGraphPanel";
import { SanctionsScreeningPanel } from "./SanctionsScreeningPanel";
import { SourceOfFundsPanel } from "./SourceOfFundsPanel";
import { ComplianceDecisionPanel } from "./ComplianceDecisionPanel";

/* ── Panel definitions ── */

interface PanelDef {
  id: string;
  label: string;
  icon: typeof FileText;
  component: React.ComponentType<{ isVisible: boolean }>;
  /** Key in conciergeSimulated that marks this panel as "done" */
  checklistKey: string | null;
}

const PANELS: PanelDef[] = [
  {
    id: "documents",
    label: "Document Package",
    icon: FileText,
    component: DocumentPackagePanel,
    checklistKey: "checklist:entityVerificationPassed",
  },
  {
    id: "ubo",
    label: "UBO Structure",
    icon: Users,
    component: UBOGraphPanel,
    checklistKey: "checklist:uboReviewPassed",
  },
  {
    id: "sanctions",
    label: "AML / Sanctions",
    icon: Shield,
    component: SanctionsScreeningPanel,
    checklistKey: "checklist:screeningPassed",
  },
  {
    id: "source-of-funds",
    label: "Source of Funds",
    icon: DollarSign,
    component: SourceOfFundsPanel,
    checklistKey: null,
  },
  {
    id: "compliance-decision",
    label: "Compliance Decision",
    icon: CheckCircle2,
    component: ComplianceDecisionPanel,
    checklistKey: "checklist:complianceReviewPassed",
  },
];

/* ── Component ── */

export function VerificationEvidenceWorkspace() {
  const { state } = useTour();
  const [manualPanelId, setManualPanelId] = useState<string | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  /* Derive concierge-driven panel from simulated state */
  const conciergePanelId = useMemo(() => {
    const openPanel = state.conciergeSimulated.__openPanel;
    return typeof openPanel === "string" ? openPanel : null;
  }, [state.conciergeSimulated.__openPanel]);

  /* Reset manual override when concierge takes control */
  const activePanelId = manualOverride
    ? manualPanelId
    : (conciergePanelId ?? manualPanelId);

  const handlePanelClick = useCallback((panelId: string) => {
    setManualOverride(true);
    setManualPanelId((prev) => (prev === panelId ? null : panelId));
  }, []);

  const activePanel = PANELS.find((p) => p.id === activePanelId);

  /* Check which panels have been marked "done" by the concierge */
  const isPanelDone = useCallback(
    (panel: PanelDef): boolean => {
      if (!panel.checklistKey) return false;
      return state.conciergeSimulated[panel.checklistKey] === "done";
    },
    [state.conciergeSimulated],
  );

  const completedCount = PANELS.filter(isPanelDone).length;

  return (
    <div className="w-full mt-6 space-y-4" data-tour="evidence-workspace">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#C6A86B]" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
            Verification Evidence Workspace
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <span className="text-[9px] text-emerald-400/60 font-mono tabular-nums">
              {completedCount}/{PANELS.filter((p) => p.checklistKey).length} reviewed
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6A86B]/20 bg-[#C6A86B]/5 px-3 py-1 text-[8px] font-bold uppercase tracking-[0.15em] text-[#C6A86B]/70">
            <Lock className="h-2.5 w-2.5" />
            Institutional Demo Case
          </span>
        </div>
      </div>

      {/* ── Panel tabs ── */}
      <div className="grid grid-cols-5 gap-2">
        {PANELS.map((panel) => {
          const Icon = panel.icon;
          const isActive = activePanelId === panel.id;
          const isDone = isPanelDone(panel);

          return (
            <button
              key={panel.id}
              onClick={() => handlePanelClick(panel.id)}
              className={`
                relative flex flex-col items-center gap-2 rounded-xl border px-3 py-3
                text-[9px] font-bold uppercase tracking-wider transition-all duration-200
                ${isActive
                  ? "border-[#C6A86B]/40 bg-[#C6A86B]/10 text-[#C6A86B] shadow-[0_0_12px_rgba(198,168,107,0.06)]"
                  : isDone
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400/70 hover:border-emerald-500/30"
                    : "border-slate-800/60 bg-slate-900/30 text-slate-500 hover:border-slate-700 hover:text-slate-400"
                }
              `}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {isDone && !isActive && (
                  <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <CheckCircle2 className="h-1.5 w-1.5 text-emerald-400" />
                  </div>
                )}
              </div>
              <span className="text-center leading-tight">{panel.label}</span>
              {isActive && (
                <ChevronUp className="h-2.5 w-2.5 opacity-60" />
              )}
              {!isActive && (
                <ChevronDown className="h-2.5 w-2.5 opacity-30" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active panel content ── */}
      {activePanel && (
        <div
          className="rounded-xl border border-slate-800/50 bg-slate-950/60 p-5 backdrop-blur-sm"
          key={activePanel.id}
          style={{
            animation: "fadeSlideIn 300ms ease-out forwards",
          }}
        >
          <activePanel.component isVisible={true} />
        </div>
      )}

      {/* ── Collapsed hint ── */}
      {!activePanel && (
        <div className="flex items-center justify-center gap-2 py-4 rounded-lg border border-dashed border-slate-800/40">
          <Shield className="h-3 w-3 text-slate-700" />
          <span className="text-[10px] text-slate-600 tracking-wide">
            Select a category above to inspect demonstration evidence
          </span>
        </div>
      )}

      {/* ── Inline keyframes ── */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
