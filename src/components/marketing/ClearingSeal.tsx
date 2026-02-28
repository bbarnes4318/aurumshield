'use client';

import React, { useEffect, useState } from 'react';

interface ClearingSealProps {
  transactionHash?: string;
  policyId?: string;
}

export function ClearingSeal({
  transactionHash = "0x9f8a34e7c9a2bbd8e1a4f76d9f7b2c",
  policyId = "AUR-7729-X"
}: ClearingSealProps) {
  // SSR-Safe Hydration for the "Random" QR Pattern
  // We generate this once on the client to prevent React hydration mismatch errors
  const [qrPattern, setQrPattern] = useState<boolean[]>(Array(36).fill(false));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setQrPattern(Array.from({ length: 36 }).map(() => Math.random() > 0.4));
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full max-w-3xl mx-auto py-8">
      
      {/* Subtle Breathing Outer Glow */}
      <div className="absolute inset-0 bg-gold/10 blur-[80px] rounded-full mix-blend-screen animate-[pulse_4s_ease-in-out_infinite] pointer-events-none"></div>

      <div className="relative w-full rounded-2xl overflow-hidden bg-[#0B0E14] border border-gold/40 shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-1">
        
        {/* Subtle Center Radiance */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08),transparent_70%)]" />

        {/* Guilloche Border Layer (SVG) */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.15] mix-blend-screen z-0">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="guilloche" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 0 30 Q 15 0 30 30 T 60 30" fill="none" stroke="#c6a86b" strokeWidth="0.5"/>
                <path d="M 0 30 Q 15 60 30 30 T 60 30" fill="none" stroke="#c6a86b" strokeWidth="0.5"/>
                <circle cx="30" cy="30" r="10" fill="none" stroke="#c6a86b" strokeWidth="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#guilloche)" />
          </svg>
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 px-6 py-10 md:px-12 md:py-14 bg-slate-950/80 backdrop-blur-md rounded-xl h-full flex flex-col">
          
          {/* Sovereign Watermark Layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03] flex items-center justify-center z-0 select-none">
            <p className="text-[8px] sm:text-[10px] text-gold font-mono whitespace-pre-wrap leading-tight tracking-[0.3em] text-center rotate-[-15deg] scale-150">
              {Array(20).fill('AURUMSHIELD CLEARING INSTRUMENT - EXECUTED ATOMIC DVP - ').join('')}
            </p>
          </div>
          
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-gold font-bold tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.25em] text-[10px] sm:text-xs md:text-sm whitespace-nowrap uppercase">
              Executed: Atomic Settlement Warrant
            </h2>
            <div className="mx-auto mt-4 w-1/2 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          </div>

          {/* Dual Pillars & Center Shield */}
          <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-4 mb-12">
            
            {/* Left Column (Buyer) */}
            <div className="flex-1 space-y-4 text-center md:text-left bg-slate-900/40 p-5 rounded-lg border border-slate-800/50">
              <h3 className="text-gray-300 tracking-widest text-xs uppercase font-mono">
                Capital Confinement
              </h3>
              <p className="text-slate-100 text-sm md:text-base font-semibold tracking-wide">
                FUNDS VERIFIED & ESCROWED
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-900/50 bg-emerald-950/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="font-mono text-emerald-500 text-xs tracking-widest">
                  [ STATUS: LOCKED ]
                </span>
              </div>
            </div>

            {/* Mobile-Only Center Shield (Stacks inline on phones) */}
            <div className="md:hidden flex justify-center w-full z-20 my-2">
              <div className="bg-[#0B0E14] border border-gold/50 rounded-lg p-3 shadow-[0_0_30px_rgba(212,175,55,0.2)] text-center w-full relative overflow-hidden group">
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                <div className="text-gold font-bold uppercase text-[11px] leading-tight tracking-widest">
                  100% Indemnified<br/>
                  <span className="text-gold/80 text-[9px]">Against Fraud & Theft</span>
                </div>
              </div>
            </div>

            {/* Desktop Center Shield (Absolute positioned over the gap) */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex-col items-center justify-center w-[220px]">
              <div className="bg-[#0B0E14] border border-gold/50 rounded-xl p-4 shadow-[inset_0_1px_3px_rgba(255,255,255,0.1),0_4px_15px_rgba(0,0,0,0.5),0_0_40px_rgba(212,175,55,0.25)] text-center w-full backdrop-blur-xl relative overflow-hidden group transition-all duration-300 hover:border-gold hover:shadow-[inset_0_1px_3px_rgba(255,255,255,0.1),0_4px_15px_rgba(0,0,0,0.5),0_0_50px_rgba(212,175,55,0.4)] cursor-default">
                {/* Shimmer effect inside shield */}
                <div className="absolute top-0 left-[-100%] w-[200%] h-full bg-gradient-to-r from-transparent via-amber-100/10 to-transparent skew-x-[-20deg] group-hover:animate-[shimmer_2s_infinite]" />
                
                <svg className="w-8 h-8 mx-auto mb-2 text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-gold font-bold uppercase text-[12px] leading-snug tracking-widest">
                  100% Indemnified
                </div>
                <div className="text-gold/70 text-[9px] uppercase tracking-widest mt-1">
                  Against Fraud & Theft
                </div>
              </div>
            </div>

            {/* Right Column (Seller) */}
            <div className="flex-1 space-y-4 text-center md:text-right bg-slate-900/40 p-5 rounded-lg border border-slate-800/50">
              <h3 className="text-gray-300 tracking-widest text-xs uppercase font-mono">
                Asset Provenance
              </h3>
              <p className="text-slate-100 text-sm md:text-base font-semibold tracking-wide">
                BULLION AUTHENTICATED & VAULTED
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-900/50 bg-emerald-950/30 md:float-right">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
                <span className="font-mono text-emerald-500 text-xs tracking-widest">
                  [ STATUS: LOCKED ]
                </span>
              </div>
            </div>

          </div>

          {/* Footer & Dynamic Props */}
          <div className="mt-auto pt-8 border-t border-slate-800/60 flex flex-col md:flex-row justify-between items-end gap-6 font-mono text-xs text-gray-400">
            
            <div className="flex flex-col space-y-2 w-full md:w-auto">
              <div>TXN HASH: <span className="text-slate-300">{transactionHash}</span></div>
              <div>ACTUARIAL POLICY: <span className="text-gold font-semibold">ACTIVE [{policyId}]</span></div>
            </div>

            {/* High-Tech SSR-Safe QR Block */}
            <div className="flex flex-col items-end gap-2 opacity-80">
              <div className="grid grid-cols-6 gap-[2px] w-12 h-12">
                {mounted ? qrPattern.map((isActive, i) => (
                  <div 
                    key={i} 
                    className={`w-full h-full rounded-sm transition-colors duration-1000 ${isActive ? "bg-gold shadow-[0_0_4px_rgba(212,175,55,0.5)]" : "bg-slate-800"}`} 
                  />
                )) : (
                  /* Fallback skeleton for SSR */
                  Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="w-full h-full bg-slate-800 rounded-sm" />
                  ))
                )}
              </div>
              <div className="text-[9px] tracking-widest uppercase">
                Verified On-Chain
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Required CSS for Shimmer Animation (Tailwind arbitrary values approach) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
