/* ================================================================
   CASE ASSIGNMENT & TASK SERVICE
   ================================================================
   Phase 5.1: Manages reviewer queues, dynamic task generation,
   and task completion gating for compliance cases.

   SERVICES:
     assignCase()        — Assign a reviewer to a case
     generateCaseTasks() — Dynamically generate tasks from failure reasons
     completeTask()      — Mark task done + gate on all-required-complete

   When all required tasks on a case are COMPLETED or WAIVED,
   the case automatically transitions to READY_FOR_DISPOSITION.

   Uses Drizzle ORM for type-safe database operations.
   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { eq, and, inArray } from "drizzle-orm";
import {
  coCases,
  coCaseTasks,
  coChecks,
  type CoCase,
  type CoCaseTask,
} from "@/db/schema/compliance";
import { getDb } from "@/db/drizzle";
import { appendEvent } from "./audit-log";

// ─── TYPES ─────────────────────────────────────────────────────────────────────

export interface AssignCaseResult {
  caseId: string;
  reviewerId: string;
  previousReviewerId: string | null;
  assignedAt: string;
}

export interface GenerateTasksResult {
  caseId: string;
  tasksGenerated: number;
  tasks: TaskSummary[];
}

export interface TaskSummary {
  taskId: string;
  taskType: string;
  description: string;
  required: boolean;
}

export interface CompleteTaskResult {
  taskId: string;
  caseId: string;
  taskType: string;
  completedAt: string;
  allRequiredComplete: boolean;
  caseTransitioned: boolean;
  newCaseStatus: string | null;
}

// ─── ERROR CLASSES ─────────────────────────────────────────────────────────────

export class CaseNotFoundError extends Error {
  constructor(caseId: string) {
    super(`NOT_FOUND: Compliance case ${caseId} does not exist.`);
    this.name = "CaseNotFoundError";
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`NOT_FOUND: Case task ${taskId} does not exist.`);
    this.name = "TaskNotFoundError";
  }
}

export class TaskAlreadyCompleteError extends Error {
  constructor(taskId: string) {
    super(`ALREADY_COMPLETE: Task ${taskId} is already completed or waived.`);
    this.name = "TaskAlreadyCompleteError";
  }
}

export class CaseNotReviewableError extends Error {
  constructor(caseId: string, status: string) {
    super(
      `NOT_REVIEWABLE: Case ${caseId} has status "${status}" — ` +
        `must be AWAITING_INTERNAL_REVIEW or ESCALATED for assignment.`,
    );
    this.name = "CaseNotReviewableError";
  }
}

// ─── TASK GENERATION RULES ─────────────────────────────────────────────────────

/**
 * Maps failure signals to reviewer task definitions.
 * Each rule has a match function and the task it generates.
 */
interface TaskRule {
  /** Unique task type identifier */
  taskType: string;
  /** Human-readable description of the required action */
  description: string;
  /** Whether this task is required for case disposition */
  required: boolean;
  /** Predicate to determine if this task should be generated */
  match: (context: TaskGenerationContext) => boolean;
}

interface TaskGenerationContext {
  complianceCase: CoCase;
  checks: Array<{
    checkType: string;
    normalizedVerdict: string | null;
    resultCode: string | null;
  }>;
  /** Failure reason from the case's closedReason or from review engines */
  closedReason: string | null;
}

const TASK_RULES: TaskRule[] = [
  // ── Sanctions Tasks ──
  {
    taskType: "CLEAR_FALSE_POSITIVE",
    description:
      "Review and clear the potential sanctions match. Determine if this is a true " +
      "positive or false positive. Document evidence and reasoning.",
    required: true,
    match: (ctx) =>
      ctx.checks.some(
        (c) =>
          c.checkType === "SANCTIONS" &&
          (c.normalizedVerdict === "REVIEW" ||
            c.resultCode === "POSSIBLE_MATCH"),
      ),
  },
  {
    taskType: "ESCALATE_SANCTIONS_HIT",
    description:
      "Confirmed sanctions match detected. Escalate to MLRO for final determination " +
      "and potential SAR filing.",
    required: true,
    match: (ctx) =>
      ctx.checks.some(
        (c) =>
          c.checkType === "SANCTIONS" &&
          c.normalizedVerdict === "FAIL" &&
          (c.resultCode === "CONFIRMED_MATCH" ||
            c.resultCode === "TRUE_POSITIVE"),
      ),
  },

  // ── PEP Tasks ──
  {
    taskType: "REVIEW_PEP_MATCH",
    description:
      "Politically Exposed Person match flagged. Review the match details and " +
      "apply Enhanced Due Diligence procedures.",
    required: true,
    match: (ctx) =>
      ctx.checks.some(
        (c) =>
          c.checkType === "PEP" &&
          (c.normalizedVerdict === "REVIEW" || c.normalizedVerdict === "FAIL"),
      ),
  },

  // ── Adverse Media Tasks ──
  {
    taskType: "REVIEW_ADVERSE_MEDIA",
    description:
      "Adverse media alerts found for this subject. Assess materiality and " +
      "document risk impact assessment.",
    required: true,
    match: (ctx) =>
      ctx.checks.some(
        (c) =>
          c.checkType === "ADVERSE_MEDIA" &&
          (c.normalizedVerdict === "REVIEW" || c.normalizedVerdict === "FAIL"),
      ),
  },

  // ── Source of Funds/Wealth Tasks ──
  {
    taskType: "VERIFY_SOURCE_OF_FUNDS",
    description:
      "Source of funds documentation is incomplete or flagged. Request and verify " +
      "additional documentation from the subject.",
    required: true,
    match: (ctx) =>
      ctx.checks.some(
        (c) =>
          (c.checkType === "SOURCE_OF_FUNDS" ||
            c.checkType === "SOURCE_OF_WEALTH") &&
          c.normalizedVerdict !== "PASS",
      ),
  },

  // ── Shipment Review Tasks ──
  {
    taskType: "VERIFY_TRANSIT_EXCEPTION",
    description:
      "Chain of custody integrity violation detected during transit. " +
      "Contact the armored carrier and verify the shipment seal status and timeline.",
    required: true,
    match: (ctx) =>
      ctx.complianceCase.caseType === "PHYSICAL_SHIPMENT_REVIEW" &&
      (ctx.closedReason?.includes("seal") === true ||
        ctx.closedReason?.includes("Seal") === true ||
        ctx.closedReason?.includes("timeline") === true ||
        ctx.closedReason?.includes("Timeline") === true),
  },
  {
    taskType: "INVESTIGATE_FAILED_VERIFICATION",
    description:
      "A chain of custody verification event returned FAILED. " +
      "Investigate the circumstances and document findings.",
    required: true,
    match: (ctx) =>
      ctx.complianceCase.caseType === "PHYSICAL_SHIPMENT_REVIEW" &&
      (ctx.closedReason?.includes("FAILED") === true),
  },

  // ── Refinery Review Tasks ──
  {
    taskType: "RECONCILE_ASSAY_WEIGHT",
    description:
      "Assay weight values failed validation. Reconcile the discrepancy between " +
      "declared and assayed weights. Contact the refinery for clarification.",
    required: true,
    match: (ctx) =>
      ctx.complianceCase.caseType === "REFINERY_INTAKE_REVIEW" &&
      (ctx.closedReason?.includes("weight") === true ||
        ctx.closedReason?.includes("Weight") === true),
  },
  {
    taskType: "VERIFY_ASSAY_CERTIFICATE",
    description:
      "Assay certificate reference is missing or invalid. Obtain and verify " +
      "the original certificate from the refinery.",
    required: true,
    match: (ctx) =>
      ctx.complianceCase.caseType === "REFINERY_INTAKE_REVIEW" &&
      (ctx.closedReason?.includes("certificate") === true ||
        ctx.closedReason?.includes("Certificate") === true),
  },
  {
    taskType: "RECONCILE_PAYABLE_VALUE",
    description:
      "Payable value calculation does not match the stored value within tolerance. " +
      "Verify oracle price, discount rate, and recalculate.",
    required: true,
    match: (ctx) =>
      ctx.complianceCase.caseType === "REFINERY_INTAKE_REVIEW" &&
      (ctx.closedReason?.includes("value") === true ||
        ctx.closedReason?.includes("Value") === true ||
        ctx.closedReason?.includes("mismatch") === true),
  },
  {
    taskType: "VERIFY_FINENESS",
    description:
      "Assay fineness is outside acceptable bounds. Verify with the refinery " +
      "and document the corrective action.",
    required: true,
    match: (ctx) =>
      ctx.complianceCase.caseType === "REFINERY_INTAKE_REVIEW" &&
      (ctx.closedReason?.includes("fineness") === true ||
        ctx.closedReason?.includes("Fineness") === true),
  },

  // ── Wallet / KYT Tasks ──
  {
    taskType: "REVIEW_WALLET_RISK",
    description:
      "Wallet screening returned elevated risk. Review the Elliptic/Chainalysis " +
      "report and determine if the wallet is safe for settlement.",
    required: true,
    match: (ctx) =>
      ctx.complianceCase.caseType === "EVENT_DRIVEN_REVIEW" &&
      (ctx.closedReason?.includes("WALLET") === true ||
        ctx.closedReason?.includes("wallet") === true ||
        ctx.closedReason?.includes("sanctions_exposure") === true),
  },

  // ── General Review Task (catch-all) ──
  {
    taskType: "GENERAL_REVIEW",
    description:
      "This case requires manual compliance review. Assess all flagged items " +
      "and document your findings.",
    required: false,
    match: (ctx) =>
      ctx.complianceCase.status === "AWAITING_INTERNAL_REVIEW" ||
      ctx.complianceCase.status === "ESCALATED",
  },
];

// ─── SERVICE FUNCTIONS ─────────────────────────────────────────────────────────

/**
 * Assign a reviewer to a compliance case.
 *
 * RULES:
 *   - Case must be in AWAITING_INTERNAL_REVIEW, ESCALATED, or OPEN status
 *   - Updates assigned_reviewer_id on the case
 *   - Logs REVIEWER_ASSIGNED via audit trail
 *
 * @param caseId     - UUID of the case to assign
 * @param reviewerId - UUID of the reviewer being assigned
 * @param userId     - The operator performing the assignment
 */
export async function assignCase(
  caseId: string,
  reviewerId: string,
  userId: string,
): Promise<AssignCaseResult> {
  const db = await getDb();

  const [complianceCase] = await db
    .select()
    .from(coCases)
    .where(eq(coCases.id, caseId))
    .limit(1);

  if (!complianceCase) {
    throw new CaseNotFoundError(caseId);
  }

  const reviewableStatuses = [
    "OPEN",
    "AWAITING_INTERNAL_REVIEW",
    "ESCALATED",
  ] as const;

  if (!(reviewableStatuses as readonly string[]).includes(complianceCase.status)) {
    throw new CaseNotReviewableError(caseId, complianceCase.status);
  }

  const previousReviewerId = complianceCase.assignedReviewerId;
  const assignedAt = new Date().toISOString();

  // CONCURRENCY: Conditional UPDATE — only assign if case is still reviewable.
  // If another operator transitioned the case between our SELECT and UPDATE,
  // the rowCount will be 0 and we throw CaseNotReviewableError.
  await db
    .update(coCases)
    .set({ assignedReviewerId: reviewerId })
    .where(
      and(
        eq(coCases.id, caseId),
        inArray(coCases.status, [...reviewableStatuses]),
      ),
    );

  await appendEvent(
    "COMPLIANCE_CASE",
    caseId,
    "REVIEWER_ASSIGNED",
    {
      caseId,
      reviewerId,
      previousReviewerId,
      caseType: complianceCase.caseType,
      caseStatus: complianceCase.status,
    },
    userId,
  );

  console.log(
    `[CASE_SERVICE] Reviewer assigned: case=${caseId}, ` +
      `reviewer=${reviewerId}, previous=${previousReviewerId ?? "none"}`,
  );

  return {
    caseId,
    reviewerId,
    previousReviewerId,
    assignedAt,
  };
}

/**
 * Dynamically generate reviewer tasks based on case failure reasons.
 *
 * LOGIC:
 *   1. Fetch the case and its associated checks
 *   2. Build a TaskGenerationContext from failure signals
 *   3. Evaluate each TASK_RULE against the context
 *   4. Create matching tasks in co_case_tasks
 *   5. Assign tasks to the case's reviewer if present
 *
 * @param caseId - UUID of the case to generate tasks for
 * @param userId - The operator triggering task generation
 */
export async function generateCaseTasks(
  caseId: string,
  userId: string,
): Promise<GenerateTasksResult> {
  const db = await getDb();

  const [complianceCase] = await db
    .select()
    .from(coCases)
    .where(eq(coCases.id, caseId))
    .limit(1);

  if (!complianceCase) {
    throw new CaseNotFoundError(caseId);
  }

  // Fetch associated checks
  const checks = await db
    .select()
    .from(coChecks)
    .where(eq(coChecks.caseId, caseId));

  // Build context
  const context: TaskGenerationContext = {
    complianceCase,
    checks: checks.map((c) => ({
      checkType: c.checkType,
      normalizedVerdict: c.normalizedVerdict,
      resultCode: c.resultCode,
    })),
    closedReason: complianceCase.closedReason,
  };

  // Evaluate rules and collect matching tasks
  const matchingTasks: TaskRule[] = [];
  const seenTypes = new Set<string>();

  for (const rule of TASK_RULES) {
    if (rule.match(context) && !seenTypes.has(rule.taskType)) {
      matchingTasks.push(rule);
      seenTypes.add(rule.taskType);
    }
  }

  // Insert tasks
  const taskSummaries: TaskSummary[] = [];

  for (const task of matchingTasks) {
    const [inserted] = await db
      .insert(coCaseTasks)
      .values({
        caseId,
        taskType: task.taskType,
        description: task.description,
        required: task.required,
        assigneeId: complianceCase.assignedReviewerId,
      })
      .returning();

    taskSummaries.push({
      taskId: inserted.id,
      taskType: task.taskType,
      description: task.description,
      required: task.required,
    });

    await appendEvent(
      "COMPLIANCE_CASE",
      caseId,
      "TASK_GENERATED",
      {
        caseId,
        taskId: inserted.id,
        taskType: task.taskType,
        description: task.description,
        required: task.required,
        assigneeId: complianceCase.assignedReviewerId,
      },
      userId,
    );
  }

  console.log(
    `[CASE_SERVICE] Generated ${taskSummaries.length} tasks for case=${caseId}: ` +
      taskSummaries.map((t) => t.taskType).join(", "),
  );

  return {
    caseId,
    tasksGenerated: taskSummaries.length,
    tasks: taskSummaries,
  };
}

/**
 * Complete a case task and check the all-required gate.
 *
 * FLOW:
 *   1. Fetch the task → verify it exists and is PENDING
 *   2. Mark it COMPLETED with notes and timestamp
 *   3. Check if ALL required tasks for the parent case are now done
 *   4. If yes → transition case to READY_FOR_DISPOSITION
 *   5. Audit log TASK_COMPLETED
 *
 * @param taskId - UUID of the task to complete
 * @param userId - The reviewer completing the task
 * @param notes  - Completion notes documenting the reviewer's findings
 */
export async function completeTask(
  taskId: string,
  userId: string,
  notes: string,
): Promise<CompleteTaskResult> {
  const db = await getDb();

  /* ════════════════════════════════════════════════════════════════
     CONCURRENCY: Task completion + all-required gate check + case
     transition wrapped in single transaction. Prevents:
       - Two concurrent completions of the last two required tasks
         both reading incomplete state and both transitioning the case
       - A task being completed twice by different reviewers
     ════════════════════════════════════════════════════════════════ */

  return await db.transaction(async (tx) => {
    // ── Step 1: Fetch and validate the task ──

    const [task] = await tx
      .select()
      .from(coCaseTasks)
      .where(eq(coCaseTasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new TaskNotFoundError(taskId);
    }

    if (task.status !== "PENDING") {
      throw new TaskAlreadyCompleteError(taskId);
    }

    const completedAt = new Date();

    // ── Step 2: Conditional UPDATE — only complete if still PENDING ──
    // Guards against two reviewers racing to complete the same task.

    const updateResult = await tx
      .update(coCaseTasks)
      .set({
        status: "COMPLETED",
        completedAt,
        completedBy: userId,
        completionNotes: notes,
      })
      .where(and(eq(coCaseTasks.id, taskId), eq(coCaseTasks.status, "PENDING")));

    if ((updateResult as unknown as { rowCount: number }).rowCount === 0) {
      throw new TaskAlreadyCompleteError(taskId);
    }

    // ── Step 3: Check the all-required gate (inside transaction) ──

    const allTasks = await tx
      .select()
      .from(coCaseTasks)
      .where(eq(coCaseTasks.caseId, task.caseId));

    const requiredTasks = allTasks.filter((t) => t.required === true);
    const allRequiredComplete = requiredTasks.every(
      (t) =>
        t.id === taskId || // The one we just completed
        t.status === "COMPLETED" ||
        t.status === "WAIVED",
    );

    // ── Step 4: Conditional case transition (inside transaction) ──
    // Only transition if case is NOT already READY_FOR_DISPOSITION.
    // Prevents duplicate transitions from concurrent task completions.

    let caseTransitioned = false;
    let newCaseStatus: string | null = null;

    if (allRequiredComplete && requiredTasks.length > 0) {
      const caseUpdateResult = await tx
        .update(coCases)
        .set({ status: "READY_FOR_DISPOSITION" })
        .where(
          and(
            eq(coCases.id, task.caseId),
            // Guard: only if NOT already in a terminal/ready state
            inArray(coCases.status, [
              "OPEN",
              "AWAITING_INTERNAL_REVIEW",
              "ESCALATED",
              "AWAITING_SUBJECT",
              "AWAITING_PROVIDER",
            ]),
          ),
        );

      if ((caseUpdateResult as unknown as { rowCount: number }).rowCount > 0) {
        caseTransitioned = true;
        newCaseStatus = "READY_FOR_DISPOSITION";

        console.log(
          `[CASE_SERVICE] ✅ All required tasks complete — case ${task.caseId} → READY_FOR_DISPOSITION`,
        );
      }
    }

    // ── Step 5: Audit log ──

    await appendEvent(
      "COMPLIANCE_CASE",
      task.caseId,
      "TASK_COMPLETED",
      {
        caseId: task.caseId,
        taskId,
        taskType: task.taskType,
        completedBy: userId,
        completionNotes: notes,
        allRequiredComplete,
        caseTransitioned,
        newCaseStatus: newCaseStatus ?? undefined,
      },
      userId,
    );

    console.log(
      `[CASE_SERVICE] Task completed: task=${taskId} (${task.taskType}), ` +
        `case=${task.caseId}, allRequired=${allRequiredComplete}`,
    );

    return {
      taskId,
      caseId: task.caseId,
      taskType: task.taskType,
      completedAt: completedAt.toISOString(),
      allRequiredComplete,
      caseTransitioned,
      newCaseStatus,
    };
  }); // end transaction
}

// ─── QUERY HELPERS ─────────────────────────────────────────────────────────────

/**
 * Get all tasks for a case.
 */
export async function getTasksByCase(
  caseId: string,
): Promise<CoCaseTask[]> {
  const db = await getDb();
  return db
    .select()
    .from(coCaseTasks)
    .where(eq(coCaseTasks.caseId, caseId));
}

/**
 * Get all pending tasks assigned to a reviewer.
 */
export async function getPendingTasksByReviewer(
  reviewerId: string,
): Promise<CoCaseTask[]> {
  const db = await getDb();
  return db
    .select()
    .from(coCaseTasks)
    .where(
      and(
        eq(coCaseTasks.assigneeId, reviewerId),
        eq(coCaseTasks.status, "PENDING"),
      ),
    );
}

/**
 * Waive a non-critical task (marks as WAIVED instead of COMPLETED).
 * Only non-required tasks can be waived without affecting the gate.
 */
export async function waiveTask(
  taskId: string,
  userId: string,
  notes: string,
): Promise<void> {
  const db = await getDb();

  const [task] = await db
    .select()
    .from(coCaseTasks)
    .where(eq(coCaseTasks.id, taskId))
    .limit(1);

  if (!task) {
    throw new TaskNotFoundError(taskId);
  }

  if (task.status !== "PENDING") {
    throw new TaskAlreadyCompleteError(taskId);
  }

  await db
    .update(coCaseTasks)
    .set({
      status: "WAIVED",
      completedAt: new Date(),
      completedBy: userId,
      completionNotes: notes,
    })
    .where(eq(coCaseTasks.id, taskId));

  console.log(
    `[CASE_SERVICE] Task waived: task=${taskId} (${task.taskType}), case=${task.caseId}`,
  );
}
