// Vitest global test setup — runs before all tests regardless of environment.
// This file is referenced by vite.config.ts `test.setupFiles`.
//
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
