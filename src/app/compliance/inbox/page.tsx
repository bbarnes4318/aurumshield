/* ================================================================
   /compliance/inbox — Compliance Case Inbox (Server Component)
   ================================================================
   Fetches all V3 compliance cases from co_cases and passes to
   the ComplianceInboxUI client component for interactive
   filtering, sorting, and navigation.
   ================================================================ */

import { getComplianceCaseInbox, type ComplianceCaseRow } from "@/actions/compliance-queries";
import ComplianceInboxUI from "./ComplianceInboxUI";

export default async function ComplianceInboxPage() {
  let cases: ComplianceCaseRow[];
  try {
    cases = await getComplianceCaseInbox();
  } catch (err) {
    console.error(
      "[ComplianceInboxPage] Failed to fetch inbox:",
      err instanceof Error ? err.message : err,
    );
    cases = [];
  }

  return <ComplianceInboxUI cases={cases} />;
}
