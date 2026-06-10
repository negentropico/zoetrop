/**
 * ingest-schema.test.ts — LAB-01 / LAB-05 / LAB-06 live Neon schema assertions
 *
 * RED contract: asserts the shape of the 4 new ingest tables (lab_documents,
 * lab_extractions, audit_log, consent_log) in the live Neon database after
 * migration 0007 is applied.
 *
 * Skip-guarded: when DATABASE_URL_UNPOOLED or DATABASE_URL is not set (local CI
 * without DB creds), the suite is GREEN-SKIPPED. When a URL is present, every
 * assertion is hard.
 *
 * Becomes fully GREEN after Task 4 (db:migrate 0007) is run against live Neon.
 */

import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

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

interface ColumnRow {
  column_name: string;
  is_nullable: string;
}

interface IndexRow {
  indexdef: string;
}

// ── Table existence + tenant/subject NOT NULL ─────────────────────────────────

const TENANT_SUBJECT_TABLES = [
  "lab_documents",
  "lab_extractions",
  "audit_log",
] as const;

describe.skipIf(!connectionString)(
  "ingest tables: tenant_id / subject_id NOT NULL (LAB-01 / LAB-05 / D-16)",
  () => {
    for (const table of TENANT_SUBJECT_TABLES) {
      it(`${table} has non-null tenant_id and subject_id`, async () => {
        const { rows } = await getPool().query<ColumnRow>(
          `SELECT column_name, is_nullable
             FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = ANY($2)`,
          [table, ["tenant_id", "subject_id"]]
        );

        const byName = new Map(rows.map((r) => [r.column_name, r.is_nullable]));

        expect(byName.has("tenant_id")).toBe(true);
        expect(byName.has("subject_id")).toBe(true);
        expect(byName.get("tenant_id")).toBe("NO");
        expect(byName.get("subject_id")).toBe("NO");
      });
    }

    it("consent_log has subject_id NOT NULL (no tenant_id — subject-scoped only)", async () => {
      const { rows } = await getPool().query<ColumnRow>(
        `SELECT column_name, is_nullable
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'consent_log'
            AND column_name = 'subject_id'`
      );
      expect(rows.length).toBe(1);
      expect(rows[0].is_nullable).toBe("NO");
    });
  }
);

// ── Composite indexes ─────────────────────────────────────────────────────────

describe.skipIf(!connectionString)(
  "ingest tables: composite (tenant_id, subject_id) index",
  () => {
    for (const table of ["lab_documents", "lab_extractions"] as const) {
      it(`${table} has a composite index on (tenant_id, subject_id)`, async () => {
        const { rows } = await getPool().query<IndexRow>(
          `SELECT indexdef
             FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = $1`,
          [table]
        );

        const hasComposite = rows.some((r) => {
          const def = r.indexdef.replace(/\s+/g, " ").toLowerCase();
          const cols = def.slice(def.indexOf("("));
          const t = cols.indexOf("tenant_id");
          const s = cols.indexOf("subject_id");
          return t !== -1 && s !== -1 && t < s;
        });

        expect(hasComposite).toBe(true);
      });
    }
  }
);

// ── dataSourceEnum includes 'lab' (D-16) ─────────────────────────────────────

describe.skipIf(!connectionString)(
  "data_source enum includes 'lab' value (D-16)",
  () => {
    it("data_source enum has 'lab' value", async () => {
      const { rows } = await getPool().query<{ enumlabel: string }>(
        `SELECT e.enumlabel
           FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'data_source'`
      );
      const values = rows.map((r) => r.enumlabel);
      expect(values).toContain("lab");
    });
  }
);

// ── audit_log has NO PHI columns (D-13 / LAB-05) ─────────────────────────────

describe.skipIf(!connectionString)(
  "audit_log has no PHI value/name columns (D-13 / LAB-05)",
  () => {
    it("audit_log has no column named 'value' or 'name'", async () => {
      const { rows } = await getPool().query<{ column_name: string }>(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'audit_log'
            AND column_name = ANY($1)`,
        [["value", "name"]]
      );
      expect(rows.length).toBe(0);
    });

    it("audit_log table exists", async () => {
      const { rows } = await getPool().query<{ table_name: string }>(
        `SELECT table_name
           FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'audit_log'`
      );
      expect(rows.length).toBe(1);
    });
  }
);

// ── All 4 new tables exist ────────────────────────────────────────────────────

describe.skipIf(!connectionString)(
  "all 4 ingest tables exist (LAB-01 / LAB-06)",
  () => {
    for (const table of [
      "lab_documents",
      "lab_extractions",
      "audit_log",
      "consent_log",
    ] as const) {
      it(`table ${table} exists`, async () => {
        const { rows } = await getPool().query<{ table_name: string }>(
          `SELECT table_name
             FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1`,
          [table]
        );
        expect(rows.length).toBe(1);
      });
    }
  }
);
