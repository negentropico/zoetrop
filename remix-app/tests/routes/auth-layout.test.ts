import { describe, it, expect } from "vitest";

// AUTH-02 — authenticated layout loader redirect.
//
// RED until Plan 05 creates remix-app/app/routes/_app/layout.tsx exporting a
// `loader` that calls auth.api.getSession and throws redirect("/login?...") when
// there is no session (T-03-unauth-access). Asserts: calling the loader with a
// Request that carries no session cookie throws a redirect Response — status 302,
// Location starting with /login.
//
// Source: 03-RESEARCH.md § Pattern 3 + § Code Examples (Authenticated Layout
//   Loader: throw redirect(`/login?redirect=...`) when session is null).

import { loader } from "~/routes/_app/layout";

describe("AUTH-02 authenticated layout loader redirect", () => {
  it("throws a 302 redirect to /login when no session cookie is present", async () => {
    const request = new Request("https://zoetrop.vercel.app/dashboard");

    let thrown: unknown;
    try {
      // React Router loaders receive { request, params, context }.
      await loader({ request, params: {}, context: {}, unstable_pattern: "/dashboard" });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Response);

    const response = thrown as Response;
    expect(response.status).toBe(302);
    const location = response.headers.get("Location") ?? "";
    expect(location.startsWith("/login")).toBe(true);
  });
});
