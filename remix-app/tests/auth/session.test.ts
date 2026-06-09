import { describe, it, expect } from "vitest";

// AUTH-01 — getSession contract.
//
// RED until Plan 03 creates remix-app/app/lib/auth.server.ts exporting the
// Better-Auth `auth` instance. The static import below fails to resolve until
// then, which is the intended Wave-0 red state: this file is the fixed contract
// every later plan's auth.server.ts must satisfy.
//
// Contract asserted here:
//   - `auth` exposes the Better-Auth server surface: `auth.api.getSession` and `auth.handler`.
//   - `auth.api.getSession({ headers })` returns null when no session cookie is present
//     (empty Headers) — an unauthenticated request has no session.
//
// Source: 03-RESEARCH.md § Code Examples (getSession), § Pattern 1 (auth.server.ts shape).

import { auth } from "~/lib/auth.server";

describe("AUTH-01 getSession contract", () => {
  it("exposes the Better-Auth server surface (api.getSession + handler)", () => {
    expect(auth).toBeDefined();
    expect(typeof auth.api.getSession).toBe("function");
    expect(typeof auth.handler).toBe("function");
  });

  it("returns null for a request carrying no session cookie", async () => {
    const headers = new Headers();
    const session = await auth.api.getSession({ headers });
    expect(session).toBeNull();
  });
});
