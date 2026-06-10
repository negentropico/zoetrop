/**
 * settings/invites.ts — Action-only resource route for invite revocation.
 *
 * No loader, no default export — this is a resource route.
 *
 * Security contracts (T-031-SET-2):
 *   - requireUser: unauthenticated requests → redirect to /login
 *   - requireRole: clients 403'd even with crafted POST requests
 *   - revokeInvite scoped by user.tenantId (IDOR guard — filters WHERE id AND tenantId)
 */

import type { ActionFunctionArgs } from "react-router";
import { requireUser, requireRole } from "~/lib/authz.server";
import { revokeInvite } from "~/lib/invites.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireUser(request);

  // Server gate: client cannot revoke even with a crafted request (T-031-SET-2 / D-12)
  requireRole(user, ["owner", "practitioner"]);

  // Tenant-scoped revoke: helper filters WHERE id = … AND tenantId = …
  // Passing user.tenantId (from session, never params) closes the IDOR vector.
  try {
    await revokeInvite({
      id: params.inviteId!,
      tenantId: user.tenantId ?? "",
    });
    return { success: true };
  } catch {
    return { success: false, error: "Unable to revoke invite. Try again." };
  }
}

// No loader, no default export — action-only resource route
