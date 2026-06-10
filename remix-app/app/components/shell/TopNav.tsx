// TopNav: sticky desktop nav bar (hidden on mobile ≤760px via md:hidden link cluster).
// Wordmark (left) + nav links + ThemeToggle (right).
// Source: docs/design-system/_rounds/round1/app/lib.jsx TopNav (lines 380–405)
// Translated: hash Link → react-router NavLink + useLocation; inline styles → CSS vars
import { useLocation, NavLink } from "react-router";
import { Wordmark } from "../ui/Wordmark";
import { ThemeToggle } from "../ui/ThemeToggle";
import { AccountMenu } from "./AccountMenu";

const NAV = [
  {
    to: "/",
    label: "Dashboard",
    match: (p: string) => p === "/",
    end: true,
  },
  {
    to: "/metrics",
    label: "Metrics",
    match: (p: string) => p.startsWith("/metrics"),
    end: false,
  },
  {
    to: "/protocol",
    label: "Protocol",
    match: (p: string) => p.startsWith("/protocol"),
    end: false,
  },
  {
    to: "/insights/correlations",
    label: "Insights",
    match: (p: string) => p.startsWith("/insights"),
    end: false,
  },
  {
    to: "/import/whoop",
    label: "Import",
    match: (p: string) => p.startsWith("/import"),
    end: false,
  },
] as const;

interface TopNavProps {
  user: { name: string; email: string; role: string };
}

export function TopNav({ user }: TopNavProps) {
  const { pathname } = useLocation();
  return (
    <header
      className="zt-topnav sticky top-0 z-40"
      style={{
        height: 68,
        // Solid fallback before color-mix (Pitfall 8 / A6 — Safari <16.2)
        background: "var(--paper)",
        // Progressive enhancement: glassmorphism backdrop
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Apply backdrop via a separate element to allow the solid fallback */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "color-mix(in srgb, var(--paper) 86%, transparent)",
          backdropFilter: "blur(10px) saturate(1.2)",
          WebkitBackdropFilter: "blur(10px) saturate(1.2)",
          zIndex: 0,
        }}
      />
      <div
        className="relative flex items-center justify-between h-full"
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "0 var(--gap-2xl)",
          zIndex: 1,
        }}
      >
        <Wordmark />
        {/* Nav links cluster — hidden on mobile (md:flex = desktop only) */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {NAV.map((n) => {
              const active = n.match(pathname);
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  style={{
                    position: "relative",
                    padding: "8px 12px",
                    fontFamily: "var(--font-text)",
                    fontWeight: active ? 600 : 500,
                    fontSize: "var(--text-base)",
                    color: active ? "var(--ink)" : "var(--text-secondary)",
                    textDecoration: "none",
                    transition: "color var(--dur-fast) var(--ease-out)",
                  }}
                >
                  {n.label}
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: -19,
                        height: 2,
                        borderRadius: 2,
                        background: "var(--ink)",
                      }}
                    />
                  )}
                </NavLink>
              );
            })}
          </nav>
          <ThemeToggle />
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}
