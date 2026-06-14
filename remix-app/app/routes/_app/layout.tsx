import { redirect, Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { AppShell } from "~/components/shell/AppShell";
import { listSubjectsForTenant } from "~/lib/subjects.server";

// AUTH-02 — authenticated layout loader.
// All routes nested under this layout require a valid session.
// No session → redirect to /login with the original pathname preserved for
// post-login redirect. Pitfall 4: MUST pass request.headers to getSession or
// the session cookie is never read and the check always returns null.
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  // Normalize the session user for the shell — role is `string | null | undefined`
  // from Better-Auth additionalFields but shell components require `string`.
  // Coerce to "client" as a safe default (read-only role) when unset.
  const u = session.user;
  // Sidebar collapse preference — zt-nav=1 means collapsed. Strict-regex parse
  // to a boolean only (T-q56-01: never interpolated, stored, or echoed).
  // SSR-read so the initial render matches the client (no flash).
  const cookie = request.headers.get("Cookie") ?? "";
  const navCollapsed = /(?:^|;\s*)zt-nav=1(?:\s*;|$)/.test(cookie);

  // Load subject list for SubjectChip (owner/practitioner only — clients have no chip).
  // Parse the zt-subject cookie to determine the active subject id.
  let subjectList: Array<{ id: string; displayName: string }> = [];
  let activeSubjectId: string | null = null;
  if (u.tenantId && (u.role === "owner" || u.role === "practitioner")) {
    const subjectMatch = /(?:^|;\s*)zt-subject=([^;]+)/.exec(cookie);
    activeSubjectId = subjectMatch?.[1] ?? null;
    const rows = await listSubjectsForTenant(u.tenantId);
    subjectList = rows.map((s) => ({ id: s.id, displayName: s.displayName }));
  }

  return {
    user: {
      name: u.name,
      email: u.email,
      role: u.role ?? "client",
    },
    navCollapsed,
    subjectList,
    activeSubjectId,
  };
}

// AppShell moves here from root.tsx (Pitfall 3 — never leave AppShell in root
// where it would wrap public/login routes too).
// Thread the session user (name, email, role) + navCollapsed from loader →
// AppShell → Sidebar/SidebarAccount.
export default function AppLayout() {
  const { user, navCollapsed, subjectList, activeSubjectId } = useLoaderData<typeof loader>();
  return (
    <AppShell
      user={user}
      navCollapsed={navCollapsed}
      subjectList={subjectList}
      activeSubjectId={activeSubjectId}
    >
      <Outlet />
    </AppShell>
  );
}
