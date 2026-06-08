// TrendChart — brand-tokened Recharts chart (relocated from app/components/TrendChart.tsx)
// All clinical hex colors replaced with CSS var token strings (dark cascade works)
// Preserves: data shape, projection math, axis domains, reference-band meaning
// Changes: colors + stroke treatments only → brand language for Phase 6
//
// Wave 4 note: two routes import from the old path (../../components/TrendChart):
//   - app/routes/metrics/category.tsx
//   - app/routes/metrics/detail.tsx
// These will be repointed in Wave 4. Both TrendChart and TrendSparkline exported
// here so the repoint is a single import-path change.

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
  isProjection?: boolean;
}

interface TrendChartProps {
  data: DataPoint[];
  projections?: DataPoint[];
  unit: string;
  optimalRange?: { min: number; max: number };
  referenceRange?: { min: number; max: number };
  height?: number;
  showMilestones?: boolean;
}

// Milestone labels for display
const MILESTONE_LABELS: Record<string, string> = {
  "2025-02-06": "M1",
  "2025-05-01": "M2",
  "2025-09-04": "M3",
  "2025-08-15": "Aug",
  "2026-01-15": "M4",
  "2026-04-01": "M5",
  "2026-07-01": "M6",
};

function getMilestoneLabel(timestamp: string): string {
  const dateStr = timestamp.split("T")[0];
  return MILESTONE_LABELS[dateStr] || format(parseISO(timestamp), "MMM");
}

export function TrendChart({
  data,
  projections = [],
  unit,
  optimalRange,
  referenceRange,
  height = 200,
  showMilestones = true,
}: TrendChartProps) {
  if (data.length === 0 && projections.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-32 font-mono text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        No historical data available
      </div>
    );
  }

  // Sort actual data by timestamp (oldest first for chart)
  const sortedData = [...data]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((d) => ({
      ...d,
      label: d.label || getMilestoneLabel(d.timestamp),
      date: format(parseISO(d.timestamp), "MMM d, yyyy"),
      isProjection: false,
    }));

  // Add projections
  const sortedProjections = [...projections]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((d) => ({
      ...d,
      label: d.label || getMilestoneLabel(d.timestamp),
      date: format(parseISO(d.timestamp), "MMM d, yyyy"),
      isProjection: true,
      projectedValue: d.value,
    }));

  // Combine data — actual values and projections
  // For the projection line, connect the last actual point to projections
  const combinedData = [
    ...sortedData.map((d, i) => ({
      ...d,
      projectedValue: undefined,
      // Add projection value to last actual point to connect the lines
      ...(i === sortedData.length - 1 && sortedProjections.length > 0
        ? { projectedValue: d.value }
        : {}),
    })),
    ...sortedProjections.map((d) => ({
      ...d,
      value: undefined, // Don't show on actual line
    })),
  ];

  // Calculate Y-axis domain — include optimal range to show target zone
  const allValues = [
    ...sortedData.map((d) => d.value),
    ...sortedProjections.map((d) => d.value),
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  let domainMin = minValue;
  let domainMax = maxValue;

  // Always extend to include optimal range so the target zone is visible
  if (optimalRange) {
    domainMin = Math.min(domainMin, optimalRange.min);
    domainMax = Math.max(domainMax, optimalRange.max);
  }

  // Add 10% padding for visual breathing room
  const dataRange = domainMax - domainMin || 1;
  const padding = dataRange * 0.1;
  const yMin = Math.max(0, domainMin - padding);
  const yMax = domainMax + padding;

  // Custom tooltip — brand-tokened (no hardcoded Tailwind dark: classes)
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const value = d.value ?? d.projectedValue;
      const isProjection = d.isProjection;

      return (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "8px 12px",
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-sm)",
          }}
        >
          <div
            style={{
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--ink)",
            }}
          >
            {d.date}
            {isProjection && (
              <span
                style={{
                  fontSize: "var(--text-2xs)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--energy-50)",
                  color: "var(--energy-400)",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Target
              </span>
            )}
          </div>
          <div style={{ color: "var(--text-secondary)", marginTop: 2 }}>
            {value?.toFixed(2)} {unit}
          </div>
          {d.label && isProjection && (
            <div
              style={{
                color: "var(--energy-400)",
                fontSize: "var(--text-xs)",
                marginTop: 4,
              }}
            >
              {d.label}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    // Concrete numeric height per Pitfall 7 (ResponsiveContainer needs explicit height)
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={combinedData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
        {/* Optimal range band — var(--vital-50) fill, brand teal wash */}
        {optimalRange && (
          <ReferenceArea
            y1={Math.max(yMin, optimalRange.min)}
            y2={Math.min(yMax, optimalRange.max)}
            fill="var(--vital-50)"
            fillOpacity={1}
            stroke="none"
            label={{ value: "Optimal", position: "insideTopRight", fill: "var(--vital-400)", fontSize: 10 }}
          />
        )}

        {/* Reference range lines — var(--n-200) dashed outline */}
        {referenceRange && (
          <ReferenceLine
            y={referenceRange.min}
            stroke="var(--n-200)"
            strokeDasharray="3 4"
            strokeOpacity={0.8}
          />
        )}
        {referenceRange && (
          <ReferenceLine
            y={referenceRange.max}
            stroke="var(--n-200)"
            strokeDasharray="3 4"
            strokeOpacity={0.8}
          />
        )}

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          width={45}
          tickFormatter={(v) => v.toFixed(1)}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Actual data line — var(--ink) stroke 2.25, surface-fill/ink-stroke dots */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--ink)"
          strokeWidth={2.25}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload.value === undefined) return null;
            return (
              <g key={`dot-${cx}-${cy}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="var(--surface)"
                  stroke="var(--ink)"
                  strokeWidth={2}
                />
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily="var(--font-mono)"
                >
                  {payload.value.toFixed(1)}
                </text>
              </g>
            );
          }}
          activeDot={{ r: 7, fill: "var(--ink)" }}
          connectNulls={false}
        />

        {/* Projection line — var(--energy-400) dashed 4 4 */}
        {sortedProjections.length > 0 && (
          <Line
            type="monotone"
            dataKey="projectedValue"
            stroke="var(--energy-400)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.projectedValue === undefined || !payload.isProjection) return null;
              return (
                <g key={`proj-${cx}-${cy}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill="var(--surface)"
                    stroke="var(--energy-400)"
                    strokeWidth={2}
                  />
                  <text
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    fill="var(--energy-400)"
                    fontSize={11}
                    fontWeight={600}
                    fontFamily="var(--font-mono)"
                  >
                    {payload.projectedValue.toFixed(1)}
                  </text>
                </g>
              );
            }}
            activeDot={{ r: 7, fill: "var(--energy-400)" }}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// TrendSparkline — compact inline sparkline for category overview
// Brand style: always var(--ink) at opacity ~0.7 (not status-colored)
interface SparklineProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  improvement?: "higher" | "lower" | "target";
}

export function TrendSparkline({ data, width = 80, height = 24 }: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const values = sortedData.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 1;

  return (
    // Concrete numeric height per Pitfall 7
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={sortedData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <YAxis domain={[min - padding, max + padding]} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--ink)"
          strokeWidth={1.5}
          strokeOpacity={0.7}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
