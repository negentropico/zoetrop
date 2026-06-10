/**
 * layout.tsx — Ingest section layout
 * Wraps upload, review, and consent routes with section navigation.
 * Pattern mirrors app/routes/_app/import/layout.tsx exactly.
 */

import { NavLink, Outlet } from "react-router";

const TABS = [
  { to: "/ingest/upload", label: "Upload", end: false },
  { to: "/ingest/review", label: "Review", end: false },
];

export default function IngestLayout() {
  return (
    <div>
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
