import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // PUBLIC — no auth check
  index("routes/landing.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("logout", "routes/auth/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),

  // AUTHENTICATED — gated by _app/layout.tsx loader (AUTH-02)
  layout("routes/_app/layout.tsx", [
    route("dashboard", "routes/_app/dashboard.tsx"),
    // Metrics
    layout("routes/_app/metrics/layout.tsx", [
      route("metrics", "routes/_app/metrics/index.tsx"),
      route("metrics/:category", "routes/_app/metrics/category.tsx"),
      route("metrics/:category/:metricId", "routes/_app/metrics/detail.tsx"),
    ]),
    // Protocol
    layout("routes/_app/protocol/layout.tsx", [
      route("protocol", "routes/_app/protocol/index.tsx"),
      route("protocol/versions", "routes/_app/protocol/versions.tsx"),
      route("protocol/versions/:version", "routes/_app/protocol/version-detail.tsx"),
      route("protocol/supplements", "routes/_app/protocol/supplements.tsx"),
      route("protocol/cessation", "routes/_app/protocol/cessation.tsx"),
      route("protocol/compare", "routes/_app/protocol/compare.tsx"),
    ]),
    // Insights
    layout("routes/_app/insights/layout.tsx", [
      route("insights", "routes/_app/insights/index.tsx"),
      route("insights/correlations", "routes/_app/insights/correlations.tsx"),
      route("insights/genetics", "routes/_app/insights/genetics.tsx"),
    ]),
    // Import
    layout("routes/_app/import/layout.tsx", [
      route("import", "routes/_app/import/index.tsx"),
      route("import/whoop", "routes/_app/import/whoop.tsx"),
      route("import/vault", "routes/_app/import/vault.tsx"),
    ]),
    // Ingest (Plan 05-02: upload action; Plan 05-03: review/consent UI)
    layout("routes/_app/ingest/layout.tsx", [
      route("ingest/upload", "routes/_app/ingest/upload.tsx"),
      route("ingest/review", "routes/_app/ingest/review.tsx"),
      route("ingest/consent", "routes/_app/ingest/consent.tsx"),
    ]),
    // Settings
    route("settings", "routes/_app/settings/index.tsx"),
    route("settings/invites/:inviteId/revoke", "routes/_app/settings/invites.ts"),
  ]),
] satisfies RouteConfig;
