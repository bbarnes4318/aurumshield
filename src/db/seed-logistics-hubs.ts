/**
 * AurumShield — Logistics Hub Seeder
 *
 * Seeds the `logistics_hubs` table with verified Tier-1 LBMA Good Delivery
 * refineries and Malca-Amit FTZ custody vaults.
 *
 * This is a destructive idempotent operation: it TRUNCATES the table
 * and re-inserts the canonical dataset within a single transaction.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@localhost:5432/aurumshield npm run db:seed-hubs
 */

import { getPoolClient } from '../lib/db';

// ─── Canonical Hub Dataset ───────────────────────────────────────────────────

interface LogisticsHub {
  hub_type: 'REFINERY' | 'CUSTODY_VAULT';
  name: string;
  location_code: string;
  latitude: number;
  longitude: number;
}

const LOGISTICS_HUBS: LogisticsHub[] = [
  // ── CUSTODY VAULTS (Malca-Amit FTZ Hubs) ──────────────────────────────────
  {
    hub_type: 'CUSTODY_VAULT',
    name: 'Malca-Amit Zurich (Zurich Airport FTZ)',
    location_code: 'ZRH',
    latitude: 47.4582000,
    longitude: 8.5555000,
  },
  {
    hub_type: 'CUSTODY_VAULT',
    name: 'Malca-Amit London (Heathrow Secured)',
    location_code: 'LHR',
    latitude: 51.4700000,
    longitude: -0.4543000,
  },
  {
    hub_type: 'CUSTODY_VAULT',
    name: 'Malca-Amit Singapore (Le Freeport)',
    location_code: 'SIN',
    latitude: 1.3521000,
    longitude: 103.8198000,
  },
  {
    hub_type: 'CUSTODY_VAULT',
    name: 'Malca-Amit New York (JFK Secured)',
    location_code: 'JFK',
    latitude: 40.6413000,
    longitude: -73.7781000,
  },
  {
    hub_type: 'CUSTODY_VAULT',
    name: 'Malca-Amit Toronto (Pearson FTZ)',
    location_code: 'YYZ',
    latitude: 43.6777000,
    longitude: -79.6248000,
  },

  // ── LBMA ACCREDITED REFINERIES ────────────────────────────────────────────
  {
    hub_type: 'REFINERY',
    name: 'Valcambi SA (Balerna, Switzerland)',
    location_code: 'CHE-VAL',
    latitude: 45.8408000,
    longitude: 9.0036000,
  },
  {
    hub_type: 'REFINERY',
    name: 'PAMP SA (Castel San Pietro, Switzerland)',
    location_code: 'CHE-PMP',
    latitude: 45.8580000,
    longitude: 9.0039000,
  },
  {
    hub_type: 'REFINERY',
    name: 'Argor-Heraeus SA (Mendrisio, Switzerland)',
    location_code: 'CHE-ARG',
    latitude: 45.8683000,
    longitude: 8.9811000,
  },
  {
    hub_type: 'REFINERY',
    name: 'Asahi Refining (Salt Lake City, USA)',
    location_code: 'USA-ASH',
    latitude: 40.7128000,
    longitude: -112.0011000,
  },
  {
    hub_type: 'REFINERY',
    name: 'Rand Refinery (Germiston, South Africa)',
    location_code: 'ZAF-RND',
    latitude: -26.2144000,
    longitude: 28.1568000,
  },
  {
    hub_type: 'REFINERY',
    name: 'The Perth Mint (Perth, Australia)',
    location_code: 'AUS-PRT',
    latitude: -31.9574000,
    longitude: 115.8693000,
  },
];

// ─── Seed Execution ──────────────────────────────────────────────────────────

async function seedLogisticsHubs(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  AurumShield — Logistics Hub Seeder');
  console.log('═══════════════════════════════════════════════════\n');

  const client = await getPoolClient();

  try {
    await client.query('BEGIN');

    // Truncate for deterministic re-seeding
    await client.query('TRUNCATE TABLE logistics_hubs RESTART IDENTITY CASCADE');
    console.log('  ✓ Cleared existing logistics_hubs data\n');

    const insertSQL = `
      INSERT INTO logistics_hubs (hub_type, name, location_code, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5)
    `;

    let vaultCount = 0;
    let refineryCount = 0;

    for (const hub of LOGISTICS_HUBS) {
      await client.query(insertSQL, [
        hub.hub_type,
        hub.name,
        hub.location_code,
        hub.latitude,
        hub.longitude,
      ]);

      const icon = hub.hub_type === 'CUSTODY_VAULT' ? '🏦' : '🏭';
      console.log(`  ${icon} ${hub.location_code.padEnd(10)} ${hub.name}`);

      if (hub.hub_type === 'CUSTODY_VAULT') vaultCount++;
      else refineryCount++;
    }

    await client.query('COMMIT');

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  Done. Seeded ${LOGISTICS_HUBS.length} hubs:`);
    console.log(`    🏦 Custody Vaults: ${vaultCount}`);
    console.log(`    🏭 Refineries:     ${refineryCount}`);
    console.log('═══════════════════════════════════════════════════\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('  ✗ Seed failed, transaction rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedLogisticsHubs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Logistics hub seeder failed:', err);
    process.exit(1);
  });
