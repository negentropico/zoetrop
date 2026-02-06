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
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
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

  // Combine data - actual values and projections
  // For the projection line, we need to connect the last actual point to projections
  const lastActual = sortedData[sortedData.length - 1];

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

  // Calculate Y-axis domain - include optimal range to show target zone
  const allValues = [
    ...sortedData.map((d) => d.value),
    ...sortedProjections.map((d) => d.value),
  ];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  // Start with data range
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

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.value ?? data.projectedValue;
      const isProjection = data.isProjection;

      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 text-sm">
          <div className="font-medium flex items-center gap-2">
            {data.date}
            {isProjection && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                Target
              </span>
            )}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {value?.toFixed(2)} {unit}
          </div>
          {data.label && isProjection && (
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {data.label}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={combinedData} margin={{ top: 25, right: 10, left: 0, bottom: 0 }}>
        {/* Optimal range band (green area) - render behind data */}
        {optimalRange && (
          <ReferenceArea
            y1={Math.max(yMin, optimalRange.min)}
            y2={Math.min(yMax, optimalRange.max)}
            fill="#22c55e"
            fillOpacity={0.2}
            stroke="none"
            label={{ value: "Optimal", position: "insideTopRight", fill: "#16a34a", fontSize: 10 }}
          />
        )}

        {/* Reference range lines (yellow dashed) */}
        {referenceRange && (
          <ReferenceLine
            y={referenceRange.min}
            stroke="#eab308"
            strokeDasharray="2 2"
            strokeOpacity={0.5}
          />
        )}
        {referenceRange && (
          <ReferenceLine
            y={referenceRange.max}
            stroke="#eab308"
            strokeDasharray="2 2"
            strokeOpacity={0.5}
          />
        )}

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={45}
          tickFormatter={(v) => v.toFixed(1)}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* Actual data line */}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={(props: any) => {
            const { cx, cy, payload } = props;
            if (payload.value === undefined) return null;
            return (
              <g key={`dot-${cx}-${cy}`}>
                <circle cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fill="#3b82f6"
                  fontSize={11}
                  fontWeight={600}
                >
                  {payload.value.toFixed(1)}
                </text>
              </g>
            );
          }}
          activeDot={{ r: 7, fill: "#2563eb" }}
          connectNulls={false}
        />

        {/* Projection line (dashed, purple) */}
        {sortedProjections.length > 0 && (
          <Line
            type="monotone"
            dataKey="projectedValue"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              if (payload.projectedValue === undefined || !payload.isProjection) return null;
              return (
                <g key={`proj-${cx}-${cy}`}>
                  <circle cx={cx} cy={cy} r={5} fill="#a855f7" stroke="#fff" strokeWidth={2} />
                  <text
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    fill="#a855f7"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {payload.projectedValue.toFixed(1)}
                  </text>
                </g>
              );
            }}
            activeDot={{ r: 7, fill: "#9333ea" }}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Compact sparkline version for category overview
interface SparklineProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  improvement?: "higher" | "lower" | "target";
}

export function TrendSparkline({ data, width = 80, height = 24, improvement }: SparklineProps) {
  if (data.length < 2) {
    return <div className="w-20 h-6" />;
  }

  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const values = sortedData.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 1;

  // Determine trend direction for color
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const trendUp = lastValue > firstValue;

  // Color based on improvement direction
  let trendColor: string;
  if (improvement === "higher") {
    trendColor = trendUp ? "#22c55e" : "#ef4444"; // Green if up, red if down
  } else if (improvement === "lower") {
    trendColor = trendUp ? "#ef4444" : "#22c55e"; // Red if up, green if down
  } else {
    // Default: just show direction
    trendColor = trendUp ? "#22c55e" : "#ef4444";
  }

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={sortedData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <YAxis domain={[min - padding, max + padding]} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={trendColor}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
