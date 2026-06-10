// BottomTab: fixed mobile bottom navigation bar (md:hidden — desktop hides it).
// 5 icon+label tabs with ≥44px touch targets (min-height: 48px per item).
// Source: docs/design-system/_rounds/round1/app/lib.jsx BottomTab (lines 406–420)
// Translated: hash Link → react-router Link + useLocation
import { useLocation, Link } from "react-router";
import { LayoutGrid, Activity, ListChecks, GitCompare, User } from "lucide-react";

const NAV_ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutGrid,
    match: (p: string) => p === "/",
  },
  {
    to: "/metrics",
    label: "Metrics",
    icon: Activity,
    match: (p: string) => p.startsWith("/metrics"),
  },
  {
    to: "/protocol",
    label: "Protocol",
    icon: ListChecks,
    match: (p: string) => p.startsWith("/protocol"),
  },
  {
    to: "/insights/correlations",
    label: "Insights",
    icon: GitCompare,
    match: (p: string) => p.startsWith("/insights"),
  },
  {
    to: "/settings",
    label: "Account",
    icon: User,
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

export function BottomTab() {
  const { pathname } = useLocation();
  return (
    <nav
      className="zt-bottomtab md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
      aria-label="Mobile navigation"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        padding: "8px 6px calc(8px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-1 flex-1"
            aria-label={label}
            aria-current={active ? "page" : undefined}
            style={{
              minHeight: 48, // ≥44px WCAG 2.5.5 touch target (UI-01-l)
              color: active ? "var(--accent)" : "var(--text-muted)",
              textDecoration: "none",
              justifyContent: "center",
            }}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.3 : 1.9}
              color="currentColor"
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.625rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
