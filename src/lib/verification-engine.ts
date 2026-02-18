/* ================================================================
   VERIFICATION ENGINE — Deterministic Identity Perimeter
   ================================================================
   States: NOT_STARTED → IN_PROGRESS → NEEDS_REVIEW → VERIFIED → REJECTED
   Tracks: INDIVIDUAL_KYC (4 steps) | BUSINESS_KYB (8 steps)
   All outcomes deterministic — derived from userId/orgId, no randomness.
   localStorage key: aurumshield:verification:<userId>
   ================================================================ */

import type {
  VerificationCase,
  VerificationStep,
  VerificationTrack,
  VerificationStatus,
  VerificationStepStatus,
  EvidenceItem,
} from "./mock-data";
import { mockEvidence } from "./mock-data";

/* ---------- Storage ---------- */

const STORAGE_PREFIX = "aurumshield:verification:";
const EVIDENCE_STORE_KEY = "aurumshield:evidence";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadVerificationCase(userId: string): VerificationCase | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return null;
  try { return JSON.parse(raw) as VerificationCase; } catch { return null; }
}

export function saveVerificationCase(vc: VerificationCase): void {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(vc.userId), JSON.stringify(vc));
}

/* ---------- Evidence Store ---------- */

function loadEvidenceStore(): EvidenceItem[] {
  if (!isBrowser()) return [...mockEvidence];
  const raw = localStorage.getItem(EVIDENCE_STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw) as EvidenceItem[]; } catch { /* fall through */ }
  }
  localStorage.setItem(EVIDENCE_STORE_KEY, JSON.stringify(mockEvidence));
  return [...mockEvidence];
}

function saveEvidenceStore(items: EvidenceItem[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(EVIDENCE_STORE_KEY, JSON.stringify(items));
}

/** Create a deterministic evidence stub for a verification step. */
export function createEvidenceStub(stepId: string, userId: string, title: string): EvidenceItem {
  const items = loadEvidenceStore();
  const id = `ev-${userId}-${stepId}`;
  const existing = items.find((e) => e.id === id);
  if (existing) return existing;

  const item: EvidenceItem = {
    id,
    title,
    type: "document",
    date: new Date().toISOString().slice(0, 10),
    author: `Identity Perimeter — ${userId}`,
    classification: "restricted",
    summary: `Verification evidence for step "${stepId}" — submitted by ${userId}.`,
    pages: 1,
  };
  items.push(item);
  saveEvidenceStore(items);
  return item;
}

export function getEvidenceStore(): EvidenceItem[] {
  return loadEvidenceStore();
}

/* ---------- Step Definitions ---------- */

const KYC_STEPS: { id: string; title: string }[] = [
  { id: "email_phone", title: "Email & Phone Confirmation" },
  { id: "id_document", title: "Government ID Capture" },
  { id: "selfie_liveness", title: "Selfie / Liveness Verification" },
  { id: "sanctions_pep", title: "Sanctions & PEP Screening" },
];

const KYB_EXTRA_STEPS: { id: string; title: string }[] = [
  { id: "business_registration", title: "Business Registration Filing" },
  { id: "ubo_capture", title: "Ultimate Beneficial Owner Declaration" },
  { id: "proof_of_address", title: "Proof of Registered Address" },
  { id: "source_of_funds", title: "Source of Funds Declaration" },
];

function getStepDefs(track: VerificationTrack): { id: string; title: string }[] {
  return track === "BUSINESS_KYB"
    ? [...KYC_STEPS, ...KYB_EXTRA_STEPS]
    : [...KYC_STEPS];
}

/* ---------- Deterministic Outcome Rules ---------- */

function lastDigit(s: string): number {
  const match = s.match(/(\d)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Deterministic sanctions/PEP result based on orgId last digit. */
export function determineSanctionsOutcome(orgId: string): { status: VerificationStepStatus; reasonCode?: string; notes?: string } {
  const d = lastDigit(orgId);
  if (d === 3) return { status: "SUBMITTED", reasonCode: "SANCTIONS_POSSIBLE_MATCH", notes: "Possible match detected — escalated to Compliance Desk for manual review." };
  if (d === 7) return { status: "FAILED", reasonCode: "SANCTIONS_CONFIRMED_MATCH", notes: "Confirmed match against OFAC SDN list — case rejected." };
  return { status: "PASSED" };
}

/** Deterministic liveness result based on userId last digit. */
export function determineLivenessOutcome(userId: string): { status: VerificationStepStatus; reasonCode?: string; notes?: string } {
  const d = lastDigit(userId);
  if (d === 9) return { status: "FAILED", reasonCode: "LIVENESS_FAILED", notes: "Liveness verification failed — no motion detected in submitted frames." };
  return { status: "PASSED" };
}

/** Deterministic UBO result — company must have ≥1 UBO declared. */
export function determineUBOOutcome(orgType: "individual" | "company"): { status: VerificationStepStatus; reasonCode?: string; notes?: string } {
  // In the mock, company orgs always have at least 1 UBO; we'll treat orgType="individual" as auto-pass
  if (orgType === "individual") return { status: "PASSED", notes: "Individual track — UBO declaration not required." };
  return { status: "PASSED", notes: "UBO declaration received — 2 beneficial owners identified." };
}

/* ---------- Risk Tier Computation ---------- */

export function computeRiskTier(steps: VerificationStep[]): "LOW" | "ELEVATED" | "HIGH" {
  if (steps.some((s) => s.status === "FAILED")) return "HIGH";
  if (steps.some((s) => s.reasonCode?.startsWith("SANCTIONS_POSSIBLE"))) return "ELEVATED";
  if (steps.some((s) => s.status === "SUBMITTED" && s.decidedAt === null)) return "ELEVATED";
  return "LOW";
}

/* ---------- Case Status Computation ---------- */

export function computeCaseStatus(steps: VerificationStep[]): VerificationStatus {
  if (steps.some((s) => s.status === "FAILED")) return "REJECTED";
  if (steps.some((s) => s.reasonCode?.startsWith("SANCTIONS_POSSIBLE"))) return "NEEDS_REVIEW";
  if (steps.every((s) => s.status === "PASSED")) return "VERIFIED";
  if (steps.some((s) => s.status !== "LOCKED")) return "IN_PROGRESS";
  return "NOT_STARTED";
}

/* ---------- Find Next Required Step ---------- */

function findNextRequiredStepId(steps: VerificationStep[]): string | null {
  const next = steps.find((s) => s.status === "PENDING" || s.status === "LOCKED");
  return next?.id ?? null;
}

/* ---------- Public API ---------- */

/** Initialize a new verification case for a user. */
export function initCase(
  track: VerificationTrack,
  userId: string,
  _orgId: string,
): VerificationCase {
  const now = new Date().toISOString();
  const defs = getStepDefs(track);
  const steps: VerificationStep[] = defs.map((d, i) => ({
    id: d.id,
    title: d.title,
    status: i === 0 ? "PENDING" : "LOCKED",
    submittedAt: null,
    decidedAt: null,
    decidedBy: null,
  }));

  const vc: VerificationCase = {
    userId,
    track,
    status: "IN_PROGRESS",
    riskTier: "LOW",
    createdAt: now,
    updatedAt: now,
    lastScreenedAt: null,
    nextRequiredStepId: steps[0]?.id ?? null,
    steps,
    evidenceIds: [],
    audit: [{
      at: now,
      actor: userId,
      action: "CASE_INITIATED",
      detail: `Verification case opened — track: ${track}`,
    }],
  };
  saveVerificationCase(vc);
  return vc;
}

/** Submit a step with mock payload. Deterministic outcomes applied. */
export function submitStep(
  existingCase: VerificationCase,
  stepId: string,
  orgId: string,
  orgType: "individual" | "company",
): VerificationCase {
  const now = new Date().toISOString();
  const vc = structuredClone(existingCase);
  const stepIdx = vc.steps.findIndex((s) => s.id === stepId);
  if (stepIdx === -1) return vc;

  const step = vc.steps[stepIdx];
  if (step.status !== "PENDING") return vc;

  step.submittedAt = now;

  // Create evidence stub for this step
  const evidence = createEvidenceStub(stepId, vc.userId, step.title);
  if (!vc.evidenceIds.includes(evidence.id)) {
    vc.evidenceIds.push(evidence.id);
  }

  // Deterministic outcome per step type
  let outcome: { status: VerificationStepStatus; reasonCode?: string; notes?: string };

  switch (stepId) {
    case "sanctions_pep":
      outcome = determineSanctionsOutcome(orgId);
      vc.lastScreenedAt = now;
      break;
    case "selfie_liveness":
      outcome = determineLivenessOutcome(vc.userId);
      break;
    case "ubo_capture":
      outcome = determineUBOOutcome(orgType);
      break;
    default:
      // email_phone, id_document, business_registration, proof_of_address, source_of_funds → auto-pass
      outcome = { status: "PASSED" };
      break;
  }

  step.status = outcome.status;
  step.decidedAt = outcome.status !== "SUBMITTED" ? now : null;
  step.decidedBy = outcome.status !== "SUBMITTED" ? "AUTO" : null;
  if (outcome.reasonCode) step.reasonCode = outcome.reasonCode;
  if (outcome.notes) step.notes = outcome.notes;

  // Unlock next step if current passed
  if (step.status === "PASSED" && stepIdx + 1 < vc.steps.length) {
    vc.steps[stepIdx + 1].status = "PENDING";
  }

  // Recompute case-level fields
  vc.riskTier = computeRiskTier(vc.steps);
  vc.status = computeCaseStatus(vc.steps);
  vc.nextRequiredStepId = findNextRequiredStepId(vc.steps);
  vc.updatedAt = now;

  vc.audit.push({
    at: now,
    actor: vc.userId,
    action: "STEP_SUBMITTED",
    detail: `Step "${step.title}" submitted — outcome: ${step.status}${step.reasonCode ? ` (${step.reasonCode})` : ""}`,
  });

  if (vc.status === "VERIFIED") {
    vc.audit.push({ at: now, actor: "AUTO", action: "CASE_VERIFIED", detail: "All steps passed — identity perimeter verified." });
  } else if (vc.status === "REJECTED") {
    vc.audit.push({ at: now, actor: "AUTO", action: "CASE_REJECTED", detail: `Case rejected — step "${step.title}" failed: ${step.reasonCode ?? "N/A"}` });
  } else if (vc.status === "NEEDS_REVIEW") {
    vc.audit.push({ at: now, actor: "AUTO", action: "CASE_ESCALATED", detail: `Case escalated to Compliance Desk — step "${step.title}": ${step.reasonCode}` });
  }

  saveVerificationCase(vc);
  return vc;
}

/** Get verification case for a user combined with the latest status. */
export function getVerificationCase(userId: string): VerificationCase | null {
  return loadVerificationCase(userId);
}

/** Get all step defs for a track. Exported for UI. */
export function getStepDefinitions(track: VerificationTrack): { id: string; title: string }[] {
  return getStepDefs(track);
}
