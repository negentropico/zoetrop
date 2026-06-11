// PageHeader — meta row (eyebrow left, breadcrumb right) + h1 title + sub
// paragraph + optional right slot. Crumbs auto-derive from the pathname via
// crumbsForPath; pass `crumbs` explicitly (or null) to override.
// Optional `icon` renders an element (e.g. CatChip) beside the title block;
// optional `titleAccessory` renders inline after the h1 (e.g. StatusBadge).
// Translated from lib.jsx PageHeader (lines 86-97).

import type { ReactNode } from "react";
import { useLocation } from "react-router";
import { Crumb, type CrumbItem } from "./Crumb";
import { crumbsForPath } from "~/components/shell/nav-tree";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  /** Element rendered to the left of the title block (e.g. CatChip). */
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

  const heading = (
    <h1
      style={{
        fontSize: "var(--text-2xl)",
        fontWeight: 600,
        letterSpacing: "-0.02em",
      }}
    >
      {title}
    </h1>
  );

  const titleBlock = (
    <div>
      {titleAccessory ? (
        <div className="flex items-center flex-wrap" style={{ gap: 12 }}>
          {heading}
          {titleAccessory}
        </div>
      ) : (
        heading
      )}
      {sub && (
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--text-secondary)",
            fontSize: "var(--text-md)",
            maxWidth: 620,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );

  return (
    <div className="mb-8">
      {(eyebrow || hasCrumbs) && (
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2.5">
          {eyebrow ? <div className="zt-eyebrow">{eyebrow}</div> : <span />}
          {hasCrumbs && <Crumb items={resolvedCrumbs} />}
        </div>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {icon ? (
          <div className="flex items-center" style={{ gap: 16 }}>
            {icon}
            {titleBlock}
          </div>
        ) : (
          titleBlock
        )}
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
