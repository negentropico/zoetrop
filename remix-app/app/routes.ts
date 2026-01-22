import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Metrics routes with nested category views
  layout("routes/metrics/layout.tsx", [
    route("metrics", "routes/metrics/index.tsx"),
    route("metrics/:category", "routes/metrics/category.tsx"),
    route("metrics/:category/:metricId", "routes/metrics/detail.tsx"),
  ]),
  // Protocol routes with version management
  layout("routes/protocol/layout.tsx", [
    route("protocol", "routes/protocol/index.tsx"),
    route("protocol/versions", "routes/protocol/versions.tsx"),
    route("protocol/versions/:version", "routes/protocol/version-detail.tsx"),
    route("protocol/supplements", "routes/protocol/supplements.tsx"),
    route("protocol/cessation", "routes/protocol/cessation.tsx"),
    route("protocol/compare", "routes/protocol/compare.tsx"),
  ]),
  // Import routes
  layout("routes/import/layout.tsx", [
    route("import", "routes/import/index.tsx"),
    route("import/whoop", "routes/import/whoop.tsx"),
    route("import/vault", "routes/import/vault.tsx"),
  ]),
] satisfies RouteConfig;
