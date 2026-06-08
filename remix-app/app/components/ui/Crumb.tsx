// Crumb — breadcrumb in Space Mono uppercase
// Translated from lib.jsx Crumb (lines 441-452).
// Uses react-router Link for linked items.

import { Fragment } from "react";
import { Link } from "react-router";

export interface CrumbItem {
  label: string;
  /** If provided, renders as a link; otherwise renders as current page span. */
  to?: string;
}

export interface CrumbProps {
  items: CrumbItem[];
}

export function Crumb({ items }: CrumbProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--text-muted)",
        marginBottom: "var(--gap-lg)",
      }}
    >
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span style={{ color: "var(--text-faint)" }}>/</span>
          )}
          {it.to ? (
            <Link
              to={it.to}
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              {it.label}
            </Link>
          ) : (
            <span style={{ color: "var(--ink)" }}>{it.label}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
