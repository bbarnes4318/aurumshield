"use client";

import {
  Shield,
  Lock,
  Wifi,
  Thermometer,
  CheckCircle2,
  Radio,
  Eye,
  ArrowRight,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useWizardStore } from "./wizard-store";
import { useEffect, useState } from "react";

/* ================================================================
   SecureTransitHandoff — Step 7 (Final View)
   ================================================================
   3-sector "High-Security Command Center" dashboard:
     Sector 1: SVG telemetry map with glowing arc (center)
     Sector 2: Military-precision status timeline (left)
     Sector 3: "Sleep at Night" perimeter (right)
   Boot-up animation on load. Zero scroll, 100vh viewport.
   ================================================================ */

/* ── Route coordinates for SVG map ── */
const ROUTES = {
  london:   { from: { x: 516, y: 142, label: "London" },   to: { x: 468, y: 160, label: "Zurich" } },
  zurich:   { from: { x: 468, y: 160, label: "Zurich" },    to: { x: 310, y: 165, label: "New York" } },
  new_york: { from: { x: 516, y: 142, label: "London" },   to: { x: 310, y: 165, label: "New York" } },
} as const;

const TIMELINE_STEPS = [
  { title: "Unallocated Extraction",    desc: "Initiating allocation from Loco London Clearing. Serial numbers locked.", status: "completed" as const },
  { title: "Armored Tarmac Extraction",  desc: "Secure armored transit via Brink's Global Services. Sterile tarmac handover initiated.", status: "active" as const },
  { title: "Chartered Airfreight",       desc: "In transit. Protected by continuous Lloyd's of London Specie Insurance.", status: "pending" as const },
  { title: "Ultrasonic Intake Assaying", desc: "Arrival at final depository. Non-destructive ultrasonic & electrical conductivity verification pending.", status: "pending" as const },
  { title: "Absolute Allocation",        desc: "Final vaulting under strict Bailment Jurisprudence. 100% Bankruptcy Remote.", status: "pending" as const },
];

export function SecureTransitHandoff() {
  const { jurisdiction, carrier, barCount, goNext } = useWizardStore();
  const [booted, setBooted] = useState(false);
  const route = ROUTES[jurisdiction] ?? ROUTES.london;

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 800);
    return () => clearTimeout(t);
  }, []);

  /* Telemetry simulation */
  const [, setGpsLat] = useState<number>(route.from.x);
  useEffect(() => {
    if (!booted) return;
    const t = setInterval(() => {
      setGpsLat((l: number) => l + (Math.random() - 0.3) * 0.01);
    }, 2000);
    return () => clearInterval(t);
  }, [booted]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══════ Sector 2: Timeline (Left) ══════ */}
      <div className="w-[260px] shrink-0 border-r border-slate-800/60 bg-[#050a14] p-4 flex flex-col overflow-hidden">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-3">
          Status Timeline
        </p>
        <div className="relative pl-5 space-y-3 flex-1">
          <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-linear-to-b from-emerald-500/30 via-gold/20 to-slate-800" />
          {TIMELINE_STEPS.map((step, idx) => (
            <motion.div key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={booted ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: idx * 0.15 + 0.5 }}
              className="relative"
            >
              <div className={`absolute -left-5 mt-0.5 flex h-[14px] w-[14px] items-center justify-center rounded-full border ${
                step.status === "completed" ? "border-emerald-500/50 bg-emerald-500/15" :
                step.status === "active" ? "border-gold/50 bg-gold/15 animate-pulse" :
                "border-slate-700 bg-slate-800/50"
              }`}>
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-2 w-2 text-emerald-400" />
                ) : step.status === "active" ? (
                  <Radio className="h-2 w-2 text-gold" />
                ) : (
                  <div className="h-1 w-1 rounded-full bg-slate-600" />
                )}
              </div>
              <p className={`text-[10px] font-semibold ${
                step.status === "completed" ? "text-emerald-300" :
                step.status === "active" ? "text-gold" :
                "text-slate-500"
              }`}>
                {step.title}
              </p>
              <p className="text-[8px] text-slate-600 leading-relaxed mt-0.5">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ══════ Sector 1: Telemetry Map (Center) ══════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#040810]">
        {/* Boot overlay */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: booted ? 0 : 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-[#040810] pointer-events-none"
        >
          <div className="text-center">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }}>
              <Eye className="h-8 w-8 text-gold mx-auto mb-2" />
            </motion.div>
            <p className="font-mono text-[10px] text-gold/60">Initializing Telemetry Uplink...</p>
          </div>
        </motion.div>

        {/* SVG Map */}
        <div className="flex-1 relative overflow-hidden">
          <svg viewBox="0 0 900 450" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Dark world outline — simplified continents */}
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(198,168,107,0.12)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <filter id="arcGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(198,168,107,0.8)" />
                <stop offset="50%" stopColor="rgba(63,174,122,0.9)" />
                <stop offset="100%" stopColor="rgba(198,168,107,0.8)" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {Array.from({ length: 18 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 25} x2={900} y2={i * 25} stroke="rgba(100,116,139,0.06)" strokeWidth={0.5} />
            ))}
            {Array.from({ length: 36 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 25} y1={0} x2={i * 25} y2={450} stroke="rgba(100,116,139,0.06)" strokeWidth={0.5} />
            ))}

            {/* Simplified continents (outlined shapes) */}
            {/* North America */}
            <path d="M100,80 L160,60 L230,55 L320,70 L340,100 L325,140 L350,175 L340,200 L280,195 L250,210 L230,205 L210,180 L170,195 L140,170 L110,160 L95,130 Z"
              fill="rgba(100,116,139,0.05)" stroke="rgba(100,116,139,0.12)" strokeWidth={0.8} />
            {/* South America */}
            <path d="M270,230 L300,220 L330,230 L345,260 L340,300 L320,340 L300,370 L280,360 L265,320 L260,280 Z"
              fill="rgba(100,116,139,0.05)" stroke="rgba(100,116,139,0.12)" strokeWidth={0.8} />
            {/* Europe */}
            <path d="M440,70 L470,60 L520,65 L540,80 L530,110 L540,140 L520,160 L480,170 L460,150 L440,155 L430,130 L440,100 Z"
              fill="rgba(100,116,139,0.05)" stroke="rgba(100,116,139,0.12)" strokeWidth={0.8} />
            {/* Africa */}
            <path d="M440,170 L490,165 L540,180 L550,220 L560,270 L540,320 L510,350 L480,340 L460,300 L440,250 L430,210 Z"
              fill="rgba(100,116,139,0.05)" stroke="rgba(100,116,139,0.12)" strokeWidth={0.8} />
            {/* Asia */}
            <path d="M540,60 L600,50 L700,55 L780,70 L810,100 L790,140 L760,160 L700,170 L640,160 L580,150 L550,120 L540,90 Z"
              fill="rgba(100,116,139,0.05)" stroke="rgba(100,116,139,0.12)" strokeWidth={0.8} />

            {/* Glowing transit arc */}
            <motion.path
              d={`M${route.from.x},${route.from.y} Q${(route.from.x + route.to.x) / 2},${Math.min(route.from.y, route.to.y) - 80} ${route.to.x},${route.to.y}`}
              fill="none" stroke="url(#arcGrad)" strokeWidth={2.5} filter="url(#arcGlow)"
              initial={{ pathLength: 0 }}
              animate={booted ? { pathLength: 1 } : {}}
              transition={{ duration: 2, delay: 1.5 }}
            />

            {/* Origin node */}
            <motion.circle cx={route.from.x} cy={route.from.y} r={5}
              fill="rgba(198,168,107,0.3)" stroke="rgba(198,168,107,0.8)" strokeWidth={1.5}
              initial={{ scale: 0 }} animate={booted ? { scale: 1 } : {}}
              transition={{ delay: 1 }} />
            <motion.circle cx={route.from.x} cy={route.from.y} r={12}
              fill="none" stroke="rgba(198,168,107,0.2)" strokeWidth={0.5}
              animate={booted ? { r: [12, 20, 12], opacity: [0.5, 0, 0.5] } : {}}
              transition={{ duration: 2, repeat: Infinity }} />
            <text x={route.from.x} y={route.from.y + 18} textAnchor="middle"
              className="fill-gold text-[9px] font-mono">{route.from.label}</text>

            {/* Destination node */}
            <motion.circle cx={route.to.x} cy={route.to.y} r={5}
              fill="rgba(63,174,122,0.3)" stroke="rgba(63,174,122,0.8)" strokeWidth={1.5}
              initial={{ scale: 0 }} animate={booted ? { scale: 1 } : {}}
              transition={{ delay: 1.2 }} />
            <motion.circle cx={route.to.x} cy={route.to.y} r={12}
              fill="none" stroke="rgba(63,174,122,0.2)" strokeWidth={0.5}
              animate={booted ? { r: [12, 20, 12], opacity: [0.5, 0, 0.5] } : {}}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
            <text x={route.to.x} y={route.to.y + 18} textAnchor="middle"
              className="fill-emerald-400 text-[9px] font-mono">{route.to.label}</text>
          </svg>

          {/* Telemetry overlay widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={booted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.5 }}
            className="absolute bottom-4 left-4 rounded-xl border border-slate-700/50 bg-slate-900/90 backdrop-blur-md p-3 text-[9px] font-mono space-y-1.5 w-[280px]"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Wifi className="h-3 w-3 text-emerald-400" />
              <span className="font-bold text-emerald-300 uppercase tracking-wider text-[8px]">Live Telemetry</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GPS Uplink</span>
              <span className="text-emerald-400 tabular-nums flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Encrypted · Active
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Environmental</span>
              <span className="text-slate-300 tabular-nums flex items-center gap-1">
                <Thermometer className="h-2.5 w-2.5 text-gold/50" />
                68°F / 40% RH / Nominal
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Seal Status</span>
              <span className="text-emerald-400 tabular-nums">Unbroken & Bonded</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Carrier</span>
              <span className="text-white tabular-nums">{carrier === "brinks" ? "Brink's GS" : "Loomis Intl"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Manifest</span>
              <span className="text-gold tabular-nums">{barCount} × 400oz LBMA</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══════ Sector 3: Sleep At Night Perimeter (Right) ══════ */}
      <div className="w-[240px] shrink-0 border-l border-slate-800/60 bg-[#050a14] p-4 flex flex-col gap-3 overflow-hidden">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-1">
          Security Perimeter
        </p>

        {/* Carrier Liability */}
        <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 backdrop-blur-sm p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-3 w-3 text-gold" />
            <p className="text-[10px] font-semibold text-white">Chain of Liability</p>
          </div>
          <p className="text-[8px] text-slate-500 leading-relaxed">
            Physical custody legally transferred to elite logistics carrier. You are entirely
            insulated from transit loss.
          </p>
        </div>

        {/* Insurance */}
        <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/15 backdrop-blur-sm p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-3 w-3 text-emerald-400" />
            <p className="text-[10px] font-semibold text-emerald-300">Syndicated Coverage</p>
          </div>
          <p className="text-[8px] text-slate-500 leading-relaxed">
            Active &quot;All-Risk&quot; umbrella policy via Lloyd&apos;s of London syndicates covering 100%
            of physical loss, theft, or catastrophic damage.
          </p>
          <span className="mt-1.5 inline-flex rounded bg-emerald-950/30 border border-emerald-800/30 px-2 py-0.5 font-mono text-[7px] font-bold text-emerald-400">
            $100,000,000 COVERAGE
          </span>
        </div>

        {/* Destination Legal */}
        <div className="rounded-xl border border-gold/20 bg-gold/5 backdrop-blur-sm p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lock className="h-3 w-3 text-gold" />
            <p className="text-[10px] font-semibold text-white">Target Custody State</p>
          </div>
          <p className="text-[8px] text-slate-500 leading-relaxed">
            Assets routing to segregated allocated storage governed by strict bailment law.
            Zero counterparty credit exposure.
          </p>
          <div className="mt-1.5 flex items-center gap-1">
            <Lock className="h-2.5 w-2.5 text-gold/50" />
            <span className="font-mono text-[7px] font-bold text-gold/60">BANKRUPTCY REMOTE</span>
          </div>
        </div>

        {/* Tracking Details */}
        <div className="mt-auto rounded-xl border border-slate-800/40 bg-slate-900/20 p-3">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-slate-600 mb-1.5">
            Tracking
          </p>
          <div className="space-y-1 text-[8px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Ref</span>
              <span className="font-mono text-gold">BGS-2026-0309-7A2F</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ETA</span>
              <span className="font-mono text-white">Mar 12, 2026 · 14:00 UTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Authority</span>
              <span className="font-mono text-slate-400">{carrier === "brinks" ? "Brink's GS" : "Loomis"}</span>
            </div>
          </div>
        </div>
      </div>

        {/* CTA to Marketplace */}
        <button type="button" onClick={goNext}
          className="shrink-0 mx-3 mb-3 flex items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-[10px] font-bold uppercase tracking-wider text-black hover:shadow-[0_0_25px_rgba(198,168,107,0.25)] transition-all">
          <Zap className="h-3.5 w-3.5" />
          Access Marketplace
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
  );
}
