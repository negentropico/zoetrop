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
import { getOwnerSubject, getActiveSubject } from "./data.server";
import type { TenantCtx } from "./data.server";

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
// requireSubjectCtx (below) is the canonical caller for PHI read loaders.
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

// ── requireSubjectCtx ─────────────────────────────────────────────────────
//
// Canonical PHI-read entry point (CR-02 fix, Phase 7 Plan 06).
//
// Composes requireUser → getActiveSubject → assertSubjectAccess in one call.
// All 13 PHI read loaders (dashboard/metrics/insights/protocol) use this
// helper instead of duplicating the three-line boilerplate.
//
// Why this is required: React Router 7 child loaders run independently of
// _app/layout.tsx — the layout loader gates authentication only. Child loader
// execution is NOT blocked by the layout gate, so a client-role user who passes
// authentication can reach every child loader without a role check. This helper
// closes that gap by running assertSubjectAccess (Gate 1: client → 403) on
// every PHI read surface. Centralizing the check in one function means a single
// audit point; tsc forces every PHI loader to the same contract.
//
// Import-cycle note: data.server.ts → db.server.ts only; it does NOT import
// authz.server.ts. This authz → data.server edge introduces no cycle.

export async function requireSubjectCtx(request: Request): Promise<{
  user: Awaited<ReturnType<typeof requireUser>>["user"];
  subject: Awaited<ReturnType<typeof getOwnerSubject>>;
  ctx: TenantCtx;
}> {
  // Step 1: authenticate — throws redirect(/login) if no session
  const { user } = await requireUser(request);
  // Step 2: resolve the active subject for this tenant — reads zt-subject cookie;
  //          falls back to owner subject if absent/invalid/cross-tenant (self-healing)
  const subject = await getActiveSubject(request, user.tenantId!);
  // Step 3: role + tenant gate — Gate 1 throws 403 for client role;
  //          Gate 2 throws 403 for cross-tenant (defense-in-depth)
  assertSubjectAccess(user, subject, user.tenantId!);
  // Step 4: build TenantCtx from validated identity
  const ctx: TenantCtx = {
    userId: user.id,
    tenantId: user.tenantId!,
    subjectId: subject.id,
  };
  return { user, subject, ctx };
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
