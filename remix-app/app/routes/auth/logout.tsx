import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

// Logout action — clear the session and redirect to /login.
// No loader, no default export (action-only resource route).
export async function action({ request }: ActionFunctionArgs) {
  // CR-01: use asResponse so Better-Auth's cookie-clearing Set-Cookie is
  // forwarded on the redirect — otherwise the signed session cookie persists
  // in the browser and getSession trusts it for the cookieCache window.
  const response = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  throw redirect("/login", { headers: response.headers });
}
