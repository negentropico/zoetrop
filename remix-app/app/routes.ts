import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Metrics routes with nested category views
  layout("routes/metrics/layout.tsx", [
    route("metrics", "routes/metrics/index.tsx"),
    route("metrics/:category", "routes/metrics/category.tsx"),
    route("metrics/:category/:metricId", "routes/metrics/detail.tsx"),
  ]),
  route("protocol", "routes/protocol.tsx"),
  // Import routes
  layout("routes/import/layout.tsx", [
    route("import", "routes/import/index.tsx"),
    route("import/whoop", "routes/import/whoop.tsx"),
    route("import/vault", "routes/import/vault.tsx"),
  ]),
] satisfies RouteConfig;
