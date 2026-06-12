/**
 * corpus-lint.test.ts — RPT-03 corpus guardrail lint
 *
 * Wave-0 RED-first stub (06-02 Task 1). This file is authored BEFORE the
 * production seed scaffold in Task 2. It imports from scripts/seed-corpus
 * (created in Task 2), so this file is RED until Task 2 ships the scaffold.
 *
 * Two test groups:
 *   1. IMPERATIVE_PATTERNS — Runs normally and MUST pass. Iterates all
 *      corpusSeedData.variantRules + .metricRules and asserts that
 *      no recommendationText contains imperative language directed at the
 *      subject ("you should", "you must", "you need to", "you have to").
 *      This passes immediately over the empty arrays in the Task 2 scaffold.
 *
 *   2. DisclaimerCallout source assertion — intentionally test.skip until
 *      06-04 ships the DisclaimerCallout component. The component does not
 *      exist at 06-02 completion; running this assertion would fail the suite
 *      with a file-not-found error. Un-skip or add a component-level test in
 *      06-04.
 *
 * Acceptance criteria:
 *   - `vitest run tests/lib/corpus-lint.test.ts` exits 0 after Task 2 (empty arrays)
 *   - DisclaimerCallout assertion is test.skip (not a live failing assertion)
 */

import { describe, it, expect } from "vitest";
import { corpusSeedData } from "../../scripts/seed-corpus";

// ── Imperative pattern lint ───────────────────────────────────────────────────
//
// RPT-03: No corpus recommendation text should direct the subject with
// imperative second-person language. "Consider X" / "X may support Y" is
// correct; "You should take X" / "You must..." is prohibited.

const IMPERATIVE_PATTERNS = [
  /\byou should\b/i,
  /\byou must\b/i,
  /\byou need to\b/i,
  /\byou have to\b/i,
];

describe("corpus-lint: no imperative patterns in recommendationText", () => {
  it("variantRules contain no imperative language", () => {
    for (const rule of corpusSeedData.variantRules) {
      for (const pattern of IMPERATIVE_PATTERNS) {
        expect(rule.recommendationText).not.toMatch(pattern);
      }
    }
  });

  it("metricRules contain no imperative language", () => {
    for (const rule of corpusSeedData.metricRules) {
      for (const pattern of IMPERATIVE_PATTERNS) {
        expect(rule.recommendationText).not.toMatch(pattern);
      }
    }
  });
});

// ── DisclaimerCallout K4 disclaimer source assertion ─────────────────────────
//
// This assertion verifies that DisclaimerCallout.tsx hard-codes the exact
// K4 disclaimer string (ROADMAP SC5-locked) so it cannot drift.
//
// INTENTIONALLY test.skip — DisclaimerCallout is built in 06-04. At 06-02
// completion the component does not exist; a live assertion would error on
// file read. Un-skip in 06-04 once the component exists, or cover it in
// 06-04's component test.
//
// The imperative-pattern lint above runs normally and must pass.

const K4_DISCLAIMER =
  "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting.";

describe("DisclaimerCallout: K4 disclaimer string", () => {
  it.skip("DisclaimerCallout contains the locked K4 disclaimer string", async () => {
    // Un-skip after 06-04 ships DisclaimerCallout.tsx
    const fs = await import("fs");
    const src = fs.readFileSync(
      "app/components/ui/DisclaimerCallout.tsx",
      "utf-8"
    );
    expect(src).toContain(K4_DISCLAIMER);
  });
});
