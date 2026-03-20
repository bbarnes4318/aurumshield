"use client";

/* ================================================================
   AML TRAINING TERMINAL — FinCEN 31 CFR § 1027 Compliance
   ================================================================
   Route: /compliance/training

   Interactive 4-module curriculum with hard-stop knowledge checks
   and cryptographic attestation. Zero-scroll. Prime Brokerage
   dark-mode SCADA aesthetic.

   Modules:
     1. BSA Legal Framework
     2. Precious Metals Typologies (Quiz)
     3. Red Flag Recognition (Quiz)
     4. Suspicious Activity Reporting (Quiz)
     → Digital Signature + Certificate Issuance

   Architecture:
     - Left sidebar: locked vertical stepper
     - Main panel: curriculum content or quiz terminal
     - All state managed via useState (no server components)
   ================================================================ */

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Unlock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Fingerprint,
} from "lucide-react";

/* ================================================================
   CURRICULUM DATA
   ================================================================ */

interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
  explanation: string;
}

interface Quiz {
  question: string;
  options: QuizOption[];
}

interface CurriculumModule {
  id: number;
  title: string;
  shortTitle: string;
  icon: string;
  content: {
    heading: string;
    paragraphs: string[];
    keyPoints: { label: string; detail: string }[];
  };
  quiz: Quiz | null;
}

const CURRICULUM: CurriculumModule[] = [
  /* ── Module 1: BSA Legal Framework ── */
  {
    id: 1,
    title: "BSA Legal Framework",
    shortTitle: "BSA Framework",
    icon: "§",
    content: {
      heading: "The Bank Secrecy Act & USA PATRIOT Act",
      paragraphs: [
        "The Bank Secrecy Act of 1970 (31 U.S.C. §§ 5311–5332) establishes the legal foundation for anti-money laundering compliance in the United States. Under the BSA, dealers in precious metals, precious stones, or jewels (PMSJs) are classified as financial institutions and must implement a written AML program reasonably designed to prevent the business from being used to facilitate money laundering or terrorist financing.",
        "The USA PATRIOT Act of 2001 (Title III) expanded the BSA's reach by adding enhanced due diligence (EDD) requirements for correspondent accounts, private banking, and transactions involving jurisdictions of primary money laundering concern (31 CFR § 1010.610–670). Section 352 mandates that every financial institution establish an AML program containing four pillars.",
        "FinCEN's 2005 Final Rule (31 CFR Part 1027) explicitly brought precious metals dealers under BSA jurisdiction. AurumShield, as a clearing and settlement platform for physical gold, is subject to the full weight of these requirements.",
      ],
      keyPoints: [
        { label: "Four Pillars of AML", detail: "(1) Internal policies/procedures, (2) Compliance officer designation, (3) Employee training, (4) Independent testing" },
        { label: "Form 8300", detail: "Any cash transaction exceeding $10,000 in a single day must be reported via IRS/FinCEN Form 8300 within 15 days" },
        { label: "Structuring (31 U.S.C. § 5324)", detail: "Breaking transactions into amounts below $10,000 to evade reporting is a federal crime carrying up to 5 years imprisonment" },
        { label: "Willful Violation Penalties", detail: "Up to $500,000 fine and/or 10 years imprisonment per violation. Corporate liability attaches to the entity" },
      ],
    },
    quiz: null,
  },

  /* ── Module 2: Precious Metals Typologies ── */
  {
    id: 2,
    title: "Precious Metals Typologies",
    shortTitle: "PM Typologies",
    icon: "▲",
    content: {
      heading: "How Gold Is Weaponized for Money Laundering",
      paragraphs: [
        "Trade-Based Money Laundering (TBML) through precious metals is a $2 trillion annual global threat identified by the Financial Action Task Force (FATF). Gold's intrinsic value, global liquidity, and ability to be melted and re-assayed make it a preferred vehicle for value transfer by organized crime, sanctions evaders, and terrorist financiers.",
        "Common typologies include: (1) Falsified assay certificates — fabricating purity documentation to inflate the declared value of gold shipments, enabling over-invoicing schemes. (2) Scrap melting — purchasing gold from unknown sources (often theft proceeds), melting it to destroy provenance, and re-casting it as 'new production' with falsified origin documentation. (3) Structured cash purchases — splitting gold purchases across multiple days or locations to stay below Form 8300 thresholds.",
        "AurumShield's mandatory refinery routing and LBMA Good Delivery verification exist specifically to break these typologies. Every bar entering our clearing ledger must be independently assayed by a partner refinery, preventing falsified provenance from penetrating the settlement system.",
      ],
      keyPoints: [
        { label: "Mirror Trades", detail: "Simultaneous buy/sell of equivalent gold positions across jurisdictions to transfer value internationally without wire transfers" },
        { label: "Layering via Refineries", detail: "Using multiple re-refining steps to obscure the original source of gold, creating a 'clean' provenance chain" },
        { label: "Cuckoo Smurfing", detail: "A third party unknowingly receives legitimate gold as payment, while the launderer diverts the funds — exploiting the physical nature of gold for value substitution" },
        { label: "Form 8300 Evasion", detail: "Structured purchases of $9,500 on consecutive days — still reportable under 'aggregate transactions' rule and constitutes a federal crime" },
      ],
    },
    quiz: {
      question: "A broker's client purchases $9,800 in gold bars on Monday, then $9,600 on Wednesday, and $9,400 on Friday — all in cash. Under BSA regulations, what is the correct course of action?",
      options: [
        {
          id: "a",
          text: "No reporting required — each individual transaction is below the $10,000 threshold",
          correct: false,
          explanation: "INCORRECT. Under 31 CFR § 1010.313, multiple cash transactions by the same customer that aggregate to over $10,000 within a single business day — or multiple related transactions designed to evade reporting — trigger Form 8300 filing. Furthermore, this pattern constitutes textbook 'structuring' under 31 U.S.C. § 5324, which is itself a federal crime regardless of whether the underlying funds are legitimate.",
        },
        {
          id: "b",
          text: "File a Form 8300 for each transaction individually since they exceed $5,000",
          correct: false,
          explanation: "INCORRECT. The $5,000 threshold relates to mandatory customer identification under the BSA, not Form 8300 reporting. Form 8300 is triggered at $10,000 in aggregate cash per customer. Additionally, this pattern requires a Suspicious Activity Report (SAR) for suspected structuring, not merely individual Form 8300 filings.",
        },
        {
          id: "c",
          text: "File a single Form 8300 for the aggregated amount AND file a SAR for suspected structuring",
          correct: true,
          explanation: "CORRECT. The transactions aggregate to $28,800 in cash within a single week from the same customer — clearly exceeding the $10,000 threshold. The deliberate pattern of keeping each transaction below $10,000 is textbook structuring (31 U.S.C. § 5324). You must: (1) File Form 8300 for the aggregate, (2) File a SAR within 30 days for suspected structuring, and (3) Never inform the customer that a SAR has been filed.",
        },
        {
          id: "d",
          text: "Refuse the transactions and terminate the business relationship immediately",
          correct: false,
          explanation: "INCORRECT. While refusal may be appropriate after internal review, immediately terminating the relationship without filing the required SAR constitutes a compliance failure. The BSA requires that you file the SAR first. Defensive termination ('de-risking') without completing regulatory obligations is itself a regulatory violation.",
        },
      ],
    },
  },

  /* ── Module 3: Red Flag Recognition ── */
  {
    id: 3,
    title: "Red Flag Recognition",
    shortTitle: "Red Flags",
    icon: "⚑",
    content: {
      heading: "Identifying Suspicious Counterparties & Transactions",
      paragraphs: [
        "FinCEN Advisory FIN-2006-A003 and FATF Guidance on TBML outline specific red flags for the precious metals sector. AurumShield operators and registered brokers are legally obligated to recognize and escalate these indicators. Failure to do so exposes the individual and the platform to criminal liability under 18 U.S.C. § 1956 (money laundering) and 18 U.S.C. § 1960 (unlicensed money transmission).",
        "Counterparty red flags include: obscured Ultimate Beneficial Ownership (UBO) structures involving shell companies in opacity jurisdictions (BVI, Panama, Seychelles), uncooperative or evasive behavior during KYB due diligence, last-minute changes to settlement instructions (particularly routing to new jurisdictions), and entities with connections to OFAC-designated persons or countries subject to comprehensive sanctions (North Korea, Iran, Syria, Cuba, Crimea).",
        "Transaction red flags include: purchases with no apparent economic rationale, transactions inconsistent with the customer's stated business purpose, requests to bypass standard settlement procedures, and unusual insistence on physical delivery to non-standard locations.",
      ],
      keyPoints: [
        { label: "Shell Company Layering", detail: "Counterparty is a SPV owned by a trust, administered by a nominee director, with the UBO obscured behind 3+ corporate layers" },
        { label: "Geographic Risk", detail: "Origin/destination in FATF 'grey list' jurisdictions (currently: Turkey, UAE, South Africa, Nigeria) or comprehensive sanctions targets" },
        { label: "Behavioral Indicators", detail: "Customer is unusually knowledgeable about SAR thresholds, asks whether transactions are reported, or requests confirmation of anonymity" },
        { label: "Profile Inconsistency", detail: "A small trading company with declared $200K annual revenue placing a $5M gold order — profile does not match transaction volume" },
      ],
    },
    quiz: {
      question: "During KYB onboarding, a counterparty provides UBO documentation showing the beneficial owner is a trust registered in the British Virgin Islands, administered by a nominee director based in Dubai, with the trust's settlor listed as 'CONFIDENTIAL.' The entity wants to purchase 50kg of gold for 'treasury reserves.' What is your obligation?",
      options: [
        {
          id: "a",
          text: "Proceed — trust structures are common in international commerce and the BVI is a legitimate jurisdiction",
          correct: false,
          explanation: "INCORRECT. While trust structures are legal, the combination of BVI incorporation + nominee directors + undisclosed settlor + Dubai administration constitutes multiple concurrent red flags per FATF Guidance. Proceeding without Enhanced Due Diligence (EDD) violates 31 CFR § 1010.610 and exposes AurumShield to facilitating potential sanctions evasion or money laundering.",
        },
        {
          id: "b",
          text: "Escalate to the Compliance Officer for Enhanced Due Diligence (EDD) — the opacity of UBO structure requires full beneficial ownership resolution before any transaction can proceed",
          correct: true,
          explanation: "CORRECT. Under 31 CFR § 1010.230 (CDD Rule), you must identify and verify the identity of each beneficial owner with 25%+ ownership. A 'CONFIDENTIAL' settlor is unacceptable — the UBO must be resolved. The Compliance Officer must conduct EDD including: independent verification of the trust deed, identification of all parties with control or benefit, screening against OFAC/UN sanctions lists, and a documented risk assessment before any transaction can proceed.",
        },
        {
          id: "c",
          text: "File a SAR immediately and block the account",
          correct: false,
          explanation: "INCORRECT. A SAR may ultimately be required, but the immediate obligation is to escalate for EDD — not to file a SAR based solely on red flags without investigation. Filing a SAR prematurely without completing due diligence can itself be a compliance failure. The correct sequence is: escalate → investigate → determine if SAR-filing threshold is met → file within 30 days if warranted.",
        },
        {
          id: "d",
          text: "Request a letter from the counterparty's attorney confirming the legitimacy of the trust structure",
          correct: false,
          explanation: "INCORRECT. An attorney letter provides zero regulatory value for UBO verification under the BSA. You cannot outsource your CDD obligations to the customer's legal counsel. The obligation to independently verify beneficial ownership rests with AurumShield, not the counterparty's representatives.",
        },
      ],
    },
  },

  /* ── Module 4: Suspicious Activity Reporting ── */
  {
    id: 4,
    title: "Suspicious Activity Reporting (SAR)",
    shortTitle: "SAR Filing",
    icon: "◉",
    content: {
      heading: "Federal Filing Obligations & the Tipping-Off Prohibition",
      paragraphs: [
        "Under 31 CFR § 1027.320, AurumShield must file a Suspicious Activity Report (SAR) with FinCEN within 30 calendar days of the initial detection of facts constituting the basis for filing. If no suspect is identified, the deadline extends to 60 days. SAR filing is mandatory — there is no discretion threshold. If facts meet the standard, the SAR must be filed.",
        "The 'tipping off' prohibition (31 U.S.C. § 5318(g)(2)) makes it a federal crime to disclose to any person involved in the transaction that a SAR has been filed or is being considered. This prohibition extends to all AurumShield employees, contractors, and registered brokers. Violation carries penalties of up to $250,000 and/or 5 years imprisonment.",
        "SAR narratives must be factually detailed, describing the 'who, what, when, where, why, and how' of the suspicious activity. Vague or conclusory narratives (e.g., 'suspicious transaction') are regulatory failures. FinCEN reviews narrative quality and can issue deficiency findings against institutions filing inadequate SARs.",
      ],
      keyPoints: [
        { label: "30-Day Filing Deadline", detail: "Clock starts on the date suspicious activity is first detected by any employee — not when the Compliance Officer is notified" },
        { label: "Tipping Off = Federal Crime", detail: "You CANNOT tell the customer, their attorney, or any third party that a SAR has been or will be filed. Period. No exceptions." },
        { label: "Safe Harbor (31 U.S.C. § 5318(g)(3))", detail: "Good-faith SAR filing provides complete civil liability protection. You cannot be sued for filing a SAR." },
        { label: "Retention", detail: "All SARs and supporting documentation must be retained for 5 years from the date of filing" },
      ],
    },
    quiz: {
      question: "You filed a SAR on a broker's client 15 days ago. The broker calls and asks: 'My client says his gold purchase was flagged — can you confirm whether any reports were filed?' What is your legal obligation?",
      options: [
        {
          id: "a",
          text: "Confirm the SAR was filed — the broker is a registered platform user with a legitimate business need to know",
          correct: false,
          explanation: "INCORRECT. This is a textbook violation of 31 U.S.C. § 5318(g)(2). The tipping-off prohibition applies to ALL persons, including registered brokers. There is NO 'business need' exception. Confirming the SAR would constitute a federal crime punishable by up to $250,000 fine and 5 years imprisonment.",
        },
        {
          id: "b",
          text: "Deny that any SAR was filed — protecting client confidentiality",
          correct: false,
          explanation: "INCORRECT. Affirmatively denying a SAR's existence is also a form of disclosure under the tipping-off prohibition. Any statement that could lead the subject to infer whether a SAR was or was not filed violates the statute. The correct response is to neither confirm nor deny.",
        },
        {
          id: "c",
          text: "Neither confirm nor deny — state that company policy prohibits discussing internal compliance matters, and document the broker's inquiry in the SAR follow-up file",
          correct: true,
          explanation: "CORRECT. The only legally compliant response is to neither confirm nor deny. State: 'AurumShield policy does not permit discussion of internal compliance processes.' Then immediately document the inquiry (date, time, caller, exact questions asked) in the SAR follow-up file — the inquiry itself may be a red flag requiring SAR amendment.",
        },
        {
          id: "d",
          text: "Transfer the call to the Compliance Officer — only they are authorized to discuss SARs",
          correct: false,
          explanation: "INCORRECT. The Compliance Officer is equally bound by the tipping-off prohibition. Transferring the call implies that discussing SARs is permissible at a higher authorization level, which is false. No person at AurumShield — regardless of title — may confirm, deny, or discuss SAR filings with any outside party.",
        },
      ],
    },
  },
];

/* ================================================================
   COMPONENT STATE TYPES
   ================================================================ */

type StepType = "content" | "quiz" | "attestation" | "complete";

interface ModuleState {
  currentModule: number; // 0-indexed into CURRICULUM
  step: StepType;
  completedModules: Set<number>;
  quizAnswer: string | null;
  quizSubmitted: boolean;
  quizCorrect: boolean;
  attestationName: string;
  certificateId: string | null;
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function AmlTrainingPage() {
  const [state, setState] = useState<ModuleState>({
    currentModule: 0,
    step: "content",
    completedModules: new Set<number>(),
    quizAnswer: null,
    quizSubmitted: false,
    quizCorrect: false,
    attestationName: "",
    certificateId: null,
  });

  const currentMod = CURRICULUM[state.currentModule];
  const isLastModule = state.currentModule === CURRICULUM.length - 1;

  /* ── Advance to quiz or next module ── */
  const handleContinue = useCallback(() => {
    if (currentMod.quiz && state.step === "content") {
      // Go to quiz
      setState((s) => ({ ...s, step: "quiz", quizAnswer: null, quizSubmitted: false, quizCorrect: false }));
    } else if (isLastModule && state.step === "quiz" && state.quizCorrect) {
      // Last module quiz passed → attestation
      const completed = new Set(state.completedModules);
      completed.add(state.currentModule);
      setState((s) => ({ ...s, step: "attestation", completedModules: completed }));
    } else if (state.step === "content" && !currentMod.quiz) {
      // Module 1 (no quiz) → advance
      const completed = new Set(state.completedModules);
      completed.add(state.currentModule);
      setState((s) => ({
        ...s,
        currentModule: s.currentModule + 1,
        step: "content",
        completedModules: completed,
        quizAnswer: null,
        quizSubmitted: false,
        quizCorrect: false,
      }));
    } else if (state.step === "quiz" && state.quizCorrect && !isLastModule) {
      // Quiz passed, advance to next module
      const completed = new Set(state.completedModules);
      completed.add(state.currentModule);
      setState((s) => ({
        ...s,
        currentModule: s.currentModule + 1,
        step: "content",
        completedModules: completed,
        quizAnswer: null,
        quizSubmitted: false,
        quizCorrect: false,
      }));
    }
  }, [currentMod, state, isLastModule]);

  /* ── Quiz submission ── */
  const handleQuizSubmit = useCallback(() => {
    if (!state.quizAnswer || !currentMod.quiz) return;
    const selected = currentMod.quiz.options.find((o) => o.id === state.quizAnswer);
    setState((s) => ({
      ...s,
      quizSubmitted: true,
      quizCorrect: selected?.correct ?? false,
    }));
  }, [state.quizAnswer, currentMod]);

  /* ── Quiz retry ── */
  const handleQuizRetry = useCallback(() => {
    setState((s) => ({ ...s, quizAnswer: null, quizSubmitted: false, quizCorrect: false }));
  }, []);

  /* ── Certificate issuance ── */
  const handleIssueCertificate = useCallback(() => {
    const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const certId = `CERT-AML-2026-${hex}`;

    // TODO: Wire to real server action — currently mock
    // Mock: log GovernanceAuditEvent
    console.log("[AML_TRAINING] Certificate issued:", {
      certificateId: certId,
      action: "CLEARING_CERTIFICATE_ISSUED",
      actor: state.attestationName,
      timestamp: new Date().toISOString(),
      resourceType: "AML_TRAINING_CERTIFICATE",
      severity: "info",
      result: "SUCCESS",
    });

    setState((s) => ({ ...s, step: "complete", certificateId: certId }));
  }, [state.attestationName]);

  /* ── Sidebar module states ── */
  const getModuleStatus = (idx: number): "completed" | "current" | "locked" => {
    if (state.completedModules.has(idx)) return "completed";
    if (idx === state.currentModule) return "current";
    return "locked";
  };

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-slate-950 text-slate-300">
      {/* ═══════════════════════════════════════════════
          LEFT SIDEBAR — Curriculum Progression
         ═══════════════════════════════════════════════ */}
      <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-amber-400" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">
              AML Training
            </span>
          </div>
          <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
            FinCEN 31 CFR § 1027 — Annual Certification
          </p>
        </div>

        {/* Module Stepper */}
        <nav className="flex-1 p-3 space-y-px">
          {CURRICULUM.map((mod, idx) => {
            const status = getModuleStatus(idx);
            return (
              <div
                key={mod.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-colors ${
                  status === "current"
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : status === "completed"
                    ? "bg-emerald-500/5 border border-transparent"
                    : "border border-transparent opacity-40"
                }`}
              >
                {/* Step indicator */}
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                  status === "completed"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : status === "current"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-slate-800 text-slate-600"
                }`}>
                  {status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : status === "locked" ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <span className="font-mono text-[10px] font-bold">{mod.icon}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className={`font-mono text-[10px] font-medium truncate ${
                    status === "current" ? "text-blue-400" : status === "completed" ? "text-emerald-400" : "text-slate-600"
                  }`}>
                    Module {idx + 1}
                  </p>
                  <p className={`font-mono text-[8px] truncate ${
                    status === "current" ? "text-slate-400" : status === "completed" ? "text-slate-500" : "text-slate-700"
                  }`}>
                    {mod.shortTitle}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Attestation step */}
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md mt-2 border-t border-slate-800 pt-3 ${
            state.step === "attestation" || state.step === "complete"
              ? "bg-amber-500/10 border border-amber-500/20"
              : "border border-transparent opacity-40"
          }`}>
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
              state.step === "complete"
                ? "bg-emerald-500/20 text-emerald-400"
                : state.step === "attestation"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-800 text-slate-600"
            }`}>
              {state.step === "complete" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Fingerprint className="h-3 w-3" />
              )}
            </div>
            <div className="min-w-0">
              <p className={`font-mono text-[10px] font-medium ${
                state.step === "attestation" ? "text-amber-400" : state.step === "complete" ? "text-emerald-400" : "text-slate-600"
              }`}>
                Attestation
              </p>
              <p className="font-mono text-[8px] text-slate-700">Digital Signature</p>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
              {state.completedModules.size}/4 Modules Complete
            </span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════ */}
      <main className="flex-1 min-h-0 flex flex-col">
        {/* ── Top Header ── */}
        <header className="shrink-0 border-b border-slate-800 bg-black/40 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-sm font-bold text-white tracking-wide">
              {state.step === "complete"
                ? "Certification Complete"
                : state.step === "attestation"
                ? "Digital Attestation"
                : `Module ${state.currentModule + 1}: ${currentMod.title}`
              }
            </h1>
            <p className="font-mono text-[9px] text-slate-600 tracking-wider uppercase mt-0.5">
              {state.step === "content" && "Curriculum Content"}
              {state.step === "quiz" && "Terminal Verification — Hard-Stop Knowledge Check"}
              {state.step === "attestation" && "Cryptographic Certificate Issuance"}
              {state.step === "complete" && "FinCEN-Compliant AML Certification Issued"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
            <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-wider">
              Secure Session
            </span>
          </div>
        </header>

        {/* ── Scrollable Content Zone ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">

            {/* ────────── CONTENT VIEW ────────── */}
            {state.step === "content" && (
              <div className="space-y-5">
                <h2 className="text-base font-bold text-white">
                  {currentMod.content.heading}
                </h2>

                {currentMod.content.paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-slate-400 leading-relaxed">
                    {p}
                  </p>
                ))}

                {/* Key Points */}
                <div className="border border-slate-800 rounded bg-black/30">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <span className="font-mono text-[9px] font-bold text-amber-400 uppercase tracking-[0.15em]">
                      Critical Regulatory Points
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800/50">
                    {currentMod.content.keyPoints.map((kp) => (
                      <div key={kp.label} className="px-4 py-3 flex gap-3">
                        <span className="shrink-0 font-mono text-[10px] font-bold text-amber-400 w-40">
                          {kp.label}
                        </span>
                        <span className="text-xs text-slate-400 leading-relaxed">
                          {kp.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Continue button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="flex items-center gap-2 px-5 py-2 rounded border border-blue-500/30 bg-blue-500/10 font-mono text-xs font-bold text-blue-400 uppercase tracking-wider hover:bg-blue-500/20 transition-colors"
                  >
                    {currentMod.quiz ? "Proceed to Verification" : "Complete Module"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ────────── QUIZ VIEW ────────── */}
            {state.step === "quiz" && currentMod.quiz && (
              <div className="space-y-5">
                <div className="border border-amber-500/30 bg-amber-500/5 rounded px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-[0.15em]">
                      Terminal Verification — Module {state.currentModule + 1}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    You must answer correctly to proceed. Incorrect answers will be explained and you must re-attempt.
                  </p>
                </div>

                <div className="border border-slate-700 rounded bg-black/30 p-4">
                  <p className="text-sm text-white leading-relaxed mb-5">
                    {currentMod.quiz.question}
                  </p>

                  <div className="space-y-2">
                    {currentMod.quiz.options.map((opt) => {
                      const isSelected = state.quizAnswer === opt.id;
                      const showResult = state.quizSubmitted && isSelected;
                      const isCorrectOption = opt.correct;

                      let borderClass = "border-slate-800";
                      if (showResult) {
                        borderClass = isCorrectOption ? "border-emerald-500/50" : "border-red-500/50";
                      } else if (isSelected) {
                        borderClass = "border-blue-500/40";
                      }

                      return (
                        <div key={opt.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!state.quizSubmitted) {
                                setState((s) => ({ ...s, quizAnswer: opt.id }));
                              }
                            }}
                            disabled={state.quizSubmitted}
                            className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded border transition-all ${borderClass} ${
                              showResult && isCorrectOption ? "bg-emerald-500/5" : showResult ? "bg-red-500/5" : isSelected ? "bg-blue-500/5" : "bg-transparent hover:bg-slate-800/30"
                            } ${state.quizSubmitted ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <span className={`font-mono text-xs shrink-0 mt-0.5 ${
                              isSelected ? "text-white" : "text-slate-600"
                            }`}>
                              [{isSelected ? "●" : " "}]
                            </span>
                            <span className={`text-xs leading-relaxed ${
                              isSelected ? "text-white" : "text-slate-400"
                            }`}>
                              <span className="font-mono font-bold text-slate-500 mr-1.5">{opt.id.toUpperCase()}.</span>
                              {opt.text}
                            </span>
                          </button>

                          {/* Explanation */}
                          {showResult && (
                            <div className={`mt-1 ml-7 px-3 py-2 rounded text-xs leading-relaxed border-l-2 ${
                              isCorrectOption
                                ? "border-emerald-500 bg-emerald-500/5 text-emerald-300"
                                : "border-red-500 bg-red-500/5 text-red-300"
                            }`}>
                              {opt.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Submit / Retry / Continue */}
                <div className="flex justify-end gap-3">
                  {!state.quizSubmitted && (
                    <button
                      type="button"
                      onClick={handleQuizSubmit}
                      disabled={!state.quizAnswer}
                      className={`flex items-center gap-2 px-5 py-2 rounded border font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                        state.quizAnswer
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          : "border-slate-800 bg-transparent text-slate-700 cursor-not-allowed"
                      }`}
                    >
                      Submit Answer
                    </button>
                  )}

                  {state.quizSubmitted && !state.quizCorrect && (
                    <button
                      type="button"
                      onClick={handleQuizRetry}
                      className="flex items-center gap-2 px-5 py-2 rounded border border-red-500/30 bg-red-500/10 font-mono text-xs font-bold text-red-400 uppercase tracking-wider hover:bg-red-500/20 transition-colors"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Re-Attempt Required
                    </button>
                  )}

                  {state.quizSubmitted && state.quizCorrect && (
                    <button
                      type="button"
                      onClick={handleContinue}
                      className="flex items-center gap-2 px-5 py-2 rounded border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      {isLastModule ? "Proceed to Attestation" : "Unlock Next Module"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ────────── ATTESTATION VIEW ────────── */}
            {state.step === "attestation" && (
              <div className="space-y-5">
                <div className="border-2 border-amber-500/30 rounded bg-amber-500/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Fingerprint className="h-5 w-5 text-amber-400" />
                    <h2 className="text-base font-bold text-white">
                      Digital Attestation — Binding Legal Declaration
                    </h2>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    By typing your full legal name below, you attest under penalty of federal law that you have completed all four modules of the AurumShield AML/BSA Training Program, that you understand the obligations imposed by 31 CFR Part 1027, and that you acknowledge the criminal penalties for willful non-compliance including fines up to $500,000 and imprisonment of up to 10 years per violation.
                  </p>

                  <div className="border border-slate-700 rounded bg-black/40 p-4 space-y-4">
                    <div>
                      <label className="block font-mono text-[9px] text-slate-500 uppercase tracking-[0.15em] mb-1.5">
                        Full Legal Name (as it appears on government-issued ID)
                      </label>
                      <input
                        type="text"
                        value={state.attestationName}
                        onChange={(e) => setState((s) => ({ ...s, attestationName: e.target.value }))}
                        placeholder="e.g. James A. Kelly"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-sm text-white placeholder:text-slate-700 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
                          Certification Authority: AurumShield Compliance Division
                        </p>
                        <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
                          Standard: FinCEN 31 CFR § 1027 — Annual AML Certification
                        </p>
                        <p className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
                          Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issue Certificate */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleIssueCertificate}
                    disabled={state.attestationName.trim().length < 3}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded border font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                      state.attestationName.trim().length >= 3
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                        : "border-slate-800 bg-transparent text-slate-700 cursor-not-allowed"
                    }`}
                  >
                    <Fingerprint className="h-4 w-4" />
                    Issue Cryptographic Certificate
                  </button>
                </div>
              </div>
            )}

            {/* ────────── COMPLETE VIEW ────────── */}
            {state.step === "complete" && state.certificateId && (
              <div className="flex flex-col items-center justify-center py-12">
                {/* Giant compliance badge */}
                <div className="w-40 h-40 rounded-full border-4 border-emerald-500 bg-emerald-500/10 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                  <CheckCircle2 className="h-20 w-20 text-emerald-400" />
                </div>

                <h2 className="text-2xl font-bold text-emerald-400 tracking-wider uppercase mb-2">
                  Compliant
                </h2>
                <p className="font-mono text-sm text-slate-400 mb-6">
                  AML/BSA Training Certification Successfully Issued
                </p>

                {/* Certificate details */}
                <div className="border border-emerald-500/30 bg-emerald-500/5 rounded w-full max-w-lg p-5 space-y-3 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Certificate ID</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">{state.certificateId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Holder</span>
                    <span className="font-mono text-sm text-white">{state.attestationName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Issued</span>
                    <span className="font-mono text-xs text-slate-400">{new Date().toISOString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Standard</span>
                    <span className="font-mono text-xs text-slate-400">FinCEN 31 CFR § 1027</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Valid Until</span>
                    <span className="font-mono text-xs text-amber-400">
                      {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">Audit Event</span>
                    <span className="font-mono text-xs text-emerald-400">CLEARING_CERTIFICATE_ISSUED ✓</span>
                  </div>
                </div>

                {/* Return button */}
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-6 py-2.5 rounded border border-blue-500/30 bg-blue-500/10 font-mono text-xs font-bold text-blue-400 uppercase tracking-wider hover:bg-blue-500/20 transition-colors"
                >
                  Return to Command Center
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
