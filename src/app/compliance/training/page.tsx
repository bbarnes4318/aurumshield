"use client";

/* ================================================================
   AML TRAINING TERMINAL — FinCEN 31 CFR § 1027 Compliance
   ================================================================
   Route: /compliance/training

   Interactive 4-module curriculum with hard-stop knowledge checks
   and cryptographic attestation. Zero-scroll. Prime Brokerage
   dark-mode SCADA aesthetic.

   Modules:
     1. Part 1027 & Form 8300 (No Quiz — foundational reading)
     2. Supply Chain Due Diligence (Quiz)
     3. Physical Metal Typologies (Quiz)
     4. SARs & Tipping Off (Quiz)
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
  /* ── Module 1: Part 1027 & Form 8300 ── */
  {
    id: 1,
    title: "Part 1027 & Form 8300",
    shortTitle: "Part 1027",
    icon: "§",
    content: {
      heading: "31 CFR Part 1027 — Precious Metals Dealer Obligations",
      paragraphs: [
        "FinCEN's 2005 Final Rule (31 CFR Part 1027) designates dealers in precious metals, precious stones, or jewels (PMSJs) as 'financial institutions' under the Bank Secrecy Act. AurumShield, as a clearing and settlement platform for physical LBMA-grade gold, is classified as a PMSJ and is subject to the full regulatory weight of Part 1027 — including mandatory AML program requirements (§ 1027.210), SAR filing obligations (§ 1027.320), and recordkeeping provisions.",
        "IRS/FinCEN Form 8300 ('Report of Cash Payments Over $10,000 Received in a Trade or Business') must be filed within 15 days whenever a dealer receives more than $10,000 in cash or cash equivalents in a single transaction — or in two or more related transactions within a 24-hour period. 'Cash equivalents' explicitly includes cashier's checks, bank drafts, traveler's checks, and money orders with a face value of $10,000 or less. A wire transfer is NOT a cash equivalent. A cashier's check for $9,500 combined with $1,500 in currency triggers Form 8300.",
        "AurumShield personnel must understand that Form 8300 filing is NOT discretionary. Failure to file carries civil penalties of $25,000 per violation (minimum), and willful failure to file is a federal felony under 26 U.S.C. § 7206 carrying up to 5 years imprisonment and a $250,000 fine. Structuring — breaking transactions into amounts below $10,000 to evade reporting — is separately criminalized under 31 U.S.C. § 5324 regardless of whether the underlying funds are legitimate.",
      ],
      keyPoints: [
        { label: "PMSJ Threshold", detail: "Part 1027 applies to any dealer who has purchased or sold more than $50,000 in precious metals, precious stones, or jewels during the prior calendar year" },
        { label: "Cash Equivalents", detail: "Cashier's checks, bank drafts, traveler's checks, and money orders with face values of $10,000 or less — these count as 'cash' for Form 8300 purposes" },
        { label: "15-Day Filing Window", detail: "Form 8300 must be filed with both FinCEN and the IRS within 15 calendar days of the cash receipt. A copy must also be provided to the payor by January 31 of the following year" },
        { label: "Aggregation Rule", detail: "Multiple cash payments from the same buyer (or agent) that the dealer knows — or has reason to know — are related must be aggregated. Two $6,000 cash payments on consecutive days from the same customer = one $12,000 reportable event" },
      ],
    },
    quiz: null,
  },

  /* ── Module 2: Supply Chain Due Diligence ── */
  {
    id: 2,
    title: "Supply Chain Due Diligence",
    shortTitle: "Supply Chain DD",
    icon: "▲",
    content: {
      heading: "Verifying Source, Chain of Custody & Assay Integrity",
      paragraphs: [
        "Every physical gold bar that enters AurumShield's clearing ledger must be traceable to a legitimate source. The LBMA Good Delivery List establishes the global standard for acceptable refineries — only bars produced by an LBMA-accredited refinery, accompanied by a valid Assay Certificate confirming fineness (minimum 995.0 parts per thousand for gold), are eligible for settlement. AurumShield operators must verify the refinery hallmark, serial number, and assay documentation for every bar before it enters the vault or custody chain.",
        "Chain of Custody (CoC) documentation traces every transfer of physical metal from mine or refinery to the dealer. Gaps in the CoC are a critical red flag: they may indicate the metal was diverted, stolen, or laundered through informal channels. AurumShield requires unbroken CoC documentation for all inbound metal, including transport manifests, vault transfer receipts, and handover signatures at each node.",
        "Conflict gold and sanctioned-origin metal pose severe legal exposure. Under Executive Orders 13661, 13662, and 14024, dealing in Russian-origin gold refined after March 2022 is prohibited. The LBMA's Responsible Gold Guidance (based on OECD Due Diligence frameworks) requires dealers to conduct reasonable-grounds inquiry into whether metal originates from conflict-affected or high-risk areas (CAHRA) — including artisanal mining regions in DRC, Sudan, and Venezuela. Accepting metal without this diligence exposes AurumShield to OFAC sanctions liability, IEEPA penalties (up to $1M per violation and 20 years imprisonment), and reputational destruction.",
      ],
      keyPoints: [
        { label: "LBMA Good Delivery", detail: "Only bars from LBMA-accredited refineries are acceptable. The refinery hallmark, bar serial number, assay fineness, and weight must match the accompanying certificate" },
        { label: "Assay Certificate", detail: "Independent laboratory confirmation of gold purity (fineness). A missing, altered, or unverifiable assay certificate is grounds for immediate rejection of the bar" },
        { label: "Russian-Origin Gold Ban", detail: "Per OFAC/Executive Order 14024 and UK SI 2022/850, Russian-origin gold refined on or after March 7, 2022 is sanctioned. Accepting it is a federal crime" },
        { label: "OECD 5-Step Framework", detail: "(1) Establish strong management systems, (2) Identify/assess supply chain risks, (3) Design mitigation strategy, (4) Carry out independent third-party audit, (5) Report on supply chain due diligence" },
      ],
    },
    quiz: {
      question: "A new supplier offers AurumShield 20 kilobars of gold at 3% below spot price. The bars carry hallmarks from a refinery that was removed from the LBMA Good Delivery List in 2023. The supplier provides assay certificates, but they are photocopies with no original refinery seal. The supplier states the metal was 'sourced from a private Swiss vault' and cannot provide chain of custody documentation. What is the correct course of action?",
      options: [
        {
          id: "a",
          text: "Accept the metal — the below-spot pricing represents a legitimate arbitrage opportunity and assay certificates are provided",
          correct: false,
          explanation: "INCORRECT. Below-spot pricing on physical metal is itself a red flag for stolen or laundered gold. Combined with a delisted refinery hallmark, photocopied assay certificates (not originals), and no chain of custody documentation, this transaction presents at least four concurrent red flags. Proceeding would violate AurumShield's AML program and potentially implicate the platform in receiving stolen property or laundering proceeds.",
        },
        {
          id: "b",
          text: "Reject the metal outright — a delisted refinery hallmark disqualifies the bars from AurumShield's clearing ledger. Document the refusal, retain all supplier communications, and escalate to the Compliance Officer for potential SAR filing",
          correct: true,
          explanation: "CORRECT. A refinery removed from the LBMA Good Delivery List cannot produce bars eligible for AurumShield settlement. Photocopied assay certificates without original seals are unverifiable and worthless. The absence of chain of custody creates an unacceptable provenance gap. The combination of these facts — plus below-spot pricing — meets the SAR-filing threshold. You must: (1) Reject the metal, (2) Document everything, (3) Escalate immediately, and (4) File a SAR within 30 days if the Compliance Officer concurs.",
        },
        {
          id: "c",
          text: "Request that the supplier provide original assay certificates and chain of custody documents before making a decision",
          correct: false,
          explanation: "INCORRECT. While requesting documentation seems reasonable, the delisted refinery hallmark alone is disqualifying. No amount of supplementary paperwork can rehabilitate bars from a non-LBMA-accredited source for settlement through AurumShield. Additionally, continuing to negotiate with the supplier before escalating to compliance delays the potential SAR-filing clock.",
        },
        {
          id: "d",
          text: "Accept the metal conditionally — have it independently re-assayed at an LBMA-accredited refinery before entering it into the clearing ledger",
          correct: false,
          explanation: "INCORRECT. Re-assaying confirms purity, not provenance. Even if the gold tests at 999.9 fineness, the origin remains unknown, the chain of custody is broken, and the refinery is delisted. Re-assaying does not cure the AML risk — it only confirms that the metal is real gold. The compliance concern is where the gold came from, not what it is made of.",
        },
      ],
    },
  },

  /* ── Module 3: Physical Metal Typologies ── */
  {
    id: 3,
    title: "Physical Metal Typologies",
    shortTitle: "TBML Red Flags",
    icon: "⚑",
    content: {
      heading: "Trade-Based Money Laundering Using Physical Gold",
      paragraphs: [
        "Trade-Based Money Laundering (TBML) through precious metals is a $2 trillion annual global threat identified by the Financial Action Task Force (FATF). Gold's intrinsic value, global liquidity, and ability to be melted and re-assayed make it a preferred vehicle for value transfer by organized crime, sanctions evaders, and terrorist financiers. AurumShield operators must recognize the specific TBML typologies that exploit physical metal.",
        "Altered hallmarks are a critical indicator of laundered metal. Legitimate LBMA bars carry laser-engraved refinery marks, unique serial numbers, and weight/fineness stamps that are virtually impossible to replicate. Bars with hand-stamped, re-engraved, or partially obscured hallmarks may have been re-cast from illicit sources. Similarly, transactions involving unrefined scrap gold or Doré (semi-pure alloy direct from mining) that deviate from standard LBMA 400oz or kilobar formats are high-risk — scrap and Doré are the primary entry points for conflict mineral and artisanal-mined gold into the legitimate supply chain.",
        "Behavioral typologies are equally important. Customers who show no interest in storage fees, insurance costs, or purity verification are potential red flags — legitimate gold investors care deeply about these economics. Other indicators include: buyers who request immediate physical delivery to a third-party address (potential 'drop' location), customers who purchase gold and immediately request it be re-smelted or re-refined (destroying provenance), and buyers who pay significant premiums above spot without negotiation (suggesting the transaction's purpose is value transfer, not investment).",
      ],
      keyPoints: [
        { label: "Altered Hallmarks", detail: "Hand-stamped, re-engraved, partially polished, or mismatched serial numbers on bars. Any discrepancy between the physical hallmark and the assay certificate is grounds for rejection and escalation" },
        { label: "Scrap / Doré Deviation", detail: "Transactions involving unrefined scrap, Doré bars, or non-standard formats (e.g., irregular weight, non-LBMA dimensions) that bypass standard refinery provenance channels" },
        { label: "Indifference to Economics", detail: "Customer does not negotiate price, shows no concern for storage fees or insurance, waives purity testing, or pays significant premiums over spot — the transaction may be about value transfer, not investment" },
        { label: "Rapid Buy-Refine Cycle", detail: "Customer purchases refined gold and immediately requests re-smelting or re-assay at a different refinery — a classic technique to launder provenance by creating new documentation under the second refinery's name" },
      ],
    },
    quiz: {
      question: "A customer purchases 10 LBMA kilobars from AurumShield, settles via wire transfer at full spot price with no negotiation, and immediately requests that all 10 bars be sent to a non-LBMA refinery in Dubai for 're-assay and re-casting into smaller denominations.' The customer has no prior purchase history with AurumShield and lists their occupation as 'import/export consultant.' What is the correct assessment?",
      options: [
        {
          id: "a",
          text: "Legitimate request — customers frequently re-cast bars into smaller denominations for resale in regional markets",
          correct: false,
          explanation: "INCORRECT. While re-casting occurs in legitimate commerce, this scenario presents multiple concurrent red flags: (1) No prior purchase history (new, unestablished relationship), (2) No price negotiation on a ~$800K purchase (indifference to economics), (3) Immediate re-casting request at a non-LBMA refinery (provenance destruction), (4) Vague occupational profile ('import/export consultant'). The purpose of this transaction is almost certainly to launder the provenance of gold — creating new documentation under the Dubai refinery's name to obscure the bars' origin.",
        },
        {
          id: "b",
          text: "Escalate immediately to the Compliance Officer — this is a textbook rapid buy-refine provenance laundering typology requiring SAR evaluation",
          correct: true,
          explanation: "CORRECT. This matches the FATF-identified 'rapid buy-refine cycle' typology precisely. The customer is purchasing gold with a clean LBMA provenance and immediately destroying that provenance by re-casting at a non-accredited facility. The new refinery would issue fresh documentation, effectively laundering the gold's history. Combined with no prior relationship, no negotiation, and a vague occupational profile, this meets the SAR-filing threshold. Escalate to Compliance, document all communications, and do NOT process the re-casting shipment until the investigation concludes.",
        },
        {
          id: "c",
          text: "Process the purchase but decline the re-casting request — AurumShield only deals with LBMA-accredited refineries",
          correct: false,
          explanation: "INCORRECT. Declining the re-casting request addresses only one symptom while ignoring the underlying compliance obligation. The totality of the red flags — new customer, no negotiation, immediate re-casting, vague profile — requires a SAR evaluation regardless of whether you process the re-casting. The purchase itself may be suspicious. Simply declining one request without escalating to Compliance is a regulatory failure.",
        },
        {
          id: "d",
          text: "Request additional documentation — ask the customer to explain the business rationale for re-casting and provide proof of downstream buyers",
          correct: false,
          explanation: "INCORRECT. While gathering additional information is generally appropriate, the number and severity of concurrent red flags in this scenario require immediate compliance escalation — not further customer engagement. Asking the customer to explain themselves risks 'tipping off' (if a SAR is later warranted) and delays the 30-day SAR-filing clock. Escalate first, investigate through compliance channels, then determine next steps.",
        },
      ],
    },
  },

  /* ── Module 4: SARs & Tipping Off ── */
  {
    id: 4,
    title: "SARs & Tipping Off",
    shortTitle: "SAR Filing",
    icon: "◉",
    content: {
      heading: "Suspicious Activity Reporting for Physical Metal Transactions",
      paragraphs: [
        "Under 31 CFR § 1027.320, AurumShield must file a Suspicious Activity Report (SAR) with FinCEN within 30 calendar days of the initial detection of facts constituting a known or suspected violation of law, or a transaction designed to evade BSA reporting requirements — if the transaction involves or aggregates to at least $5,000. For precious metals dealers, this threshold is notably lower than for banks ($5,000 vs. $5,000 for PMSJs is the same, but the 'aggregation' rules mean even small structured purchases can trigger filing). If no suspect is identified at the time of detection, the filing deadline extends to 60 days.",
        "The 'tipping off' prohibition (31 U.S.C. § 5318(g)(2)) is absolute and applies to every AurumShield employee, contractor, and registered broker. It is a federal crime to disclose — directly or indirectly — that a SAR has been filed, is being filed, or will be filed. This prohibition extends to confirming, denying, or even implying the existence of a SAR. It applies to communications with the subject of the SAR, the subject's attorney, law enforcement (unless pursuant to formal subpoena or request), and any third party. Violation carries penalties of up to $250,000 and/or 5 years imprisonment.",
        "SAR narratives for physical metal transactions must include the specific TBML typology observed (e.g., altered hallmarks, broken CoC, rapid buy-refine cycle, structuring), the exact weight, fineness, and refinery of the metal involved, all counterparty identification data, and a clear timeline of events. Vague narratives like 'suspicious gold transaction' are deficient. FinCEN's BSA Enforcement Division reviews narrative quality and will issue findings against institutions that file boilerplate SARs.",
      ],
      keyPoints: [
        { label: "30-Day Filing Deadline", detail: "Clock starts on the date suspicious activity is first detected by any employee — not when the Compliance Officer is notified. Late detection does not excuse late filing" },
        { label: "Tipping Off = Federal Crime", detail: "You CANNOT tell the customer, their attorney, their broker, or any third party that a SAR has been or will be filed. You cannot confirm, deny, or imply. Period. No exceptions." },
        { label: "Safe Harbor (31 U.S.C. § 5318(g)(3))", detail: "Good-faith SAR filing provides complete civil liability protection. You cannot be sued for filing a SAR — even if the activity turns out to be legitimate" },
        { label: "5-Year Retention", detail: "All SARs, supporting documentation, and the Compliance Officer's investigation notes must be retained for 5 years from the date of filing. AurumShield's audit vault logs all SAR-related actions immutably" },
      ],
    },
    quiz: {
      question: "Three weeks ago, AurumShield's Compliance Officer filed a SAR on a customer who purchased 5 LBMA kilobars using three separate cashier's checks ($9,500 each) on the same day — suspected structuring to evade Form 8300. Today, the customer calls you directly and says: 'My bank told me you filed some kind of government report about my gold purchase. I want to know exactly what was reported.' What is your legal obligation?",
      options: [
        {
          id: "a",
          text: "Confirm the SAR was filed — the customer already knows about it from their bank, so the information is no longer confidential",
          correct: false,
          explanation: "INCORRECT. The tipping-off prohibition (31 U.S.C. § 5318(g)(2)) applies regardless of what the customer claims to already know. Even if the customer's bank independently disclosed information (which would itself be a violation by the bank), AurumShield's obligation to neither confirm nor deny remains absolute. The customer's statement may also be a 'social engineering' tactic to extract confirmation. Any confirmation by you is a federal crime.",
        },
        {
          id: "b",
          text: "Deny that any report was filed — tell the customer their bank must be mistaken",
          correct: false,
          explanation: "INCORRECT. Affirmatively denying a SAR's existence is also a prohibited disclosure under the tipping-off statute. Any statement — positive or negative — that allows the subject to infer the existence or non-existence of a SAR violates 31 U.S.C. § 5318(g)(2). Denial is as illegal as confirmation.",
        },
        {
          id: "c",
          text: "Neither confirm nor deny — state that AurumShield policy does not permit discussion of internal compliance processes, then immediately document the call and notify the Compliance Officer",
          correct: true,
          explanation: "CORRECT. The only legally compliant response is: 'AurumShield policy does not permit discussion of internal compliance processes.' Do not elaborate, explain, or make any statement that could be interpreted as confirmation or denial. Immediately after the call: (1) Document the date, time, caller identity, and exact words used, (2) Notify the Compliance Officer, (3) The Compliance Officer should evaluate whether the customer's inquiry — and the claim that their bank disclosed SAR information — warrants a SAR amendment or a new SAR filing against the bank.",
        },
        {
          id: "d",
          text: "Transfer the call to the Compliance Officer — they are the only person authorized to discuss SAR filings",
          correct: false,
          explanation: "INCORRECT. No person at AurumShield — including the Compliance Officer — is authorized to discuss SAR filings with the subject of the SAR. The Compliance Officer is equally bound by the tipping-off prohibition. Transferring the call implies that disclosure is permissible at a higher authorization level, which is categorically false under federal law.",
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
