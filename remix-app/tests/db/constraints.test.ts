import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "@neondatabase/serverless";

// TEN-04 — protocol_versions uniqueness constraint swap.
//
// Live-DB introspection. RED until Plan 04 migrates Neon to (a) ADD the composite
// UNIQUE(tenant_id, subject_id, version) on protocol_versions and (b) DROP the old
// global UNIQUE(version) constraint (protocol_versions_version_unique).
//
// Same skip-guard as schema-columns.test.ts: green-SKIPPED without a connection
// string, hard-asserted when one is present. Connection-string resolution mirrors
// the migration path: DATABASE_URL_UNPOOLED || DATABASE_URL.
//
// Source: 03-RESEARCH.md § Migration Sequence (Migration D constraint swap),
//   § Pitfall 6 (drop global UNIQUE(version) before adding composite UNIQUE).

const connectionString =
  process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

interface ConstraintRow {
  constraint_name: string;
  column_names: string[];
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
  "TEN-04 protocol_versions uniqueness constraint swap (live Neon)",
  () => {
    // All UNIQUE constraints on protocol_versions, with their ordered columns.
    async function uniqueConstraints(): Promise<ConstraintRow[]> {
      const { rows } = await getPool().query<ConstraintRow>(
        `SELECT tc.constraint_name AS constraint_name,
                array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS column_names
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'protocol_versions'
            AND tc.constraint_type = 'UNIQUE'
          GROUP BY tc.constraint_name`
      );
      return rows;
    }

    it("has a composite UNIQUE on (tenant_id, subject_id, version)", async () => {
      const constraints = await uniqueConstraints();
      const hasComposite = constraints.some((c) => {
        const cols = [...c.column_names].sort();
        return (
          cols.length === 3 &&
          cols[0] === "subject_id" &&
          cols[1] === "tenant_id" &&
          cols[2] === "version"
        );
      });
      expect(hasComposite).toBe(true);
    });

    it("no longer carries the old global UNIQUE(version) constraint", async () => {
      const constraints = await uniqueConstraints();

      // Named guard: the original constraint name is gone.
      const hasOldNamed = constraints.some(
        (c) => c.constraint_name === "protocol_versions_version_unique"
      );
      expect(hasOldNamed).toBe(false);

      // Shape guard: no UNIQUE constraint on version alone remains.
      const hasGlobalVersionUnique = constraints.some(
        (c) => c.column_names.length === 1 && c.column_names[0] === "version"
      );
      expect(hasGlobalVersionUnique).toBe(false);
    });
  }
);
