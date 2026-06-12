/**
 * generate.tsx — Role-gated report generation action + page (/reports/generate)
 *
 * Security:
 *   T-06-EOP: requireRole(['owner','practitioner']) — client role → 403
 *   T-06-INPUT: validate subjectId via getOwnerSubject (resolves from tenant, not raw form value)
 *   T-06-IDOR/D-18: assertSubjectAccess guards the generate action
 *
 * D-13: NO LLM in this path.
 * D-17: generateReport inserts a NEW row — never mutates existing rows.
 */

import { useState } from "react";
import { redirect, useActionData } from "react-router";
import type { Route } from "./+types/generate";
import {
  requireUser,
  requireRole,
  assertSubjectAccess,
} from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { listAssignedSubjectIds } from "~/lib/assignments.server";
import { generateReport } from "~/lib/report-generator.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Generate Report - Zoetrop" },
    { name: "description", content: "Generate a confidence-graded protocol report" },
  ];
}

// ── Action ─────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  // T-06-EOP: Authentication + role gate — client cannot generate (D-18)
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  // T-06-INPUT: Resolve subject via tenant (not trusting raw form subjectId)
  const subject = await getOwnerSubject(user.tenantId!);

  // T-06-IDOR/D-18: Cross-tenant check — 403 for tenant mismatch
  // ctx constructed before assertSubjectAccess so listAssignedSubjectIds can run
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const assignedIds =
    user.role === "practitioner"
      ? await listAssignedSubjectIds(ctx, user.id)
      : undefined;
  assertSubjectAccess(user, subject, user.tenantId!, assignedIds);

  // D-13/D-17: Generate report — pure deterministic engine, inserts NEW row
  const reportId = await generateReport(ctx, user.id);

  return redirect(`/reports/${reportId}`);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function GenerateReport() {
  const actionData = useActionData<typeof action>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="REPORTS"
        title="Generate report"
        sub="Select a subject and generate a confidence-graded protocol report."
      />

      <Card padding="lg" style={{ maxWidth: 480 }}>
        <form method="post" onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="subject-label"
              style={{
                display: "block",
                fontFamily: "var(--font-text)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--text)",
                marginBottom: 6,
              }}
            >
              Subject
            </label>
            {/* Subject is resolved from tenant via getOwnerSubject — no user input needed */}
            <div
              id="subject-label"
              style={{
                fontFamily: "var(--font-text)",
                fontSize: "var(--text-base)",
                color: "var(--text-secondary)",
                padding: "9px 14px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-sunken)",
              }}
            >
              Owner subject (resolved automatically)
            </div>
          </div>

          {actionData && typeof actionData === "object" && "error" in actionData && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: "var(--text-sm)",
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              Report generation failed. Check that all required data is available and try again.
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {submitting ? "Generating report…" : "Generate report"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
