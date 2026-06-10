/**
 * consent.server.ts — LAB-06 consent gate for the lab ingest pipeline
 *
 * Provides checkConsent (gate: blocks PHI writes until a consentLog row exists)
 * and insertConsent (writes the consent record for a subject).
 *
 * Phase 7 withTenantDb retrofit boundary:
 *   getDb() is isolated here. Phase 7 replaces it with withTenantDb() if RLS
 *   is enforced. Route loaders/actions never call getDb() directly.
 *
 * D-08: Consent gate — upload action checks for a consentLog row before any
 * PHI insert. Consent must exist or the upload is redirected to the consent
 * form.
 *
 * D-09: Designed generically for future client intake (not pilot-specific).
 */

import { getDb } from "./db.server";
import { eq } from "drizzle-orm";
import { consentLog } from "../../db/schema";

// ── checkConsent ───────────────────────────────────────────────────────────
//
// Returns true if a consentLog row exists for the given subjectId, false
// otherwise. Called synchronously in the upload action before any PHI write
// (LAB-06 / D-08).

export async function checkConsent(subjectId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: consentLog.id })
    .from(consentLog)
    .where(eq(consentLog.subjectId, subjectId))
    .limit(1);
  return !!row;
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
  subjectId: string,
  userId: string,
  version: string
): Promise<void> {
  const db = getDb();
  await db.insert(consentLog).values({
    subjectId,
    consentedAt: new Date(),
    consentVersion: version,
    consentedByUserId: userId,
  });
}
