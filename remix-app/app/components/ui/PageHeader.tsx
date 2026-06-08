// PageHeader — eyebrow + h1 title + sub paragraph + optional right slot
// Translated from lib.jsx PageHeader (lines 86-97).

import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}

export function PageHeader({ eyebrow, title, sub, right }: PageHeaderProps) {
  return (
    <div
      className="flex items-end justify-between gap-4 flex-wrap mb-8"
    >
      <div>
        {eyebrow && (
          <div className="zt-eyebrow mb-2.5">{eyebrow}</div>
        )}
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
  );
}
