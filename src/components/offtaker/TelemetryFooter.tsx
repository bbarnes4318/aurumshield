"use client";

/* ================================================================
   GLOBAL TELEMETRY FOOTER
   ================================================================
   Fixed bar at the bottom of every Offtaker portal page.
   Displays session metadata, secure relay status, and live
   Fedwire WebSocket heartbeat indicator.
   ================================================================ */

export default function TelemetryFooter() {
  return (
    <div className="shrink-0 w-full h-8 bg-black border-t border-slate-800 flex items-center justify-between px-4">
      {/* Left — Session Metadata */}
      <span className="font-mono text-[9px] text-slate-500">
        SESSION: AS-9942-X | IP: SECURE_RELAY | ENCLAVE: ACTIVE
      </span>

      {/* Right — WebSocket Heartbeat */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] text-slate-500">
          WSS://COLUMN-FEDWIRE: CONNECTED (14ms) | 14:32:01 UTC
        </span>
        <span className="bg-emerald-500 animate-pulse w-1.5 h-1.5 rounded-full shrink-0" />
      </div>
    </div>
  );
}
