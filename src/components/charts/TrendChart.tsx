/**
 * TrendChart Component
 *
 * Displays metric trends over time using Recharts.
 * Supports multiple data points and shows optimal/reference ranges.
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { Metric } from '@/types/metrics';

interface TrendChartProps {
  metrics: Metric[];
  height?: number;
  showOptimalRange?: boolean;
  showReferenceRange?: boolean;
}

export function TrendChart({
  metrics,
  height = 200,
  showOptimalRange = true,
  showReferenceRange = false,
}: TrendChartProps) {
  // Sort by date and format data for chart
  const chartData = useMemo(() => {
    return [...metrics]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(m => ({
        date: new Date(m.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: metrics.length > 30 ? '2-digit' : undefined
        }),
        value: m.value,
        fullDate: m.timestamp,
      }));
  }, [metrics]);

  // Get range info from first metric with ranges
  const rangeInfo = useMemo(() => {
    const withRange = metrics.find(m => m.optimalRange || m.referenceRange);
    return {
      optimal: withRange?.optimalRange,
      reference: withRange?.referenceRange,
    };
  }, [metrics]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    const values = metrics.map(m => m.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Include optimal range in domain if available
    let domainMin = min;
    let domainMax = max;

    if (rangeInfo.optimal) {
      domainMin = Math.min(domainMin, rangeInfo.optimal.min);
      domainMax = Math.max(domainMax, rangeInfo.optimal.max);
    }

    // Add 10% padding
    const padding = (domainMax - domainMin) * 0.1;
    return [Math.floor(domainMin - padding), Math.ceil(domainMax + padding)];
  }, [metrics, rangeInfo]);

  if (metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No trend data available
      </div>
    );
  }

  if (metrics.length === 1) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Single data point - need more for trend
      </div>
    );
  }

  const unit = metrics[0]?.unit || '';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
          axisLine={{ stroke: '#d1d5db' }}
        />

        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#d1d5db' }}
          axisLine={{ stroke: '#d1d5db' }}
          width={50}
          tickFormatter={(value) => value.toLocaleString()}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value.toLocaleString()} ${unit}`, 'Value']}
          labelFormatter={(label) => `Date: ${label}`}
        />

        {/* Optimal range area */}
        {showOptimalRange && rangeInfo.optimal && (
          <ReferenceArea
            y1={rangeInfo.optimal.min}
            y2={rangeInfo.optimal.max}
            fill="#10b981"
            fillOpacity={0.1}
            stroke="#10b981"
            strokeOpacity={0.3}
            strokeDasharray="3 3"
          />
        )}

        {/* Reference range lines */}
        {showReferenceRange && rangeInfo.reference && (
          <>
            <ReferenceLine
              y={rangeInfo.reference.min}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
            <ReferenceLine
              y={rangeInfo.reference.max}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          </>
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#2563eb' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TrendChart;
