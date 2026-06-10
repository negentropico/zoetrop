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
 * CR-01 split: resolveInviteByToken VALIDATES (non-mutating SELECT) and is used in the
 * beforeSignUp gate; consumeInviteByToken BURNS (guarded UPDATE) and runs adjacent to the
 * user-row write so a failed/duplicate signup never burns the token (atomic role+tenant
 * delivery — see auth.server.ts databaseHooks).
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
 *
 * Returns { revoked: boolean } reflecting whether a row was actually changed (WR-02).
 * A wrong/empty tenant or unknown id matches zero rows → { revoked: false }, so the
 * caller can surface "Invite not found." instead of a silent false success.
 */
export async function revokeInvite(opts: {
  id: string;
  tenantId: string;
}): Promise<{ revoked: boolean }> {
  const db = getDb();
  const changed = await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invites.id, opts.id),
        eq(invites.tenantId, opts.tenantId) // tenant-scope prevents cross-tenant revoke
      )
    )
    .returning({ id: invites.id });

  // WR-02: a no-op UPDATE (0 rows) is NOT a success — report it honestly.
  return { revoked: changed.length > 0 };
}

// ── resolveInviteByToken ──────────────────────────────────────────────────────

/**
 * VALIDATE an invite by its raw token WITHOUT consuming it (CR-01).
 *
 * Performs the exact same fail-closed checks as consumeInviteByToken — un-consumed,
 * un-revoked, not expired, known hash — but runs a SELECT ONLY: it NEVER marks the
 * invite consumed. Used by the beforeSignUp gate to validate a token up front so a
 * signup that later fails (duplicate email, write error) does not burn the token.
 *
 * Returns { role, tenantId } if the token is currently valid, or null otherwise
 * (unknown / consumed / revoked / expired / any error → null, fail-closed).
 *
 * NEVER logs the raw token (T-031-INV-5).
 */
export async function resolveInviteByToken(
  raw: string
): Promise<{ role: string; tenantId: string } | null> {
  try {
    const tokenHash = hashToken(raw);
    const now = new Date();
    const db = getDb();

    const rows = await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.tokenHash, tokenHash),
          isNull(invites.consumedAt),
          isNull(invites.revokedAt),
          gt(invites.expiresAt, now) // fail-closed: expired tokens are refused
        )
      )
      .limit(1);

    const invite = rows[0];
    if (!invite) return null; // unknown / consumed / revoked / expired

    // SELECT only — no UPDATE here. The burn happens in consumeInviteByToken,
    // adjacent to the user-row write (CR-01 atomic delivery).
    return { role: invite.role, tenantId: invite.tenantId };
  } catch {
    return null; // fail closed on any error (T-031-INV-6)
  }
}

// ── consumeInviteByToken ──────────────────────────────────────────────────────

/**
 * Consume (BURN) an invite by its raw token, single-use.
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
 * WR-01: when `consumedBy` (the consuming user's id) is supplied, it is recorded
 * alongside consumedAt so the invite audit trail attributes the redemption to a user.
 * The caller passes this from databaseHooks.user.create.after where the new id exists.
 *
 * CR-01: this runs ADJACENT to the user-row write (in the user.create hooks), so the
 * burn and the role/tenant injection commit together — a failed signup never burns
 * the token, and a resolved-but-unburnable invite fails closed (the hook throws).
 *
 * NEVER logs the raw token (T-031-INV-5).
 */
export async function consumeInviteByToken(
  raw: string,
  consumedBy?: string
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
    // WR-01: record consumedBy when the consuming user id is available.
    const setPayload: { consumedAt: Date; consumedBy?: string } = {
      consumedAt: now,
    };
    if (consumedBy) {
      setPayload.consumedBy = consumedBy;
    }

    const updated = await db
      .update(invites)
      .set(setPayload)
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
