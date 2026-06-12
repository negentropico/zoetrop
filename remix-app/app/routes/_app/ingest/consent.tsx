/**
 * consent.tsx — LAB-06 consent gate for lab ingest pipeline
 *
 * Security (T-05-CONSENT2):
 *   - Loader: requireUser → assertSubjectAccess → checkConsent; if already
 *     consented redirect to ?next (default /ingest/upload).
 *   - Action: requireUser → assertSubjectAccess → insertConsent(v1-pilot-self)
 *     → insertAuditLog → redirect to next.
 *
 * D-08: consent gate — writes blocked until consentLog row exists.
 * D-09: form text is generic enough for future client intake workflows.
 * LAB-06: consentVersion 'v1-pilot-self' for the pilot self-consent flow.
 */

import { redirect } from "react-router";
import type { Route } from "./+types/consent";
import { requireUser } from "~/lib/authz.server";
import { assertSubjectAccess } from "~/lib/authz.server";
import type { AppRole } from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { listAssignedSubjectIds } from "~/lib/assignments.server";
import { checkConsent, insertConsent } from "~/lib/consent.server";
import { insertAuditLog } from "~/lib/audit.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
import { Form } from "react-router";

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const assignedIds =
    user.role === "practitioner"
      ? await listAssignedSubjectIds(ctx, user.id)
      : undefined;
  assertSubjectAccess(user, subject, user.tenantId!, assignedIds);

  // If consent already exists, redirect to the next destination
  const alreadyConsented = await checkConsent(ctx);
  if (alreadyConsented) {
    const url = new URL(request.url);
    const next = url.searchParams.get("next") ?? "/ingest/upload";
    return redirect(next);
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") ?? "/ingest/upload";
  return { next };
}

// ── Action ─────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };
  const assignedIds =
    user.role === "practitioner"
      ? await listAssignedSubjectIds(ctx, user.id)
      : undefined;
  assertSubjectAccess(user, subject, user.tenantId!, assignedIds);

  const formData = await request.formData();
  const next = (formData.get("next") as string | null) ?? "/ingest/upload";

  // LAB-06 / D-08: persist consent record before any PHI write is allowed
  // consentVersion 'v1-pilot-self' — D-08 pilot self-consent flow
  await insertConsent(ctx, "v1-pilot-self");

  // D-13: audit the consent event — no PHI values
  await insertAuditLog({
    userId: user.id,
    role: user.role as AppRole,
    action: "consent",
    tableName: "consent_log",
    operation: "insert",
    tenantId: user.tenantId!,
    subjectId: subject.id,
  });

  return redirect(next);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IngestConsent({ loaderData }: Route.ComponentProps) {
  const { next } = loaderData;

  return (
    <div>
      <PageHeader
        eyebrow="LAB INGEST"
        title="Data processing consent"
        sub="Please review and consent to the processing of your lab data before uploading."
      />

      <div style={{ maxWidth: 640 }}>
        <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
          {/* Consent text — D-09: generic for future client intake */}
          <div
            className="zt-eyebrow"
            style={{ marginBottom: 16, color: "var(--text-muted)" }}
          >
            What you are consenting to
          </div>

          <ul
            style={{
              margin: "0 0 20px 0",
              paddingLeft: 20,
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            <li>
              Your lab report PDF will be processed by an AI system to extract
              numerical analyte values.
            </li>
            <li>
              Extracted values are held for your review and are not saved to
              your tracker until you individually approve each field.
            </li>
            <li>
              Your data is processed under the same security controls as all
              other data in this application — tenant-scoped, role-gated, and
              audit-logged.
            </li>
            <li>
              You may reject any extracted value and it will not be saved.
            </li>
          </ul>

          <div
            style={{
              padding: "12px 16px",
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginBottom: 24,
            }}
          >
            Consent version: v1-pilot-self. This consent applies to your own
            lab data processed through the pilot intake flow. Consent is
            recorded per-subject and is not required again for subsequent
            uploads.
          </div>

          <Form method="post">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="primary" fullWidth>
              I consent — continue to upload
            </Button>
          </Form>
        </Card>

        {/* Back link */}
        <div
          style={{
            textAlign: "center",
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          <a
            href="/ingest/upload"
            style={{ color: "var(--text-muted)", textDecoration: "underline" }}
          >
            Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
