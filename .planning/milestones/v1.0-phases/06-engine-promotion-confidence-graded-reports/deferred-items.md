# Phase 06 Deferred Items

_No items deferred out of Phase 06. The build issue found during 06-05 was resolved in-phase (see below)._

## RESOLVED IN-PHASE — engine server-only bundle leak

**Found during:** 06-05 Task 2 verification (`npm run build`)
**Resolved during:** Phase 06 finalization (post-Wave-4 integration gate)

**Issue:** `npm run build` failed with:
```
[commonjs--resolver] Server-only module referenced by client
  './engine.server' imported by 'app/lib/metrics.ts'
```

**Root cause:** Plan 06-01 extracted the pure decision engine into `app/lib/engine.server.ts` and added backward-compat re-exports (`metrics.ts`, `protocol-data.ts`, `correlations.ts`). Those re-exporters are reachable from client route components, so the `.server` suffix — which forbids the module from the client bundle — broke the production build. The `.server` suffix was a misnomer: the engine is provably pure (only `date-fns` + type imports; an ESLint rule and an import-purity test both enforce that it imports no Drizzle/react-router/Neon), i.e. it is client-safe by design.

**Resolution:** Renamed `app/lib/engine.server.ts` → `app/lib/engine.ts` (a pure, client-safe module should not carry `.server`). Updated all importers (`metrics.ts`, `protocol-data.ts`, `correlations.ts`, `report-generator.server.ts`, `tests/lib/engine.test.ts`), the ESLint import-purity rule target, and the import-purity test's resolve path. The purity gate (ESLint + test) remains active on `engine.ts`.

**Deviation note:** CONTEXT decision D-01 named the module `engine.server.ts`. The decision's intent (a single pure, dependency-free engine module) is preserved; only the filename suffix changed to fix the client-bundle break. `report-generator.server.ts` (the server-side report writer that consumes the engine) keeps its `.server` suffix.

**Verification:** `npm run build` ✓ (client 2838 modules + ssr), typecheck clean, lint clean, `npm test` 260 passed / 0 failed.
