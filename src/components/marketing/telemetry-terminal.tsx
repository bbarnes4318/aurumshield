"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

const LOG_SEQUENCE = [
  "> INITIALIZING DETERMINISTIC STATE MACHINE...",
  "> EXECUTING ROUTINE: DVP_ATOMIC_SWAP",
  "> COUNTERPARTY A: VERIFIED (INSTITUTIONAL_NODE_04)",
  "> COUNTERPARTY B: VERIFIED (SOVEREIGN_VAULT_LND)",
  "> LOCATING ASSET: 400oz LBMA GOOD DELIVERY BAR (SERIAL: #XJ-992A)",
  "> PHYSICAL PROVENANCE: AUTHENTICATED",
  "> LOCKING FRACTIONAL COLLATERAL (5%): $54,200.00 LOCKED",
  "> EXECUTING ATOMIC TRANSFER...",
  "> ZERO-KNOWLEDGE PROOF GENERATED.",
  "> SHA-256 CLEARING CERTIFICATE: a8f5f167f44f4964e6c998dee827110c",
  "> TITLE TRANSFERRED. TEMPORAL EXPOSURE: 0.00ms",
  "> SETTLEMENT FINALITY ACHIEVED. AWAITING NEXT INSTRUCTION_"
];

export function TelemetryTerminal() {
  const [logs, setLogs] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex < LOG_SEQUENCE.length) {
      const timer = setTimeout(() => {
        setLogs((prev) => [...prev, LOG_SEQUENCE[currentIndex]]);
        setCurrentIndex((prev) => prev + 1);
      }, Math.random() * 800 + 400); // Random delay between 400ms and 1200ms for realism
      return () => clearTimeout(timer);
    } else {
      // Loop it after a long pause
      const resetTimer = setTimeout(() => {
        setLogs([]);
        setCurrentIndex(0);
      }, 10000);
      return () => clearTimeout(resetTimer);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto rounded-md bg-[#0A1128] border border-slate-800 shadow-[0_0_60px_-15px_rgba(198,168,107,0.15)] overflow-hidden font-mono text-sm relative">
      {/* Terminal Header */}
      <div className="bg-[#0B0E14] border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-[#c6a86b]" />
          <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">AurumShield // Core Engine_v2.4</span>
        </div>
        <div className="flex gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#c6a86b]/70 animate-pulse" />
        </div>
      </div>
      
      {/* Terminal Body */}
      <div 
        ref={scrollRef}
        className="p-6 h-[320px] overflow-y-auto scrollbar-hide bg-[linear-gradient(rgba(10,17,40,1)_0%,rgba(10,17,40,0.95)_100%)] relative"
      >
        <div className="absolute inset-0 bg-[url('/scanline-bg.png')] opacity-5 pointer-events-none" /> {/* Optional scanline texture */}
        
        <div className="space-y-3">
          {logs.map((log, i) => (
            <div 
              key={i} 
              className={`flex items-start ${log.includes("SUCCESS") || log.includes("ACHIEVED") ? "text-[#c6a86b] font-bold" : "text-gray-400"}`}
            >
              <span className="opacity-50 mr-4 shrink-0">{new Date().toISOString().split('T')[1].slice(0, 8)}</span>
              <span className="break-all">{log}</span>
            </div>
          ))}
          {currentIndex < LOG_SEQUENCE.length && (
            <div className="flex items-start text-[#c6a86b]">
              <span className="opacity-50 mr-4 shrink-0">{new Date().toISOString().split('T')[1].slice(0, 8)}</span>
              <span className="animate-pulse">_</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
