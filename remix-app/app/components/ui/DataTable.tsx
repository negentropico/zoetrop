// DataTable — generic mono-header hairline table with tabular numeric columns
// Header: Space Mono (.zt-eyebrow), warm 1px hairline rows (border-border)
// Mono columns: Space Mono + tabular-nums
// Horizontally scrollable wrapper for dense correlations data.

import type { ReactNode } from "react";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  align?: "left" | "right" | "center";
  /** Space Mono + tabular-nums for numeric columns */
  mono?: boolean;
  /** Custom cell renderer */
  render?: (row: T) => ReactNode;
  /** Allow text wrapping (default nowrap) */
  wrap?: boolean;
  width?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  rowKey?: (row: T, i: number) => string | number;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
}: DataTableProps<T>) {
  return (
    <div
      style={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 640,
        }}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="zt-eyebrow border-b border-border"
                style={{
                  textAlign: c.align ?? "left",
                  padding: "0 16px 12px",
                  whiteSpace: "nowrap",
                  fontWeight: 400,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr
              key={rowKey ? rowKey(r, ri) : ri}
              className="zt-trow"
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="border-b border-border"
                  style={{
                    textAlign: c.align ?? "left",
                    padding: "15px 16px",
                    fontFamily: c.mono ? "var(--font-mono)" : "var(--font-text)",
                    fontVariantNumeric: c.mono ? "tabular-nums" : "normal",
                    fontSize: "var(--text-sm)",
                    color: "var(--text)",
                    whiteSpace: c.wrap ? "normal" : "nowrap",
                    width: c.width,
                  }}
                >
                  {c.render ? c.render(r) : String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
