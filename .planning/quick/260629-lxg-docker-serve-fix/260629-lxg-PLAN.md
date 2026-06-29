---
phase: quick-260629-lxg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [remix-app/react-router.config.ts]
autonomous: true
requirements: [QUICK-260629-lxg]
quick: true

must_haves:
  truths:
    - "A standalone (non-Vercel) `react-router build` emits `build/server/index.js` — the artifact the Dockerfile's `npm run start` (react-router-serve ./build/server/index.js) requires."
    - "Vercel builds still receive `vercelPreset()` (preset applied only when `process.env.VERCEL` is set)."
  artifacts:
    - path: "remix-app/react-router.config.ts"
      provides: "Conditional Vercel preset — standard SSR output off Vercel, Vercel build-output on Vercel"
      contains: "process.env.VERCEL ? [vercelPreset()] : []"
  key_links:
    - from: "remix-app/react-router.config.ts"
      to: "process.env.VERCEL"
      via: "ternary gating the presets array"
      pattern: "process\\.env\\.VERCEL\\s*\\?\\s*\\[vercelPreset\\(\\)\\]\\s*:\\s*\\[\\]"
    - from: "remix-app/package.json start script"
      to: "build/server/index.js"
      via: "react-router-serve consumes the standalone SSR server bundle"
      pattern: "react-router-serve \\./build/server/index\\.js"
---

<objective>
Repair Docker by making the Vercel preset conditional in `react-router.config.ts`. Today the preset is applied unconditionally, so `react-router build` emits Vercel build-output (`.vercel/output/`) and never produces `build/server/index.js`. The Docker image builds but crashes on start with `Cannot find module /app/build/server/index.js`.

Gate the preset on `process.env.VERCEL` (auto-set to "1" on Vercel, unset in Docker/local). A Docker/standalone build then emits standard React Router SSR output (`build/server/index.js`) while Vercel deploys keep the preset.

Purpose: The app must actually serve in a container.
Output: One-line config change to `remix-app/react-router.config.ts`, proven at the source/build level by a standalone build that produces `build/server/index.js`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/HANDOFF.md

<interfaces>
<!-- Current react-router.config.ts — the ONLY file to change -->
From remix-app/react-router.config.ts:
```typescript
import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config;
```

From remix-app/package.json (consumers — DO NOT modify):
```
"build": "react-router build"
"start": "react-router-serve ./build/server/index.js"
```

From remix-app/Dockerfile (consumer — DO NOT modify):
```
RUN npm run build                 # build-env stage → must produce /app/build
COPY --from=build-env /app/build /app/build
CMD ["npm", "run", "start"]       # react-router-serve ./build/server/index.js
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Gate the Vercel preset on process.env.VERCEL</name>
  <files>remix-app/react-router.config.ts</files>
  <action>
Change the `presets` line from the unconditional `presets: [vercelPreset()]` to the conditional form:

`presets: process.env.VERCEL ? [vercelPreset()] : [],`

Keep the existing `import { vercelPreset } from '@vercel/react-router/vite';` import, the `import type { Config }` import, `ssr: true`, and the `satisfies Config` — change ONLY the presets line. Do NOT touch the Dockerfile, package.json, or any route/component code. Rationale: `VERCEL` is auto-set to "1" on Vercel builds and unset in Docker/local, so this makes a standalone build emit standard SSR output (`build/server/index.js`) while Vercel deploys still get the Vercel preset (per HANDOFF Task A root cause + recommended fix).
  </action>
  <verify>
    <automated>grep -Eq 'presets:\s*process\.env\.VERCEL\s*\?\s*\[vercelPreset\(\)\]\s*:\s*\[\]' remix-app/react-router.config.ts && echo PRESET_CONDITIONAL_OK</automated>
  </verify>
  <done>`react-router.config.ts` gates `vercelPreset()` behind `process.env.VERCEL`; preset array is empty when VERCEL is unset. No other files changed.</done>
</task>

<task type="auto">
  <name>Task 2: Prove standalone build emits build/server/index.js</name>
  <files>remix-app/react-router.config.ts</files>
  <action>
Run a clean standalone (non-Vercel) production build from `remix-app/` with the `VERCEL` env var explicitly unset, and confirm the standard React Router SSR server bundle now exists. This is the deterministic source/build-level proof that the preset is now conditional. Use `env -u VERCEL` so the result does not depend on the ambient shell.

Run from `remix-app/`:
1. `env -u VERCEL npm run build`
2. Confirm `build/server/index.js` exists (this is the file the Dockerfile's `CMD ["npm","run","start"]` loads via `react-router-serve ./build/server/index.js`).
3. Confirm `build/client/` exists (standard client assets) and that NO `.vercel/output/` directory was produced by this standalone build.

IMPORTANT — verification labor split (per task constraints): the executor verifies at the SOURCE/BUILD level ONLY. Do NOT run `docker build` or `docker run` — the orchestrator owns live-container verification (docker build + docker run + sign-in) and the removal/rebuild of the broken `zoetrop-app:latest` image. Running `npm run build` from the worktree's `remix-app/` is self-contained and safe.
  </action>
  <verify>
    <automated>cd remix-app && env -u VERCEL npm run build && test -f build/server/index.js && test -d build/client && echo STANDALONE_SSR_OK</automated>
  </verify>
  <done>`env -u VERCEL npm run build` exits 0 and `remix-app/build/server/index.js` exists alongside `build/client/`. The standalone build no longer emits Vercel-only output. Docker/live verification is left to the orchestrator.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No new trust boundary is introduced. This is a build-time configuration change selecting which output format `react-router build` emits; it touches no request path, no auth, no data, and adds no dependencies.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-lxg-01 | Tampering | react-router.config.ts build-mode selection | accept | One-line, gated on platform-provided `VERCEL`; Vercel path unchanged; standalone path proven by build artifact check in Task 2. No runtime surface. |
| T-lxg-SC | Tampering | npm/pip/cargo installs | accept | No package installs in this plan; nothing added to package.json. |
</threat_model>

<verification>
- `react-router.config.ts` contains `presets: process.env.VERCEL ? [vercelPreset()] : []`.
- `env -u VERCEL npm run build` (from `remix-app/`) exits 0.
- `remix-app/build/server/index.js` exists after the standalone build.
- `remix-app/build/client/` exists; no `.vercel/output/` produced by the standalone build.
- No files other than `react-router.config.ts` are modified (Dockerfile, package.json, routes untouched).
</verification>

<success_criteria>
A standalone (non-Vercel) `react-router build` produces `build/server/index.js`, satisfying the Dockerfile's `react-router-serve ./build/server/index.js` start command, while Vercel builds still apply `vercelPreset()`. Source/build-level proof complete; live container verification handed to the orchestrator.
</success_criteria>

<output>
Create `.planning/quick/260629-lxg-docker-serve-fix/260629-lxg-SUMMARY.md` when done.
</output>
