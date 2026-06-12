// DiffRows — the Compare screen's glyph-diff rows (round 3/4, BAKED),
// shared by /protocol/compare and the version-detail "Changes vs P(n−1)"
// section. Glyph tile + name (struck when removed) + mono base/compare
// doses with dose-change highlighting.

import { DIFF_GLYPHS, type DiffRow } from "~/lib/protocol-diff";

export function DiffRowList({ rows }: { rows: DiffRow[] }) {
  return (
    <>
      {rows.map((r, i) => {
        const s = DIFF_GLYPHS[r.state];
        return (
          <div
            key={r.name}
            style={{
              display: "grid",
              gridTemplateColumns: "28px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)",
              gap: "var(--gap-lg)",
              alignItems: "center",
              padding: "var(--gap-row) var(--gap-card)",
              borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "var(--radius-sm)",
                background: s.bg,
                color: s.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
              }}
            >
              {s.g}
            </span>
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: r.state === "removed" ? "var(--text-muted)" : "var(--text)",
                textDecoration: r.state === "removed" ? "line-through" : "none",
              }}
            >
              {r.name}
            </div>
            <div className="zt-tnum" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {r.doseA ?? "—"}
            </div>
            <div
              className="zt-tnum"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: r.state === "changed" ? "var(--energy-500, var(--energy))" : "var(--text)",
              }}
            >
              {r.doseB ?? "—"}
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Mono summary-count line (+a added −r removed ~c changed). */
export function DiffSummaryCounts({
  counts,
}: {
  counts: { added: number; removed: number; changed: number; same?: number };
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      <span style={{ color: "var(--vital-500, var(--vital))" }}>+{counts.added} added</span>
      <span style={{ color: "var(--deficient)" }}>−{counts.removed} removed</span>
      <span style={{ color: "var(--energy-500, var(--energy))" }}>~{counts.changed} changed</span>
      {counts.same != null && counts.same > 0 && <span>·{counts.same} unchanged</span>}
    </div>
  );
}
