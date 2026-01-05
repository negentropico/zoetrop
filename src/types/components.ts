/**
 * Component Types for MVP Dashboard
 *
 * View models and component props for dashboard UI.
 * Extends Phase 1 types from metrics.ts and whoop.ts.
 */

import type {
  Metric,
  MetricCategory,
  MetricStatus,
  MetricTrend,
  ImprovementDirection,
  CategoryInfo,
  AutonomicSubcategory,
} from './metrics';

// =============================================================================
// VIEW MODELS
// =============================================================================

/**
 * Metric with pre-computed calculations for display.
 */
export interface MetricWithCalculations extends Metric {
  /** Result of classifyStatus() or null if no ranges defined */
  calculatedStatus: MetricStatus | null;
  /** Result of analyzeTrend() */
  calculatedTrend: MetricTrend;
  /** Percent change from previous reading, null if insufficient data */
  percentChange: number | null;
  /** Historical readings sorted by timestamp ascending */
  historicalValues: Array<{ value: number; timestamp: string }>;
}

/**
 * Aggregated category summary for dashboard display.
 */
export interface CategorySummary {
  /** Category identifier */
  category: MetricCategory;
  /** Display metadata from CATEGORY_INFO */
  info: CategoryInfo;
  /** Number of metrics in this category */
  metricCount: number;
  /** Worst status among metrics, or 'empty' if no metrics */
  overallStatus: MetricStatus | 'empty';
  /** All metrics with calculations */
  metrics: MetricWithCalculations[];
  /** ISO timestamp of most recent metric, null if empty */
  lastUpdated: string | null;
}

/**
 * Preview state for WHOOP import before confirmation.
 */
export interface ImportPreview {
  source: 'whoop';
  filename: string;
  dataPeriod: { start: string; end: string };
  metrics: PreviewMetric[];
  warnings: string[];
  errors: string[];
}

/**
 * Single metric in import preview.
 */
export interface PreviewMetric {
  name: string;
  value: number;
  unit: string;
  subcategory: AutonomicSubcategory;
  willReplace: boolean;
  existingValue?: number;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * StatusBadge - Visual indicator of metric status
 */
export interface StatusBadgeProps {
  /** Status to display */
  status: MetricStatus;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show status icon */
  showIcon?: boolean;
  /** Show text label */
  showLabel?: boolean;
}

/**
 * TrendIndicator - Visual indicator of metric trend
 */
export interface TrendIndicatorProps {
  /** Trend direction */
  trend: MetricTrend;
  /** Percent change (optional) */
  percentChange?: number;
  /** How to interpret the trend direction */
  improvement: ImprovementDirection;
  /** Show percentage value */
  showPercentage?: boolean;
}

/**
 * MetricCard - Display component for individual metrics
 */
export interface MetricCardProps {
  /** Metric with calculations */
  metric: MetricWithCalculations;
  /** Show trend indicator */
  showTrend?: boolean;
  /** Show reference/optimal ranges */
  showRanges?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Click handler for expansion/details */
  onClick?: () => void;
}

/**
 * CategoryCard - Visual representation of metric category
 */
export interface CategoryCardProps {
  /** Category summary data */
  summary: CategorySummary;
  /** Navigation click handler */
  onClick?: () => void;
  /** Selected state for active category */
  selected?: boolean;
}

/**
 * CategoryGrid - Dashboard grid of all categories
 */
export interface CategoryGridProps {
  /** All category summaries */
  categories: CategorySummary[];
  /** Category selection handler */
  onCategoryClick?: (category: MetricCategory) => void;
  /** Loading state */
  loading?: boolean;
}

/**
 * WhoopImport - File upload and import component
 */
export interface WhoopImportProps {
  /** Called after successful import with count */
  onImportComplete?: (count: number) => void;
  /** Cancel handler */
  onCancel?: () => void;
}

/**
 * ImportPreviewPanel - Shows metrics before confirmation
 */
export interface ImportPreviewPanelProps {
  /** Preview data to display */
  preview: ImportPreview;
  /** Confirm import handler */
  onConfirm: () => void;
  /** Cancel handler */
  onCancel: () => void;
  /** Loading state during import */
  isImporting?: boolean;
}

/**
 * FileUpload - Generic file upload component
 */
export interface FileUploadProps {
  /** Accepted file types */
  accept?: string;
  /** File selection handler */
  onFileSelect: (file: File) => void;
  /** Error state */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * CategoryDetail - Full category view props
 */
export interface CategoryDetailProps {
  /** Category to display */
  category: MetricCategory;
  /** Pre-loaded summary (optional) */
  summary?: CategorySummary;
}

/**
 * EmptyState - Display when no data available
 */
export interface EmptyStateProps {
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button handler */
  onAction?: () => void;
  /** Icon name (Lucide) */
  icon?: string;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

/**
 * useDashboard hook return type
 */
export interface UseDashboardReturn {
  /** All category summaries */
  categories: CategorySummary[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh dashboard data */
  refresh: () => void;
  /** Current storage mode */
  storageMode: 'localStorage' | 'api';
}

/**
 * useWhoopImport hook return type
 */
export interface UseWhoopImportReturn {
  /** Current import step */
  step: 'idle' | 'selecting' | 'preview' | 'importing' | 'complete' | 'error';
  /** Preview data when in preview step */
  preview: ImportPreview | null;
  /** Error message if any */
  error: string | null;
  /** Handle file selection */
  handleFile: (file: File) => Promise<void>;
  /** Confirm and execute import */
  confirmImport: () => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
  /** Number of metrics imported (after complete) */
  importedCount: number;
}

// =============================================================================
// STATUS STYLING
// =============================================================================

/**
 * Status color configuration for consistent styling
 */
export const STATUS_STYLES: Record<
  MetricStatus,
  { bg: string; text: string; icon: string; label: string }
> = {
  optimal: {
    bg: 'bg-green-600',
    text: 'text-white',
    icon: 'check-circle',
    label: 'Optimal',
  },
  borderline: {
    bg: 'bg-yellow-500',
    text: 'text-black',
    icon: 'alert-circle',
    label: 'Borderline',
  },
  deficient: {
    bg: 'bg-red-600',
    text: 'text-white',
    icon: 'x-circle',
    label: 'Deficient',
  },
  excess: {
    bg: 'bg-orange-700', // #c2410c for WCAG AA
    text: 'text-white',
    icon: 'arrow-up-circle',
    label: 'Excess',
  },
};

/**
 * Trend styling based on direction and improvement
 */
export const getTrendStyle = (
  trend: MetricTrend,
  percentChange: number,
  improvement: ImprovementDirection
): { color: string; icon: string } => {
  if (trend === 'stable') {
    return { color: 'text-gray-500', icon: 'minus' };
  }

  const isUp = percentChange > 0;
  const isGood =
    (improvement === 'higher is better' && isUp) ||
    (improvement === 'lower is better' && !isUp);

  return {
    color: isGood ? 'text-green-600' : 'text-red-600',
    icon: isUp ? 'arrow-up-right' : 'arrow-down-right',
  };
};
