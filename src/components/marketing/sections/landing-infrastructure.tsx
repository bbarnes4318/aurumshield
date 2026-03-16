"use client";

/* ================================================================
   COMPONENT 4 — DIGITAL INFRASTRUCTURE (v2 — Premium)
   ================================================================
   Split-screen: Left = copy with richer point cards, 
   Right = animated terminal logs with enhanced styling.
   ================================================================ */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { Shield, Cpu, Landmark } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface InfraPoint {
  icon: LucideIcon;
  title: string;
  description: string;
}

const POINTS: InfraPoint[] = [
  {
    icon: Shield,
    title: "Bank-Grade Cryptography & Execution",
    description:
      "Our platform's security protocols, data encryption methodologies, and coding architecture mirror the frameworks utilized by leading institutional clearinghouses and digital custodians such as the DTCC, OCC, Paxos, and Anchorage Digital. Your allocation data and trade executions are hermetically sealed.",
  },
  {
    icon: Cpu,
    title: "Automated, API-Driven Compliance",
    description:
      "We insulate our ecosystem from illicit capital by integrating elite, third-party KYB/KYC and global AML watchlist software. This shifts the compliance liability to specialized data providers, ensuring strict federal adherence and a completely clean marketplace without sacrificing execution speed.",
  },
  {
    icon: Landmark,
    title: "Multi-Rail Global Settlement",
    description:
      "Capital deployment must be agile. AurumShield supports rapid settlement via traditional institutional Bank Wires, as well as instantaneous stablecoin routing (USDT) for frictionless, cross-border clearing.",
  },
];

/* ── Terminal lines ── */
const TERMINAL_LINES = [
  { prefix: ">", text: "Initializing Zero-Trust Perimeter…", status: "OK", color: "text-emerald-400" },
  { prefix: ">", text: "Executing AML Protocol…", status: "PASS", color: "text-emerald-400" },
  { prefix: ">", text: "KYB Entity Verification: APEX CORP", status: "VERIFIED", color: "text-[#C6A86B]" },
  { prefix: ">", text: "TLS 1.3 Handshake Complete", status: "SECURED", color: "text-emerald-400" },
  { prefix: ">", text: "Allocating Asset: AU-400OZ-0029", status: "LOCKED", color: "text-[#C6A86B]" },
  { prefix: ">", text: "OFAC Watchlist Scan…", status: "CLEAR", color: "text-emerald-400" },
  { prefix: ">", text: "Escrow Wallet Funded: $2,847,500.00", status: "CONFIRMED", color: "text-[#C6A86B]" },
  { prefix: ">", text: "Brink's Logistics Routing…", status: "DISPATCHED", color: "text-sky-400" },
  { prefix: ">", text: "Ultrasonic Assay: Bar #GD-7741", status: "99.98%", color: "text-[#C6A86B]" },
  { prefix: ">", text: "Settlement Finality Achieved", status: "COMPLETE", color: "text-emerald-400" },
  { prefix: ">", text: "Lloyd's Policy Attached: SPE-2026-0441", status: "ACTIVE", color: "text-emerald-400" },
  { prefix: ">", text: "Vault Receipt Generated: VR-00293", status: "ISSUED", color: "text-[#C6A86B]" },
  { prefix: ">", text: "Counterparty Risk Score…", status: "0.00", color: "text-emerald-400" },
  { prefix: ">", text: "Multi-sig Custody Transfer…", status: "EXECUTED", color: "text-[#C6A86B]" },
  { prefix: ">", text: "Compliance Report Filed: CR-20260315", status: "ARCHIVED", color: "text-slate-400" },
] as const;

/* ── Terminal Component ── */
function InfraTerminal() {
  const [visibleLines, setVisibleLines] = useState<typeof TERMINAL_LINES[number][]>([]);
  const [renderCounter, setRenderCounter] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const lineIndex = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLine = useCallback(() => {
    const line = TERMINAL_LINES[lineIndex.current % TERMINAL_LINES.length];
    setVisibleLines((prev) => {
      const next = [...prev, line];
      return next.length > 10 ? next.slice(-10) : next;
    });
    lineIndex.current += 1;
    setRenderCounter((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!isInView) return;
    const burstTimeout = setTimeout(() => {
      addLine();
      setTimeout(() => addLine(), 300);
      setTimeout(() => addLine(), 600);
    }, 400);

    const startCycle = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        addLine();
      }, 1800 + Math.random() * 1200);
    }, 1500);

    return () => {
      clearTimeout(burstTimeout);
      clearTimeout(startCycle);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isInView, addLine]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <div ref={sectionRef} className="w-full">
      <div className="rounded-xl border border-slate-800 bg-[#070B12] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        {/* Title Bar */}
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 bg-slate-900/40">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="ml-2 font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            aurumshield-clearinghouse — live
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            <span className="font-mono text-[9px] text-emerald-500/70 uppercase tracking-widest">
              Connected
            </span>
          </div>
        </div>

        {/* Log Output */}
        <div
          ref={scrollRef}
          className="h-[380px] overflow-hidden p-4 font-mono text-xs leading-7"
        >
          {visibleLines.map((line, i) => (
            <motion.div
              key={`${renderCounter - visibleLines.length + i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2"
            >
              <span className="text-slate-600 shrink-0">{line.prefix}</span>
              <span className="text-slate-400">{line.text}</span>
              <span
                className={`ml-auto shrink-0 font-bold ${line.color}`}
              >
                [{line.status}]
              </span>
            </motion.div>
          ))}
          {/* Blinking cursor */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-slate-600">&gt;</span>
            <span className="inline-block h-3.5 w-1.5 bg-[#C6A86B] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingInfrastructure() {
  return (
    <section
      className="relative py-24 md:py-32 lg:py-36 overflow-hidden"
      style={{ backgroundColor: "#0A1128" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(198,168,107,0.03) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6">
        {/* Overline */}
        <div className="flex items-center gap-4 mb-5">
          <div className="h-px w-10 bg-[#C6A86B]/50" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#C6A86B]">
            Digital Infrastructure
          </p>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Copy */}
          <div>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight leading-tight mb-4">
              Zero-Trust Architecture.{" "}
              <span className="text-[#C6A86B]">
                Frictionless Global Clearing.
              </span>
            </h2>
            <p className="text-[15px] text-slate-400 leading-relaxed mb-10">
              Physical security is compromised if the digital clearinghouse is
              vulnerable. AurumShield operates on a proprietary, zero-trust
              digital infrastructure engineered to the exact cryptographic and
              operational standards of tier-one global custodians.
            </p>

            <div className="space-y-4">
              {POINTS.map((point, i) => (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="group flex gap-4 rounded-lg border border-transparent p-3 -ml-3 transition-colors hover:border-slate-800 hover:bg-slate-900/30"
                >
                  <div className="mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 transition-colors group-hover:border-[#C6A86B]/30 group-hover:bg-[#C6A86B]/5">
                    <point.icon
                      className="h-4 w-4 text-slate-500 transition-colors group-hover:text-[#C6A86B]"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-sm font-bold text-white">
                      {point.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {point.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Terminal */}
          <div className="flex items-start lg:pt-8">
            <InfraTerminal />
          </div>
        </div>
      </div>
    </section>
  );
}
