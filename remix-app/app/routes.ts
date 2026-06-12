import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // PUBLIC — no auth check
  index("routes/landing.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("logout", "routes/auth/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),

  // AUTHENTICATED — gated by _app/layout.tsx loader (AUTH-02)
  // Section routes are registered flat: the consolidated left sidebar
  // (AppShell) owns all section navigation — per-section layouts deleted.
  layout("routes/_app/layout.tsx", [
    route("dashboard", "routes/_app/dashboard.tsx"),
    // Metrics
    route("metrics", "routes/_app/metrics/index.tsx"),
    route("metrics/:category", "routes/_app/metrics/category.tsx"),
    route("metrics/:category/:metricId", "routes/_app/metrics/detail.tsx"),
    // Protocol
    route("protocol", "routes/_app/protocol/index.tsx"),
    route("protocol/versions", "routes/_app/protocol/versions.tsx"),
    route("protocol/versions/:version", "routes/_app/protocol/version-detail.tsx"),
    route("protocol/supplements", "routes/_app/protocol/supplements.tsx"),
    route("protocol/cessation", "routes/_app/protocol/cessation.tsx"),
    route("protocol/compare", "routes/_app/protocol/compare.tsx"),
    // Insights
    route("insights", "routes/_app/insights/index.tsx"),
    route("insights/correlations", "routes/_app/insights/correlations.tsx"),
    route("insights/genetics", "routes/_app/insights/genetics.tsx"),
    // Import
    route("import", "routes/_app/import/index.tsx"),
    route("import/whoop", "routes/_app/import/whoop.tsx"),
    route("import/vault", "routes/_app/import/vault.tsx"),
    // Ingest (Plan 05-02: upload action; Plan 05-03: review/consent/document UI)
    // route("ingest", ...) — NOT index(...): inside two pathless layouts an
    // index registered at `/`, colliding with the public landing (q56 fix).
    route("ingest", "routes/_app/ingest/index.tsx"),
    route("ingest/upload", "routes/_app/ingest/upload.tsx"),
    route("ingest/review", "routes/_app/ingest/review.tsx"),
    route("ingest/consent", "routes/_app/ingest/consent.tsx"),
    route("ingest/documents/:id", "routes/_app/ingest/document.tsx"),
    // Raw PDF byte stream consumed by PdfPageViewer/react-pdf. Kept SEPARATE
    // from the viewer page so the page can render UI while react-pdf fetches
    // application/pdf bytes from this resource route (T-05-DOC auth preserved).
    route("ingest/documents/:id/raw", "routes/_app/ingest/document-raw.tsx"),
    // Reports (Plan 06-05: flat under _app/layout.tsx, no sub-layout)
    route("reports", "routes/_app/reports/index.tsx"),
    route("reports/generate", "routes/_app/reports/generate.tsx"),
    route("reports/:reportId", "routes/_app/reports/detail.tsx"),
    // Settings
    route("settings", "routes/_app/settings/index.tsx"),
    route("settings/invites/:inviteId/revoke", "routes/_app/settings/invites.ts"),
    route("settings/assignments", "routes/_app/settings/assignments.tsx"),
  ]),
] satisfies RouteConfig;
