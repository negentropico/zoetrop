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

import { useState } from "react";
import { redirect, Form, Link } from "react-router";
import { FileSearch, ClipboardCheck, Archive, Check } from "lucide-react";
import type { Route } from "./+types/consent";
import { requireUser } from "~/lib/authz.server";
import { assertSubjectAccess } from "~/lib/authz.server";
import type { AppRole } from "~/lib/authz.server";
import { getActiveSubject } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { listAssignedSubjectIds } from "~/lib/assignments.server";
import { checkConsent, insertConsent } from "~/lib/consent.server";
import { insertAuditLog } from "~/lib/audit.server";
import { Card } from "~/components/ui/Card";
import { CatChip } from "~/components/ui/CatChip";
import { PageHeader } from "~/components/ui/PageHeader";

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getActiveSubject(request, user.tenantId!);
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
  const subject = await getActiveSubject(request, user.tenantId!);
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

// Three plain statements — D-09: generic enough for future client intake.
const TERMS = [
  {
    icon: FileSearch,
    text: "The document is read by an AI extraction model to lift test names, values and units.",
  },
  {
    icon: ClipboardCheck,
    text: "Nothing is written to your metrics until you approve each field in review.",
  },
  {
    icon: Archive,
    text: "The original PDF is stored unmodified, tenant-scoped and audit-logged; consent is per-subject and recorded once.",
  },
];

export default function IngestConsent({ loaderData }: Route.ComponentProps) {
  const { next } = loaderData;
  const [agree, setAgree] = useState(false);

  return (
    <div data-screen-label="Ingest consent">
      <PageHeader
        eyebrow="LAB INGEST"
        crumbs={[{ label: "Ingest", to: "/ingest" }, { label: "Consent" }]}
        title="Before this document is read"
        sub="One quiet decision, recorded per subject"
      />

      <div style={{ maxWidth: 620 }}>
        <Card>
          {TERMS.map((t, i) => (
            <div
              key={t.text}
              style={{
                display: "flex",
                gap: "var(--gap-lg)",
                alignItems: "flex-start",
                padding: "var(--gap-md) 0",
                borderBottom: i < TERMS.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <CatChip icon={t.icon} size={34} />
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                  textWrap: "pretty",
                  paddingTop: 6,
                }}
              >
                {t.text}
              </p>
            </div>
          ))}

          {/* Single consent checkbox row — accent when on */}
          <button
            type="button"
            className={"zt-consent-row" + (agree ? " is-on" : "")}
            aria-pressed={agree}
            onClick={() => setAgree((a) => !a)}
          >
            <span className="zt-consent-box">
              {agree && <Check size={13} strokeWidth={2.6} />}
            </span>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
              I consent to AI-assisted extraction of this document
            </span>
          </button>

          {/* Continue → upload (action persists consent then redirects to next) */}
          <Form method="post">
            <input type="hidden" name="next" value={next} />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "var(--gap-md)",
                marginTop: "var(--gap-lg)",
              }}
            >
              <Link
                to="/ingest"
                className="zt-pill"
                style={{ color: "var(--text-secondary)", textDecoration: "none" }}
              >
                Cancel
              </Link>
              <button type="submit" className="zt-btn-ink" disabled={!agree}>
                Continue to upload
              </button>
            </div>
          </Form>

          <p
            style={{
              margin: "var(--gap-lg) 0 0",
              fontSize: "var(--text-2xs)",
              color: "var(--text-faint)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            Consent version v1-pilot-self · recorded per subject · not required again for
            subsequent uploads.
          </p>
        </Card>
      </div>
    </div>
  );
}
