# Phase 06 Deferred Items

## Out-of-Scope Build Issue (Pre-existing)

**Found during:** 06-05 Task 2 verification
**Issue:** `npm run build` fails with:
```
[commonjs--resolver] Server-only module referenced by client
  './engine.server' imported by 'app/lib/metrics.ts'
```
**Root cause:** `app/lib/metrics.ts` re-exports `classifyMetricStatus as getMetricStatus` from `./engine.server` (added in Plan 06-01 backward-compat shim). Vite's client bundle treeshaker flags `engine.server` as server-only. The `metrics.ts` re-export is intended as a server-only module but lacks the `.server.ts` convention or explicit `"use server"` boundary.

**Pre-existing:** Confirmed to exist BEFORE Plan 06-05 changes by testing with git stash.

**Impact on 06-05:** The three new reports routes build correctly (they're server-only loaders/actions). The build failure affects the overall production build.

**Resolution path:** Rename `metrics.ts` to `metrics.server.ts` OR add a separate client-safe `metrics.client.ts` re-export that doesn't include `classifyMetricStatus`. Alternatively, remove the backward-compat re-export from metrics.ts since all callers of `getMetricStatus` are server-side loaders.

**Owner:** Phase 07 or a dedicated cleanup plan.
