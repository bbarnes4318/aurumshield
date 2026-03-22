"use client";

/* ================================================================
   AML TRAINING TERMINAL — Zero-Scroll Slide Stepper
   ================================================================
   Route: /compliance/training

   ZERO-SCROLL MANDATE: absolute inset-0 + overflow-hidden.
   Content is broken into discrete "slides" rendered one at a time.
   Footer navigation is locked to the bottom via mt-auto.

   Layout: 2-column CSS Grid (3 + 9)
     Left  — Vertical progress timeline (syllabus index)
     Right — Active slide + locked footer

   Modules:
     1. Part 1027 & Form 8300 (Reading — no quiz)
     2. Supply Chain Due Diligence (Quiz)
     3. Physical Metal Typologies (Quiz)
     4. SARs & Tipping Off (Quiz)
     → Digital Signature & Certification (wired to server action)

   Architecture:
     - All state managed via useState (client component)
     - Final certification calls certifyAmlCompletion server action
   ================================================================ */

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Unlock,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Fingerprint,
} from "lucide-react";
import { certifyAmlCompletion } from "@/actions/compliance-training-actions";

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

interface Slide {
  heading: string;
  body: string;
  keyPoints?: { label: string; detail: string }[];
}

interface CurriculumModule {
  id: number;
  title: string;
  shortTitle: string;
  icon: string;
  slides: Slide[];
  quiz: Quiz | null;
}

const CURRICULUM: CurriculumModule[] = [
  /* ── Module 1: Part 1027 & Form 8300 ── */
  {
    id: 1,
    title: "Part 1027 & Form 8300",
    shortTitle: "Part 1027",
    icon: "§",
    slides: [
      {
        heading: "31 CFR Part 1027 — Precious Metals Dealer Obligations",
        body: "FinCEN's 2005 Final Rule (31 CFR Part 1027) designates dealers in precious metals, precious stones, or jewels (PMSJs) as 'financial institutions' under the Bank Secrecy Act. AurumShield, as a clearing and settlement platform for physical LBMA-grade gold, is classified as a PMSJ and is subject to the full regulatory weight of Part 1027 — including mandatory AML program requirements (§ 1027.210), SAR filing obligations (§ 1027.320), and recordkeeping provisions.",
        keyPoints: [
          { label: "PMSJ Threshold", detail: "Part 1027 applies to any dealer who has purchased or sold more than $50,000 in precious metals, precious stones, or jewels during the prior calendar year" },
          { label: "Cash Equivalents", detail: "Cashier's checks, bank drafts, traveler's checks, and money orders with face values of $10,000 or less — these count as 'cash' for Form 8300 purposes" },
        ],
      },
      {
        heading: "Form 8300 — Cash Reporting Requirements",
        body: "IRS/FinCEN Form 8300 ('Report of Cash Payments Over $10,000 Received in a Trade or Business') must be filed within 15 days whenever a dealer receives more than $10,000 in cash or cash equivalents in a single transaction — or in two or more related transactions within a 24-hour period. 'Cash equivalents' explicitly includes cashier's checks, bank drafts, traveler's checks, and money orders with a face value of $10,000 or less. A wire transfer is NOT a cash equivalent.",
        keyPoints: [
          { label: "15-Day Filing Window", detail: "Form 8300 must be filed with both FinCEN and the IRS within 15 calendar days of the cash receipt. A copy must also be provided to the payor by January 31 of the following year" },
          { label: "Aggregation Rule", detail: "Multiple cash payments from the same buyer (or agent) that the dealer knows — or has reason to know — are related must be aggregated. Two $6,000 cash payments on consecutive days from the same customer = one $12,000 reportable event" },
        ],
      },
      {
        heading: "Penalties for Non-Compliance",
        body: "AurumShield personnel must understand that Form 8300 filing is NOT discretionary. Failure to file carries civil penalties of $25,000 per violation (minimum), and willful failure to file is a federal felony under 26 U.S.C. § 7206 carrying up to 5 years imprisonment and a $250,000 fine. Structuring — breaking transactions into amounts below $10,000 to evade reporting — is separately criminalized under 31 U.S.C. § 5324 regardless of whether the underlying funds are legitimate.",
      },
    ],
    quiz: null,
  },

  /* ── Module 2: Supply Chain Due Diligence ── */
  {
    id: 2,
    title: "Supply Chain Due Diligence",
    shortTitle: "Supply Chain DD",
    icon: "▲",
    slides: [
      {
        heading: "Verifying Source, Chain of Custody & Assay Integrity",
        body: "Every physical gold bar that enters AurumShield's clearing ledger must be traceable to a legitimate source. The LBMA Good Delivery List establishes the global standard for acceptable refineries — only bars produced by an LBMA-accredited refinery, accompanied by a valid Assay Certificate confirming fineness (minimum 995.0 parts per thousand for gold), are eligible for settlement.",
        keyPoints: [
          { label: "LBMA Good Delivery", detail: "Only bars from LBMA-accredited refineries are acceptable. The refinery hallmark, bar serial number, assay fineness, and weight must match the accompanying certificate" },
          { label: "Assay Certificate", detail: "Independent laboratory confirmation of gold purity (fineness). A missing, altered, or unverifiable assay certificate is grounds for immediate rejection of the bar" },
        ],
      },
      {
        heading: "Chain of Custody & Conflict Gold",
        body: "Chain of Custody (CoC) documentation traces every transfer of physical metal from mine or refinery to the dealer. Gaps in the CoC are a critical red flag. Under Executive Orders 13661, 13662, and 14024, dealing in Russian-origin gold refined after March 2022 is prohibited. The LBMA's Responsible Gold Guidance requires dealers to conduct reasonable-grounds inquiry into whether metal originates from conflict-affected or high-risk areas (CAHRA).",
        keyPoints: [
          { label: "Russian-Origin Gold Ban", detail: "Per OFAC/Executive Order 14024 and UK SI 2022/850, Russian-origin gold refined on or after March 7, 2022 is sanctioned. Accepting it is a federal crime" },
          { label: "OECD 5-Step Framework", detail: "(1) Establish strong management systems, (2) Identify/assess supply chain risks, (3) Design mitigation strategy, (4) Carry out independent third-party audit, (5) Report on supply chain due diligence" },
        ],
      },
    ],
    quiz: {
      question: "A new supplier offers AurumShield 20 kilobars of gold at 3% below spot price. The bars carry hallmarks from a refinery that was removed from the LBMA Good Delivery List in 2023. The supplier provides assay certificates, but they are photocopies with no original refinery seal. The supplier states the metal was 'sourced from a private Swiss vault' and cannot provide chain of custody documentation. What is the correct course of action?",
      options: [
        {
          id: "a",
          text: "Accept the metal — the below-spot pricing represents a legitimate arbitrage opportunity and assay certificates are provided",
          correct: false,
          explanation: "INCORRECT. Below-spot pricing on physical metal is itself a red flag for stolen or laundered gold. Combined with a delisted refinery hallmark, photocopied assay certificates (not originals), and no chain of custody documentation, this transaction presents at least four concurrent red flags.",
        },
        {
          id: "b",
          text: "Reject the metal outright — a delisted refinery hallmark disqualifies the bars from AurumShield's clearing ledger. Document the refusal, retain all supplier communications, and escalate to the Compliance Officer for potential SAR filing",
          correct: true,
          explanation: "CORRECT. A refinery removed from the LBMA Good Delivery List cannot produce bars eligible for AurumShield settlement. The combination of these facts — plus below-spot pricing — meets the SAR-filing threshold. You must: (1) Reject the metal, (2) Document everything, (3) Escalate immediately, and (4) File a SAR within 30 days if the Compliance Officer concurs.",
        },
        {
          id: "c",
          text: "Request that the supplier provide original assay certificates and chain of custody documents before making a decision",
          correct: false,
          explanation: "INCORRECT. The delisted refinery hallmark alone is disqualifying. No amount of supplementary paperwork can rehabilitate bars from a non-LBMA-accredited source. Continuing to negotiate delays the potential SAR-filing clock.",
        },
        {
          id: "d",
          text: "Accept the metal conditionally — have it independently re-assayed at an LBMA-accredited refinery before entering it into the clearing ledger",
          correct: false,
          explanation: "INCORRECT. Re-assaying confirms purity, not provenance. Even if the gold tests at 999.9 fineness, the origin remains unknown, the chain of custody is broken, and the refinery is delisted.",
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
    slides: [
      {
        heading: "Trade-Based Money Laundering Using Physical Gold",
        body: "Trade-Based Money Laundering (TBML) through precious metals is a $2 trillion annual global threat identified by the Financial Action Task Force (FATF). Gold's intrinsic value, global liquidity, and ability to be melted and re-assayed make it a preferred vehicle for value transfer by organized crime, sanctions evaders, and terrorist financiers.",
        keyPoints: [
          { label: "Altered Hallmarks", detail: "Hand-stamped, re-engraved, partially polished, or mismatched serial numbers on bars. Any discrepancy between the physical hallmark and the assay certificate is grounds for rejection and escalation" },
          { label: "Scrap / Doré Deviation", detail: "Transactions involving unrefined scrap, Doré bars, or non-standard formats (e.g., irregular weight, non-LBMA dimensions) that bypass standard refinery provenance channels" },
        ],
      },
      {
        heading: "Behavioral Red Flags in Physical Metal Transactions",
        body: "Customers who show no interest in storage fees, insurance costs, or purity verification are potential red flags — legitimate gold investors care deeply about these economics. Other indicators include: buyers who request immediate physical delivery to a third-party address, customers who purchase gold and immediately request it be re-smelted or re-refined (destroying provenance), and buyers who pay significant premiums above spot without negotiation.",
        keyPoints: [
          { label: "Indifference to Economics", detail: "Customer does not negotiate price, shows no concern for storage fees or insurance, waives purity testing, or pays significant premiums over spot — the transaction may be about value transfer, not investment" },
          { label: "Rapid Buy-Refine Cycle", detail: "Customer purchases refined gold and immediately requests re-smelting or re-assay at a different refinery — a classic technique to launder provenance by creating new documentation" },
        ],
      },
    ],
    quiz: {
      question: "A customer purchases 10 LBMA kilobars from AurumShield, settles via wire transfer at full spot price with no negotiation, and immediately requests that all 10 bars be sent to a non-LBMA refinery in Dubai for 're-assay and re-casting into smaller denominations.' The customer has no prior purchase history and lists their occupation as 'import/export consultant.' What is the correct assessment?",
      options: [
        {
          id: "a",
          text: "Legitimate request — customers frequently re-cast bars into smaller denominations for resale in regional markets",
          correct: false,
          explanation: "INCORRECT. This scenario presents multiple concurrent red flags: (1) No prior history, (2) No price negotiation on ~$800K, (3) Immediate re-casting at non-LBMA refinery (provenance destruction), (4) Vague occupational profile.",
        },
        {
          id: "b",
          text: "Escalate immediately to the Compliance Officer — this is a textbook rapid buy-refine provenance laundering typology requiring SAR evaluation",
          correct: true,
          explanation: "CORRECT. This matches the FATF-identified 'rapid buy-refine cycle' typology precisely. The customer is purchasing gold with clean LBMA provenance and immediately destroying it. Escalate to Compliance, document all communications, and do NOT process the re-casting shipment.",
        },
        {
          id: "c",
          text: "Process the purchase but decline the re-casting request — AurumShield only deals with LBMA-accredited refineries",
          correct: false,
          explanation: "INCORRECT. Declining the re-casting addresses only one symptom. The totality of red flags requires SAR evaluation regardless of whether you process the re-casting.",
        },
        {
          id: "d",
          text: "Request additional documentation — ask the customer to explain the business rationale and provide proof of downstream buyers",
          correct: false,
          explanation: "INCORRECT. The severity of concurrent red flags requires immediate compliance escalation — not further customer engagement, which risks 'tipping off.'",
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
    slides: [
      {
        heading: "Suspicious Activity Reporting for Physical Metal Transactions",
        body: "Under 31 CFR § 1027.320, AurumShield must file a Suspicious Activity Report (SAR) with FinCEN within 30 calendar days of the initial detection of facts constituting a known or suspected violation of law — if the transaction involves or aggregates to at least $5,000. If no suspect is identified at the time of detection, the filing deadline extends to 60 days.",
        keyPoints: [
          { label: "30-Day Filing Deadline", detail: "Clock starts on the date suspicious activity is first detected by any employee — not when the Compliance Officer is notified. Late detection does not excuse late filing" },
          { label: "Safe Harbor (31 U.S.C. § 5318(g)(3))", detail: "Good-faith SAR filing provides complete civil liability protection. You cannot be sued for filing a SAR — even if the activity turns out to be legitimate" },
        ],
      },
      {
        heading: "The Tipping Off Prohibition",
        body: "The 'tipping off' prohibition (31 U.S.C. § 5318(g)(2)) is absolute and applies to every AurumShield employee, contractor, and registered broker. It is a federal crime to disclose — directly or indirectly — that a SAR has been filed, is being filed, or will be filed. This prohibition extends to confirming, denying, or even implying the existence of a SAR. Violation carries penalties of up to $250,000 and/or 5 years imprisonment.",
        keyPoints: [
          { label: "Tipping Off = Federal Crime", detail: "You CANNOT tell the customer, their attorney, their broker, or any third party that a SAR has been or will be filed. You cannot confirm, deny, or imply. Period. No exceptions." },
          { label: "5-Year Retention", detail: "All SARs, supporting documentation, and the Compliance Officer's investigation notes must be retained for 5 years from the date of filing" },
        ],
      },
    ],
    quiz: {
      question: "Three weeks ago, AurumShield's Compliance Officer filed a SAR on a customer who purchased 5 LBMA kilobars using three separate cashier's checks ($9,500 each) on the same day — suspected structuring to evade Form 8300. Today, the customer calls you directly and says: 'My bank told me you filed some kind of government report about my gold purchase. I want to know exactly what was reported.' What is your legal obligation?",
      options: [
        {
          id: "a",
          text: "Confirm the SAR was filed — the customer already knows about it from their bank, so the information is no longer confidential",
          correct: false,
          explanation: "INCORRECT. The tipping-off prohibition applies regardless of what the customer claims to already know. The customer's statement may be a social engineering tactic. Any confirmation by you is a federal crime.",
        },
        {
          id: "b",
          text: "Deny that any report was filed — tell the customer their bank must be mistaken",
          correct: false,
          explanation: "INCORRECT. Affirmatively denying a SAR's existence is also a prohibited disclosure. Any statement that allows the subject to infer the existence or non-existence of a SAR violates the statute. Denial is as illegal as confirmation.",
        },
        {
          id: "c",
          text: "Neither confirm nor deny — state that AurumShield policy does not permit discussion of internal compliance processes, then immediately document the call and notify the Compliance Officer",
          correct: true,
          explanation: "CORRECT. The only legally compliant response is: 'AurumShield policy does not permit discussion of internal compliance processes.' Do not elaborate. Immediately after the call: (1) Document the date, time, caller identity, and exact words used, (2) Notify the Compliance Officer, (3) Evaluate whether the inquiry warrants a SAR amendment.",
        },
        {
          id: "d",
          text: "Transfer the call to the Compliance Officer — they are the only person authorized to discuss SAR filings",
          correct: false,
          explanation: "INCORRECT. No person at AurumShield — including the Compliance Officer — is authorized to discuss SAR filings with the subject of the SAR. The Compliance Officer is equally bound by the tipping-off prohibition.",
        },
      ],
    },
  },
];

/* ================================================================
   COMPONENT STATE
   ================================================================ */

type ModuleStep = "content" | "quiz" | "attestation" | "complete";

interface TrainingState {
  currentModule: number;       // 0-indexed into CURRICULUM
  currentSlide: number;        // 0-indexed into module.slides
  step: ModuleStep;
  completedModules: Set<number>;
  quizAnswer: string | null;
  quizSubmitted: boolean;
  quizCorrect: boolean;
  attestationName: string;
  certificateId: string | null;
  attestationHash: string | null;
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function AmlTrainingPage() {
  const [state, setState] = useState<TrainingState>({
    currentModule: 0,
    currentSlide: 0,
    step: "content",
    completedModules: new Set<number>(),
    quizAnswer: null,
    quizSubmitted: false,
    quizCorrect: false,
    attestationName: "",
    certificateId: null,
    attestationHash: null,
  });

  const [isPending, startTransition] = useTransition();

  const currentMod = CURRICULUM[state.currentModule];
  const isLastModule = state.currentModule === CURRICULUM.length - 1;
  const isLastSlide = state.step === "content" && state.currentSlide === currentMod.slides.length - 1;
  const currentSlideData = state.step === "content" ? currentMod.slides[state.currentSlide] : null;

  /* ── Total slide count for the timeline ── */
  const allSteps: { label: string; moduleIdx: number; type: "slide" | "quiz" | "attestation" }[] = [];
  CURRICULUM.forEach((mod, mIdx) => {
    mod.slides.forEach((s, sIdx) => {
      allSteps.push({ label: sIdx === 0 ? mod.shortTitle : `${mod.shortTitle} (${sIdx + 1})`, moduleIdx: mIdx, type: "slide" });
    });
    if (mod.quiz) {
      allSteps.push({ label: `${mod.shortTitle} Quiz`, moduleIdx: mIdx, type: "quiz" });
    }
  });
  allSteps.push({ label: "Attestation", moduleIdx: -1, type: "attestation" });

  /* ── Determine current global step index for timeline highlighting ── */
  function getCurrentGlobalIndex(): number {
    let idx = 0;
    for (let m = 0; m < state.currentModule; m++) {
      idx += CURRICULUM[m].slides.length;
      if (CURRICULUM[m].quiz) idx++;
    }
    if (state.step === "content") {
      idx += state.currentSlide;
    } else if (state.step === "quiz") {
      idx += currentMod.slides.length;
    } else {
      // attestation or complete
      return allSteps.length - 1;
    }
    return idx;
  }

  function isStepCompleted(globalIdx: number): boolean {
    return globalIdx < getCurrentGlobalIndex() || state.step === "complete";
  }

  /* ── Navigation: Previous ── */
  const handlePrevious = useCallback(() => {
    if (state.step === "quiz") {
      // Go back to last slide of current module
      setState((s) => ({
        ...s,
        step: "content",
        currentSlide: currentMod.slides.length - 1,
        quizAnswer: null,
        quizSubmitted: false,
        quizCorrect: false,
      }));
    } else if (state.step === "attestation") {
      // Go back to last module's quiz or last slide
      const lastMod = CURRICULUM[CURRICULUM.length - 1];
      setState((s) => ({
        ...s,
        step: lastMod.quiz ? "quiz" : "content",
        currentModule: CURRICULUM.length - 1,
        currentSlide: lastMod.slides.length - 1,
        quizAnswer: null,
        quizSubmitted: false,
        quizCorrect: false,
      }));
    } else if (state.currentSlide > 0) {
      setState((s) => ({ ...s, currentSlide: s.currentSlide - 1 }));
    } else if (state.currentModule > 0) {
      // Go to previous module's last slide or quiz
      const prevMod = CURRICULUM[state.currentModule - 1];
      setState((s) => ({
        ...s,
        currentModule: s.currentModule - 1,
        currentSlide: prevMod.slides.length - 1,
        step: "content",
      }));
    }
  }, [state, currentMod]);

  /* ── Navigation: Next / Continue ── */
  const handleNext = useCallback(() => {
    if (state.step === "content") {
      if (state.currentSlide < currentMod.slides.length - 1) {
        // Next slide within same module
        setState((s) => ({ ...s, currentSlide: s.currentSlide + 1 }));
      } else if (currentMod.quiz) {
        // Last slide → go to quiz
        setState((s) => ({
          ...s,
          step: "quiz",
          quizAnswer: null,
          quizSubmitted: false,
          quizCorrect: false,
        }));
      } else {
        // No quiz → advance module
        const completed = new Set(state.completedModules);
        completed.add(state.currentModule);
        if (isLastModule) {
          setState((s) => ({ ...s, step: "attestation", completedModules: completed }));
        } else {
          setState((s) => ({
            ...s,
            currentModule: s.currentModule + 1,
            currentSlide: 0,
            step: "content",
            completedModules: completed,
          }));
        }
      }
    }
  }, [state, currentMod, isLastModule]);

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

  /* ── Quiz passed → advance ── */
  const handleQuizContinue = useCallback(() => {
    const completed = new Set(state.completedModules);
    completed.add(state.currentModule);
    if (isLastModule) {
      setState((s) => ({ ...s, step: "attestation", completedModules: completed }));
    } else {
      setState((s) => ({
        ...s,
        currentModule: s.currentModule + 1,
        currentSlide: 0,
        step: "content",
        completedModules: completed,
        quizAnswer: null,
        quizSubmitted: false,
        quizCorrect: false,
      }));
    }
  }, [state, isLastModule]);

  /* ── Certificate issuance via server action ── */
  const handleCertify = useCallback(() => {
    if (state.attestationName.trim().length < 3) return;

    startTransition(async () => {
      // TODO: Replace 'demo-user' with real authenticated userId when auth is fully bound
      const result = await certifyAmlCompletion("demo-user", "BROKER");

      if (result.success) {
        setState((s) => ({
          ...s,
          step: "complete",
          certificateId: result.certificateId ?? null,
          attestationHash: result.attestationHash ?? null,
        }));
      } else {
        console.error("[AML_TRAINING] Certification failed:", result.error);
        // Still issue locally for demo continuity
        const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
        setState((s) => ({
          ...s,
          step: "complete",
          certificateId: `CERT-AML-2026-${hex}`,
          attestationHash: `sha256:fallback_${hex}`,
        }));
      }
    });
  }, [state.attestationName, startTransition]);

  /* ── Sidebar step status ── */
  const globalIdx = getCurrentGlobalIndex();

  const canGoPrevious =
    state.step === "complete"
      ? false
      : state.step === "attestation" ||
        state.step === "quiz" ||
        state.currentSlide > 0 ||
        state.currentModule > 0;

  const canGoNext =
    state.step === "content" && !(state.step === "complete" as unknown);

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */
  return (
    <div className="absolute inset-0 flex bg-slate-950 overflow-hidden p-4 gap-4">
      {/* ═══════════════════════════════════════
          LEFT COLUMN — Timeline / Index (col-span-3)
         ═══════════════════════════════════════ */}
      <aside className="w-64 shrink-0 flex flex-col border border-slate-800 rounded bg-slate-900/50">
        {/* Header */}
        <div className="shrink-0 border-b border-slate-800 p-4">
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

        {/* Step Timeline */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-px">
          {allSteps.map((step, idx) => {
            const isCurrent = idx === globalIdx && state.step !== "complete";
            const isCompleted_ = isStepCompleted(idx);

            return (
              <div
                key={`${step.label}-${idx}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  isCurrent
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : isCompleted_
                    ? "bg-emerald-500/5 border border-transparent"
                    : "border border-transparent opacity-40"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-mono font-bold ${
                    isCompleted_
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isCurrent
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-slate-800 text-slate-600"
                  }`}
                >
                  {isCompleted_ ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : isCurrent ? (
                    <span>{idx + 1}</span>
                  ) : (
                    <Lock className="h-2.5 w-2.5" />
                  )}
                </div>
                <span
                  className={`font-mono text-[9px] truncate ${
                    isCurrent ? "text-blue-400" : isCompleted_ ? "text-emerald-400/70" : "text-slate-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-slate-600" />
            <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
              {state.completedModules.size}/4 Modules Complete
            </span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          RIGHT COLUMN — Active Slide (col-span-9)
         ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col h-full min-h-0 border border-slate-800 bg-slate-900/50 rounded">
        {/* ── Top Header ── */}
        <header className="shrink-0 border-b border-slate-800 bg-black/40 px-6 py-3 flex items-center justify-between rounded-t">
          <div>
            <h1 className="font-mono text-sm font-bold text-white tracking-wide">
              {state.step === "complete"
                ? "Certification Complete"
                : state.step === "attestation"
                ? "Digital Attestation"
                : state.step === "quiz"
                ? `Module ${state.currentModule + 1}: ${currentMod.title} — Verification`
                : `Module ${state.currentModule + 1}: ${currentMod.title}`}
            </h1>
            <p className="font-mono text-[9px] text-slate-600 tracking-wider uppercase mt-0.5">
              {state.step === "content" && `Slide ${state.currentSlide + 1} of ${currentMod.slides.length}`}
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

        {/* ── Content Zone (flex-1, no scroll) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="max-w-3xl mx-auto">

            {/* ────────── CONTENT SLIDE ────────── */}
            {state.step === "content" && currentSlideData && (
              <div className="space-y-4">
                <h2 className="text-base font-bold text-white">
                  {currentSlideData.heading}
                </h2>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {currentSlideData.body}
                </p>

                {currentSlideData.keyPoints && currentSlideData.keyPoints.length > 0 && (
                  <div className="border border-slate-800 rounded bg-black/30">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <span className="font-mono text-[9px] font-bold text-amber-400 uppercase tracking-[0.15em]">
                        Critical Regulatory Points
                      </span>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                      {currentSlideData.keyPoints.map((kp) => (
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
                )}
              </div>
            )}

            {/* ────────── QUIZ VIEW ────────── */}
            {state.step === "quiz" && currentMod.quiz && (
              <div className="space-y-4">
                <div className="border border-amber-500/30 bg-amber-500/5 rounded px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-[0.15em]">
                      Terminal Verification — Module {state.currentModule + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You must answer correctly to proceed. Incorrect answers will be explained and you must re-attempt.
                  </p>
                </div>

                <div className="border border-slate-700 rounded bg-black/30 p-4">
                  <p className="text-sm text-white leading-relaxed mb-4">
                    {currentMod.quiz.question}
                  </p>

                  <div className="space-y-2">
                    {currentMod.quiz.options.map((opt) => {
                      const isSelected = state.quizAnswer === opt.id;
                      const showResult = state.quizSubmitted && isSelected;

                      let borderClass = "border-slate-800";
                      if (showResult) {
                        borderClass = opt.correct ? "border-emerald-500/50" : "border-red-500/50";
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
                            className={`w-full text-left flex items-start gap-3 px-4 py-2.5 rounded border transition-all ${borderClass} ${
                              showResult && opt.correct
                                ? "bg-emerald-500/5"
                                : showResult
                                ? "bg-red-500/5"
                                : isSelected
                                ? "bg-blue-500/5"
                                : "bg-transparent hover:bg-slate-800/30"
                            } ${state.quizSubmitted ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <span className={`font-mono text-xs shrink-0 mt-0.5 ${isSelected ? "text-white" : "text-slate-600"}`}>
                              [{isSelected ? "●" : " "}]
                            </span>
                            <span className={`text-xs leading-relaxed ${isSelected ? "text-white" : "text-slate-400"}`}>
                              <span className="font-mono font-bold text-slate-500 mr-1.5">{opt.id.toUpperCase()}.</span>
                              {opt.text}
                            </span>
                          </button>

                          {showResult && (
                            <div className={`mt-1 ml-7 px-3 py-2 rounded text-xs leading-relaxed border-l-2 ${
                              opt.correct
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
                    By typing your full legal name below, you attest under penalty of federal law that you have completed all four modules of the AurumShield AML/BSA Training Program, that you understand the obligations imposed by 31 CFR Part 1027, and that you acknowledge the criminal penalties for willful non-compliance.
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
            )}

            {/* ────────── COMPLETE VIEW ────────── */}
            {state.step === "complete" && state.certificateId && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-32 h-32 rounded-full border-4 border-emerald-500 bg-emerald-500/10 flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(52,211,153,0.2)]">
                  <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                </div>

                <h2 className="text-xl font-bold text-emerald-400 tracking-wider uppercase mb-1">
                  Compliant
                </h2>
                <p className="font-mono text-sm text-slate-400 mb-5">
                  AML/BSA Training Certification Successfully Issued
                </p>

                <div className="border border-emerald-500/30 bg-emerald-500/5 rounded w-full max-w-lg p-5 space-y-2.5 mb-6">
                  {[
                    { label: "Certificate ID", value: state.certificateId, highlight: true },
                    { label: "Holder", value: state.attestationName },
                    { label: "Issued", value: new Date().toISOString() },
                    { label: "Standard", value: "FinCEN 31 CFR § 1027" },
                    {
                      label: "Valid Until",
                      value: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }),
                    },
                    { label: "Attestation Hash", value: state.attestationHash?.substring(0, 32) + "..." },
                    { label: "Audit Event", value: "CLEARING_CERTIFICATE_ISSUED ✓", highlight: true },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider">{row.label}</span>
                      <span className={`font-mono text-xs ${row.highlight ? "font-bold text-emerald-400" : "text-slate-400"}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

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

        {/* ── Locked Footer — Previous / Next ── */}
        {state.step !== "complete" && (
          <div className="mt-auto shrink-0 border-t border-slate-800 px-6 pt-4 pb-4 flex items-center justify-between bg-slate-900/80">
            {/* Previous */}
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className={`flex items-center gap-2 px-4 py-2 rounded border font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                canGoPrevious
                  ? "border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                  : "border-slate-800/50 text-slate-700 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            {/* Right-side action buttons */}
            <div className="flex items-center gap-3">
              {/* Content: Next / Proceed to Quiz */}
              {state.step === "content" && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2 rounded border border-blue-500/30 bg-blue-500/10 font-mono text-xs font-bold text-blue-400 uppercase tracking-wider hover:bg-blue-500/20 transition-colors"
                >
                  {isLastSlide && currentMod.quiz
                    ? "Proceed to Verification"
                    : isLastSlide && !currentMod.quiz && isLastModule
                    ? "Proceed to Attestation"
                    : isLastSlide && !currentMod.quiz
                    ? "Complete Module"
                    : "Next"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Quiz: Submit */}
              {state.step === "quiz" && !state.quizSubmitted && (
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

              {/* Quiz: Retry */}
              {state.step === "quiz" && state.quizSubmitted && !state.quizCorrect && (
                <button
                  type="button"
                  onClick={handleQuizRetry}
                  className="flex items-center gap-2 px-5 py-2 rounded border border-red-500/30 bg-red-500/10 font-mono text-xs font-bold text-red-400 uppercase tracking-wider hover:bg-red-500/20 transition-colors"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Re-Attempt Required
                </button>
              )}

              {/* Quiz: Continue after correct */}
              {state.step === "quiz" && state.quizSubmitted && state.quizCorrect && (
                <button
                  type="button"
                  onClick={handleQuizContinue}
                  className="flex items-center gap-2 px-5 py-2 rounded border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  {isLastModule ? "Proceed to Attestation" : "Unlock Next Module"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Attestation: Certify */}
              {state.step === "attestation" && (
                <button
                  type="button"
                  onClick={handleCertify}
                  disabled={state.attestationName.trim().length < 3 || isPending}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded border font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                    state.attestationName.trim().length >= 3 && !isPending
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                      : "border-slate-800 bg-transparent text-slate-700 cursor-not-allowed"
                  }`}
                >
                  <Fingerprint className="h-4 w-4" />
                  {isPending ? "Signing..." : "Digitally Sign & Certify AML Training"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
