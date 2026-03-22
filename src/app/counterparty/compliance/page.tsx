"use client";

/* ================================================================
   COUNTERPARTY VERIFICATION PERIMETER
   ================================================================
   Route: /counterparty/compliance

   Zero-scroll compliance interface where a broker's counterparty
   can view their KYC/AML status and launch their Idenfy session.

   ACTIVE_COMPLIANCE_PROVIDER = IDENFY

   Architecture:
     - Left Column: Entity details + KYC state + compliance checklist
     - Right Column: Idenfy gateway action card
     - All state managed client-side (no server components)
   ================================================================ */

import { useState } from "react";
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Fingerprint,
  Building2,
  User,
  Globe,
  ChevronRight,
  Lock,
  Scan,
} from "lucide-react";

/* ================================================================
   TYPES & MOCK DATA
   ================================================================ */

type KycState =
  | "NOT_STARTED"
  | "PENDING_LIVENESS"
  | "PENDING_DOCUMENTS"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

interface ComplianceCheckItem {
  id: string;
  label: string;
  description: string;
  status: "complete" | "pending" | "required";
}

interface CounterpartyEntity {
  legalName: string;
  entityType: string;
  jurisdiction: string;
  registrationNumber: string;
  incorporationDate: string;
  primaryContact: string;
  contactEmail: string;
  kycState: KycState;
  lastUpdated: string;
  idenfySessionId: string | null;
}

// Mock counterparty data — will be replaced with TanStack Query fetch
const MOCK_ENTITY: CounterpartyEntity = {
  legalName: "Meridian Bullion Holdings AG",
  entityType: "Aktiengesellschaft (AG)",
  jurisdiction: "Switzerland — Canton of Zug",
  registrationNumber: "CHE-114.827.591",
  incorporationDate: "2019-03-14",
  primaryContact: "Klaus D. Reinhardt",
  contactEmail: "k.reinhardt@meridianbullion.ch",
  kycState: "PENDING_LIVENESS",
  lastUpdated: "2026-03-21T09:14:22Z",
  idenfySessionId: null,
};

const COMPLIANCE_CHECKLIST: ComplianceCheckItem[] = [
  {
    id: "corp-docs",
    label: "Corporate Documents",
    description: "Articles of Incorporation, Certificate of Good Standing, Shareholder Register",
    status: "complete",
  },
  {
    id: "ubo-disclosure",
    label: "UBO Disclosure",
    description: "Ultimate Beneficial Ownership declaration (>25% threshold)",
    status: "complete",
  },
  {
    id: "director-biometrics",
    label: "Director Biometrics",
    description: "3D Liveness check for all named directors via Idenfy",
    status: "pending",
  },
  {
    id: "aml-screening",
    label: "AML/PEP Screening",
    description: "Sanctions, PEP, and adverse media screening — all UBOs and directors",
    status: "required",
  },
  {
    id: "source-of-funds",
    label: "Source of Funds",
    description: "Verified provenance of settlement capital (bank statements or auditor letter)",
    status: "required",
  },
];

/* ================================================================
   HELPER: KYC STATE DISPLAY CONFIG
   ================================================================ */

function getKycConfig(state: KycState) {
  switch (state) {
    case "APPROVED":
      return {
        label: "APPROVED",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        pulseColor: "bg-emerald-400",
        icon: CheckCircle2,
      };
    case "UNDER_REVIEW":
      return {
        label: "UNDER REVIEW",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        pulseColor: "bg-yellow-400",
        icon: Clock,
      };
    case "PENDING_LIVENESS":
      return {
        label: "PENDING LIVENESS",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        pulseColor: "bg-yellow-400",
        icon: Fingerprint,
      };
    case "PENDING_DOCUMENTS":
      return {
        label: "PENDING DOCUMENTS",
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        pulseColor: "bg-yellow-400",
        icon: FileText,
      };
    case "REJECTED":
      return {
        label: "REJECTED",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        pulseColor: "bg-red-400",
        icon: XCircle,
      };
    case "NOT_STARTED":
    default:
      return {
        label: "NOT STARTED",
        color: "text-slate-500",
        bgColor: "bg-slate-800/50",
        borderColor: "border-slate-700",
        pulseColor: "bg-slate-500",
        icon: Lock,
      };
  }
}

function getChecklistIcon(status: ComplianceCheckItem["status"]) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
    case "required":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
  }
}

/* ================================================================
   TRUST BADGE COMPONENT
   ================================================================ */

function TrustBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-emerald-500/20 bg-emerald-500/5">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
      <span className="font-mono text-[9px] text-emerald-400 uppercase tracking-[0.15em] font-bold">
        TLS 1.3 Encrypted
      </span>
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
    </div>
  );
}

/* ================================================================
   PAGE COMPONENT
   ================================================================ */

export default function CounterpartyCompliancePage() {
  // TODO: Replace with TanStack Query — useQuery(['counterpartyCompliance', entityId])
  const [entity] = useState<CounterpartyEntity>(MOCK_ENTITY);
  const [checklist] = useState<ComplianceCheckItem[]>(COMPLIANCE_CHECKLIST);
  const [isInitializing, setIsInitializing] = useState(false);

  const kycConfig = getKycConfig(entity.kycState);
  const KycIcon = kycConfig.icon;

  const completedCount = checklist.filter((c) => c.status === "complete").length;
  const totalCount = checklist.length;

  const handleInitializeIdenfySession = () => {
    setIsInitializing(true);

    // TODO: Execute server action to generate Idenfy session token
    // via idenfy-adapter.ts and redirect to Idenfy hosted flow.
    //
    // Implementation steps:
    //   1. POST to /api/compliance/idenfy/create-session with counterparty entityId
    //   2. idenfy-adapter.ts calls Idenfy API (POST https://ivs.idenfy.com/api/v2/token)
    //      with {clientId, firstName, lastName, successUrl, errorUrl, callbackUrl}
    //   3. Receive { authToken, scanRef } from Idenfy
    //   4. Redirect to: https://ivs.idenfy.com/api/v2/redirect?authToken={authToken}
    //   5. On callback, update counterparty KYC state via webhook handler
    //
    // For now, simulate with a timeout:
    setTimeout(() => {
      setIsInitializing(false);
      console.log("[IDENFY] Session initialization requested for:", entity.legalName);
    }, 2000);
  };

  return (
    <div className="absolute inset-0 flex flex-col p-4 text-slate-300 overflow-hidden">

      {/* ═══════════════════════════════════════════════
          HEADER STRIP
         ═══════════════════════════════════════════════ */}
      <header className="shrink-0 flex items-center justify-between border-b border-slate-800 bg-black/40 rounded-t px-5 py-3 mb-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-slate-400" />
          <div>
            <h1 className="font-mono text-sm font-bold text-white tracking-wide uppercase">
              Counterparty Verification Perimeter
            </h1>
            <p className="font-mono text-[9px] text-slate-600 tracking-[0.15em] uppercase mt-0.5">
              KYC/AML Compliance Gate — Idenfy Provider
            </p>
          </div>
        </div>
        <TrustBadge />
      </header>

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT — TWO-COLUMN GRID
         ═══════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 grid grid-cols-5 gap-4">

        {/* ─────────────────────────────────────────────
            LEFT COLUMN — Current Status (3/5 width)
           ───────────────────────────────────────────── */}
        <div className="col-span-3 flex flex-col gap-4 min-h-0 overflow-y-auto">

          {/* Entity Details Card */}
          <div className="border border-slate-800 rounded bg-slate-900/40">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  Entity Profile
                </span>
              </div>
              <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
                Last Updated: {new Date(entity.lastUpdated).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <span className="block font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em] mb-0.5">
                  Legal Entity Name
                </span>
                <span className="font-mono text-sm text-white font-medium">
                  {entity.legalName}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em] mb-0.5">
                  Entity Type
                </span>
                <span className="font-mono text-sm text-slate-300">
                  {entity.entityType}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em] mb-0.5">
                  Jurisdiction
                </span>
                <span className="font-mono text-sm text-slate-300 flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-slate-500" />
                  {entity.jurisdiction}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em] mb-0.5">
                  Registration Number
                </span>
                <span className="font-mono text-sm text-slate-300 tabular-nums">
                  {entity.registrationNumber}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em] mb-0.5">
                  Primary Contact
                </span>
                <span className="font-mono text-sm text-slate-300 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-slate-500" />
                  {entity.primaryContact}
                </span>
              </div>
              <div>
                <span className="block font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em] mb-0.5">
                  Incorporation Date
                </span>
                <span className="font-mono text-sm text-slate-300 tabular-nums">
                  {new Date(entity.incorporationDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* KYC State Banner */}
          <div className={`border rounded px-4 py-3 flex items-center justify-between ${kycConfig.borderColor} ${kycConfig.bgColor}`}>
            <div className="flex items-center gap-3">
              <KycIcon className={`h-5 w-5 ${kycConfig.color}`} />
              <div>
                <span className="block font-mono text-[8px] text-slate-500 uppercase tracking-[0.15em]">
                  KYC Compliance State
                </span>
                <span className={`font-mono text-sm font-bold tracking-wider ${kycConfig.color}`}>
                  {kycConfig.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${kycConfig.pulseColor} shadow-[0_0_6px_currentColor] animate-pulse`} />
              <span className="font-mono text-[8px] text-slate-600 uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="border border-slate-800 rounded bg-slate-900/40 flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                  Compliance Checklist
                </span>
              </div>
              <span className="font-mono text-[9px] text-slate-500">
                <span className="text-emerald-400 font-bold">{completedCount}</span>
                <span className="text-slate-700 mx-1">/</span>
                <span>{totalCount}</span>
                <span className="text-slate-700 ml-1">items cleared</span>
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/50">
              {checklist.map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {getChecklistIcon(item.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-white">
                        {item.label}
                      </span>
                      <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                        item.status === "complete"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : item.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────
            RIGHT COLUMN — Idenfy Gateway (2/5 width)
           ───────────────────────────────────────────── */}
        <div className="col-span-2 flex flex-col gap-4 min-h-0">

          {/* Idenfy Gateway Card */}
          <div className="border-2 border-slate-700 rounded bg-linear-to-b from-slate-800/50 to-transparent flex-1 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Scan className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-[0.15em]">
                  Idenfy Compliance Gateway
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-500 leading-relaxed">
                Complete your identity verification perimeter to unlock
                settlement access. All biometric data is processed exclusively
                by Idenfy under their EU GDPR-compliant infrastructure.
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-between p-5">
              {/* Required steps */}
              <div className="space-y-3">
                <span className="font-mono text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
                  Verification Sequence
                </span>

                {[
                  {
                    step: "01",
                    title: "Document Capture",
                    desc: "Government-issued ID (passport, national ID, or driver's license)",
                  },
                  {
                    step: "02",
                    title: "3D Liveness Detection",
                    desc: "Active liveness check — real-time biometric verification",
                  },
                  {
                    step: "03",
                    title: "AML/PEP Screening",
                    desc: "Automated sanctions, PEP, and adverse media cross-reference",
                  },
                  {
                    step: "04",
                    title: "Corporate Document Extraction",
                    desc: "OCR extraction and validation of corporate formation documents",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="font-mono text-[10px] font-bold text-slate-500 mt-0.5 shrink-0">
                      {item.step}
                    </span>
                    <div>
                      <span className="font-mono text-xs text-white block">
                        {item.title}
                      </span>
                      <span className="font-mono text-[9px] text-slate-600 block leading-relaxed">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Idenfy Session Trigger */}
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleInitializeIdenfySession}
                  disabled={isInitializing || entity.kycState === "APPROVED"}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded border-2 font-mono text-sm font-bold uppercase tracking-[0.15em] transition-all duration-200 ${
                    entity.kycState === "APPROVED"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 cursor-default"
                      : isInitializing
                      ? "border-slate-600 bg-slate-800 text-slate-400 cursor-wait"
                      : "border-slate-600 bg-white text-slate-950 hover:bg-slate-100 hover:border-slate-500 cursor-pointer active:scale-[0.98]"
                  }`}
                >
                  {entity.kycState === "APPROVED" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Perimeter Cleared
                    </>
                  ) : isInitializing ? (
                    <>
                      <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Initializing Secure Session…
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-5 w-5" />
                      Initialize Secure Idenfy Session
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {/* Security notice */}
                <div className="flex items-start gap-2 px-3 py-2 rounded border border-slate-800 bg-slate-900/30">
                  <Lock className="h-3 w-3 text-slate-600 mt-0.5 shrink-0" />
                  <p className="font-mono text-[8px] text-slate-600 leading-relaxed">
                    Session tokens are generated server-side via <code className="text-slate-500">idenfy-adapter.ts</code> and
                    expire after 30 minutes. No biometric data is stored on AurumShield infrastructure.
                    Verification results are returned via encrypted webhook to <code className="text-slate-500">/api/compliance/idenfy/webhook</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Attestation Footer */}
          <div className="shrink-0 border border-slate-800 rounded bg-slate-900/30 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[8px] text-slate-600 uppercase tracking-[0.15em] font-bold">
                Provider
              </span>
              <span className="font-mono text-[9px] text-slate-400 font-bold">
                Idenfy
              </span>
            </div>
            <div className="space-y-1">
              {[
                { label: "Standard", value: "eIDAS / GDPR Compliant" },
                { label: "Liveness", value: "3D Active — ISO/IEC 30107-3" },
                { label: "Coverage", value: "195 Countries / 3,000+ Document Types" },
                { label: "SLA", value: "< 10s median verification time" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="font-mono text-[8px] text-slate-700 uppercase tracking-wider">
                    {row.label}
                  </span>
                  <span className="font-mono text-[9px] text-slate-500">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
