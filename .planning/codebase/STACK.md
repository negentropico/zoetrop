# Technology Stack

**Analysis Date:** 2026-06-07

## Languages

**Primary:**
- TypeScript 5.9.3 — all application code in `remix-app/app/`, `remix-app/db/`, config files; strict mode enabled

**Secondary:**
- CSS — Tailwind 4 utility classes via `remix-app/app/app.css`

## Runtime

**Environment:**
- Node.js 20 (pinned in `netlify.toml` via `NODE_VERSION = "20"`; CI uses `node-version: 20`; local dev running 25.x is compatible)

**Package Manager:**
- npm 11.x
- Lockfile: `remix-app/package-lock.json` present and committed

## Frameworks

**Core:**
- React Router 7.12.0 (Remix-mode, SSR enabled) — full-stack framework handling routing, loaders, actions, and SSR. Config: `remix-app/react-router.config.ts` (`ssr: true`)
- React 19.2.3 — UI rendering
- React DOM 19.2.3 — DOM rendering

**Build/Dev:**
- Vite 7.3.1 — dev server and production bundler. Config: `remix-app/vite.config.ts`
- `@react-router/dev` 7.12.0 — Vite plugin + `react-router typegen` CLI for route type generation
- `vite-tsconfig-paths` 5.1.4 — resolves `~/` path alias from `tsconfig.json`
- `@tailwindcss/vite` 4.1.18 — Tailwind CSS 4 Vite integration (no `tailwind.config.js`; config is CSS-native)

**Testing:**
- Not detected — no test framework, no test files found

## Key Dependencies

**Critical:**
- `react-router` 7.12.0 — routing, loaders, actions, SSR (`remix-app/app/routes.ts`, all route files)
- `drizzle-orm` 0.45.1 — type-safe ORM for Neon Postgres. Client: `remix-app/app/lib/db.server.ts`
- `@neondatabase/serverless` 1.0.2 — Neon Postgres WebSocket driver for serverless environments. Used via `drizzle-orm/neon-serverless`
- `recharts` 3.7.0 — charting library. Used exclusively in `remix-app/app/components/TrendChart.tsx` (LineChart, AreaChart, ResponsiveContainer, Tooltip, etc.)
- `date-fns` 4.1.0 — date math utilities (`differenceInDays`, `parseISO`, `format`, `addDays`). Used in multiple routes and `TrendChart.tsx`

**Infrastructure:**
- `@react-router/node` 7.12.0 — Node.js adapter for server rendering
- `@react-router/serve` 7.12.0 — production static file server (used in `npm run start`)
- `isbot` 5.1.31 — bot detection for streaming responses (React Router standard entry pattern)
- `tailwindcss` 4.1.13 — CSS framework, configured via CSS file (no JS config)

**Dev tooling:**
- `drizzle-kit` 0.31.8 — schema diffing, migration generation, Drizzle Studio. Config: `remix-app/drizzle.config.ts`
- `typescript` 5.9.3 — type checker

## Configuration

**TypeScript:**
- Config: `remix-app/tsconfig.json`
- `strict: true`, `target: ES2022`, `module: ES2022`, `moduleResolution: bundler`
- Path alias: `~/*` → `./app/*`
- Generated route types in `remix-app/.react-router/types/` (auto-generated, not committed)

**Build:**
- Vite config: `remix-app/vite.config.ts` — plugins: `tailwindcss()`, `reactRouter()`, `tsconfigPaths()`
- React Router config: `remix-app/react-router.config.ts` — SSR mode enabled
- Drizzle config: `remix-app/drizzle.config.ts` — dialect: postgresql, schema: `./db/schema.ts`, migrations output: `./migrations/`

**Environment:**
- Two env vars used (both reference same Neon DB): `NETLIFY_DATABASE_URL` (primary, set by Netlify Postgres extension) and `DATABASE_URL` (fallback for local dev)
- No `.env` file committed; no `.env.example` present
- Referenced in: `remix-app/app/lib/db.server.ts`, `remix-app/drizzle.config.ts`

**Fonts:**
- Google Fonts CDN: Inter variable font loaded via `<link>` in `remix-app/app/root.tsx`

## Platform Requirements

**Development:**
- Node.js 20+
- npm install from `remix-app/`
- Requires `NETLIFY_DATABASE_URL` or `DATABASE_URL` for database access
- Run commands from `remix-app/`: `npm run dev`, `npm run typecheck`, `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`

**Production:**
- Build: `npm run build` (runs `react-router build` from `remix-app/`)
- Publish dir: `remix-app/build/client`
- Server: Netlify SSR function (auto-configured via `@react-router/dev` Netlify preset)
- Node version locked to 20 in `netlify.toml`

---

*Stack analysis: 2026-06-07*
