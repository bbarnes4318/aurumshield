"use client";

/* ================================================================
   PRODUCER TELEMETRY FOOTER
   ================================================================
   Fixed bar at the bottom of every Producer portal page.
   Displays Producer Org status, aXedras GBI sync, Tensorlake
   OCR readiness, and Malca-Amit API health.
   ================================================================ */

export default function ProducerTelemetryFooter() {
  return (
    <div className="shrink-0 w-full h-8 bg-black border-t border-slate-800 flex items-center justify-between px-4">
      {/* Left — Producer Org Status */}
      <span className="font-mono text-[9px] text-slate-500">
        PRODUCER ORG ID: ACTIVE | ENCLAVE: SECURED
      </span>

      {/* Right — External System Health */}
      <div className="flex items-center gap-2">
        <span className="bg-emerald-500 animate-pulse w-1.5 h-1.5 rounded-full shrink-0" />
        <span className="font-mono text-[9px] text-slate-500">
          aXedras GBI: SYNCED | Tensorlake OCR: STANDBY | Malca-Amit API: ONLINE
        </span>
      </div>
    </div>
  );
}
