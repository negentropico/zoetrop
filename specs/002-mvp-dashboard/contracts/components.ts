/**
 * Component Contracts: MVP Dashboard & UI Components
 *
 * This file defines the public API contracts for all dashboard components.
 * Implementation must satisfy these interfaces exactly.
 *
 * @feature 002-mvp-dashboard
 * @date 2026-01-03
 */

import type {
  Metric,
  MetricCategory,
  MetricStatus,
  MetricTrend,
  ImprovementDirection,
  CategoryInfo,
  AutonomicSubcategory,
} from '@/types/metrics';

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
// COMPONENT PROPS CONTRACTS
// =============================================================================

/**
 * StatusBadge - Visual indicator of metric status
 * @requirement FR-006
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
 * @requirement FR-007
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
 * @requirement FR-005, FR-008
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
 * @requirement FR-002, FR-003
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
 * @requirement FR-001, FR-017
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
 * @requirement FR-009, FR-010, FR-011
 */
export interface WhoopImportProps {
  /** Called after successful import with count */
  onImportComplete?: (count: number) => void;
  /** Cancel handler */
  onCancel?: () => void;
}

/**
 * ImportPreviewPanel - Shows metrics before confirmation
 * @requirement FR-011
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
 * @requirement FR-009
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
 * CategoryDetailPage - Full category view
 * @requirement FR-013, FR-014, FR-015
 */
export interface CategoryDetailProps {
  /** Category to display */
  category: MetricCategory;
  /** Pre-loaded summary (optional, will load if not provided) */
  summary?: CategorySummary;
}

/**
 * EmptyState - Display when no data available
 * @requirement FR-015
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
// ACCESSIBILITY CONTRACTS
// =============================================================================

/**
 * All interactive components MUST implement these accessibility requirements.
 * @requirement SC-008
 */
export interface AccessibilityContract {
  /** Keyboard navigable with Tab/Enter/Space */
  keyboardAccessible: true;
  /** Has appropriate ARIA labels */
  ariaLabeled: true;
  /** Status indicated by more than just color */
  notColorOnly: true;
  /** Focus visible indicator */
  focusVisible: true;
}

// =============================================================================
// TEST CONTRACTS
// =============================================================================

/**
 * Each component must pass these test categories.
 */
export interface ComponentTestContract {
  /** Renders without error */
  renders: true;
  /** Handles all prop variants */
  propsHandled: true;
  /** Accessible (keyboard, screen reader) */
  accessible: true;
  /** Responsive at all breakpoints */
  responsive: true;
}
