/**
 * invites.server.ts — Invite token lifecycle (server-only)
 *
 * Security contracts (D-06/D-08/D-09/D-10, STRIDE T-031-INV-1 through T-031-INV-6):
 *   - Raw tokens are NEVER stored or logged; only their SHA-256 hash persists.
 *   - Tokens are single-use: consumeInviteByToken uses a guarded UPDATE WHERE consumedAt IS NULL
 *     so a concurrent second redeem updates 0 rows (T-031-INV-3).
 *   - Policy is tiered: owner → practitioner|client; practitioner → client only; client → none (D-10).
 *   - The raw token is returned to the caller exactly once for copy-link delivery (D-09).
 *   - Any lookup error / expired / consumed / revoked / unknown token → null (fail-closed, T-031-INV-6).
 *
 * Out of scope (→ later plans): email delivery, RLS, AUTH-03, AUTH-04.
 */

import { randomBytes, createHash } from "node:crypto";
import { getDb } from "./db.server";
import { invites } from "../../db/schema";
import { eq, isNull, gt, and, desc } from "drizzle-orm";
import { can } from "./authz.server";

// ── hashToken ─────────────────────────────────────────────────────────────────

/**
 * Returns a 64-char lowercase SHA-256 hex string of the input.
 * Deterministic: same input → same hash.
 * Used both to store at creation time and to look up on consumption.
 */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ── newRawToken ───────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure, URL-safe, high-entropy raw token.
 * 32 bytes → 256-bit entropy, base64url-encoded (opaque, no padding).
 * Never stored — only its hash is persisted (T-031-INV-1/T-031-INV-2).
 */
export function newRawToken(): string {
  return randomBytes(32).toString("base64url");
}

// ── generateInvite ────────────────────────────────────────────────────────────

export interface GenerateInviteOpts {
  inviter: {
    id: string;
    role?: string | null;
    tenantId?: string | null;
  };
  role: "practitioner" | "client";
}

export interface GenerateInviteResult {
  /** Raw token — returned ONCE for copy-link delivery; never stored. */
  token: string;
  role: "practitioner" | "client";
  tenantId: string;
  expiresAt: Date;
}

/**
 * Generate a single-use, role-scoped, 7-day-expiring invite.
 *
 * Policy enforcement (D-10, T-031-INV-4):
 *   - owner: may invite practitioner or client
 *   - practitioner: may invite client only
 *   - client: no invites
 *
 * Only the SHA-256 hash of the raw token is persisted (T-031-INV-2).
 * The raw token is returned to the caller exactly once.
 *
 * @throws Response(403) if the inviter lacks permission or has no tenantId.
 */
export async function generateInvite(
  opts: GenerateInviteOpts
): Promise<GenerateInviteResult> {
  const { inviter, role } = opts;

  // Policy gate — delegate to CAPABILITIES matrix (D-10)
  if (!can(inviter, `invite:${role}`)) {
    throw new Response(
      `Insufficient permission: your role does not allow inviting ${role}`,
      { status: 403 }
    );
  }

  // Tenant binding — every invite must be scoped to the inviter's tenant
  if (!inviter.tenantId) {
    throw new Response(
      "Cannot generate an invite: inviter has no tenant assignment",
      { status: 403 }
    );
  }

  const raw = newRawToken();
  const tokenHash = hashToken(raw);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const db = getDb();
  await db.insert(invites).values({
    id: crypto.randomUUID(),
    tokenHash,          // Only the hash is stored — raw token NEVER persisted (T-031-INV-2)
    role,
    tenantId: inviter.tenantId,
    createdBy: inviter.id,
    expiresAt,
    createdAt: now,
  });

  // Return the raw token exactly once — caller delivers it via copy-link (D-09)
  return { token: raw, role, tenantId: inviter.tenantId, expiresAt };
}

// ── listInvites ───────────────────────────────────────────────────────────────

/**
 * List all invites for a tenant, ordered newest-first.
 * Used by the settings loader to render the active-invites table.
 */
export async function listInvites(tenantId: string) {
  const db = getDb();
  return db
    .select()
    .from(invites)
    .where(eq(invites.tenantId, tenantId))
    .orderBy(desc(invites.createdAt));
}

// ── revokeInvite ──────────────────────────────────────────────────────────────

/**
 * Mark an invite as revoked. Idempotent.
 *
 * IDOR guard: the UPDATE filters by BOTH id AND tenantId so an actor in
 * tenant A cannot revoke an invite in tenant B (T-031-INV-4 / PATTERNS.md IDOR note).
 */
export async function revokeInvite(opts: {
  id: string;
  tenantId: string;
}): Promise<void> {
  const db = getDb();
  await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invites.id, opts.id),
        eq(invites.tenantId, opts.tenantId) // tenant-scope prevents cross-tenant revoke
      )
    );
}

// ── consumeInviteByToken ──────────────────────────────────────────────────────

/**
 * Consume an invite by its raw token.
 *
 * Returns { role, tenantId } on success, or null on any failure (fail-closed):
 *   - unknown token hash
 *   - already consumed (consumedAt IS NOT NULL)
 *   - revoked (revokedAt IS NOT NULL)
 *   - expired (expiresAt <= now)
 *
 * Single-use race-safety (T-031-INV-3): the consume is a guarded UPDATE WHERE
 * consumedAt IS NULL — a concurrent second redeem updates 0 rows and returns null.
 *
 * NEVER logs the raw token (T-031-INV-5).
 */
export async function consumeInviteByToken(
  raw: string
): Promise<{ role: string; tenantId: string } | null> {
  try {
    const tokenHash = hashToken(raw);
    const now = new Date();
    const db = getDb();

    // Step 1: Select the invite — must be un-consumed, un-revoked, and not expired
    const rows = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.tokenHash, tokenHash),
          isNull(invites.consumedAt),
          isNull(invites.revokedAt),
          gt(invites.expiresAt, now)  // fail-closed: expired tokens are refused
        )
      )
      .limit(1);

    const invite = rows[0];
    if (!invite) {
      // Unknown, consumed, revoked, or expired — fail closed (T-031-INV-6)
      return null;
    }

    // Step 2: Guarded UPDATE — WHERE consumedAt IS NULL makes this race-safe (T-031-INV-3)
    // A concurrent second redeem will find consumedAt already set and update 0 rows.
    const updated = await db
      .update(invites)
      .set({ consumedAt: now })
      .where(
        and(
          eq(invites.tokenHash, tokenHash),
          isNull(invites.consumedAt)  // race guard: only 1 concurrent call wins
        )
      )
      .returning({ id: invites.id });

    if (updated.length === 0) {
      // Race condition: another request consumed this token concurrently
      return null;
    }

    return { role: invite.role, tenantId: invite.tenantId };
  } catch {
    // Any lookup error → fail closed (T-031-INV-6): never allow-through on error
    return null;
  }
}
