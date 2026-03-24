# Prompt 5B — Test Isolation & Async Cleanup

## 1. Unhandled Rejection — Root Cause

**File**: `src/lib/__tests__/compliance-screening.test.ts`
**Test**: "throws COMPLIANCE_OFFLINE on AbortController timeout"
**Symptom**: `PromiseRejectionHandledWarning: Promise rejection was handled asynchronously (rejection id: 2)` + `Errors: 1 error` in Vitest output

### Root Cause

The test created a mock fetch that rejected synchronously when the `AbortController` fired. The test sequence was:

```typescript
const promise = screenCounterpartyEntity("Slow Entity");
await vi.advanceTimersByTimeAsync(3_100);   // ← rejection fires HERE
await expect(promise).rejects.toThrow(...); // ← handler attaches HERE (too late)
```

When `advanceTimersByTimeAsync` fires the 3s timeout, `controller.abort()` triggers the mock's reject. The promise rejects **before** `.rejects.toThrow()` attaches its `.then()` handler. Node detects this gap and emits `PromiseRejectionHandledWarning`.

The stack trace confirmed the origin: `@vitest/expect/dist/index.js:1761:46` — Vitest's internal promise chain was handling the rejection asynchronously.

### Fix Applied

Attach the rejection assertion **before** advancing timers:

```diff
 const promise = screenCounterpartyEntity("Slow Entity");
-await vi.advanceTimersByTimeAsync(3_100);
-await expect(promise).rejects.toThrow("COMPLIANCE_OFFLINE");
+const assertion = expect(promise).rejects.toThrow("COMPLIANCE_OFFLINE");
+await vi.advanceTimersByTimeAsync(3_100);
+await assertion;
```

This ensures the `.then()` handler is attached to the promise **before** the rejection fires. Node sees the handler already attached and does not warn.

## 2. Integration Test Leakage — Root Cause

**Symptom**: `npx vitest run` picked up all 6 `*.integration.test.ts` files, which failed immediately (no DB connection).

### Root Cause

`vitest.config.ts` had `include: ["src/**/*.test.ts"]` — the glob `*.test.ts` matches `*.integration.test.ts` because `integration.test.ts` ends with `.test.ts`. There was no `exclude` rule to filter them out.

### Fix Applied

Added explicit exclusion to `vitest.config.ts`:

```diff
 test: {
   include: ["src/**/*.test.ts"],
+  exclude: ["src/**/*.integration.test.ts"],
 }
```

## 3. Final Test Command Matrix

| Command | Runs | Requires |
|---------|------|----------|
| `npx vitest run` | 394 unit/mock tests (14 files) | Nothing |
| `npm run test:integration:up` | Starts test Postgres container | Docker |
| `npm run test:integration` | 39 integration tests (6 files) | Running container |
| `npm run test:integration:down` | Tears down container | Docker |
| `npx tsc --noEmit` | TypeScript compilation check | Nothing |

## 4. Files Changed

| File | Change |
|------|--------|
| `src/lib/__tests__/compliance-screening.test.ts` | Fixed abort timeout test assertion ordering |
| `vitest.config.ts` | Added `exclude` for `*.integration.test.ts` |
| `docs/prompt-5-real-db-integration-harness.md` | Added Section 9: test isolation documentation |

## 5. Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Exit 0, clean |
| `npx vitest run` (standard suite) | ✅ 14/14 files, 394/394 tests, 0 errors |
| `PromiseRejectionHandledWarning` | ✅ Eliminated |
| Integration tests excluded from standard run | ✅ Confirmed |
