/**
 * subject-switch.ts — Resource route: POST sets the zt-subject httpOnly cookie.
 * No loader, no default export — action-only resource route.
 *
 * Security (D-04/D-06):
 *   - requireUser: unauthenticated → redirect to /login
 *   - assertSubjectAccess: validates target subject is within caller's tenant;
 *     client role → 403 (Gate 1 — T-01-client-403); cross-tenant → 403 (Gate 2 — T-01-cross-tenant)
 *   - httpOnly cookie: cannot be read/written by client JS (T-01-cookie-tamper)
 *   - Session-scoped: no Max-Age/Expires → clears on browser close (D-06, T-01-session-scope)
 */

import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { requireUser, assertSubjectAccess } from "~/lib/authz.server";
import { getDb } from "~/lib/db.server";
import { subjects } from "../../../db/schema";
import { eq, and } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireUser(request);

  const formData = await request.formData();
  const subjectId = formData.get("subjectId");

  if (typeof subjectId !== "string" || !subjectId.trim()) {
    throw new Response("Missing subjectId", { status: 400 });
  }

  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  const db = getDb();
  const [candidate] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId.trim()), eq(subjects.tenantId, user.tenantId)))
    .limit(1);

  if (!candidate) {
    throw new Response("Subject not found", { status: 404 });
  }

  // Validates Gate 1 (client → 403) and Gate 2 (cross-tenant → 403).
  // NEVER skip this call — it is the PHI-safety check (RESEARCH anti-pattern).
  assertSubjectAccess(user, candidate, user.tenantId);

  const referer = request.headers.get("Referer") ?? "/dashboard";

  // httpOnly, session-scoped: NO Max-Age or Expires (D-06 — clears on browser close).
  return redirect(referer, {
    headers: {
      "Set-Cookie": `zt-subject=${subjectId.trim()}; Path=/; HttpOnly; SameSite=Lax`,
    },
  });
}

// No loader, no default export — action-only resource route
