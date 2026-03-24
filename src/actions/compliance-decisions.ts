/* ================================================================
   COMPLIANCE DECISIONS — Server Action Bridge
   ================================================================
   Secure server actions that call the backend compliance engines.
   These are the ONLY entry points for privileged compliance actions
   from the frontend.

   All actions:
     1. Accept user parameters from the client
     2. Call the backend engine (case-service or manual-review-rules)
     3. Revalidate the affected page path
     4. Return a structured result or error

   MUST NOT be imported in client components — called via server
   action invocation only.
   ================================================================ */

"use server";

import { revalidatePath } from "next/cache";
import {
  assignCase,
  completeTask,
} from "@/lib/compliance/case-service";
import {
  dispositionCase,
  type DispositionVerdict,
} from "@/lib/compliance/manual-review-rules";

// ─── RESULT TYPES ──────────────────────────────────────────────────────────────

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorType?: string;
}

// ─── ASSIGN CASE ───────────────────────────────────────────────────────────────

/**
 * Assign a reviewer to a compliance case.
 * Calls assignCase from case-service.ts.
 */
export async function assignCaseAction(
  caseId: string,
  reviewerId: string,
): Promise<ActionResult> {
  try {
    const result = await assignCase(caseId, reviewerId, reviewerId);

    revalidatePath(`/compliance/inbox/${caseId}`);
    revalidatePath("/compliance/inbox");

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const errorType = err instanceof Error ? err.name : "UnknownError";
    console.error(`[assignCaseAction] Failed: ${message}`);
    return {
      success: false,
      error: message,
      errorType,
    };
  }
}

// ─── COMPLETE TASK ─────────────────────────────────────────────────────────────

/**
 * Complete a reviewer task with notes.
 * Calls completeTask from case-service.ts.
 * When all required tasks are done, the case auto-transitions
 * to READY_FOR_DISPOSITION.
 */
export async function completeTaskAction(
  taskId: string,
  userId: string,
  notes: string,
): Promise<ActionResult> {
  try {
    if (!notes.trim()) {
      return {
        success: false,
        error: "Completion notes are required.",
        errorType: "ValidationError",
      };
    }

    const result = await completeTask(taskId, userId, notes);

    revalidatePath(`/compliance/inbox/${result.caseId}`);
    revalidatePath("/compliance/inbox");

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const errorType = err instanceof Error ? err.name : "UnknownError";
    console.error(`[completeTaskAction] Failed: ${message}`);
    return {
      success: false,
      error: message,
      errorType,
    };
  }
}

// ─── SUBMIT DISPOSITION ────────────────────────────────────────────────────────

/**
 * Submit the final disposition on a compliance case.
 * Calls dispositionCase from manual-review-rules.ts.
 *
 * Handles DualSignoffRequiredError gracefully — returns it as
 * a structured error so the UI can show appropriate messaging.
 */
export async function submitDispositionAction(
  caseId: string,
  reviewerId: string,
  verdict: "APPROVED" | "REJECTED",
  rationale: string,
): Promise<ActionResult> {
  try {
    if (!rationale.trim()) {
      return {
        success: false,
        error: "Rationale is required for disposition.",
        errorType: "ValidationError",
      };
    }

    if (rationale.trim().length < 10) {
      return {
        success: false,
        error: "Rationale must be at least 10 characters.",
        errorType: "ValidationError",
      };
    }

    const result = await dispositionCase(
      caseId,
      reviewerId,
      verdict as DispositionVerdict,
      rationale,
    );

    revalidatePath(`/compliance/inbox/${caseId}`);
    revalidatePath("/compliance/inbox");

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const errorType = err instanceof Error ? err.name : "UnknownError";
    console.error(`[submitDispositionAction] Failed: ${message}`);
    return {
      success: false,
      error: message,
      errorType,
    };
  }
}
