/**
 * TrendIndicator Component
 *
 * Visual indicator of metric trend with contextual colors.
 * Arrow direction based on raw value change.
 * Color based on whether change is good or bad for that metric type.
 */

import type { TrendIndicatorProps } from '@/types/components';
import { getTrendStyle } from '@/types/components';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

// Icon components for trend directions
const TREND_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  stable: Minus,
};

export function TrendIndicator({
  trend,
  percentChange = 0,
  improvement,
  showPercentage = true,
}: TrendIndicatorProps) {
  // Get styling based on trend and improvement direction
  const style = getTrendStyle(trend, percentChange, improvement);

  // Determine arrow direction based on percent change
  const isUp = percentChange > 0;
  const IconComponent = trend === 'stable' ? TREND_ICONS.stable : isUp ? TREND_ICONS.up : TREND_ICONS.down;

  // Build ARIA label
  const ariaLabel =
    trend === 'stable'
      ? 'Trend: Stable'
      : `${trend === 'improving' ? 'Improving' : 'Declining'} by ${Math.abs(percentChange).toFixed(1)}%`;

  return (
    <span
      data-testid="trend-indicator"
      className={`inline-flex items-center gap-1 ${style.color}`}
      aria-label={ariaLabel}
    >
      <IconComponent className="w-4 h-4" aria-hidden="true" />
      {showPercentage && trend !== 'stable' && (
        <span className="text-sm font-medium">
          {Math.abs(percentChange).toFixed(1)}%
        </span>
      )}
    </span>
  );
}

export default TrendIndicator;
