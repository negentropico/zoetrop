/**
 * consent.server.ts — LAB-06 consent gate for the lab ingest pipeline
 *
 * Provides checkConsent (gate: blocks PHI writes until a consentLog row exists)
 * and insertConsent (writes the consent record for a subject).
 *
 * Phase 7 withTenantDb retrofit boundary:
 *   Phase 7 COMPLETE: both checkConsent and insertConsent run inside withTenantDb(ctx).
 *   consent_log is subject-only (no tenant_id column) — the RLS policy keys on
 *   app.subject_id. TenantCtx.subjectId is used for the WHERE / INSERT.
 *
 * D-08: Consent gate — upload action checks for a consentLog row before any
 * PHI insert. Consent must exist or the upload is redirected to the consent
 * form.
 *
 * D-09: Designed generically for future client intake (not pilot-specific).
 */

import { withTenantDb } from "./db.server";
import type { TenantCtx } from "./db.server";
import { eq } from "drizzle-orm";
import { consentLog } from "../../db/schema";

// ── checkConsent ───────────────────────────────────────────────────────────
//
// Returns true if a consentLog row exists for the given subject, false
// otherwise. Called synchronously in the upload action before any PHI write
// (LAB-06 / D-08).

export async function checkConsent(ctx: TenantCtx): Promise<boolean> {
  return withTenantDb(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: consentLog.id })
      .from(consentLog)
      .where(eq(consentLog.subjectId, ctx.subjectId))
      .limit(1);
    return !!row;
  });
}

// ── insertConsent ──────────────────────────────────────────────────────────
//
// Writes a consentLog row for the subject. Called from the consent route
// action when the subject submits the consent form.
//
// consentVersion: use 'v1-pilot-self' for the pilot's self-consent flow.
// D-09: the version string is kept generic so future consent versions
// (e.g. 'v2-client-intake') can be added without schema changes.

export async function insertConsent(
  ctx: TenantCtx,
  version: string
): Promise<void> {
  await withTenantDb(ctx, async (tx) => {
    await tx.insert(consentLog).values({
      subjectId: ctx.subjectId,
      consentedAt: new Date(),
      consentVersion: version,
      consentedByUserId: ctx.userId,
    });
  });
}
