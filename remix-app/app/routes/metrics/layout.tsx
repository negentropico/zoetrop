import { NavLink, Outlet, useLocation } from "react-router";
import { CATEGORY_INFO, type MetricCategory } from "../../types/metrics";
import { CatChip } from "../../components/ui/CatChip";
import {
  Pill,
  Gem,
  Flame,
  Zap,
  FlaskConical,
  HeartPulse,
  Dumbbell,
  Droplet,
  Dna,
  LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LUCIDE_MAP: Record<string, LucideIcon> = {
  pill: Pill,
  gem: Gem,
  flame: Flame,
  zap: Zap,
  "flask-conical": FlaskConical,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  droplet: Droplet,
  dna: Dna,
};

const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

// Nav item type for "All categories" + each category
interface NavItem {
  id: string | null;
  label: string;
  icon: LucideIcon;
  family: "vital" | "energy" | null;
  to: string;
}

const navItems: NavItem[] = [
  { id: null, label: "All categories", icon: LayoutGrid, family: null, to: "/metrics" },
  ...categories.map((cat) => {
    const info = CATEGORY_INFO[cat];
    return {
      id: cat,
      label: info.label,
      icon: LUCIDE_MAP[info.icon] ?? Pill,
      family: info.family,
      to: `/metrics/${cat}`,
    };
  }),
];

export default function MetricsLayout() {
  const location = useLocation();

  return (
    <div>
      {/* Mobile (≤760px): horizontal scroll pill bar */}
      <div
        className="block"
        style={{
          display: "none",
          gap: 8,
          overflowX: "auto",
          padding: "2px 2px 10px",
          margin: "0 0 16px",
          WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        }}
        id="cat-nav-mobile"
      >
        {navItems.map((item) => {
          const isActive = item.id === null
            ? location.pathname === "/metrics"
            : location.pathname === item.to || location.pathname.startsWith(item.to + "/");

          return (
            <NavLink
              key={item.id ?? "all"}
              to={item.to}
              end={item.id === null}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                borderRadius: "var(--radius-pill)",
                whiteSpace: "nowrap",
                flex: "0 0 auto",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                background: isActive ? "var(--ink)" : "var(--surface)",
                color: isActive ? "var(--n-50)" : "var(--text-secondary)",
                border: `1px solid ${isActive ? "var(--ink)" : "var(--border)"}`,
                textDecoration: "none",
              }}
            >
              <item.icon size={16} strokeWidth={1.9} />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      {/* Desktop + Mobile layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "232px 1fr",
          gap: "var(--gap-2xl)",
          alignItems: "start",
        }}
        className="metrics-layout-grid"
      >
        {/* Desktop sidebar (sticky) */}
        <aside>
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              position: "sticky",
              top: 92,
            }}
          >
            {navItems.map((item) => {
              const isActive = item.id === null
                ? location.pathname === "/metrics"
                : location.pathname === item.to || location.pathname.startsWith(item.to + "/");

              return (
                <NavLink
                  key={item.id ?? "all"}
                  to={item.to}
                  end={item.id === null}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-base)",
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? "var(--surface)" : "transparent",
                    color: isActive ? "var(--ink)" : "var(--text-secondary)",
                    border: `1px solid ${isActive ? "var(--border)" : "transparent"}`,
                    boxShadow: isActive ? "var(--shadow-xs)" : "none",
                    textDecoration: "none",
                    transition: "all var(--dur-fast) var(--ease-out)",
                  }}
                >
                  <item.icon
                    size={18}
                    strokeWidth={1.9}
                    color={isActive ? "var(--accent)" : "var(--text-muted)"}
                  />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ minWidth: 0 }}>
          <Outlet />
        </main>
      </div>

      {/* Responsive CSS via a style tag for grid → 1-col on mobile */}
      <style>{`
        @media (max-width: 760px) {
          .metrics-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .metrics-layout-grid > aside {
            display: none !important;
          }
          #cat-nav-mobile {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
