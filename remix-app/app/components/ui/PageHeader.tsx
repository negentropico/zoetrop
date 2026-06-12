// PageHeader — round-3 condensed masthead. Meta row (eyebrow left, breadcrumb
// right) top-aligns with the sidebar logo row (.zn-page padding-top, W0 CSS);
// the meta row always renders (minHeight keeps the rhythm even when empty).
// Title drops to --text-xl; `sub` sits inline on the title baseline; the
// `right` slot shares the title row (no dead band) and can shrink/wrap on
// mobile (round-5 finding 1: flex 0 1 auto + min-width 0).
// Crumbs auto-derive from the pathname via crumbsForPath; pass `crumbs`
// explicitly (or null) to override.
// Optional `icon` renders an element (e.g. CatChip) beside the title;
// optional `titleAccessory` renders inline after the h1 (e.g. StatusBadge).
// Translated from round3-return lib.jsx PageHeader (lines 392-417).

import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { Crumb, type CrumbItem } from "./Crumb";
import { crumbsForPath } from "~/components/shell/nav-tree";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  /** Element rendered to the left of the title (e.g. CatChip). */
  icon?: ReactNode;
  /** Element rendered inline after the h1 (e.g. StatusBadge). */
  titleAccessory?: ReactNode;
  /** Explicit crumb items, or null to suppress. Undefined = auto-derive
   *  from the current pathname via crumbsForPath. */
  crumbs?: CrumbItem[] | null;
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  right,
  icon,
  titleAccessory,
  crumbs,
}: PageHeaderProps) {
  const { pathname } = useLocation();
  const resolvedCrumbs = crumbs === undefined ? crumbsForPath(pathname) : crumbs;
  const hasCrumbs = resolvedCrumbs !== null && resolvedCrumbs.length > 0;

  return (
    <header style={{ marginBottom: "var(--gap-section)" }}>
      {/* Meta row — eyebrow left / crumb right. Always rendered so the
          title row sits at a constant offset (masthead ↔ logo alignment). */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "var(--gap-lg)", marginBottom: 14, minHeight: 17 }}
      >
        {eyebrow ? <div className="zt-eyebrow">{eyebrow}</div> : <div />}
        {hasCrumbs && <Crumb items={resolvedCrumbs} />}
      </div>

      {/* Title row — h1 + inline sub on the baseline; right slot shares
          the row and shrinks (round-5 mobile fix). */}
      <div
        className="flex flex-wrap"
        style={{ alignItems: "baseline", gap: "var(--gap-lg)" }}
      >
        {icon && (
          <div style={{ alignSelf: "center", flex: "0 0 auto" }}>{icon}</div>
        )}
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>
        {titleAccessory && (
          <div style={{ alignSelf: "center", flex: "0 0 auto" }}>
            {titleAccessory}
          </div>
        )}
        {sub && (
          <p
            style={{
              margin: 0,
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
              flex: "1 1 auto",
              minWidth: 0,
              textWrap: "pretty",
            }}
          >
            {sub}
          </p>
        )}
        {right && (
          <div
            style={{
              marginLeft: "auto",
              alignSelf: "center",
              flex: "0 1 auto",
              minWidth: 0,
            }}
          >
            {right}
          </div>
        )}
      </div>
    </header>
  );
}
