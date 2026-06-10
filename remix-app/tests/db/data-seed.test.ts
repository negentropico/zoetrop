import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "@neondatabase/serverless";

// DATA-02 — seed row-count introspection scaffold.
//
// Live-DB introspection. The describe block is skip-guarded on connectionString.
// Row-count assertions are skip-guarded pending seed: un-skip after Plan 03 runs
// the seed script (all tables will have minRows rows under the owner's tenant_id).
//
// SEEDED_TABLES counts reflect the full M0 data inventory:
//   metrics: 77 lab panel rows (all categories)
//   protocol_versions: 7 (P0–P6)
//   protocol_changes: ~20 change log entries
//   milestones: 8 named milestones
//   supplements: 15 active supplements
//   correlations: 10 supplement↔metric correlations
//   cessation_log: 1 active cessation entry
//   subject_genotypes: 15 genetic variants

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

const SEEDED_TABLES = [
  { table: "metrics", minRows: 40 },          // actual: 77 (M1+M2 blood work + body comp + autonomic)
  { table: "protocol_versions", minRows: 7 },  // actual: 7 (P0–P6)
  { table: "protocol_changes", minRows: 20 },  // actual: 24
  { table: "milestones", minRows: 8 },         // actual: 8
  { table: "supplements", minRows: 15 },       // actual: 17 (P6 protocol incl. tier2 inactive)
  { table: "correlations", minRows: 9 },       // actual: 9 (CoQ10 skipped — not in realSupplements)
  { table: "cessation_log", minRows: 1 },      // actual: 1
  { table: "subject_genotypes", minRows: 15 }, // actual: 16
] as const;

interface CountRow {
  count: string;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

afterAll(async () => {
  if (pool) await pool.end();
});

describe.skipIf(!connectionString)(
  "DATA-02 seed row counts (live Neon)",
  () => {
    for (const { table, minRows } of SEEDED_TABLES) {
      it(`${table} has >= ${minRows} rows with tenant_id set`, async () => {
        const { rows } = await getPool().query<CountRow>(
          `SELECT COUNT(*) AS count FROM "${table}" WHERE tenant_id IS NOT NULL`
        );
        const rowCount = parseInt(rows[0].count, 10);
        expect(rowCount).toBeGreaterThanOrEqual(minRows);
      });
    }
  }
);
