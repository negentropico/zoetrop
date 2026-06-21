// TrendChart — the round-3 chart language, Part B (BAKED — do not relitigate
// without a new design round): direction = "frames", tooltip = frame card,
// grid = sparse horizontal hairlines, band intensity 50%, status mapping =
// standard, ring sweep = --dur-ring (mount-only).
//
// RULES (the language):
// 1. Structure is neutral — grids, tracks, axes use n-100/150.
//    Horizontal hairlines only; never vertical gridlines.
// 2. The data itself is Ink. Lines and value markers draw in var(--ink);
//    judgment is never encoded in the line.
// 3. Status maps through the canonical tokens (--optimal/--borderline/
//    --deficient/--excess) and is applied ONLY to bands, dots, badges, tags.
// 4. Axis labels are Space Mono, 10px, uppercase, muted. Units appear once
//    (header readout + tooltip), never on ticks.
// 5. One tooltip pattern app-wide: the frame card (zt-tip-frame).
// 6. Empty = dot-grain + mono caption (zt-chart-empty). Loading = hairline
//    pulse (zt-chart-skel). Both exported for reuse by non-chart surfaces.
// 7. Every reading is a "frame": ringed ink dot + hairline tick to baseline.
// 8. The x-axis counts MILESTONES (M1, M2 …), not dates — draw dates live in
//    the tooltip + history table. Two future milestones are projected from
//    the trend (linear fit of the last ≤4 readings): dashed ink continuation,
//    hollow "ghost" frames, faint neutral wash + PROJECTED tag. A projection
//    is never colored by status — judgment waits for a real reading; values
//    read with ~.

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { MetricStatus } from "~/types/metrics";
import { statusOf, statusColor, type StatusRanges } from "~/lib/status";
import { Sparkline } from "./Sparkline";
import { SigEmpty, SigLoading } from "./Signature";

interface Range {
  min: number;
  max: number;
}

interface DataPoint {
  timestamp: string;
  value: number;
}

interface TrendChartProps {
  data: DataPoint[];
  unit: string;
  optimalRange?: Range;
  referenceRange?: Range;
  height?: number;
  loading?: boolean;
}

/* baked band intensity (50%) and projection count */
const BAND_K = 0.5;
const PROJ_COUNT = 2;

interface ChartRow {
  label: string;
  date: string | null;
  kind: "actual" | "projected";
  value: number | null;
  proj: number | null;
}

/* linear trend fit over the last (up to) 4 readings */
function trendSlope(vals: number[]): number {
  const k = Math.min(4, vals.length);
  const recent = vals.slice(-k);
  if (k < 2) return 0;
  const xm = (k - 1) / 2;
  const ym = recent.reduce((a, b) => a + b, 0) / k;
  let num = 0;
  let den = 0;
  recent.forEach((v, x) => {
    num += (x - xm) * (v - ym);
    den += (x - xm) * (x - xm);
  });
  return den ? num / den : 0;
}

/* trim a value for display — at most 2 decimals, no trailing zeros */
function fmtValue(v: number): string {
  return String(Math.round(v * 100) / 100);
}

/* ============================================================
   Empty / loading states — exported for reuse by non-chart
   surfaces (ingest review, vault) per rule 6.
   ============================================================ */
// ChartEmpty — delegates to SigEmpty (branded spiral ghost + dot-grain frame)
// for the signature empty state. The locked .zt-chart-empty idiom (dot-grain +
// mono caption) is preserved — SigEmpty wraps it and unspools the spiral behind.
export function ChartEmpty({
  height = 240,
  title = "No readings yet",
  body = "Your first frame starts with your next lab draw.",
}: {
  height?: number;
  title?: string;
  body?: string;
}) {
  return <SigEmpty height={height} title={title} body={body} />;
}

// ChartLoading — delegates to SigLoading (phyllotaxis seed-head, breathes in
// golden order). Replaces the bare hairline pulse; reduced motion → static dots.
export function ChartLoading({ height = 240 }: { height?: number }) {
  return <SigLoading height={height} />;
}

/* ============================================================
   Tooltip — the frame card (baked, one tooltip pattern app-wide)
   ============================================================ */
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
  label?: string | number;
  unit: string;
  ranges: StatusRanges;
}

function ChartTooltip({ active, payload, label, unit, ranges }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  if (!row) return null;
  const projected = row.kind === "projected";
  const v = projected ? row.proj : row.value;
  if (v == null) return null;
  const st = statusOf(v, ranges);
  return (
    <div className="zt-tip-frame">
      <div className="zt-tip-date">
        {label}
        {row.date ? " · " + row.date : projected ? " · projected" : ""}
      </div>
      <div className="zt-tip-val">
        {projected ? "~" : ""}
        {fmtValue(v)} <span className="zt-tip-unit">{unit}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
        {projected ? (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              border: "1px dashed var(--n-400)",
              display: "inline-block",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusColor(st),
              display: "inline-block",
            }}
          />
        )}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.625rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {projected ? "trend · " + st : st}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   TrendChart — "frames" direction (baked)
   Every reading is a frame: ringed ink dot + hairline frame tick
   to the baseline. Optimal band as quiet tint with mono tag;
   reference bounds as dashed neutral hairlines.
   ============================================================ */
export function TrendChart({
  data,
  unit,
  optimalRange,
  referenceRange,
  height = 300,
  loading = false,
}: TrendChartProps) {
  if (loading) return <ChartLoading height={height} />;

  const hist = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  if (hist.length < 2) return <ChartEmpty height={height} />;
  const n = hist.length;

  const ranges: StatusRanges = {
    ref: referenceRange,
    opt: optimalRange,
  };

  /* milestone rows: actuals M1..Mn, then PROJ_COUNT projected
     milestones extrapolated from the recent trend. `proj` bridges
     at the last actual so the dashed line continues the solid one. */
  const histVals = hist.map((h) => h.value);
  const dec = Math.min(
    2,
    Math.max(...histVals.map((v) => (String(v).split(".")[1] || "").length))
  );
  const slope = trendSlope(histVals);
  const rows: ChartRow[] = hist.map((h, i) => ({
    label: "M" + (i + 1),
    date: format(parseISO(h.timestamp), "MMM d, yyyy"),
    kind: "actual",
    value: h.value,
    proj: i === n - 1 ? h.value : null,
  }));
  for (let i = 1; i <= PROJ_COUNT; i++) {
    rows.push({
      label: "M" + (n + i),
      date: null,
      kind: "projected",
      value: null,
      proj: +(histVals[n - 1] + slope * i).toFixed(dec),
    });
  }

  /* nice axis bounds — include ranges when present, round to a clean step */
  const vals = rows.map((d) => (d.kind === "projected" ? d.proj : d.value)) as number[];
  const boundVals = [
    ...vals,
    optimalRange?.min,
    optimalRange?.max,
    referenceRange?.min,
    referenceRange?.max,
  ].filter((v): v is number => v != null);
  const rawLo = Math.min(...boundVals) * 0.93;
  const rawHi = Math.max(...boundVals) * 1.07;
  const step = Math.pow(10, Math.floor(Math.log10(Math.max(rawHi - rawLo, 0.001)))) / 2;
  const lo = Math.floor(rawLo / step) * step;
  const hi = Math.ceil(rawHi / step) * step;
  const plotBottom = height - 32; /* x-axis height ≈ 30 + 2 */

  const monoTick = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    fill: "var(--text-muted)",
    letterSpacing: "0.06em",
  };
  const bandTag = (text: string, fill: string) => ({
    value: text,
    position: "insideRight" as const,
    fill,
    fontSize: 9,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.1em",
  });

  /* a "frame": ringed ink dot + hairline tick to the baseline */
  const FrameDot = (props: any) => {
    const { cx, cy, index, payload } = props;
    if (!payload || payload.kind !== "actual" || cx == null || cy == null)
      return <g key={"d" + index}></g>;
    return (
      <g key={"d" + index}>
        <line x1={cx} y1={cy + 6} x2={cx} y2={plotBottom} stroke="var(--n-200)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={4.5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={1.6} fill="var(--ink)" />
      </g>
    );
  };

  /* ghost frame: a future milestone — dashed ring, dashed tick */
  const GhostDot = (props: any) => {
    const { cx, cy, index, payload } = props;
    if (!payload || payload.kind !== "projected" || cx == null || cy == null)
      return <g key={"g" + index}></g>;
    return (
      <g key={"g" + index}>
        <line
          x1={cx}
          y1={cy + 6}
          x2={cx}
          y2={plotBottom}
          stroke="var(--n-200)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        <circle
          cx={cx}
          cy={cy}
          r={4.5}
          fill="var(--surface)"
          stroke="var(--n-400)"
          strokeWidth={1.2}
          strokeDasharray="2.5 2.2"
        />
      </g>
    );
  };

  return (
    // Concrete numeric height (ResponsiveContainer needs explicit height)
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 14, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--n-100)" vertical={false} />

        {/* optimal band — quiet vital tint at 50% intensity + mono band tag */}
        {optimalRange && (
          <ReferenceArea
            y1={optimalRange.min}
            y2={optimalRange.max}
            fill="var(--vital-200)"
            fillOpacity={0.3 * BAND_K}
            label={bandTag(`OPT ${optimalRange.min}–${optimalRange.max}`, "var(--vital-500)")}
          />
        )}
        {/* reference bounds — dashed neutral hairlines, REF tag on the upper */}
        {referenceRange && (
          <ReferenceLine
            y={referenceRange.min}
            stroke="var(--n-300)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
        )}
        {referenceRange && (
          <ReferenceLine
            y={referenceRange.max}
            stroke="var(--n-300)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={bandTag(`REF ${referenceRange.min}–${referenceRange.max}`, "var(--text-faint)")}
          />
        )}

        {/* projection zone: faint neutral wash from the last actual frame */}
        <ReferenceArea
          x1={"M" + n}
          x2={"M" + (n + PROJ_COUNT)}
          fill="var(--n-200)"
          fillOpacity={0.16}
          label={{
            value: "PROJECTED",
            position: "insideTop",
            fill: "var(--text-faint)",
            fontSize: 9,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            dy: 4,
          }}
        />
        <ReferenceLine x={"M" + n} stroke="var(--n-300)" strokeDasharray="3 3" strokeWidth={1} />

        <XAxis
          dataKey="label"
          tick={monoTick}
          tickFormatter={(v) => String(v).toUpperCase()}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          domain={[lo, hi]}
          tick={monoTick}
          axisLine={false}
          tickLine={false}
          width={44}
          tickCount={4}
          tickFormatter={(v) => String(hi - lo >= 20 ? Math.round(v) : Math.round(v * 10) / 10)}
        />

        <Tooltip
          content={<ChartTooltip unit={unit} ranges={ranges} />}
          cursor={{ stroke: "var(--n-300)", strokeDasharray: "3 3" }}
          wrapperStyle={{ outline: "none", zIndex: 10 }}
        />

        {/* actual readings — thin ink line, frame dots */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--ink)"
          strokeWidth={1.25}
          dot={FrameDot}
          activeDot={{ r: 5.5, fill: "var(--ink)", stroke: "var(--surface)", strokeWidth: 2 }}
          animationDuration={700}
          animationEasing="ease-out"
        />
        {/* projected trend — dashed continuation, ghost frames */}
        <Line
          type="monotone"
          dataKey="proj"
          stroke="var(--ink)"
          strokeWidth={1.25}
          strokeDasharray="5 4"
          strokeOpacity={0.45}
          dot={GhostDot}
          activeDot={{ r: 5, fill: "var(--surface)", stroke: "var(--n-400)", strokeWidth: 1.5 }}
          animationDuration={700}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ============================================================
   TrendSparkline — timestamped wrapper over the shared Sparkline
   idiom (ink line; the last reading may carry the status dot).
   ============================================================ */
interface TrendSparklineProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  status?: MetricStatus; // colors ONLY the last-reading dot
}

export function TrendSparkline({ data, width = 80, height = 24, status }: TrendSparklineProps) {
  if (data.length < 2) {
    return <div style={{ width, height }} />;
  }
  const values = [...data]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((d) => d.value);
  return <Sparkline data={values} width={width} height={height} status={status} />;
}
