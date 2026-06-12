// protocol-diff — shared stack-diff language (round 3/4, BAKED).
// The Compare screen's base/compare pill-picker + glyph-diff pattern is an
// interaction-model decision; version detail reuses the same rows for
// "Changes vs P(n−1)". DIFF_GLYPHS + diffStacks ported from the round-4
// return (screens.jsx CompareScreen / screens-r4.jsx).
//
// Real-data note: per-version supplement stacks are NOT stored in the data
// layer (protocol_versions has no stack snapshot). `diffStacks` is the
// stack-based differ for when they exist; `netProtocolChanges` derives diff
// rows from the real `protocol_changes` log (added/removed/dose-changed
// events per version), netted chronologically across a version window.

export type DiffState = "added" | "removed" | "changed" | "same";

export interface DiffRow {
  name: string;
  /** Dose at the base version (null = not present). */
  doseA: string | null;
  /** Dose at the compare version (null = not present). */
  doseB: string | null;
  state: DiffState;
}

export interface StackItem {
  name: string;
  dose: string;
}

/** Glyph + canonical-token colors per diff state (one map app-wide). */
export const DIFF_GLYPHS: Record<DiffState, { g: string; color: string; bg: string }> = {
  added:   { g: "+", color: "var(--vital-500, var(--vital))", bg: "var(--optimal-bg)" },
  removed: { g: "−", color: "var(--deficient)",               bg: "var(--deficient-bg)" },
  changed: { g: "~", color: "var(--energy-500, var(--energy))", bg: "var(--borderline-bg)" },
  same:    { g: "·", color: "var(--text-faint)",              bg: "transparent" },
};

/** Diff two full supplement stacks (round-4 `diffStacks`, 1:1 port). */
export function diffStacks(stackA: StackItem[], stackB: StackItem[]): DiffRow[] {
  const names = [...new Set([...stackA.map((s) => s.name), ...stackB.map((s) => s.name)])];
  return names.map((name) => {
    const inA = stackA.find((s) => s.name === name);
    const inB = stackB.find((s) => s.name === name);
    const state: DiffState = !inA
      ? "added"
      : !inB
      ? "removed"
      : inA.dose !== inB.dose
      ? "changed"
      : "same";
    return { name, doseA: inA?.dose ?? null, doseB: inB?.dose ?? null, state };
  });
}

/** Shape of a protocol_changes row (subset used by the differ). */
export interface ProtocolChangeEvent {
  supplementName: string;
  changeType: string; // added | removed | dosage_changed | timing_changed | frequency_changed
  oldDosage: string | null;
  newDosage: string | null;
}

/**
 * Net a chronologically-ordered list of change events (one version, or all
 * versions in a base→compare window) into diff rows. A supplement added and
 * later removed inside the window nets to nothing; repeated dose changes
 * collapse to first-old → last-new.
 */
export function netProtocolChanges(events: ProtocolChangeEvent[]): DiffRow[] {
  type Acc = {
    firstOld: string | null;
    lastNew: string | null;
    addedInWindow: boolean;
    removed: boolean;
  };
  const byName = new Map<string, Acc>();
  const order: string[] = [];

  for (const e of events) {
    let acc = byName.get(e.supplementName);
    if (!acc) {
      acc = { firstOld: e.oldDosage ?? null, lastNew: null, addedInWindow: false, removed: false };
      byName.set(e.supplementName, acc);
      order.push(e.supplementName);
    }
    switch (e.changeType) {
      case "added":
        acc.addedInWindow = acc.addedInWindow || acc.firstOld == null;
        acc.removed = false;
        acc.lastNew = e.newDosage ?? acc.lastNew;
        break;
      case "removed":
        acc.removed = true;
        acc.lastNew = null;
        break;
      default:
        // dosage/timing/frequency changed
        acc.removed = false;
        if (e.newDosage != null) acc.lastNew = e.newDosage;
        if (acc.firstOld == null && e.oldDosage != null) acc.firstOld = e.oldDosage;
        break;
    }
  }

  const rows: DiffRow[] = [];
  for (const name of order) {
    const acc = byName.get(name)!;
    if (acc.removed) {
      // added-then-removed inside the window nets to nothing
      if (acc.addedInWindow) continue;
      rows.push({ name, doseA: acc.firstOld, doseB: null, state: "removed" });
    } else if (acc.addedInWindow) {
      rows.push({ name, doseA: null, doseB: acc.lastNew, state: "added" });
    } else if (acc.firstOld != null && acc.lastNew != null && acc.firstOld === acc.lastNew) {
      rows.push({ name, doseA: acc.firstOld, doseB: acc.lastNew, state: "same" });
    } else {
      rows.push({ name, doseA: acc.firstOld, doseB: acc.lastNew, state: "changed" });
    }
  }
  return rows;
}

/** Summary counts per diff state. */
export function diffCounts(rows: DiffRow[]): Record<DiffState, number> {
  return rows.reduce(
    (acc, r) => {
      acc[r.state] += 1;
      return acc;
    },
    { added: 0, removed: 0, changed: 0, same: 0 } as Record<DiffState, number>
  );
}
