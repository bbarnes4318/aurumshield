# Compliance UI Map

Route structure, components, data sources, and implementation status for the V3 Compliance Operating System frontend.

## Routes

| Route | Status | Purpose | Data Source |
|-------|--------|---------|-------------|
| `/compliance/inbox` | ✅ Done | Case queue inbox | `getComplianceCaseInbox()` |
| `/compliance/inbox/[caseId]` | ✅ Done | Full case detail (9 sections + actions) | `getComplianceCaseDetail()` |
| `/compliance/shipments/[shipmentId]` | ✅ Done | Shipment review (custody chain, logistics) | `getShipmentDetail()` |
| `/compliance/lots/[lotId]` | ✅ Done | Refinery lot review (assay economics) | `getLotDetail()` |
| `/compliance/settlements/[authorizationId]` | ✅ Done | Settlement authorization (6-gate pipeline) | `getSettlementDetail()` |
| `/compliance/cases/[caseId]` | ⚠️ Legacy V1 | V1 buyer-facing case detail | V1 `compliance_cases` API |
| `/compliance/training` | ✅ Existing | AML training module | `aml_training_logs` |

## Components

| Component | File | Type | Workstream |
|-----------|------|------|------------|
| `ComplianceInboxUI` | `app/compliance/inbox/ComplianceInboxUI.tsx` | Client | 2A |
| `CaseDetailUI` | `app/compliance/inbox/[caseId]/CaseDetailUI.tsx` | Client | 2B+2D |
| `DispositionPanel` | `app/compliance/inbox/[caseId]/DispositionPanel.tsx` | Client | 2D |
| `ShipmentReviewUI` | `app/compliance/shipments/[shipmentId]/ShipmentReviewUI.tsx` | Client | 2C |
| `LotReviewUI` | `app/compliance/lots/[lotId]/LotReviewUI.tsx` | Client | 2C |
| `SettlementAuthUI` | `app/compliance/settlements/[authorizationId]/SettlementAuthUI.tsx` | Client | 2C |

## Server Actions (Read)

| Action | Tables Queried |
|--------|----------------|
| `getComplianceCaseInbox()` | `co_cases` JOIN `co_subjects` |
| `getComplianceCaseDetail()` | 8 tables (case, subject, policy, checks, decisions, tasks, audit, lots, shipments, settlements) |
| `getShipmentDetail()` | `co_physical_shipments`, `co_subjects` (×2), `co_chain_of_custody_events`, `co_refinery_lots`, `co_cases`, `co_audit_events` |
| `getLotDetail()` | `co_refinery_lots`, `co_physical_shipments`, `co_subjects` (×2), `co_cases`, `co_settlement_authorizations`, `co_audit_events` |
| `getSettlementDetail()` | `co_settlement_authorizations`, `co_refinery_lots`, `co_subjects`, `co_cases`, `co_policy_snapshots`, `co_audit_events` |

## Server Actions (Write) — Workstream 2D

| Action | Backend Engine | Effect |
|--------|---------------|--------|
| `assignCaseAction(caseId, reviewerId)` | `case-service.assignCase()` | Sets assigned_reviewer_id, audit log |
| `completeTaskAction(taskId, userId, notes)` | `case-service.completeTask()` | Marks task COMPLETED, auto-transitions case to READY_FOR_DISPOSITION when all required done |
| `submitDispositionAction(caseId, reviewerId, verdict, rationale)` | `manual-review-rules.dispositionCase()` | Renders APPROVED/REJECTED verdict with Four-Eyes enforcement |

## Operator Action Controls (Workstream 2D)

| Control | Status | Notes |
|---------|--------|-------|
| Assign to Me | ✅ Working | Updates `assigned_reviewer_id`, revalidates page |
| Complete Task | ✅ Working | Notes required, auto-gates disposition readiness |
| Disposition (Approve/Reject) | ✅ Working | Full Four-Eyes enforcement, rationale required (min 10 chars) |
| Escalate | ⚠️ Disabled | Tooltip: "Escalation endpoint not yet implemented" |
| Quarantine | ⚠️ Not shown | No dedicated escalation/quarantine endpoint |

## Four-Eyes Control Flow

1. Priority ≥ 80 OR risk tier HIGH/ENHANCED → Four-Eyes required
2. DispositionPanel visually shows Four-Eyes status (required/not required, satisfied/blocked)
3. If current user = assigned reviewer → Approve button disabled, red warning shown
4. Server-side DualSignoffRequiredError caught and shown as toast message
5. Reject is always allowed (does not require Four-Eyes)

## Backend Gaps

1. **No `co_evidence_bundles` table** — evidence via `co_checks.rawPayloadRef`
2. **No `co_reviewer_notes` table** — notes embedded in audit events
3. **No `co_physical_shipments.case_id` FK** — shipments link via lots or subject fallback
4. **No `co_settlement_gates` table** — 6-gate results computed at authorization time, only final verdict persisted
5. **Escalation endpoint** — no backend service for case escalation
6. **Quarantine endpoint** — no dedicated quarantine action

## What Remains

### Workstream 2E — Real-Time Updates & Bulk Operations
- SSE/WebSocket live inbox updates
- Bulk assignment and escalation
- Cross-reference navigation enhancements
