/**
 * StatusBadge Component
 *
 * Visual indicator of metric status with color, icon, and text.
 * Triple encoding for accessibility: color + icon + text label.
 */

import type { StatusBadgeProps } from '@/types/components';
import { STATUS_STYLES } from '@/types/components';
import { CheckCircle, AlertCircle, XCircle, ArrowUpCircle } from 'lucide-react';

// Icon components for each status
const STATUS_ICONS = {
  optimal: CheckCircle,
  borderline: AlertCircle,
  deficient: XCircle,
  excess: ArrowUpCircle,
};

// Size classes
const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

const ICON_SIZES = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  showLabel = true,
}: StatusBadgeProps) {
  const styles = STATUS_STYLES[status];
  const IconComponent = STATUS_ICONS[status];

  return (
    <span
      role="status"
      aria-label={`Status: ${styles.label}`}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${styles.bg} ${styles.text}
        ${SIZE_CLASSES[size]}
      `}
    >
      {showIcon && (
        <IconComponent
          data-testid="status-icon"
          className={ICON_SIZES[size]}
          aria-hidden="true"
        />
      )}
      {showLabel && <span>{styles.label}</span>}
    </span>
  );
}

export default StatusBadge;
