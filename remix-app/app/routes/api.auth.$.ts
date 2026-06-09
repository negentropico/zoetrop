// Better-Auth catch-all resource route.
// Mounts the full Better-Auth HTTP handler for both GET and POST requests.
// The `$` wildcard in the filename catches all sub-paths:
//   /api/auth/sign-in/email, /api/auth/sign-out, /api/auth/session, etc.
// Route is registered in routes.ts as: route("api/auth/*", "routes/api.auth.$.ts")
// (Plan 05 wires the route table; this file creates the handler.)
// No default export — this is a resource route (no JSX component).
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return auth.handler(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return auth.handler(request);
}
