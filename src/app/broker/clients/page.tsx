/* ================================================================
   BROKER CLIENT NETWORK — Book of Business (DB-Backed)
   ================================================================
   Async Server Component. Fetches real data from the
   broker_crm_entities table via getBrokerClients().

   Columns: Entity Name, Jurisdiction, KYB/AML Status,
            Entity Type, AUM, Actions.

   Status styling:
     CLEARED          → emerald (green)
     PENDING LIVENESS → amber
     SANCTIONS BLOCK  → red
   ================================================================ */

/** Prevent static prerender at build time — DB only available at runtime */
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getBrokerClients } from "@/actions/broker-crm-actions";
import { BrokerClientsRosterShell } from "@/components/broker/BrokerClientsRosterShell";

/* ── Currently mocked broker ID — swap for real auth when ready ── */
const CURRENT_BROKER_ID = "broker_123";

export default async function BrokerClientsPage() {
  const clients = await getBrokerClients(CURRENT_BROKER_ID);

  return <BrokerClientsRosterShell clients={clients} />;
}
