import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

// Logout action — clear the session and redirect to /login.
// No loader, no default export (action-only resource route).
export async function action({ request }: ActionFunctionArgs) {
  await auth.api.signOut({ headers: request.headers, asResponse: false });
  throw redirect("/login");
}
