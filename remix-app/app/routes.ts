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
] satisfies RouteConfig;
