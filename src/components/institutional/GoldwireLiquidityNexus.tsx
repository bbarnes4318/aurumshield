"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  ShieldCheck,
  Terminal,
  Zap,
  ArrowRight,
  Lock,
  Globe,
} from "lucide-react";

export default function GoldwireLiquidityNexus() {
  // State for the interactive demo
  const [vaultValue, setVaultValue] = useState(100000000); // Starts at $100M
  const [isProcessing, setIsProcessing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "SYSTEM READY. BAILMENT SOVEREIGN TITLE CONFIRMED.",
    "AWAITING LIQUIDITY DIRECTIVE...",
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalLogs]);

  // The simulation engine
  const executeSimulation = async (
    amount: number,
    name: string,
    logs: string[]
  ) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setTerminalLogs([`> INITIATING T+0 EXECUTION: ${name}`]);

    for (let i = 0; i < logs.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTerminalLogs((prev) => [...prev, logs[i]]);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    setVaultValue((prev) => prev - amount);
    setTerminalLogs((prev) => [
      ...prev,
      `> SUCCESS. $${(amount / 1000000).toFixed(1)}M DEDUCTED FROM VAULT. REMAINING ALLOCATION SECURE.`,
    ]);
    setIsProcessing(false);
  };

  const scenarios = [
    {
      id: 1,
      name: "$2.4M Aviation Lease Settlement",
      amount: 2400000,
      logs: [
        "Authorizing Global Wire...",
        "Targeting Allocated Vault: ZURICH-ALPHA...",
        "Liquidating exactly 463.5 Troy Ounces...",
        "Fiat Converted at Wholesale Spot...",
        "Wire Sent. T+0 Settlement Complete.",
      ],
    },
    {
      id: 2,
      name: "$14M Strategic Real Estate Acquisition",
      amount: 14000000,
      logs: [
        "Bypassing standard T+2 banking delays...",
        "Fractionalizing 3 Allocated 400-oz Bars...",
        "Verifying Escrow Routing Data...",
        "Liquidity Deployed. Escrow Funded.",
      ],
    },
    {
      id: 3,
      name: "$5M Cross-Border Vendor Payroll",
      amount: 5000000,
      logs: [
        "Initiating Multi-Currency Liquidation...",
        "Zero FX Friction Detected...",
        "Clearing international ledgers...",
        "Payroll Cleared. Vendor accounts credited.",
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-white overflow-hidden">
      {/* Top Header Placeholder (Ensure this matches global App Header) */}
      <header className="h-20 border-b border-white/10 flex items-center px-8 shrink-0 bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-linear-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <Lock className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-bold text-xl tracking-wide">
            AURUM<span className="text-yellow-500">SHIELD</span> VIP
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-green-400" /> SECURE TERMINAL
          </span>
        </div>
      </header>

      {/* Main Split-Pane Content */}
      <main className="flex-1 grid grid-cols-12 gap-8 p-8 min-h-0">
        {/* LEFT PANE: The Asset & The Card */}
        <section className="col-span-5 flex flex-col justify-center relative">
          {/* Ambient background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">
                Infinite Liquidity.
                <br />
                Zero Counterparty Risk.
              </h1>
              <p className="text-slate-400 text-lg">
                Your physical allocation is vaulted, secure, and instantly
                spendable.
              </p>
            </div>

            {/* The 3D-Style Goldwire Card */}
            <div className="w-full max-w-md aspect-[1.586/1] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-linear-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl shadow-yellow-500/10 group">
              <div className="absolute inset-0 bg-linear-to-br from-yellow-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="flex justify-between items-start relative z-10">
                <div className="w-12 h-10 rounded bg-yellow-400/80 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-slate-900" />
                </div>
                <span className="font-bold tracking-widest text-yellow-500">
                  GOLDWIRE
                </span>
              </div>
              <div className="relative z-10">
                <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                  Corporate Spending Power
                </p>
                <p className="text-4xl font-mono text-white tracking-tight">
                  ${vaultValue.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Security Badges */}
            <div className="flex flex-col gap-4 p-5 rounded-xl border border-white/5 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-sm">
                  100% Allocated. Bailment Sovereign Title Confirmed.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold text-sm">
                  T+0 Instant Wholesale Spot Execution.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANE: Interactive Demo Terminal */}
        <section className="col-span-7 flex flex-col gap-6">
          {/* Terminal Window */}
          <div className="flex-1 bg-[#0a0a0a] rounded-xl border border-slate-800 p-6 font-mono text-sm shadow-inner flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-8 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-4 text-xs text-slate-500">
                goldwire_nexus_exec.sh
              </span>
            </div>

            <div className="mt-8 flex-1 overflow-y-auto space-y-2 text-green-400 pr-4 custom-scrollbar">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="flex gap-4 opacity-90 animate-fade-in">
                  <span className="text-slate-600 shrink-0">{`[${new Date().toISOString().split("T")[1].slice(0, 8)}]`}</span>
                  <span>{log}</span>
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-4 opacity-90">
                  <span className="text-slate-600 shrink-0">{`[${new Date().toISOString().split("T")[1].slice(0, 8)}]`}</span>
                  <span className="animate-pulse">_</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Simulate Corporate Execution
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() =>
                    executeSimulation(
                      scenario.amount,
                      scenario.name,
                      scenario.logs
                    )
                  }
                  disabled={isProcessing}
                  className="w-full flex items-center justify-between p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-yellow-500/50 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {scenario.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-yellow-500">
                      -${(scenario.amount / 1000000).toFixed(1)}M
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-yellow-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* The Big Closer Button */}
          <button className="w-full mt-4 py-5 rounded-xl bg-linear-to-r from-yellow-500 to-yellow-600 text-slate-950 font-bold text-lg hover:from-yellow-400 hover:to-yellow-500 transition-all shadow-lg shadow-yellow-500/20 flex flex-col items-center justify-center gap-1 group">
            <span>Deploy Corporate Treasury Now</span>
            <span className="text-xs text-slate-900/70 font-medium">
              Exit Demo Mode &amp; Begin Live Allocation
            </span>
          </button>
        </section>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 0.9; transform: translateY(0); } }
      `,
        }}
      />
    </div>
  );
}
