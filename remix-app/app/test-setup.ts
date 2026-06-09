// Vitest global test setup — runs before all tests regardless of environment.
// This file is referenced by vite.config.ts `test.setupFiles`.

// Stub required env vars for unit tests that import auth.server.ts.
// auth.server.ts guards for BETTER_AUTH_SECRET (mirrors db.server.ts env guard idiom).
// Tests run without real Vercel env vars — a stub value satisfies the guard and
// lets Better-Auth initialise (actual crypto is never exercised in unit tests).
if (!process.env["BETTER_AUTH_SECRET"]) {
  process.env["BETTER_AUTH_SECRET"] = "test-secret-stub-not-real";
}
// Stub DATABASE_URL so db.server.ts getPool() doesn't throw during import.
// The DB-introspection tests already skip-guard on DATABASE_URL; the stub just
// prevents a module-level throw when unit tests import auth.server.ts which
// transitively imports db.server.ts.
if (!process.env["DATABASE_URL"]) {
  process.env["DATABASE_URL"] = "postgres://stub:stub@localhost:5432/stub";
}

// jsdom localStorage setup:
// jsdom requires a valid `url` to activate Web Storage APIs. Vitest 4 passes
// --localstorage-file without a valid path in some configurations, which leaves
// localStorage as a non-functional stub. We patch it here with a Map-backed
// implementation that satisfies the localStorage contract for component tests.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.removeItem !== "function") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  } as Storage;
}
