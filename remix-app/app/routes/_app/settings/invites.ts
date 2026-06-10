/**
 * settings/invites.ts — Action-only resource route for invite revocation.
 *
 * No loader, no default export — this is a resource route.
 *
 * Security contracts (T-031-SET-2):
 *   - requireUser: unauthenticated requests → redirect to /login
 *   - requireRole: clients 403'd even with crafted POST requests
 *   - revokeInvite scoped by user.tenantId (IDOR guard — filters WHERE id AND tenantId)
 *   - WR-02: a tenant-less actor is 403'd up front (never silently revokes nothing),
 *     and revokeInvite reports whether a row actually changed so a no-op surfaces
 *     "Invite not found." instead of a false success.
 *   - WR-03: the :inviteId route param is validated explicitly (no non-null assertion).
 */

import type { ActionFunctionArgs } from "react-router";
import { requireUser, requireRole } from "~/lib/authz.server";
import { revokeInvite } from "~/lib/invites.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireUser(request);

  // Server gate: client cannot revoke even with a crafted request (T-031-SET-2 / D-12)
  requireRole(user, ["owner", "practitioner"]);

  // WR-03: validate the route param explicitly — never pass undefined into the
  // Drizzle id filter (a non-null assertion could yield eq(invites.id, undefined)).
  if (!params.inviteId) {
    throw new Response("Not found", { status: 404 });
  }

  // WR-02: a tenant-less owner/practitioner would match zero rows on revoke and
  // silently "succeed". Reject up front rather than lie about revocation state.
  if (!user.tenantId) {
    throw new Response("No tenant assignment.", { status: 403 });
  }

  // Tenant-scoped revoke: helper filters WHERE id = … AND tenantId = …
  // Passing user.tenantId (from session, never params) closes the IDOR vector.
  try {
    const { revoked } = await revokeInvite({
      id: params.inviteId,
      tenantId: user.tenantId,
    });
    if (!revoked) {
      // WR-02: zero rows changed (wrong id, or invite belongs to another tenant) —
      // surface a real error instead of a false success the UI would render as done.
      return { success: false, error: "Invite not found." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Unable to revoke invite. Try again." };
  }
}

// No loader, no default export — action-only resource route
