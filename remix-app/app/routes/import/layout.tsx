import { NavLink, Outlet } from "react-router";

// Sub-nav links for the import section.
// Underline tab strip — Ink active underline 2px, weight 600, inactive weight 500 text-muted.
const TABS = [
  { to: "/import", label: "Overview", end: true },
  { to: "/import/whoop", label: "WHOOP", end: false },
  { to: "/import/vault", label: "Vault", end: false },
];

export default function ImportLayout() {
  return (
    <div>
      {/* Underline tab strip */}
      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: "var(--gap-2xl)",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              display: "inline-block",
              padding: "12px 16px",
              fontFamily: "var(--font-text)",
              fontWeight: isActive ? 600 : 500,
              fontSize: "var(--text-base)",
              color: isActive ? "var(--ink)" : "var(--text-muted)",
              whiteSpace: "nowrap",
              borderBottom: `2px solid ${isActive ? "var(--ink)" : "transparent"}`,
              marginBottom: -1,
              textDecoration: "none",
              transition: "color var(--dur-fast) var(--ease-out)",
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
