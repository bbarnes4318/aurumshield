"use client";

/* ================================================================
   IDENFY FLOW SIMULATOR — Demo Compliance Visualizer
   ================================================================
   A high-end, military-grade terminal component that simulates the
   full iDenfy KYC/AML/KYB identity verification pipeline for use
   in sales pitches and investor demos.

   5 Phases:
     1. Secure Session Link  — QR code + SMS link generation
     2. OCR Extraction       — Document scanning with laser animation
     3. Biometric Liveness   — 3D depth-map face comparison
     4. AML/Sanctions Screen — OFAC, UN, Interpol database checks
     5. Webhook Firing       — HTTP 200 OK JSON payload receipt

   Self-contained. No external data dependencies.
   ================================================================ */

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Phase definitions ── */
type Phase = 1 | 2 | 3 | 4 | 5;

const PHASE_META: Record<Phase, { title: string; subtitle: string }> = {
  1: { title: "Secure Session Initialization", subtitle: "Generating encrypted verification link" },
  2: { title: "OCR Document Extraction", subtitle: "Scanning government-issued identification" },
  3: { title: "Biometric Liveness Detection", subtitle: "3D depth-map analysis vs. static ID photo" },
  4: { title: "Global AML / Sanctions Screen", subtitle: "Querying OFAC, UN Security Council, Interpol" },
  5: { title: "Webhook Dispatch", subtitle: "Transmitting cryptographic verification payload" },
};

/* ── Extracted OCR fields (Phase 2) ── */
const OCR_FIELDS = [
  { label: "FULL NAME",        value: "JAMES A. KELLY" },
  { label: "DATE OF BIRTH",    value: "08-22-1984" },
  { label: "DOCUMENT TYPE",    value: "PASSPORT" },
  { label: "DOCUMENT NUMBER",  value: "C04829371" },
  { label: "ISSUING AUTHORITY", value: "UNITED STATES" },
  { label: "EXPIRY DATE",      value: "11-15-2032" },
  { label: "DOCUMENT STATUS",  value: "VALID" },
  { label: "MRZ CHECKSUM",     value: "VERIFIED ✓" },
];

/* ── AML database checks (Phase 4) ── */
const AML_CHECKS = [
  { db: "OFAC SDN List",                   status: "CLEAR", latency: "12ms" },
  { db: "UN Security Council Sanctions",   status: "CLEAR", latency: "18ms" },
  { db: "Interpol Red Notice Database",    status: "CLEAR", latency: "24ms" },
  { db: "EU Consolidated Sanctions",       status: "CLEAR", latency: "9ms" },
  { db: "HM Treasury UK Sanctions",        status: "CLEAR", latency: "14ms" },
  { db: "PEP (Politically Exposed Persons)", status: "CLEAR", latency: "21ms" },
  { db: "Adverse Media Screening",         status: "CLEAR", latency: "31ms" },
  { db: "AurumShield Internal Blacklist",  status: "CLEAR", latency: "2ms" },
];

/* ── Webhook payload (Phase 5) ── */
const WEBHOOK_JSON = `{
  "scanRef": "scan_8f3a2b1c-d4e5-6789-ab01-cdef23456789",
  "clientId": "AS-PROD-001",
  "status": {
    "overall": "APPROVED",
    "autoDocument": "DOC_VALIDATED",
    "autoFace": "FACE_MATCH",
    "manualDocument": null,
    "manualFace": null
  },
  "data": {
    "docFirstName": "JAMES",
    "docLastName": "KELLY",
    "docNumber": "C04829371",
    "docExpiry": "2032-11-15",
    "selectedCountry": "US",
    "docType": "PASSPORT",
    "amlStatus": "CLEAR",
    "livenessScore": 0.9847
  },
  "fileUrls": {
    "FRONT": "https://vault.idenfy.com/scan/REDACTED/front.jpg",
    "FACE":  "https://vault.idenfy.com/scan/REDACTED/face.jpg"
  },
  "platform": "API",
  "timestamp": "${new Date().toISOString()}"
}`;

/* ================================================================
   COMPONENT
   ================================================================ */

export function IdenfyFlowSimulator() {
  const [phase, setPhase] = useState<Phase>(1);
  const [autoMode, setAutoMode] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0);

  /* Phase-specific animation states */
  const [sessionGenerated, setSessionGenerated] = useState(false);
  const [ocrFieldIndex, setOcrFieldIndex] = useState(0);
  const [scannerY, setScannerY] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);
  const [amlCheckIndex, setAmlCheckIndex] = useState(0);
  const [webhookReceived, setWebhookReceived] = useState(false);
  const [webhookLines, setWebhookLines] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  /* ── Reset phase-local state when phase changes ── */
  useEffect(() => {
    setPhaseProgress(0);
    setSessionGenerated(false);
    setOcrFieldIndex(0);
    setScannerY(0);
    setLivenessScore(0);
    setAmlCheckIndex(0);
    setWebhookReceived(false);
    setWebhookLines(0);
  }, [phase]);

  /* ── Phase 1: Session Generation ── */
  useEffect(() => {
    if (phase !== 1) return;
    const t = setTimeout(() => {
      setSessionGenerated(true);
      setPhaseProgress(100);
    }, 1800);
    const p = setInterval(() => {
      setPhaseProgress((prev) => Math.min(prev + 4, 95));
    }, 80);
    return () => { clearTimeout(t); clearInterval(p); };
  }, [phase]);

  /* ── Phase 2: OCR Extraction ── */
  useEffect(() => {
    if (phase !== 2) return;
    const scanInterval = setInterval(() => {
      setScannerY((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 30);
    const fieldInterval = setInterval(() => {
      setOcrFieldIndex((prev) => {
        const next = prev + 1;
        if (next >= OCR_FIELDS.length) {
          setPhaseProgress(100);
          return OCR_FIELDS.length;
        }
        setPhaseProgress(Math.floor((next / OCR_FIELDS.length) * 100));
        return next;
      });
    }, 600);
    return () => { clearInterval(scanInterval); clearInterval(fieldInterval); };
  }, [phase]);

  /* ── Phase 3: Biometric Liveness ── */
  useEffect(() => {
    if (phase !== 3) return;
    const interval = setInterval(() => {
      setLivenessScore((prev) => {
        const next = prev + 0.012 + Math.random() * 0.008;
        if (next >= 0.985) {
          setPhaseProgress(100);
          return 0.9847;
        }
        setPhaseProgress(Math.floor((next / 0.985) * 100));
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [phase]);

  /* ── Phase 4: AML Screening ── */
  useEffect(() => {
    if (phase !== 4) return;
    const interval = setInterval(() => {
      setAmlCheckIndex((prev) => {
        const next = prev + 1;
        if (next >= AML_CHECKS.length) {
          setPhaseProgress(100);
          return AML_CHECKS.length;
        }
        setPhaseProgress(Math.floor((next / AML_CHECKS.length) * 100));
        return next;
      });
    }, 450);
    return () => clearInterval(interval);
  }, [phase]);

  /* ── Phase 5: Webhook ── */
  useEffect(() => {
    if (phase !== 5) return;
    const totalLines = WEBHOOK_JSON.split("\n").length;
    const interval = setInterval(() => {
      setWebhookLines((prev) => {
        const next = prev + 1;
        if (next >= totalLines) {
          setWebhookReceived(true);
          setPhaseProgress(100);
          return totalLines;
        }
        setPhaseProgress(Math.floor((next / totalLines) * 100));
        return next;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [phase]);

  /* ── Auto-advance between phases ── */
  useEffect(() => {
    if (!autoMode || phaseProgress < 100 || phase >= 5) return;
    const t = setTimeout(() => {
      setPhase((prev) => Math.min(prev + 1, 5) as Phase);
    }, 1200);
    return () => clearTimeout(t);
  }, [autoMode, phaseProgress, phase]);

  /* ── Scroll terminal to bottom ── */
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [amlCheckIndex, webhookLines]);

  const handleNext = useCallback(() => {
    if (phase < 5) setPhase((prev) => (prev + 1) as Phase);
  }, [phase]);

  const handleReset = useCallback(() => {
    setPhase(1);
    setAutoMode(false);
  }, []);

  const meta = PHASE_META[phase];
  const isComplete = phaseProgress >= 100;

  return (
    <div className="w-full rounded border border-slate-800 bg-slate-950 overflow-hidden">
      {/* ── HEADER ── */}
      <div className="border-b border-slate-800 bg-black/40 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <span className="text-blue-400 text-sm">🔬</span>
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-white tracking-wide">
              iDenfy Compliance Engine
            </h3>
            <p className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase">
              Identity Verification Pipeline — Simulation Mode
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoMode(!autoMode)}
            className={`px-2.5 py-1 rounded border font-mono text-[9px] uppercase tracking-wider transition-colors ${
              autoMode
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-slate-700 bg-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {autoMode ? "● Auto" : "Auto"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 rounded border border-slate-700 bg-transparent font-mono text-[9px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── PHASE INDICATOR ── */}
      <div className="border-b border-slate-800 bg-slate-900/30 px-5 py-2.5">
        <div className="flex items-center gap-1">
          {([1, 2, 3, 4, 5] as Phase[]).map((p) => (
            <div key={p} className="flex items-center gap-1 flex-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  p < phase
                    ? "bg-emerald-500"
                    : p === phase
                    ? "bg-blue-500"
                    : "bg-slate-800"
                }`}
              >
                {p === phase && (
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${phaseProgress}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="font-mono text-[10px] text-blue-400 font-bold uppercase tracking-wider">
              Phase {phase}/5
            </span>
            <span className="font-mono text-[10px] text-slate-600 ml-2">
              — {meta.title}
            </span>
          </div>
          <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
            isComplete ? "text-emerald-400" : "text-amber-400 animate-pulse"
          }`}>
            {isComplete ? "COMPLETE" : "PROCESSING"}
          </span>
        </div>
      </div>

      {/* ── PHASE CONTENT ── */}
      <div className="min-h-[340px] max-h-[340px] flex flex-col">

        {/* ── PHASE 1: Secure Session Link ── */}
        {phase === 1 && (
          <div className="flex-1 flex items-stretch p-5 gap-5">
            {/* QR Code Zone */}
            <div className="flex-1 flex flex-col items-center justify-center border border-slate-800 rounded bg-black/30 p-4">
              <div className="w-28 h-28 border-2 border-dashed border-blue-500/40 rounded-lg flex items-center justify-center mb-3 relative overflow-hidden">
                {sessionGenerated ? (
                  <div className="grid grid-cols-7 grid-rows-7 gap-px w-full h-full p-2">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${
                          Math.random() > 0.4 ? "bg-white" : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full" />
                )}
              </div>
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                {sessionGenerated ? "Scan to Verify" : "Generating QR Token..."}
              </span>
            </div>

            {/* Session Details */}
            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="space-y-2">
                {[
                  { label: "SESSION ID", value: "ses_8f3a2b1c-d4e5-6789", delay: 400 },
                  { label: "ENCRYPTION", value: "AES-256-GCM / TLS 1.3", delay: 800 },
                  { label: "SMS LINK", value: "+1 (***) ***-4821 — SENT", delay: 1200 },
                  { label: "TOKEN TTL", value: "900s (15 minutes)", delay: 1500 },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className={`transition-all duration-300 ${
                      phaseProgress > (item.delay / 1800) * 100 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                    }`}
                  >
                    <span className="font-mono text-[8px] text-slate-600 uppercase tracking-widest block">
                      {item.label}
                    </span>
                    <span className={`font-mono text-xs ${i === 2 && sessionGenerated ? "text-emerald-400" : "text-white"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PHASE 2: OCR Document Extraction ── */}
        {phase === 2 && (
          <div className="flex-1 flex items-stretch p-5 gap-5">
            {/* Document wireframe */}
            <div className="w-48 shrink-0 border border-slate-700 rounded bg-slate-900/50 relative overflow-hidden flex flex-col items-center justify-center">
              {/* Document shape */}
              <div className="w-32 h-40 border border-slate-600 rounded bg-slate-800/50 relative">
                {/* Photo placeholder */}
                <div className="absolute top-2 left-2 w-10 h-12 border border-slate-600 rounded-sm bg-slate-700/50" />
                {/* Text lines */}
                <div className="absolute top-2 right-2 space-y-1.5">
                  <div className="w-14 h-1 bg-slate-600 rounded" />
                  <div className="w-12 h-1 bg-slate-600 rounded" />
                  <div className="w-10 h-1 bg-slate-600 rounded" />
                </div>
                <div className="absolute bottom-3 left-2 right-2 space-y-1">
                  <div className="w-full h-1 bg-slate-600/50 rounded" />
                  <div className="w-full h-1 bg-slate-600/50 rounded" />
                  <div className="w-3/4 h-1 bg-slate-600/50 rounded" />
                </div>
                {/* MRZ zone */}
                <div className="absolute bottom-8 left-2 right-2">
                  <div className="font-mono text-[5px] text-slate-500 leading-tight tracking-wider">
                    P&lt;USALKELLY&lt;&lt;JAMES&lt;A&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                  </div>
                </div>
              </div>
              {/* Scanning laser */}
              <div
                className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)] transition-all duration-75"
                style={{ top: `${scannerY}%` }}
              />
              <span className="font-mono text-[8px] text-blue-400 mt-3 uppercase tracking-widest animate-pulse">
                Scanning...
              </span>
            </div>

            {/* Extracted data */}
            <div className="flex-1 overflow-y-auto" ref={terminalRef}>
              <div className="space-y-1.5">
                {OCR_FIELDS.slice(0, ocrFieldIndex).map((field, i) => (
                  <div
                    key={field.label}
                    className="flex items-center gap-3 bg-black/30 border border-slate-800/50 rounded px-3 py-1.5 animate-in fade-in slide-in-from-right-4 duration-300"
                  >
                    <span className="font-mono text-[8px] text-slate-600 uppercase tracking-widest w-32 shrink-0">
                      {field.label}
                    </span>
                    <span className={`font-mono text-xs font-bold ${
                      field.label === "DOCUMENT STATUS" || field.label === "MRZ CHECKSUM"
                        ? "text-emerald-400"
                        : "text-white"
                    }`}>
                      {field.value}
                    </span>
                    <span className="ml-auto font-mono text-[8px] text-emerald-400/60">
                      ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PHASE 3: Biometric Liveness ── */}
        {phase === 3 && (
          <div className="flex-1 flex items-stretch p-5 gap-5">
            {/* Face wireframe */}
            <div className="w-48 shrink-0 border border-slate-700 rounded bg-black/40 relative overflow-hidden flex items-center justify-center">
              {/* Face outline */}
              <div className="relative">
                <svg width="100" height="120" viewBox="0 0 100 120" className="text-blue-400">
                  {/* Head outline */}
                  <ellipse cx="50" cy="50" rx="35" ry="42" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
                  {/* Eyes */}
                  <ellipse cx="35" cy="42" rx="7" ry="4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                  <ellipse cx="65" cy="42" rx="7" ry="4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                  {/* Nose */}
                  <line x1="50" y1="48" x2="50" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                  <line x1="45" y1="60" x2="55" y2="60" stroke="currentColor" strokeWidth="1" opacity="0.3" />
                  {/* Mouth */}
                  <path d="M 38 70 Q 50 78 62 70" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                  {/* Depth map grid */}
                  <g opacity={0.15 + livenessScore * 0.3}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <line key={`h${i}`} x1="15" y1={15 + i * 15} x2="85" y2={15 + i * 15} stroke="currentColor" strokeWidth="0.5" />
                    ))}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <line key={`v${i}`} x1={20 + i * 13} y1="8" x2={20 + i * 13} y2="92" stroke="currentColor" strokeWidth="0.5" />
                    ))}
                  </g>
                  {/* Scanning ring */}
                  <circle
                    cx="50" cy="50" r={30 + livenessScore * 10}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity={0.3}
                  >
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="font-mono text-[8px] text-blue-400 uppercase tracking-widest animate-pulse">
                  3D Depth Analysis
                </span>
              </div>
            </div>

            {/* Biometric metrics */}
            <div className="flex-1 flex flex-col justify-center space-y-4">
              {/* Liveness score bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">Liveness Confidence</span>
                  <span className={`font-mono text-sm font-bold tabular-nums ${
                    livenessScore >= 0.95 ? "text-emerald-400" : livenessScore >= 0.7 ? "text-amber-400" : "text-blue-400"
                  }`}>
                    {(livenessScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-150 ${
                      livenessScore >= 0.95 ? "bg-emerald-500" : livenessScore >= 0.7 ? "bg-amber-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${livenessScore * 100}%` }}
                  />
                </div>
              </div>

              {/* Check items */}
              <div className="space-y-2">
                {[
                  { label: "Face Detected",          threshold: 0.1 },
                  { label: "Anti-Spoofing (2D Print)", threshold: 0.3 },
                  { label: "Anti-Spoofing (Screen)",   threshold: 0.5 },
                  { label: "3D Depth Map Validated",   threshold: 0.7 },
                  { label: "ID Photo Cross-Match",     threshold: 0.85 },
                  { label: "Liveness Confirmed",       threshold: 0.95 },
                ].map((check) => {
                  const passed = livenessScore >= check.threshold;
                  return (
                    <div key={check.label} className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full shrink-0 transition-all duration-300 ${
                        passed ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-slate-700"
                      }`} />
                      <span className={`font-mono text-[10px] transition-colors ${
                        passed ? "text-emerald-400" : "text-slate-600"
                      }`}>
                        {check.label}
                      </span>
                      {passed && (
                        <span className="ml-auto font-mono text-[8px] text-emerald-400/60">PASS</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PHASE 4: AML / Sanctions Screen ── */}
        {phase === 4 && (
          <div className="flex-1 p-4 overflow-hidden">
            <div className="h-full bg-black/60 border border-slate-800 rounded font-mono text-[11px] p-3 overflow-y-auto" ref={terminalRef}>
              <div className="text-slate-600 mb-2">
                $ aurumshield-aml-screen --subject=&quot;JAMES A. KELLY&quot; --dob=1984-08-22 --passport=C04829371
              </div>
              <div className="text-blue-400 mb-3">
                [INFO] Initiating parallel sanctions screening across 8 databases...
              </div>
              <div className="space-y-1.5">
                {AML_CHECKS.slice(0, amlCheckIndex).map((check, i) => (
                  <div key={check.db} className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <span className="text-slate-600">[{String(i + 1).padStart(2, "0")}]</span>
                    <span className="text-slate-400 flex-1 truncate">{check.db}</span>
                    <span className="text-slate-700 text-[9px]">{check.latency}</span>
                    <span className="text-emerald-400 font-bold tracking-wider">
                      ■ {check.status}
                    </span>
                  </div>
                ))}
              </div>
              {amlCheckIndex >= AML_CHECKS.length && (
                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="text-emerald-400 font-bold">
                    ═══════════════════════════════════════════════
                  </div>
                  <div className="text-emerald-400 font-bold mt-1">
                    ✓ ALL SANCTIONS DATABASES CLEAR — NO MATCHES FOUND
                  </div>
                  <div className="text-emerald-400 font-bold">
                    ═══════════════════════════════════════════════
                  </div>
                  <div className="text-slate-600 mt-2 text-[9px]">
                    Total screening time: 131ms | Databases queried: 8 | False positive rate: 0.000%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PHASE 5: Webhook Firing ── */}
        {phase === 5 && (
          <div className="flex-1 p-4 overflow-hidden">
            <div className="h-full bg-black/60 border border-slate-800 rounded font-mono text-[11px] p-3 overflow-y-auto" ref={terminalRef}>
              {/* HTTP request line */}
              <div className="text-slate-500 mb-1">
                POST /api/webhooks/idenfy HTTP/1.1
              </div>
              <div className="text-slate-600 text-[9px] mb-1">
                Host: app.aurumshield.vip
              </div>
              <div className="text-slate-600 text-[9px] mb-1">
                Content-Type: application/json
              </div>
              <div className="text-slate-600 text-[9px] mb-1">
                X-Idenfy-Signature: sha256=a1b2c3d4e5f6...
              </div>
              <div className="text-slate-600 text-[9px] mb-3">
                X-Idenfy-Timestamp: {Math.floor(Date.now() / 1000)}
              </div>

              {/* JSON body streaming in */}
              <div className="text-amber-400/60 text-[9px] mb-1">── PAYLOAD ──</div>
              <pre className="text-slate-300 whitespace-pre leading-relaxed">
                {WEBHOOK_JSON.split("\n").slice(0, webhookLines).join("\n")}
                {webhookLines < WEBHOOK_JSON.split("\n").length && (
                  <span className="text-blue-400 animate-pulse">▋</span>
                )}
              </pre>

              {/* Response */}
              {webhookReceived && (
                <div className="mt-3 pt-3 border-t border-slate-800 animate-in fade-in duration-500">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">← HTTP 200 OK</span>
                    <span className="text-slate-600 text-[9px]">3ms</span>
                  </div>
                  <div className="text-emerald-400 mt-2">
                    {`{ "received": true, "scanRef": "scan_8f3a2b1c...", "action": "VERIFY_APPROVED" }`}
                  </div>
                  <div className="text-emerald-400 font-bold mt-3">
                    ✓ WEBHOOK PROCESSED — VERIFICATION COMPLETE
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="border-t border-slate-800 bg-black/40 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-2 w-2 rounded-full ${
            phase === 5 && isComplete
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              : "bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.4)]"
          }`} />
          <span className="font-mono text-[10px] text-slate-500 tracking-wider">
            {phase === 5 && isComplete
              ? "IDENTITY VERIFIED — ALL CHECKS PASSED"
              : meta.subtitle
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          {phase < 5 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isComplete}
              className={`px-4 py-1.5 rounded border font-mono text-[10px] font-bold uppercase tracking-wider transition-all ${
                isComplete
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                  : "border-slate-800 bg-transparent text-slate-700 cursor-not-allowed"
              }`}
            >
              Next Phase →
            </button>
          )}
          {phase === 5 && isComplete && (
            <span className="px-4 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              ✓ Approved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
