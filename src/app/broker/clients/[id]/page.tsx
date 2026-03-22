/* ================================================================
   BROKER CRM — Entity Detail Page
   ================================================================
   Async Server Component. Fetches a single entity from the
   broker_crm_entities table via getBrokerClientById().

   Security: broker_id is included in the WHERE clause (IDOR).
   If the entity is not found, returns Next.js notFound().
   ================================================================ */

import { notFound } from "next/navigation";
import { getBrokerClientById } from "@/actions/broker-crm-actions";
import { EntityDetailShell } from "@/components/broker/EntityDetailShell";

/* ── Currently mocked broker ID — swap for real auth when ready ── */
const CURRENT_BROKER_ID = "broker_123";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BrokerClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const entity = await getBrokerClientById(id, CURRENT_BROKER_ID);

  if (!entity) {
    notFound();
  }

  return <EntityDetailShell entity={entity} />;
}
