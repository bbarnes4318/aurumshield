/* ================================================================
   DRIZZLE ORM — Database Connection
   ================================================================
   Wraps the shared pg.Pool from src/lib/db.ts with a Drizzle
   ORM instance for type-safe queries against the Compliance OS
   schema (co_* tables).

   Usage:
     const db = await getDb();
     const subjects = await db.select().from(coSubjects).where(...);

   MUST NOT be imported in client components — server-side only.
   ================================================================ */

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as complianceSchema from "./schema/compliance";

let _db: NodePgDatabase<typeof complianceSchema> | null = null;

/**
 * Get or create the singleton Drizzle ORM instance.
 * Wraps the shared pg.Pool for connection reuse.
 */
export async function getDb(): Promise<NodePgDatabase<typeof complianceSchema>> {
  if (_db) return _db;

  const { getDbPool } = await import("@/lib/db");
  const pool = await getDbPool();

  _db = drizzle(pool, { schema: complianceSchema });
  return _db;
}
