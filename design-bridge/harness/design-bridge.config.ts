/**
 * design-bridge.config.ts — declarative per-repo harness config for the
 * design-roundtrip CORE (typed by @design-roundtrip/config).
 *
 * Run `npm run design:sync-core` once (and on CORE updates) to populate the
 * gitignored .staging-core from the sibling ngtops repo.
 *
 * Import ONLY from @design-roundtrip/config (never the barrel @design-roundtrip
 * — the barrel pulls postcss/tar and must not leak into this harness).
 *
 * LAYOUT NOTE — zoetrop keeps its design artifacts at the REPO ROOT
 * (`design-bridge/`, `docs/design-system/`), and the app lives in `remix-app/`.
 * So the design:* scripts run with cwd = the repo root (the npm scripts in
 * `remix-app/package.json` `cd ..` first). Every relative path below is
 * therefore anchored at the zoetrop repo root.
 *
 * SCOPE — OUTBOUND PREPILOT ONLY:
 *   `adapter: 'react-tailwind'` is FORWARD-DECLARED. No react-tailwind adapter
 *   module exists in CORE yet (only react-cssmodules, the wrong idiom for this
 *   Tailwind v4 app), so the INBOUND half (decode → adapt → gate → capture) is
 *   DEFERRED to a future adapter phase. `kitCopies` is intentionally omitted so
 *   `init`/`seed` run without resolving an adapter module.
 *
 * ARCHETYPE — adopt-existing foundation → refinement LINE. zoetrop is NOT
 * greenfield: `docs/design-system/` is a mature, shipped DS (3 prior rounds,
 * live site). The token snapshot below (`remix-app/app/app.css`) is the FROZEN
 * foundation, not a baseline being replaced (cf. FSN, which builds from zero).
 */

import { defineConfig } from '@design-roundtrip/config';

export const designBridgeConfig = defineConfig({
  // Forward-declared: matches zoetrop's stack (React Router 7 + Vite + Tailwind v4);
  // module not yet implemented in CORE (inbound deferred). Shared with LGS once a
  // real react-tailwind adapter lands.
  adapter: 'react-tailwind',

  // zoetrop is local-only (no git remote per memory). Placeholder until one exists.
  repo: { url: 'https://github.com/zoetrop/zoetrop.git', defaultBranch: 'main' },

  // Relative to the repo root (process.cwd() when the design:* scripts run).
  dirs: {
    staging: 'design-bridge/harness/.staging',
    rounds: 'design-bridge/harness/rounds',
  },

  // The product surfaces the foundation governs + refinement lines apply to.
  // Tailwind has no per-surface CSS file, so only viewFile is set. Paths are
  // relative to the repo root. The priority subset per line is set in its BRIEF.
  surfaces: {
    'app-shell': { viewFile: 'remix-app/app/routes/_app/layout.tsx' },
    dashboard: { viewFile: 'remix-app/app/routes/_app/dashboard.tsx' },
    metrics: { viewFile: 'remix-app/app/routes/_app/metrics/index.tsx' },
    'metric-detail': { viewFile: 'remix-app/app/routes/_app/metrics/detail.tsx' },
    protocol: { viewFile: 'remix-app/app/routes/_app/protocol/index.tsx' },
    insights: { viewFile: 'remix-app/app/routes/_app/insights/index.tsx' },
    correlations: { viewFile: 'remix-app/app/routes/_app/insights/correlations.tsx' },
    ingest: { viewFile: 'remix-app/app/routes/_app/ingest/index.tsx' },
    'ingest-review': { viewFile: 'remix-app/app/routes/_app/ingest/review.tsx' },
    reports: { viewFile: 'remix-app/app/routes/_app/reports/index.tsx' },
    'reports-generate': { viewFile: 'remix-app/app/routes/_app/reports/generate.tsx' },
    'report-detail': { viewFile: 'remix-app/app/routes/_app/reports/detail.tsx' },
    clients: { viewFile: 'remix-app/app/routes/_app/clients/index.tsx' },
    settings: { viewFile: 'remix-app/app/routes/_app/settings/index.tsx' },
    landing: { viewFile: 'remix-app/app/routes/landing.tsx' },
    login: { viewFile: 'remix-app/app/routes/auth/login.tsx' },
  },

  // Inbound transport — how a claude.ai/design return comes back. Required by
  // defineConfig but INERT this round (decode deferred). saved-bundle = .tgz.
  transport: [{ kind: 'saved-bundle', path: 'design-bridge/harness/.staging/return.tgz' }],

  // Design-token source of truth — VERIFIED: hex custom properties under :root
  // (light; several :root blocks, all aggregated) and html[data-theme="dark"]
  // (warm-dark remap) in the app's global stylesheet (Tailwind v4 @theme inline
  // bridges these to utilities). The dark selector is matched verbatim by CORE's
  // token-sync parser (comma-split exact match).
  tokens: {
    kind: 'tokens-css',
    path: 'remix-app/app/app.css',
    themeSelectors: { light: ':root', dark: 'html[data-theme="dark"]' },
  },

  // kitCopies intentionally OMITTED (see header) — keeps init/seed adapter-free.

  domain: { appId: 'zoetrop' },

  // Forward-declared; the LLM gate is not run this round.
  llm: { provider: 'claude' },
});
