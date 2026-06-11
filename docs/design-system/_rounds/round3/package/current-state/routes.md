# Routes — current state

Generated from `remix-app/app/routes.ts` (explicit `RouteConfig`, not file-name
convention). All authenticated routes are flat under the `_app/layout.tsx` auth
gate; the consolidated left sidebar owns all section navigation (per-section
layouts were deleted in the round2 integration).

| Route | File | Section | Notes |
|-------|------|---------|-------|
| `/` | `routes/landing.tsx` | Public | Landing page (public, no auth) |
| `/login` | `routes/auth/login.tsx` | Public | Login (public) |
| `/logout` | `routes/auth/logout.tsx` | Public | **Resource-only** — POST action, no UI |
| `/api/auth/*` | `routes/api.auth.$.ts` | Public | **Resource-only** — auth API catch-all, no UI |
| `/dashboard` | `routes/_app/dashboard.tsx` | Dashboard | Authed. Overview + cessation tracker |
| `/metrics` | `routes/_app/metrics/index.tsx` | Metrics | Authed. All-categories overview |
| `/metrics/:category` | `routes/_app/metrics/category.tsx` | Metrics | Authed. One of 9 categories |
| `/metrics/:category/:metricId` | `routes/_app/metrics/detail.tsx` | Metrics | Authed. Metric detail + trend chart |
| `/protocol` | `routes/_app/protocol/index.tsx` | Protocol | Authed. Overview |
| `/protocol/versions` | `routes/_app/protocol/versions.tsx` | Protocol | Authed. Version history |
| `/protocol/versions/:version` | `routes/_app/protocol/version-detail.tsx` | Protocol | Authed. Version detail |
| `/protocol/supplements` | `routes/_app/protocol/supplements.tsx` | Protocol | Authed. Supplement tiers |
| `/protocol/cessation` | `routes/_app/protocol/cessation.tsx` | Protocol | Authed. Cessation timeline |
| `/protocol/compare` | `routes/_app/protocol/compare.tsx` | Protocol | Authed. Version comparison |
| `/insights` | `routes/_app/insights/index.tsx` | Insights | Authed. Overview |
| `/insights/correlations` | `routes/_app/insights/correlations.tsx` | Insights | Authed. Correlations table + filters |
| `/insights/genetics` | `routes/_app/insights/genetics.tsx` | Insights | Authed. Genetic variants |
| `/import` | `routes/_app/import/index.tsx` | Import | Authed. Overview |
| `/import/whoop` | `routes/_app/import/whoop.tsx` | Import | Authed. WHOOP JSON import |
| `/import/vault` | `routes/_app/import/vault.tsx` | Import | Authed. Obsidian vault import |
| `/ingest` | `routes/_app/ingest/index.tsx` | Ingest | Authed. Redirects to `/ingest/upload` |
| `/ingest/upload` | `routes/_app/ingest/upload.tsx` | Ingest | Authed. Lab PDF upload |
| `/ingest/review` | `routes/_app/ingest/review.tsx` | Ingest | Authed. Extraction review (PDF + per-field actions) |
| `/ingest/consent` | `routes/_app/ingest/consent.tsx` | Ingest | Authed. Consent gate (breadcrumb-only nav child) |
| `/ingest/documents/:id` | `routes/_app/ingest/document.tsx` | Ingest | Authed. Document (PDF) viewer |
| `/settings` | `routes/_app/settings/index.tsx` | Settings | Authed. Account + invites (not in nav tree) |
| `/settings/invites/:inviteId/revoke` | `routes/_app/settings/invites.ts` | Settings | **Resource-only** — POST action, no UI |
