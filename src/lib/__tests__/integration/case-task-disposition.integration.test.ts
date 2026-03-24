/* ================================================================
   REAL DB-BACKED INTEGRATION TEST: Case / Task / Disposition
   ================================================================
   Validates the case assignment, task generation, and task
   completion lifecycle against a real PostgreSQL database.

   Tests:
     1. assignCase() writes assigned_reviewer_id to DB
     2. generateCaseTasks() creates task rows based on check failures
     3. completeTask() marks tasks COMPLETED and gates on all-required
     4. Case auto-transitions to READY_FOR_DISPOSITION when all done
     5. Audit events written for each lifecycle step
   ================================================================ */

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import {
  setupTestDb,
  getTestDb,
  resetTestDb,
  teardownTestDb,
  seedCaseWithTasksScenario,
} from "./db-harness";
import { coCases, coCaseTasks, coAuditEvents } from "@/db/schema/compliance";

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe("Case / Task / Disposition Persistence — Real DB", () => {
  it("assignCase() writes assigned_reviewer_id to the database", async () => {
    const scenario = await seedCaseWithTasksScenario();

    // Set case to AWAITING_INTERNAL_REVIEW (required for assignment)
    const db = getTestDb();
    await db
      .update(coCases)
      .set({ status: "AWAITING_INTERNAL_REVIEW" })
      .where(eq(coCases.id, scenario.caseId));

    const { assignCase } = await import("@/lib/compliance/case-service");

    const reviewerId = "reviewer-uuid-001";
    const result = await assignCase(scenario.caseId, reviewerId, "system-test");

    expect(result.caseId).toBe(scenario.caseId);
    expect(result.reviewerId).toBe(reviewerId);
    expect(result.previousReviewerId).toBeNull();

    // Verify in DB
    const [caseRow] = await db
      .select()
      .from(coCases)
      .where(eq(coCases.id, scenario.caseId))
      .limit(1);

    expect(caseRow.assignedReviewerId).toBe(reviewerId);
  });

  it("generateCaseTasks() creates task rows based on check failures", async () => {
    const scenario = await seedCaseWithTasksScenario();
    const db = getTestDb();

    const { generateCaseTasks } = await import(
      "@/lib/compliance/case-service"
    );

    const result = await generateCaseTasks(scenario.caseId, "system-test");

    expect(result.caseId).toBe(scenario.caseId);
    expect(result.tasksGenerated).toBeGreaterThanOrEqual(2);

    // Should have CLEAR_FALSE_POSITIVE (from SANCTIONS REVIEW)
    const hasSanctionsTask = result.tasks.some(
      (t) => t.taskType === "CLEAR_FALSE_POSITIVE",
    );
    expect(hasSanctionsTask).toBe(true);

    // Should have REVIEW_ADVERSE_MEDIA (from ADVERSE_MEDIA FAIL)
    const hasAdverseTask = result.tasks.some(
      (t) => t.taskType === "REVIEW_ADVERSE_MEDIA",
    );
    expect(hasAdverseTask).toBe(true);

    // Verify rows exist in DB
    const taskRows = await db
      .select()
      .from(coCaseTasks)
      .where(eq(coCaseTasks.caseId, scenario.caseId));

    expect(taskRows.length).toBe(result.tasksGenerated);
    expect(taskRows.every((t) => t.status === "PENDING")).toBe(true);
  });

  it("completeTask() marks task COMPLETED and verifies all-required gate", async () => {
    const scenario = await seedCaseWithTasksScenario();
    const db = getTestDb();

    const { generateCaseTasks, completeTask } = await import(
      "@/lib/compliance/case-service"
    );

    const generated = await generateCaseTasks(scenario.caseId, "system-test");
    expect(generated.tasksGenerated).toBeGreaterThanOrEqual(1);

    // Complete the first task
    const firstTask = generated.tasks[0];
    const completionResult = await completeTask(
      firstTask.taskId,
      "reviewer-001",
      "Reviewed and cleared. False positive confirmed.",
    );

    expect(completionResult.taskId).toBe(firstTask.taskId);
    expect(completionResult.caseId).toBe(scenario.caseId);
    expect(completionResult.completedAt).toBeTruthy();

    // Verify task row is COMPLETED in DB
    const [taskRow] = await db
      .select()
      .from(coCaseTasks)
      .where(eq(coCaseTasks.id, firstTask.taskId))
      .limit(1);

    expect(taskRow.status).toBe("COMPLETED");
    expect(taskRow.completedBy).toBe("reviewer-001");
    expect(taskRow.completionNotes).toContain("False positive");
  });

  it("case transitions to READY_FOR_DISPOSITION when all required tasks are completed", async () => {
    const scenario = await seedCaseWithTasksScenario();
    const db = getTestDb();

    const { generateCaseTasks, completeTask } = await import(
      "@/lib/compliance/case-service"
    );

    const generated = await generateCaseTasks(scenario.caseId, "system-test");

    // Complete ALL generated tasks
    let lastResult;
    for (const task of generated.tasks) {
      lastResult = await completeTask(
        task.taskId,
        "reviewer-001",
        `Completed: ${task.taskType}`,
      );
    }

    // The last completion should trigger case transition
    expect(lastResult!.allRequiredComplete).toBe(true);
    expect(lastResult!.caseTransitioned).toBe(true);
    expect(lastResult!.newCaseStatus).toBe("READY_FOR_DISPOSITION");

    // Verify case status in DB
    const [caseRow] = await db
      .select()
      .from(coCases)
      .where(eq(coCases.id, scenario.caseId))
      .limit(1);

    expect(caseRow.status).toBe("READY_FOR_DISPOSITION");
  });

  it("writes audit events for case assignment and task lifecycle", async () => {
    const scenario = await seedCaseWithTasksScenario();
    const db = getTestDb();

    // Set case to OPEN (assignable)
    await db
      .update(coCases)
      .set({ status: "OPEN" })
      .where(eq(coCases.id, scenario.caseId));

    const { assignCase, generateCaseTasks, completeTask } = await import(
      "@/lib/compliance/case-service"
    );

    await assignCase(scenario.caseId, "reviewer-001", "system-test");
    const generated = await generateCaseTasks(scenario.caseId, "system-test");
    await completeTask(
      generated.tasks[0].taskId,
      "reviewer-001",
      "Cleared.",
    );

    // Verify audit events
    const auditEvents = await db
      .select()
      .from(coAuditEvents)
      .where(eq(coAuditEvents.aggregateId, scenario.caseId));

    const eventTypes = auditEvents.map((e) => e.eventType);

    expect(eventTypes).toContain("REVIEWER_ASSIGNED");
    expect(eventTypes).toContain("TASK_GENERATED");
    expect(eventTypes).toContain("TASK_COMPLETED");
  });

  it("CaseNotFoundError thrown for nonexistent case", async () => {
    await seedCaseWithTasksScenario();

    const { assignCase } = await import("@/lib/compliance/case-service");

    await expect(
      assignCase("00000000-0000-0000-0000-000000000000", "reviewer-001", "system-test"),
    ).rejects.toThrow("NOT_FOUND");
  });
});
