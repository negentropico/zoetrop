/**
 * MetricCard Component
 *
 * Display component for individual metrics with value, status, trend, and ranges.
 */

import type { MetricCardProps } from '@/types/components';
import { StatusBadge } from './StatusBadge';
import { TrendIndicator } from './TrendIndicator';
import { formatDistanceToNow } from 'date-fns';

export function MetricCard({
  metric,
  showTrend = true,
  showRanges = true,
  compact = false,
  onClick,
}: MetricCardProps) {
  const {
    name,
    value,
    unit,
    timestamp,
    referenceRange,
    optimalRange,
    calculatedStatus,
    calculatedTrend,
    percentChange,
  } = metric;

  // Format timestamp
  const formattedTime = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  // Calculate position indicator for range visualization (0-100%)
  const rangePosition = referenceRange
    ? ((value - referenceRange.min) / (referenceRange.max - referenceRange.min)) * 100
    : 50;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      data-testid="metric-card"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${name}: ${value} ${unit}, ${calculatedStatus || 'unknown'} status`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm
        ${compact ? 'p-3' : 'p-4'}
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-all' : ''}
      `}
    >
      {/* Header: Name and Status */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
          {name}
        </h3>
        {calculatedStatus && (
          <StatusBadge status={calculatedStatus} size={compact ? 'sm' : 'md'} />
        )}
      </div>

      {/* Value and Unit */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`font-bold text-gray-900 ${compact ? 'text-2xl' : 'text-3xl'}`}>
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        </span>
        <span className="text-gray-500 text-sm">{unit}</span>

        {/* Trend indicator (inline with value) */}
        {showTrend && percentChange !== null && (
          <span className="ml-2">
            <TrendIndicator
              trend={calculatedTrend}
              percentChange={percentChange}
              improvement={metric.improvement}
            />
          </span>
        )}
      </div>

      {/* Range Visualization */}
      {showRanges && referenceRange && (
        <div className="mb-3">
          <div
            data-testid="range-indicator"
            className="relative h-2 bg-gray-200 rounded-full overflow-hidden"
          >
            {/* Optimal range highlight */}
            {optimalRange && (
              <div
                className="absolute h-full bg-green-200"
                style={{
                  left: `${((optimalRange.min - referenceRange.min) / (referenceRange.max - referenceRange.min)) * 100}%`,
                  width: `${((optimalRange.max - optimalRange.min) / (referenceRange.max - referenceRange.min)) * 100}%`,
                }}
              />
            )}
            {/* Current value indicator */}
            <div
              className={`absolute w-3 h-3 rounded-full -mt-0.5 transform -translate-x-1/2 border-2 border-white shadow ${
                calculatedStatus === 'optimal'
                  ? 'bg-green-500'
                  : calculatedStatus === 'borderline'
                  ? 'bg-yellow-500'
                  : calculatedStatus === 'deficient'
                  ? 'bg-red-500'
                  : 'bg-orange-500'
              }`}
              style={{ left: `${Math.max(0, Math.min(100, rangePosition))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{referenceRange.min}</span>
            <span>{referenceRange.max}</span>
          </div>
        </div>
      )}

      {/* Range Text */}
      {showRanges && referenceRange && !compact && (
        <div className="text-xs text-gray-500 space-y-0.5">
          <div>
            Reference: {referenceRange.min}-{referenceRange.max} {unit}
          </div>
          {optimalRange && (
            <div>
              Optimal: {optimalRange.min}-{optimalRange.max} {unit}
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      <div
        data-testid="metric-timestamp"
        className={`text-xs text-gray-400 ${showRanges && referenceRange ? 'mt-2' : 'mt-1'}`}
      >
        {formattedTime}
      </div>
    </div>
  );
}

export default MetricCard;
