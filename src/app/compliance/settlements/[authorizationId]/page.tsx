/* ================================================================
   /compliance/settlements/[authorizationId] — Settlement Auth
   ================================================================ */

import { getSettlementDetail } from "@/actions/compliance-queries";
import SettlementAuthUI from "./SettlementAuthUI";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function SettlementAuthorizationPage({
  params,
}: {
  params: Promise<{ authorizationId: string }>;
}) {
  const { authorizationId } = await params;

  let data;
  try {
    data = await getSettlementDetail(authorizationId);
  } catch (err) {
    console.error("[SettlementAuthPage] Failed:", err instanceof Error ? err.message : err);
    data = null;
  }

  if (!data) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <Link href="/compliance/inbox" className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text transition-colors mb-6">
          <ArrowLeft className="h-3 w-3" />Back to Inbox
        </Link>
        <div className="rounded-xl border border-border bg-surface-2 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-text mb-2">Authorization Not Found</h1>
          <p className="text-sm text-text-faint">Authorization <span className="font-mono">{authorizationId.slice(0, 8)}</span> does not exist or could not be loaded.</p>
        </div>
      </div>
    );
  }

  return <SettlementAuthUI data={data} />;
}
