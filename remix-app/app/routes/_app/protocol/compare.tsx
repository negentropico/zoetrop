import { useSearchParams } from "react-router";
import type { Route } from "./+types/compare";
import { requireSubjectCtx } from "~/lib/authz.server";
import { getProtocolVersions, getProtocolChanges } from "~/lib/data.server";
import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { ChartEmpty } from "~/components/ui/TrendChart";
import { DiffRowList, DiffSummaryCounts } from "~/components/ui/DiffRows";
import { netProtocolChanges, diffCounts } from "~/lib/protocol-diff";
import type { ProtocolChangeEvent } from "~/lib/protocol-diff";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Compare Versions - Zoetrop" },
    { name: "description", content: "Compare protocol versions side by side" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const { ctx } = await requireSubjectCtx(request);

  const [protocolVersionsRows, protocolChanges] = await Promise.all([
    getProtocolVersions(ctx),
    getProtocolChanges(ctx),
  ]);

  // Normalize timestamps to ISO strings
  const normalizedVersions = protocolVersionsRows.map((v) => ({
    ...v,
    effectiveDate: v.effectiveDate instanceof Date ? v.effectiveDate.toISOString() : v.effectiveDate,
    createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
  }));

  // Sort versions ascending by effectiveDate
  const versions = [...normalizedVersions].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );

  // Default to comparing last two versions if not specified
  let fromIdx = fromParam ? versions.findIndex((v) => v.version === fromParam) : versions.length - 2;
  let toIdx = toParam ? versions.findIndex((v) => v.version === toParam) : versions.length - 1;
  if (fromIdx < 0) fromIdx = Math.max(0, versions.length - 2);
  if (toIdx < 0) toIdx = versions.length - 1;
  // Base must precede compare — a reversed pick is normalized.
  if (fromIdx > toIdx) [fromIdx, toIdx] = [toIdx, fromIdx];

  const fromVersion = versions[fromIdx] ?? null;
  const toVersion = versions[toIdx] ?? null;

  // Real-data diff: per-version supplement stacks are not stored, so the
  // diff is derived from the protocol_changes log — every change event in
  // the (base, compare] window, netted chronologically (added-then-removed
  // nets out; repeated dose changes collapse to first-old → last-new).
  const windowVersionIds = versions.slice(fromIdx + 1, toIdx + 1).map((v) => v.id);
  const windowChanges = windowVersionIds.flatMap((vid) =>
    protocolChanges.filter((c) => c.versionId === vid)
  );
  const events: ProtocolChangeEvent[] = windowChanges.map((c) => ({
    supplementName: c.supplementName,
    changeType: c.changeType,
    oldDosage: c.oldDosage ?? null,
    newDosage: c.newDosage ?? null,
  }));
  const rows = netProtocolChanges(events);
  const counts = diffCounts(rows);

  return {
    versions,
    fromVersion,
    toVersion,
    rows,
    counts,
    // Raw change rows for the window — kept for loader parity (the glyph
    // diff renders the netted `rows`).
    changes: windowChanges,
  };
}

export default function Compare({ loaderData }: Route.ComponentProps) {
  const { versions, fromVersion, toVersion, rows, counts } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const updateVersion = (type: "from" | "to", version: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(type, version);
    setSearchParams(newParams);
  };

  // Base/compare pill picker (round-3 BAKED interaction pattern)
  const Picker = ({
    label,
    value,
    exclude,
    onChange,
  }: {
    label: string;
    value: string | undefined;
    exclude?: string;
    onChange: (v: string) => void;
  }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span className="zt-eyebrow">{label}</span>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {versions.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.version)}
            disabled={v.version === exclude}
            className={"zt-pill" + (value === v.version ? " is-active" : "")}
            style={{ padding: "5px 11px", opacity: v.version === exclude ? 0.4 : 1 }}
          >
            {v.version}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="VERSION COMPARISON"
        title="Compare versions"
        sub="Supplement stack diff between two protocol versions."
      />

      {/* Base / compare pill pickers */}
      <section className="zt-section">
        <div style={{ display: "flex", gap: "var(--gap-2xl)", flexWrap: "wrap", alignItems: "center" }}>
          <Picker
            label="Base"
            value={fromVersion?.version}
            exclude={toVersion?.version}
            onChange={(v) => updateVersion("from", v)}
          />
          <ArrowRight size={15} strokeWidth={1.8} color="var(--text-faint)" />
          <Picker
            label="Compare"
            value={toVersion?.version}
            exclude={fromVersion?.version}
            onChange={(v) => updateVersion("to", v)}
          />
        </div>
        {fromVersion && toVersion && (
          <div
            style={{
              marginTop: 10,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--text-faint)",
              letterSpacing: "0.06em",
            }}
          >
            {fromVersion.version} · {format(parseISO(fromVersion.effectiveDate), "MMM yyyy")}
            {"  →  "}
            {toVersion.version} · {format(parseISO(toVersion.effectiveDate), "MMM yyyy")}
          </div>
        )}
      </section>

      {/* Diff — glyph rows + mono summary counts */}
      <section className="zt-section">
        <div style={{ marginBottom: "var(--gap-lg)" }}>
          <DiffSummaryCounts counts={counts} />
        </div>
        <Card padding="none">
          {rows.length === 0 ? (
            <ChartEmpty
              height={200}
              title="Nothing changed"
              body={
                fromVersion && toVersion
                  ? `No supplement changes are logged between ${fromVersion.version} and ${toVersion.version}.`
                  : "Select two versions to compare."
              }
            />
          ) : (
            <DiffRowList rows={rows} />
          )}
        </Card>
        {/* Real-data caveat: the diff reads the change log; unchanged
            supplements are not enumerable without per-version stacks. */}
        <p
          style={{
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--text-faint)",
            letterSpacing: "0.04em",
          }}
        >
          Derived from the protocol change log — supplements untouched across this window are not listed.
        </p>
      </section>

      {/* Version notes comparison */}
      {fromVersion && toVersion && (fromVersion.notes || toVersion.notes) && (
        <div className="zt-grid-2" style={{ marginTop: "var(--gap-xl)" }}>
          <Card padding="md">
            <div className="zt-eyebrow" style={{ marginBottom: 10 }}>{fromVersion.version} notes</div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
              {fromVersion.notes || "No notes for this version."}
            </p>
          </Card>
          <Card padding="md">
            <div className="zt-eyebrow" style={{ marginBottom: 10 }}>{toVersion.version} notes</div>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
              {toVersion.notes || "No notes for this version."}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
