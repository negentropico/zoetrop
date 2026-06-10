import { describe, it } from "vitest";

// DATA-01 — loader parity scaffold (skip-guarded).
//
// This file is a placeholder for the parity harness that will be filled in
// during Plan 04 (loader rewiring). The full harness:
//   1. Reads PHI-free route loader outputs from tests/fixtures/*.json (gitignored,
//      captured by Plan 03 seed script before rewiring).
//   2. Invokes each loader against live Neon with FIXED_NOW pinned.
//   3. Asserts deep-equality between live output and the fixture snapshot.
//
// Plan 04 fills this file with per-loader `toMatchObject(fixture)` assertions.
// Until then, every it() is a .todo or .skip — the suite must not error.
//
// FIXTURE PATH: tests/fixtures/*.json
//   PHI-containing (blood panels, genotypes) → gitignored via remix-app/.gitignore.
//   These files are created locally by Plan 03 and deleted after cut-over.
//   They MUST NOT be committed (T-04-PHI-FIX).
//
// FIXED_NOW: pin the "current date" so cessation-phase calculations are
//   deterministic across test runs. Plan 04 passes this to loaders via
//   an injectable `now` parameter.

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

// Pin execution date for deterministic cessation phase math.
// Plan 04 will pass this to loaders via an injectable `now` parameter.
export const FIXED_NOW = new Date("2026-06-10T00:00:00.000Z");

describe.skipIf(!connectionString)(
  "loader parity (live Neon vs fixture)",
  () => {
    // Plan 04 fills each of these with a per-loader toMatchObject(fixture)
    // assertion reading from tests/fixtures/<route>.json (gitignored).
    it.todo("home loader output matches fixture snapshot");
    it.todo("metrics index loader output matches fixture snapshot");
    it.todo("protocol index loader output matches fixture snapshot");
    it.todo("insights correlations loader output matches fixture snapshot");
    it.todo("insights genetics loader output matches fixture snapshot");
  }
);
