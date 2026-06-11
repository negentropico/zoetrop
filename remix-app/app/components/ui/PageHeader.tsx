// PageHeader — meta row (eyebrow left, breadcrumb right) + h1 title + sub
// paragraph + optional right slot. Crumbs auto-derive from the pathname via
// crumbsForPath; pass `crumbs` explicitly (or null) to override.
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
  /** Explicit crumb items, or null to suppress. Undefined = auto-derive
   *  from the current pathname via crumbsForPath. */
  crumbs?: CrumbItem[] | null;
}

export function PageHeader({ eyebrow, title, sub, right, crumbs }: PageHeaderProps) {
  const { pathname } = useLocation();
  const resolvedCrumbs = crumbs === undefined ? crumbsForPath(pathname) : crumbs;
  const hasCrumbs = resolvedCrumbs !== null && resolvedCrumbs.length > 0;

  return (
    <div className="mb-8">
      {(eyebrow || hasCrumbs) && (
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2.5">
          {eyebrow ? <div className="zt-eyebrow">{eyebrow}</div> : <span />}
          {hasCrumbs && <Crumb items={resolvedCrumbs} />}
        </div>
      )}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
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
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
