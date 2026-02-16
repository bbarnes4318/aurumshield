"use client";

import { useState } from "react";
import { Check, FileText, Table } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardCapital, ReinsuranceTreaty } from "@/lib/mock-data";

interface Props {
  capital: DashboardCapital;
  treaties: ReinsuranceTreaty[];
}

function buildExportPayload(capital: DashboardCapital, treaties: ReinsuranceTreaty[]) {
  const inForce = treaties.filter((t) => t.status === "in-force");
  return {
    capitalSnapshot: {
      capitalBase: capital.capitalBase,
      activeExposure: capital.activeExposure,
      ecr: capital.ecr,
      expectedLoss: capital.expectedLoss,
      hardstopLimit: capital.hardstopLimit,
      hardstopUtilization: capital.hardstopUtilization,
      hardstopStatus: capital.hardstopStatus,
      asOf: capital.asOf,
    },
    varMetrics: {
      expectedLoss: capital.expectedLoss,
      var95: capital.var95,
      var99: capital.var99,
      tvar99: capital.tvar99,
      bufferVsTvar99: capital.bufferVsTvar99,
      capitalAdequate: capital.capitalBase >= capital.tvar99,
    },
    stressScenarios: [
      { scenario: "Dual Max-Cap Breach", stressLoss: capital.tvar99, postCapital: Math.max(0, capital.capitalBase - capital.tvar99), postECR: capital.activeExposure / Math.max(1, capital.capitalBase - capital.tvar99) },
      { scenario: "Corridor Seizure Cluster", stressLoss: Math.round(capital.var99 * 0.75), postCapital: Math.max(0, capital.capitalBase - Math.round(capital.var99 * 0.75)), postECR: capital.activeExposure / Math.max(1, capital.capitalBase - Math.round(capital.var99 * 0.75)) },
      { scenario: "Hub Compromise Event", stressLoss: capital.bufferVsTvar99, postCapital: Math.max(0, capital.capitalBase - capital.bufferVsTvar99), postECR: capital.activeExposure / Math.max(1, capital.capitalBase - capital.bufferVsTvar99) },
    ],
    treatyBreakdown: inForce.map((t) => ({
      id: t.id, name: t.treatyName, type: t.type, limit: t.limit, retention: t.retention,
      cededPct: t.limit > 0 ? ((t.limit - t.retention) / t.limit * 100) : 0,
      premium: t.premium, claimsRatio: t.claimsRatio, currency: t.currency,
    })),
    timestamp: new Date().toISOString(),
    generatedBy: "AurumShield Capital Reporting Engine v1.0",
  };
}

export function ReportExportStub({ capital, treaties }: Props) {
  const [pdfExported, setPdfExported] = useState(false);
  const [csvExported, setCsvExported] = useState(false);

  function handleExport(format: "pdf" | "csv") {
    const payload = buildExportPayload(capital, treaties);
    console.log(`[AurumShield] ${format.toUpperCase()} Export:`, JSON.stringify(payload, null, 2));

    if (format === "pdf") { setPdfExported(true); setTimeout(() => setPdfExported(false), 3000); }
    if (format === "csv") { setCsvExported(true); setTimeout(() => setCsvExported(false), 3000); }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button type="button" onClick={() => handleExport("pdf")} className={cn("flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs font-medium transition-colors border", pdfExported ? "bg-success/10 text-success border-success/30" : "bg-surface-2 text-text-muted border-border hover:text-gold hover:border-gold/30")}>
        {pdfExported ? <><Check className="h-3.5 w-3.5" /> Exported</> : <><FileText className="h-3.5 w-3.5" /> Export PDF Report</>}
      </button>
      <button type="button" onClick={() => handleExport("csv")} className={cn("flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs font-medium transition-colors border", csvExported ? "bg-success/10 text-success border-success/30" : "bg-surface-2 text-text-muted border-border hover:text-gold hover:border-gold/30")}>
        {csvExported ? <><Check className="h-3.5 w-3.5" /> Exported</> : <><Table className="h-3.5 w-3.5" /> Export CSV Data</>}
      </button>
    </div>
  );
}
