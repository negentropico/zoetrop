import { redirect, Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { AppShell } from "~/components/shell/AppShell";

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
  return {
    user: {
      name: u.name,
      email: u.email,
      role: u.role ?? "client",
    },
  };
}

// AppShell moves here from root.tsx (Pitfall 3 — never leave AppShell in root
// where it would wrap public/login routes too).
// Thread the session user (name, email, role) from loader → AppShell → TopNav → AccountMenu.
export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
