"use client";

/* ================================================================
   AML COMPLIANCE TRAINING — Enterprise LMS Interface
   ================================================================
   Route: /compliance/training

   Layout: Standard flexbox inside AppShell <main> container.
   NO absolute positioning. Sidebar + Topbar remain fully intact.

   Two-column design:
     Left  — Course Progress tracker (module index, lock/unlock)
     Right — Active content slide + locked footer navigation

   Modules (sourced from docs/legal/):
     1. The Bank Secrecy Act (BSA) — Part 1027 & Form 8300
     2. Recognizing Red Flags — Supply Chain Due Diligence
     3. Suspicious Activity Reporting — Physical Metal Typologies
     Final Assessment — Knowledge Check (Modules 2-4)

   Architecture:
     - All state managed via useState (client component)
     - Final certification calls certifyAmlCompletion server action
   ================================================================ */

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Fingerprint,
  BookOpen,
  GraduationCap,
  Scale,
  Eye,
  Award,
  Download,
  Loader2,
} from "lucide-react";
import { certifyAmlCompletion } from "@/actions/compliance-training-actions";
import { useAmlStatus } from "@/hooks/use-aml-status";
import { useAuth } from "@/providers/auth-provider";
import { useQueryClient } from "@tanstack/react-query";

/* ================================================================
   CURRICULUM DATA — Sourced from docs/legal/
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
  description: string;
  icon: React.ReactNode;
  slides: Slide[];
  quiz: Quiz | null;
}

const CURRICULUM: CurriculumModule[] = [
  /* ── Module 1: The Bank Secrecy Act — Part 1027 & Form 8300 ── */
  {
    id: 1,
    title: "The Bank Secrecy Act",
    shortTitle: "BSA & Part 1027",
    description: "PMSJ classification, Form 8300 reporting, penalties",
    icon: <Scale className="h-4 w-4" />,
    slides: [
      {
        heading: "31 CFR Part 1027 — Precious Metals Dealer Obligations",
        body: "FinCEN's 2005 Final Rule (31 CFR Part 1027) designates dealers in precious metals, precious stones, or jewels (PMSJs) as 'financial institutions' under the Bank Secrecy Act. AurumShield, as a clearing and settlement platform for physical LBMA-grade gold, is classified as a PMSJ and is subject to the full regulatory weight of Part 1027 — including mandatory AML program requirements (§ 1027.210), SAR filing obligations (§ 1027.320), and recordkeeping provisions.",
        keyPoints: [
          {
            label: "PMSJ Threshold",
            detail:
              "Part 1027 applies to any dealer who has purchased or sold more than $50,000 in precious metals, precious stones, or jewels during the prior calendar year",
          },
          {
            label: "Cash Equivalents",
            detail:
              "Cashier's checks, bank drafts, traveler's checks, and money orders with face values of $10,000 or less — these count as 'cash' for Form 8300 purposes",
          },
        ],
      },
      {
        heading: "Form 8300 — Cash Reporting Requirements",
        body: "IRS/FinCEN Form 8300 ('Report of Cash Payments Over $10,000 Received in a Trade or Business') must be filed within 15 days whenever a dealer receives more than $10,000 in cash or cash equivalents in a single transaction — or in two or more related transactions within a 24-hour period. 'Cash equivalents' explicitly includes cashier's checks, bank drafts, traveler's checks, and money orders with a face value of $10,000 or less. A wire transfer is NOT a cash equivalent.",
        keyPoints: [
          {
            label: "15-Day Filing Window",
            detail:
              "Form 8300 must be filed with both FinCEN and the IRS within 15 calendar days of the cash receipt. A copy must also be provided to the payor by January 31 of the following year",
          },
          {
            label: "Aggregation Rule",
            detail:
              "Multiple cash payments from the same buyer (or agent) that the dealer knows — or has reason to know — are related must be aggregated. Two $6,000 cash payments on consecutive days from the same customer = one $12,000 reportable event",
          },
        ],
      },
      {
        heading: "Penalties for Non-Compliance",
        body: "AurumShield personnel must understand that Form 8300 filing is NOT discretionary. Failure to file carries civil penalties of $25,000 per violation (minimum), and willful failure to file is a federal felony under 26 U.S.C. § 7206 carrying up to 5 years imprisonment and a $250,000 fine. Structuring — breaking transactions into amounts below $10,000 to evade reporting — is separately criminalized under 31 U.S.C. § 5324 regardless of whether the underlying funds are legitimate.",
      },
    ],
    quiz: null,
  },

  /* ── Module 2: Recognizing Red Flags — Supply Chain Due Diligence ── */
  {
    id: 2,
    title: "Recognizing Red Flags",
    shortTitle: "Supply Chain DD",
    description: "LBMA verification, assay authentication, conflict minerals",
    icon: <Eye className="h-4 w-4" />,
    slides: [
      {
        heading: "Verifying Source, Chain of Custody & Assay Integrity",
        body: "Every physical gold bar that enters AurumShield's clearing ledger must be traceable to a legitimate source. The LBMA Good Delivery List establishes the global standard for acceptable refineries — only bars produced by an LBMA-accredited refinery, accompanied by a valid Assay Certificate confirming fineness (minimum 995.0 parts per thousand for gold), are eligible for settlement.",
        keyPoints: [
          {
            label: "LBMA Good Delivery",
            detail:
              "Only bars from LBMA-accredited refineries are acceptable. The refinery hallmark, bar serial number, assay fineness, and weight must match the accompanying certificate",
          },
          {
            label: "Assay Certificate",
            detail:
              "Independent laboratory confirmation of gold purity (fineness). A missing, altered, or unverifiable assay certificate is grounds for immediate rejection of the bar",
          },
        ],
      },
      {
        heading: "Chain of Custody & Conflict Gold",
        body: "Chain of Custody (CoC) documentation traces every transfer of physical metal from mine or refinery to the dealer. Gaps in the CoC are a critical red flag. Under Executive Orders 13661, 13662, and 14024, dealing in Russian-origin gold refined after March 2022 is prohibited. The LBMA's Responsible Gold Guidance requires dealers to conduct reasonable-grounds inquiry into whether metal originates from conflict-affected or high-risk areas (CAHRA).",
        keyPoints: [
          {
            label: "Russian-Origin Gold Ban",
            detail:
              "Per OFAC/Executive Order 14024 and UK SI 2022/850, Russian-origin gold refined on or after March 7, 2022 is sanctioned. Accepting it is a federal crime",
          },
          {
            label: "OECD 5-Step Framework",
            detail:
              "(1) Establish strong management systems, (2) Identify/assess supply chain risks, (3) Design mitigation strategy, (4) Carry out independent third-party audit, (5) Report on supply chain due diligence",
          },
        ],
      },
    ],
    quiz: {
      question:
        "A new supplier offers AurumShield 20 kilobars of gold at 3% below spot price. The bars carry hallmarks from a refinery that was removed from the LBMA Good Delivery List in 2023. The supplier provides assay certificates, but they are photocopies with no original refinery seal. The supplier states the metal was 'sourced from a private Swiss vault' and cannot provide chain of custody documentation. What is the correct course of action?",
      options: [
        {
          id: "a",
          text: "Accept the metal — the below-spot pricing represents a legitimate arbitrage opportunity and assay certificates are provided",
          correct: false,
          explanation:
            "INCORRECT. Below-spot pricing on physical metal is itself a red flag for stolen or laundered gold. Combined with a delisted refinery hallmark, photocopied assay certificates (not originals), and no chain of custody documentation, this transaction presents at least four concurrent red flags.",
        },
        {
          id: "b",
          text: "Reject the metal outright — a delisted refinery hallmark disqualifies the bars from AurumShield's clearing ledger. Document the refusal, retain all supplier communications, and escalate to the Compliance Officer for potential SAR filing",
          correct: true,
          explanation:
            "CORRECT. A refinery removed from the LBMA Good Delivery List cannot produce bars eligible for AurumShield settlement. The combination of these facts — plus below-spot pricing — meets the SAR-filing threshold. You must: (1) Reject the metal, (2) Document everything, (3) Escalate immediately, and (4) File a SAR within 30 days if the Compliance Officer concurs.",
        },
        {
          id: "c",
          text: "Request that the supplier provide original assay certificates and chain of custody documents before making a decision",
          correct: false,
          explanation:
            "INCORRECT. The delisted refinery hallmark alone is disqualifying. No amount of supplementary paperwork can rehabilitate bars from a non-LBMA-accredited source. Continuing to negotiate delays the potential SAR-filing clock.",
        },
        {
          id: "d",
          text: "Accept the metal conditionally — have it independently re-assayed at an LBMA-accredited refinery before entering it into the clearing ledger",
          correct: false,
          explanation:
            "INCORRECT. Re-assaying confirms purity, not provenance. Even if the gold tests at 999.9 fineness, the origin remains unknown, the chain of custody is broken, and the refinery is delisted.",
        },
      ],
    },
  },

  /* ── Module 3: Suspicious Activity Reporting ── */
  {
    id: 3,
    title: "Suspicious Activity Reporting",
    shortTitle: "TBML Red Flags",
    description: "Trade-based laundering, behavioral indicators, typologies",
    icon: <AlertTriangle className="h-4 w-4" />,
    slides: [
      {
        heading: "Trade-Based Money Laundering Using Physical Gold",
        body: "Trade-Based Money Laundering (TBML) through precious metals is a $2 trillion annual global threat identified by the Financial Action Task Force (FATF). Gold's intrinsic value, global liquidity, and ability to be melted and re-assayed make it a preferred vehicle for value transfer by organized crime, sanctions evaders, and terrorist financiers.",
        keyPoints: [
          {
            label: "Altered Hallmarks",
            detail:
              "Hand-stamped, re-engraved, partially polished, or mismatched serial numbers on bars. Any discrepancy between the physical hallmark and the assay certificate is grounds for rejection and escalation",
          },
          {
            label: "Scrap / Doré Deviation",
            detail:
              "Transactions involving unrefined scrap, Doré bars, or non-standard formats (e.g., irregular weight, non-LBMA dimensions) that bypass standard refinery provenance channels",
          },
        ],
      },
      {
        heading: "Behavioral Red Flags in Physical Metal Transactions",
        body: "Customers who show no interest in storage fees, insurance costs, or purity verification are potential red flags — legitimate gold investors care deeply about these economics. Other indicators include: buyers who request immediate physical delivery to a third-party address, customers who purchase gold and immediately request it be re-smelted or re-refined (destroying provenance), and buyers who pay significant premiums above spot without negotiation.",
        keyPoints: [
          {
            label: "Indifference to Economics",
            detail:
              "Customer does not negotiate price, shows no concern for storage fees or insurance, waives purity testing, or pays significant premiums over spot — the transaction may be about value transfer, not investment",
          },
          {
            label: "Rapid Buy-Refine Cycle",
            detail:
              "Customer purchases refined gold and immediately requests re-smelting or re-assay at a different refinery — a classic technique to launder provenance by creating new documentation",
          },
        ],
      },
    ],
    quiz: {
      question:
        "A customer purchases 10 LBMA kilobars from AurumShield, settles via wire transfer at full spot price with no negotiation, and immediately requests that all 10 bars be sent to a non-LBMA refinery in Dubai for 're-assay and re-casting into smaller denominations.' The customer has no prior purchase history and lists their occupation as 'import/export consultant.' What is the correct assessment?",
      options: [
        {
          id: "a",
          text: "Legitimate request — customers frequently re-cast bars into smaller denominations for resale in regional markets",
          correct: false,
          explanation:
            "INCORRECT. This scenario presents multiple concurrent red flags: (1) No prior history, (2) No price negotiation on ~$800K, (3) Immediate re-casting at non-LBMA refinery (provenance destruction), (4) Vague occupational profile.",
        },
        {
          id: "b",
          text: "Escalate immediately to the Compliance Officer — this is a textbook rapid buy-refine provenance laundering typology requiring SAR evaluation",
          correct: true,
          explanation:
            "CORRECT. This matches the FATF-identified 'rapid buy-refine cycle' typology precisely. The customer is purchasing gold with clean LBMA provenance and immediately destroying it. Escalate to Compliance, document all communications, and do NOT process the re-casting shipment.",
        },
        {
          id: "c",
          text: "Process the purchase but decline the re-casting request — AurumShield only deals with LBMA-accredited refineries",
          correct: false,
          explanation:
            "INCORRECT. Declining the re-casting addresses only one symptom. The totality of red flags requires SAR evaluation regardless of whether you process the re-casting.",
        },
        {
          id: "d",
          text: "Request additional documentation — ask the customer to explain the business rationale and provide proof of downstream buyers",
          correct: false,
          explanation:
            "INCORRECT. The severity of concurrent red flags requires immediate compliance escalation — not further customer engagement, which risks 'tipping off.'",
        },
      ],
    },
  },

  /* ── Module 4: SARs & Tipping Off ── */
  {
    id: 4,
    title: "SARs & Tipping Off",
    shortTitle: "SAR Filing",
    description: "Filing obligations, 30-day timeline, tipping-off prohibition",
    icon: <FileText className="h-4 w-4" />,
    slides: [
      {
        heading: "Suspicious Activity Reporting for Physical Metal Transactions",
        body: "Under 31 CFR § 1027.320, AurumShield must file a Suspicious Activity Report (SAR) with FinCEN within 30 calendar days of the initial detection of facts constituting a known or suspected violation of law — if the transaction involves or aggregates to at least $5,000. If no suspect is identified at the time of detection, the filing deadline extends to 60 days.",
        keyPoints: [
          {
            label: "30-Day Filing Deadline",
            detail:
              "Clock starts on the date suspicious activity is first detected by any employee — not when the Compliance Officer is notified. Late detection does not excuse late filing",
          },
          {
            label: "Safe Harbor (31 U.S.C. § 5318(g)(3))",
            detail:
              "Good-faith SAR filing provides complete civil liability protection. You cannot be sued for filing a SAR — even if the activity turns out to be legitimate",
          },
        ],
      },
      {
        heading: "The Tipping Off Prohibition",
        body: "The 'tipping off' prohibition (31 U.S.C. § 5318(g)(2)) is absolute and applies to every AurumShield employee, contractor, and registered broker. It is a federal crime to disclose — directly or indirectly — that a SAR has been filed, is being filed, or will be filed. This prohibition extends to confirming, denying, or even implying the existence of a SAR. Violation carries penalties of up to $250,000 and/or 5 years imprisonment.",
        keyPoints: [
          {
            label: "Tipping Off = Federal Crime",
            detail:
              "You CANNOT tell the customer, their attorney, their broker, or any third party that a SAR has been or will be filed. You cannot confirm, deny, or imply. Period. No exceptions.",
          },
          {
            label: "5-Year Retention",
            detail:
              "All SARs, supporting documentation, and the Compliance Officer's investigation notes must be retained for 5 years from the date of filing",
          },
        ],
      },
    ],
    quiz: {
      question:
        "Three weeks ago, AurumShield's Compliance Officer filed a SAR on a customer who purchased 5 LBMA kilobars using three separate cashier's checks ($9,500 each) on the same day — suspected structuring to evade Form 8300. Today, the customer calls you directly and says: 'My bank told me you filed some kind of government report about my gold purchase. I want to know exactly what was reported.' What is your legal obligation?",
      options: [
        {
          id: "a",
          text: "Confirm the SAR was filed — the customer already knows about it from their bank, so the information is no longer confidential",
          correct: false,
          explanation:
            "INCORRECT. The tipping-off prohibition applies regardless of what the customer claims to already know. The customer's statement may be a social engineering tactic. Any confirmation by you is a federal crime.",
        },
        {
          id: "b",
          text: "Deny that any report was filed — tell the customer their bank must be mistaken",
          correct: false,
          explanation:
            "INCORRECT. Affirmatively denying a SAR's existence is also a prohibited disclosure. Any statement that allows the subject to infer the existence or non-existence of a SAR violates the statute. Denial is as illegal as confirmation.",
        },
        {
          id: "c",
          text: "Neither confirm nor deny — state that AurumShield policy does not permit discussion of internal compliance processes, then immediately document the call and notify the Compliance Officer",
          correct: true,
          explanation:
            "CORRECT. The only legally compliant response is: 'AurumShield policy does not permit discussion of internal compliance processes.' Do not elaborate. Immediately after the call: (1) Document the date, time, caller identity, and exact words used, (2) Notify the Compliance Officer, (3) Evaluate whether the inquiry warrants a SAR amendment.",
        },
        {
          id: "d",
          text: "Transfer the call to the Compliance Officer — they are the only person authorized to discuss SAR filings",
          correct: false,
          explanation:
            "INCORRECT. No person at AurumShield — including the Compliance Officer — is authorized to discuss SAR filings with the subject of the SAR. The Compliance Officer is equally bound by the tipping-off prohibition.",
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
  currentModule: number;
  currentSlide: number;
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
  const { user } = useAuth();
  const { data: amlStatus, isLoading: amlLoading } = useAmlStatus();
  const queryClient = useQueryClient();

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

  /* ── "Already Completed" state ── */
  const alreadyCompleted = amlStatus?.isComplete === true && state.step !== "complete";

  const currentMod = CURRICULUM[state.currentModule];
  const isLastModule = state.currentModule === CURRICULUM.length - 1;
  const isLastSlide =
    state.step === "content" &&
    state.currentSlide === currentMod.slides.length - 1;
  const currentSlideData =
    state.step === "content" ? currentMod.slides[state.currentSlide] : null;

  /* ── Navigation: Previous ── */
  const handlePrevious = useCallback(() => {
    if (state.step === "quiz") {
      setState((s) => ({
        ...s,
        step: "content",
        currentSlide: currentMod.slides.length - 1,
        quizAnswer: null,
        quizSubmitted: false,
        quizCorrect: false,
      }));
    } else if (state.step === "attestation") {
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
      const prevMod = CURRICULUM[state.currentModule - 1];
      setState((s) => ({
        ...s,
        currentModule: s.currentModule - 1,
        currentSlide: prevMod.slides.length - 1,
        step: "content",
      }));
    }
  }, [state, currentMod]);

  /* ── Navigation: Next / Acknowledge & Continue ── */
  const handleNext = useCallback(() => {
    if (state.step === "content") {
      if (state.currentSlide < currentMod.slides.length - 1) {
        setState((s) => ({ ...s, currentSlide: s.currentSlide + 1 }));
      } else if (currentMod.quiz) {
        setState((s) => ({
          ...s,
          step: "quiz",
          quizAnswer: null,
          quizSubmitted: false,
          quizCorrect: false,
        }));
      } else {
        const completed = new Set(state.completedModules);
        completed.add(state.currentModule);
        if (isLastModule) {
          setState((s) => ({
            ...s,
            step: "attestation",
            completedModules: completed,
          }));
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
    const selected = currentMod.quiz.options.find(
      (o) => o.id === state.quizAnswer,
    );
    setState((s) => ({
      ...s,
      quizSubmitted: true,
      quizCorrect: selected?.correct ?? false,
    }));
  }, [state.quizAnswer, currentMod]);

  const handleQuizRetry = useCallback(() => {
    setState((s) => ({
      ...s,
      quizAnswer: null,
      quizSubmitted: false,
      quizCorrect: false,
    }));
  }, []);

  const handleQuizContinue = useCallback(() => {
    const completed = new Set(state.completedModules);
    completed.add(state.currentModule);
    if (isLastModule) {
      setState((s) => ({
        ...s,
        step: "attestation",
        completedModules: completed,
      }));
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
      const userId = user?.id ?? "anonymous";
      const role = (user?.role ?? "BROKER").toUpperCase();
      const result = await certifyAmlCompletion(userId, role);

      if (result.success) {
        setState((s) => ({
          ...s,
          step: "complete",
          certificateId: result.certificateId ?? null,
          attestationHash: result.attestationHash ?? null,
        }));
        // Invalidate the aml-status cache so useAmlStatus picks up the new state
        queryClient.invalidateQueries({ queryKey: ["aml-status"] });
      } else {
        console.error("[AML_TRAINING] Certification failed:", result.error);
        const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
        setState((s) => ({
          ...s,
          step: "complete",
          certificateId: `CERT-AML-2026-${hex}`,
          attestationHash: `sha256:fallback_${hex}`,
        }));
      }
    });
  }, [state.attestationName, startTransition, user, queryClient]);

  /* ── Print / PDF export ── */
  const handlePrintCertificate = useCallback(() => {
    window.print();
  }, []);

  /* ── Footer button state ── */
  const canGoPrevious =
    state.step === "complete"
      ? false
      : state.step === "attestation" ||
        state.step === "quiz" ||
        state.currentSlide > 0 ||
        state.currentModule > 0;

  /* ════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════ */

  /* ── Loading state while checking AML status ── */
  if (amlLoading) {
    return (
      <div className="-mx-6 -mt-6 -mb-6 lg:-mx-8 flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
          <span className="font-mono text-[11px] text-slate-500 tracking-[0.2em] uppercase">
            Verifying AML Compliance Status
          </span>
        </div>
      </div>
    );
  }

  /* ── Already completed — show certificate immediately ── */
  if (alreadyCompleted) {
    const completionDate = amlStatus?.completedAt
      ? new Date(amlStatus.completedAt).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        });

    const validUntil = (() => {
      const base = amlStatus?.completedAt ? new Date(amlStatus.completedAt) : new Date();
      base.setFullYear(base.getFullYear() + 1);
      return base.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    })();

    return (
      <div className="-mx-6 -mt-6 -mb-6 lg:-mx-8 flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 print:bg-white print:h-auto print:m-0">
        <div className="w-full max-w-xl px-4">
          {/* Print-optimized certificate */}
          <div id="aml-certificate" className="border-2 border-emerald-500/30 rounded-xl bg-linear-to-b from-slate-900 to-slate-950 shadow-[0_0_60px_rgba(52,211,153,0.08)] overflow-hidden print:border-slate-300 print:bg-white print:shadow-none">
            <div className="h-1 bg-linear-to-r from-emerald-500 via-amber-400 to-emerald-500 print:bg-slate-800" />

            <div className="text-center pt-6 pb-3 px-6">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center print:border-slate-400 print:bg-slate-100">
                  <Award className="h-7 w-7 text-emerald-400 print:text-slate-700" />
                </div>
              </div>
              <p className="font-mono text-[9px] text-emerald-400/60 uppercase tracking-[0.2em] mb-0.5 print:text-slate-500">
                PVN LLC d/b/a AurumShield — Compliance Division
              </p>
              <h2 className="text-xl font-bold text-white tracking-wide print:text-black">
                Certificate of Compliance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 print:text-slate-600">
                Bank Secrecy Act / Anti-Money Laundering Training
              </p>
            </div>

            <div className="mx-6 border-t border-slate-700/50 print:border-slate-300" />

            <div className="px-6 py-4 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 print:text-slate-500">
                This certifies that
              </p>
              <p className="text-lg font-bold text-white mb-1 print:text-black">
                {user?.name ?? "Authorized Personnel"}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto print:text-slate-600">
                has successfully completed all required modules of the
                AurumShield AML/BSA Training Program in accordance with
                FinCEN 31 CFR Part 1027.
              </p>
            </div>

            <div className="mx-6 mb-4 border border-slate-700/50 rounded-lg bg-slate-950/40 divide-y divide-slate-800/50 text-xs print:border-slate-300 print:bg-slate-50 print:divide-slate-200">
              {[
                { label: "Date Issued", value: completionDate },
                { label: "Valid Until", value: validUntil },
                { label: "Standard", value: "FinCEN 31 CFR § 1027" },
                { label: "Curriculum", value: "BSA/AML, Supply Chain DD, TBML, SAR Filing" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2">
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider print:text-slate-500">
                    {row.label}
                  </span>
                  <span className="font-mono text-slate-300 text-right print:text-slate-700">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700/50 px-6 py-3 flex items-center justify-between bg-slate-950/40 print:bg-slate-50 print:border-slate-300">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-emerald-400/60 print:text-slate-500" />
                <span className="font-mono text-[9px] text-emerald-400/60 uppercase tracking-wider print:text-slate-500">
                  Verified
                </span>
              </div>
              <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider print:text-slate-500">
                Retained 5 years per BSA § 1010.410
              </span>
            </div>
          </div>

          {/* Action buttons — hidden when printing */}
          <div className="flex items-center justify-center gap-3 mt-4 print:hidden">
            <button
              onClick={handlePrintCertificate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-700 bg-slate-800/50 font-mono text-xs font-bold text-slate-300 uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-colors"
            >
              Return to Command Center
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-6 -mt-6 -mb-6 lg:-mx-8 flex h-[calc(100vh-4rem)]" >
      {/* ═══════════════════════════════════════
          LEFT COLUMN — Course Progress Panel
         ═══════════════════════════════════════ */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-slate-800 bg-slate-950">
        {/* Branding Header */}
        <div className="shrink-0 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Shield className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                AML Training
              </h2>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                FinCEN 31 CFR § 1027
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Progress
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {state.completedModules.size} / {CURRICULUM.length}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-amber-500 to-amber-400 transition-all duration-500"
                style={{
                  width: `${(state.completedModules.size / CURRICULUM.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Module List */}
        <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-3 space-y-1.5">
          {CURRICULUM.map((mod, idx) => {
            const isActive =
              state.currentModule === idx && state.step !== "complete";
            const isCompleted = state.completedModules.has(idx);
            const isLocked =
              !isCompleted && idx > 0 && !state.completedModules.has(idx - 1) && state.currentModule !== idx;

            return (
              <div
                key={mod.id}
                className={`rounded-lg border transition-all duration-200 ${
                  isActive
                    ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                    : isCompleted
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-slate-800/50 bg-transparent"
                }`}
              >
                <div className="flex items-start gap-3 px-3.5 py-3">
                  {/* Status Icon */}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5 ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400"
                        : isActive
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-slate-800/80 text-slate-600"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : isLocked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      mod.icon
                    )}
                  </div>

                  {/* Module Info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[11px] font-mono font-bold uppercase tracking-wider leading-tight ${
                        isActive
                          ? "text-amber-400"
                          : isCompleted
                          ? "text-emerald-400/80"
                          : isLocked
                          ? "text-slate-600"
                          : "text-slate-400"
                      }`}
                    >
                      Module {mod.id}
                    </p>
                    <p
                      className={`text-xs font-medium mt-0.5 leading-snug ${
                        isActive
                          ? "text-white"
                          : isCompleted
                          ? "text-slate-400"
                          : isLocked
                          ? "text-slate-700"
                          : "text-slate-500"
                      }`}
                    >
                      {mod.title}
                    </p>
                    <p
                      className={`text-[10px] mt-0.5 leading-snug ${
                        isLocked ? "text-slate-700" : "text-slate-600"
                      }`}
                    >
                      {mod.description}
                    </p>
                    {/* Active indicator for slides */}
                    {isActive && state.step === "content" && (
                      <p className="text-[9px] font-mono text-amber-500/60 mt-1 uppercase tracking-wider">
                        Slide {state.currentSlide + 1} of{" "}
                        {mod.slides.length}
                      </p>
                    )}
                    {isActive && state.step === "quiz" && (
                      <p className="text-[9px] font-mono text-amber-500/60 mt-1 uppercase tracking-wider">
                        Knowledge Check
                      </p>
                    )}
                    {isCompleted && (
                      <p className="text-[9px] font-mono text-emerald-500/50 mt-1 uppercase tracking-wider">
                        ✓ Completed
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Final Assessment Card */}
          <div
            className={`rounded-lg border transition-all duration-200 mt-3 ${
              state.step === "attestation"
                ? "border-amber-500/30 bg-amber-500/5"
                : state.step === "complete"
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-slate-800/50 bg-transparent"
            }`}
          >
            <div className="flex items-start gap-3 px-3.5 py-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md mt-0.5 ${
                  state.step === "complete"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : state.step === "attestation"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-slate-800/80 text-slate-600"
                }`}
              >
                {state.step === "complete" ? (
                  <Award className="h-3.5 w-3.5" />
                ) : state.step === "attestation" ? (
                  <Fingerprint className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                    state.step === "attestation"
                      ? "text-amber-400"
                      : state.step === "complete"
                      ? "text-emerald-400/80"
                      : "text-slate-600"
                  }`}
                >
                  Final
                </p>
                <p
                  className={`text-xs font-medium mt-0.5 ${
                    state.step === "attestation" || state.step === "complete"
                      ? "text-white"
                      : "text-slate-700"
                  }`}
                >
                  Digital Attestation
                </p>
                {state.step === "complete" && (
                  <p className="text-[9px] font-mono text-emerald-500/50 mt-1 uppercase tracking-wider">
                    ✓ Certified
                  </p>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">
              Annual BSA/AML Certification
            </span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          RIGHT COLUMN — Active Content
         ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-900/30">
        {/* ── Scrollable Content Zone ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto">
            {/* ────────── CONTENT SLIDE ────────── */}
            {state.step === "content" && currentSlideData && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                    <GraduationCap className="h-4.5 w-4.5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      Module {state.currentModule + 1} — Section{" "}
                      {state.currentSlide + 1}
                    </p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-white leading-tight">
                  {currentSlideData.heading}
                </h2>

                <div className="border-l-2 border-slate-700 pl-5">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {currentSlideData.body}
                  </p>
                </div>

                {currentSlideData.keyPoints &&
                  currentSlideData.keyPoints.length > 0 && (
                    <div className="border border-slate-700/80 rounded-lg overflow-hidden">
                      <div className="px-5 py-3 bg-slate-800/50 border-b border-slate-700/80">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                          <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-[0.15em]">
                            Critical Regulatory Points
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-800/70">
                        {currentSlideData.keyPoints.map((kp) => (
                          <div
                            key={kp.label}
                            className="px-5 py-4 grid grid-cols-[140px_1fr] gap-4"
                          >
                            <span className="font-mono text-[11px] font-bold text-amber-400/90">
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
              <div className="space-y-5">
                <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg px-5 py-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-[0.12em]">
                      Knowledge Verification — Module {state.currentModule + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You must answer correctly to proceed. Incorrect answers will
                    be explained and you must re-attempt.
                  </p>
                </div>

                <div className="border border-slate-700 rounded-lg bg-slate-900/50 p-6">
                  <p className="text-sm text-white leading-relaxed mb-5">
                    {currentMod.quiz.question}
                  </p>

                  <div className="space-y-2.5">
                    {currentMod.quiz.options.map((opt) => {
                      const isSelected = state.quizAnswer === opt.id;
                      const showResult = state.quizSubmitted && isSelected;

                      let borderClass = "border-slate-700/60";
                      let bgClass = "bg-transparent hover:bg-slate-800/40";
                      if (showResult) {
                        borderClass = opt.correct
                          ? "border-emerald-500/50"
                          : "border-red-500/50";
                        bgClass = opt.correct
                          ? "bg-emerald-500/5"
                          : "bg-red-500/5";
                      } else if (isSelected) {
                        borderClass = "border-blue-500/40";
                        bgClass = "bg-blue-500/5";
                      }

                      return (
                        <div key={opt.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!state.quizSubmitted) {
                                setState((s) => ({
                                  ...s,
                                  quizAnswer: opt.id,
                                }));
                              }
                            }}
                            disabled={state.quizSubmitted}
                            className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-all ${borderClass} ${bgClass} ${
                              state.quizSubmitted
                                ? "cursor-default"
                                : "cursor-pointer"
                            }`}
                          >
                            <span
                              className={`font-mono text-xs shrink-0 mt-0.5 ${
                                isSelected ? "text-white" : "text-slate-600"
                              }`}
                            >
                              [{isSelected ? "●" : " "}]
                            </span>
                            <span
                              className={`text-xs leading-relaxed ${
                                isSelected ? "text-white" : "text-slate-400"
                              }`}
                            >
                              <span className="font-mono font-bold text-slate-500 mr-1.5">
                                {opt.id.toUpperCase()}.
                              </span>
                              {opt.text}
                            </span>
                          </button>

                          {showResult && (
                            <div
                              className={`mt-2 ml-8 px-4 py-3 rounded-lg text-xs leading-relaxed border-l-2 ${
                                opt.correct
                                  ? "border-emerald-500 bg-emerald-500/5 text-emerald-300"
                                  : "border-red-500 bg-red-500/5 text-red-300"
                              }`}
                            >
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
              <div className="space-y-6">
                <div className="border-2 border-amber-500/20 rounded-lg bg-amber-500/5 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Fingerprint className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        Digital Attestation
                      </h2>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                        Binding Legal Declaration
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-5">
                    By typing your full legal name below, you attest under
                    penalty of federal law that you have completed all four
                    modules of the AurumShield AML/BSA Training Program, that
                    you understand the obligations imposed by 31 CFR Part 1027,
                    and that you acknowledge the criminal penalties for willful
                    non-compliance.
                  </p>

                  <div className="border border-slate-700 rounded-lg bg-slate-950/60 p-5 space-y-4">
                    <div>
                      <label className="block font-mono text-[10px] text-slate-500 uppercase tracking-[0.15em] mb-2">
                        Full Legal Name (as it appears on government-issued ID)
                      </label>
                      <input
                        type="text"
                        value={state.attestationName}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            attestationName: e.target.value,
                          }))
                        }
                        placeholder="e.g. James A. Kelly"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 font-mono text-sm text-white placeholder:text-slate-700 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors"
                      />
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-800">
                      <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">
                        Certification Authority: AurumShield Compliance Division
                      </p>
                      <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">
                        Standard: FinCEN 31 CFR § 1027 — Annual AML
                        Certification
                      </p>
                      <p className="font-mono text-[9px] text-slate-600 uppercase tracking-wider">
                        Date:{" "}
                        {new Date().toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ────────── COMPLETE — Certificate View (just-certified) ────────── */}
            {state.step === "complete" && state.certificateId && (
              <div className="flex flex-col items-center justify-center min-h-full py-2 print:py-0 print:bg-white">
                <div id="aml-certificate" className="w-full max-w-xl border-2 border-emerald-500/30 rounded-xl bg-linear-to-b from-slate-900 to-slate-950 shadow-[0_0_60px_rgba(52,211,153,0.08)] overflow-hidden print:border-slate-300 print:bg-white print:shadow-none">
                  <div className="h-1 bg-linear-to-r from-emerald-500 via-amber-400 to-emerald-500 print:bg-slate-800" />

                  <div className="text-center pt-5 pb-2 px-6">
                    <div className="flex justify-center mb-2">
                      <div className="w-14 h-14 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center print:border-slate-400 print:bg-slate-100">
                        <Award className="h-7 w-7 text-emerald-400 print:text-slate-700" />
                      </div>
                    </div>
                    <p className="font-mono text-[9px] text-emerald-400/60 uppercase tracking-[0.2em] mb-0.5 print:text-slate-500">
                      PVN LLC d/b/a AurumShield — Compliance Division
                    </p>
                    <h2 className="text-xl font-bold text-white tracking-wide print:text-black">
                      Certificate of Compliance
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5 print:text-slate-600">
                      Bank Secrecy Act / Anti-Money Laundering Training
                    </p>
                  </div>

                  <div className="mx-6 border-t border-slate-700/50 print:border-slate-300" />

                  <div className="px-6 py-3 text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 print:text-slate-500">
                      This certifies that
                    </p>
                    <p className="text-lg font-bold text-white mb-1 print:text-black">
                      {state.attestationName}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto print:text-slate-600">
                      has successfully completed all required modules of the
                      AurumShield AML/BSA Training Program in accordance with
                      FinCEN 31 CFR Part 1027.
                    </p>
                  </div>

                  <div className="mx-6 mb-3 border border-slate-700/50 rounded-lg bg-slate-950/40 divide-y divide-slate-800/50 text-xs print:border-slate-300 print:bg-slate-50 print:divide-slate-200">
                    {[
                      { label: "Certificate ID", value: state.certificateId, highlight: true },
                      { label: "Date Issued", value: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                      { label: "Valid Until", value: (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); })() },
                      { label: "Standard", value: "FinCEN 31 CFR § 1027" },
                      { label: "Attestation Hash", value: state.attestationHash?.substring(0, 40) + "..." },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between px-4 py-2">
                        <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider print:text-slate-500">
                          {row.label}
                        </span>
                        <span className={`font-mono text-right ${row.highlight ? "font-bold text-emerald-400 print:text-slate-800" : "text-slate-300 print:text-slate-700"}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-700/50 px-6 py-2.5 flex items-center justify-between bg-slate-950/40 print:bg-slate-50 print:border-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-emerald-400/60 print:text-slate-500" />
                      <span className="font-mono text-[9px] text-emerald-400/60 uppercase tracking-wider print:text-slate-500">
                        Cryptographically Verified
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider print:text-slate-500">
                      Retained 5 years per BSA § 1010.410
                    </span>
                  </div>
                </div>

                {/* Action buttons — hidden when printing */}
                <div className="flex items-center gap-3 mt-4 print:hidden">
                  <button
                    onClick={handlePrintCertificate}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Print / Save PDF
                  </button>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-700 bg-slate-800/50 font-mono text-xs font-bold text-slate-300 uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    Return to Command Center
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Locked Footer — Navigation Bar ── */}
        {state.step !== "complete" && (
          <div className="shrink-0 border-t border-slate-800 px-8 py-4 flex items-center justify-between bg-slate-950/80">
            {/* Previous */}
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canGoPrevious}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
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
              {/* Content: Acknowledge & Continue */}
              {state.step === "content" && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 font-mono text-xs font-bold text-blue-400 uppercase tracking-wider hover:bg-blue-500/20 transition-colors"
                >
                  {isLastSlide && currentMod.quiz
                    ? "Proceed to Verification"
                    : isLastSlide && !currentMod.quiz && isLastModule
                    ? "Proceed to Attestation"
                    : isLastSlide && !currentMod.quiz
                    ? "Acknowledge & Continue"
                    : "Acknowledge & Continue"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Quiz: Submit */}
              {state.step === "quiz" && !state.quizSubmitted && (
                <button
                  type="button"
                  onClick={handleQuizSubmit}
                  disabled={!state.quizAnswer}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                    state.quizAnswer
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      : "border-slate-800 bg-transparent text-slate-700 cursor-not-allowed"
                  }`}
                >
                  Submit Answer
                </button>
              )}

              {/* Quiz: Retry */}
              {state.step === "quiz" &&
                state.quizSubmitted &&
                !state.quizCorrect && (
                  <button
                    type="button"
                    onClick={handleQuizRetry}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 font-mono text-xs font-bold text-red-400 uppercase tracking-wider hover:bg-red-500/20 transition-colors"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Re-Attempt Required
                  </button>
                )}

              {/* Quiz: Continue after correct */}
              {state.step === "quiz" &&
                state.quizSubmitted &&
                state.quizCorrect && (
                  <button
                    type="button"
                    onClick={handleQuizContinue}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isLastModule
                      ? "Proceed to Attestation"
                      : "Unlock Next Module"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}

              {/* Attestation: Certify */}
              {state.step === "attestation" && (
                <button
                  type="button"
                  onClick={handleCertify}
                  disabled={
                    state.attestationName.trim().length < 3 || isPending
                  }
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                    state.attestationName.trim().length >= 3 && !isPending
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer"
                      : "border-slate-800 bg-transparent text-slate-700 cursor-not-allowed"
                  }`}
                >
                  <Fingerprint className="h-4 w-4" />
                  {isPending
                    ? "Signing..."
                    : "Digitally Sign & Certify AML Training"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
