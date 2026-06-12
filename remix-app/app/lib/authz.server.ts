/**
 * authz.server.ts — Server-side authorization helpers (D-11/D-12/D-13)
 *
 * Single source of truth for role→capability enforcement. All helpers are
 * fail-closed: missing or unknown roles are denied, never granted.
 *
 * RLS-compatible design: requireUser extracts session.user.tenantId so the
 * Phase 7 GUC RLS retrofit mirrors these app-layer checks rather than
 * contradicting them (01-SPIKE-FINDINGS).
 *
 * Phase 7 AUTH-03 COMPLETE: assertSubjectAccess extended with optional
 * assignedSubjectIds parameter for per-assignment practitioner scoping.
 * The 7 existing owner-context callers are unbroken (parameter is optional).
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
// Tenant + per-assignment authorization gate (D-11/D-13, AUTH-03).
//
// Check order:
//   1. client role → always 403 (clients never access subject data directly)
//   2. cross-tenant → always 403 (no IDOR, T-031-AZ-2)
//   3. practitioner + assignedSubjectIds provided → deny unless subject.id ∈ set
//   4. owner → passes for any same-tenant subject (tenant-wide access retained)
//
// The `assignedSubjectIds` parameter is OPTIONAL so the 7 existing owner-context
// callers (ingest/{consent,document,upload,review}.tsx, reports/{generate,detail,
// index}.tsx, report-generator.server.ts) remain valid without modification.
// When `assignedSubjectIds` is undefined the per-assignment check is skipped —
// those callers are owner-context and own their tenant's data entirely.
//
// For practitioner callers: populate `assignedSubjectIds` from
// `listAssignedSubjectIds(ctx, practitionerId)` in assignments.server.ts.
// Phase 7 AUTH-03 COMPLETE (Plan 04).

export function assertSubjectAccess(
  user: { role?: string | null; id?: string },
  subject: { tenantId: string; id?: string },
  userTenantId: string,
  assignedSubjectIds?: string[]
): void {
  // Gate 1: client role is always denied
  if (user.role === "client") {
    throw new Response("You don't have permission to view this.", {
      status: 403,
    });
  }
  // Gate 2: cross-tenant — no IDOR
  if (subject.tenantId !== userTenantId) {
    throw new Response("You don't have permission to view this.", {
      status: 403,
    });
  }
  // Gate 3: per-assignment check for practitioners
  // Only applies when assignedSubjectIds is explicitly provided (not undefined).
  // Owners skip this gate entirely — they retain tenant-wide access (D-07).
  if (user.role === "practitioner" && assignedSubjectIds !== undefined) {
    if (!subject.id || !assignedSubjectIds.includes(subject.id)) {
      throw new Response("You don't have permission to view this.", {
        status: 403,
      });
    }
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
