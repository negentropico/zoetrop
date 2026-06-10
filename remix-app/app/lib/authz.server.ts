/**
 * authz.server.ts — Server-side authorization helpers (D-11/D-12/D-13)
 *
 * Single source of truth for role→capability enforcement. All helpers are
 * fail-closed: missing or unknown roles are denied, never granted.
 *
 * RLS-compatible design: requireUser extracts session.user.tenantId so the
 * Phase 7 `SET LOCAL request.jwt.claims` retrofit can mirror these app-layer
 * checks rather than contradict them (01-SPIKE-FINDINGS).
 *
 * Out of scope (→ Phase 7): RLS enable + policies, SET LOCAL withTenantDb,
 * per-assignment AUTH-03 scoping, immutable AUTH-04 audit log.
 */

import { redirect } from "react-router";
import { auth } from "./auth.server";

// ── Types ──────────────────────────────────────────────────────────────────

export type AppRole = "owner" | "practitioner" | "client";

// ── requireUser ────────────────────────────────────────────────────────────
//
// Mirrors the session gate in _app/layout.tsx but as a reusable server helper.
// Unauthenticated → redirect to /login with the original pathname preserved
// for post-login redirect.

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  return { user: session.user, session };
}

// ── requireRole ────────────────────────────────────────────────────────────
//
// Synchronous check that throws a 403 Response for authorization failures
// (NOT redirect — 403 surfaces correctly to error boundaries).
// Fail-closed: a missing or unknown role is always denied (T-031-AZ-1).

export function requireRole(
  user: { role?: string | null },
  allowed: AppRole[]
): void {
  if (!user.role || !allowed.includes(user.role as AppRole)) {
    throw new Response("You don't have permission to view this.", {
      status: 403,
    });
  }
}

// ── assertSubjectAccess ───────────────────────────────────────────────────
//
// Tenant-scoped interim authorization gate (D-13).
// Denies: client role outright; any practitioner/owner whose tenantId differs
// from the subject's tenantId (no IDOR / cross-tenant access, T-031-AZ-2).
// Per-assignment AUTH-03 scoping is Phase 7 — do NOT add it here.

export function assertSubjectAccess(
  user: { role?: string | null },
  subject: { tenantId: string },
  userTenantId: string
): void {
  if (user.role === "client") {
    throw new Response("You don't have permission to view this.", {
      status: 403,
    });
  }
  if (subject.tenantId !== userTenantId) {
    throw new Response("You don't have permission to view this.", {
      status: 403,
    });
  }
}

// ── CAPABILITIES matrix (D-12) ────────────────────────────────────────────
//
// Maps every AppRole to its allowed capability strings.
// owner: can invite practitioners + clients + access admin settings
// practitioner: can invite clients + access admin settings
// client: no special capabilities
//
// Extend this matrix when new capabilities land (Phase 3.1+).

export const CAPABILITIES = {
  owner: ["invite:practitioner", "invite:client", "admin:settings"],
  practitioner: ["invite:client", "admin:settings"],
  client: [],
} as const satisfies Record<AppRole, readonly string[]>;

// ── can() ─────────────────────────────────────────────────────────────────
//
// Reads the CAPABILITIES matrix for the user's role.
// Fail-closed via `?? "client"` fallback: undefined/unknown roles get the
// empty client capability set (T-031-AZ-3).

export function can(
  user: { role?: string | null },
  capability: string
): boolean {
  const role = (user.role ?? "client") as AppRole;
  const caps = CAPABILITIES[role] ?? ([] as readonly string[]);
  return (caps as readonly string[]).includes(capability);
}
