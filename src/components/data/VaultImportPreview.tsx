/**
 * VaultImportPreview Component
 *
 * Displays preview of vault import data before confirmation.
 * Shows metrics by category, status distribution, and critical items.
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Activity,
} from 'lucide-react';
import type { VaultImportPreview } from '@/hooks/useVaultImport';

export interface VaultImportPreviewProps {
  preview: VaultImportPreview;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  optimal: { bg: 'bg-green-100', text: 'text-green-800' },
  borderline: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  deficient: { bg: 'bg-red-100', text: 'text-red-800' },
  excess: { bg: 'bg-orange-100', text: 'text-orange-800' },
  unknown: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

const CATEGORY_LABELS: Record<string, string> = {
  vitamins: 'Vitamins',
  minerals: 'Minerals',
  inflammatory: 'Inflammatory',
  metabolic: 'Metabolic',
  hormones: 'Hormones',
  autonomic: 'Autonomic',
  bodyComposition: 'Body Composition',
  lipids: 'Lipids',
  hematology: 'Hematology',
};

export function VaultImportPreviewPanel({
  preview,
  onConfirm,
  onCancel,
  isImporting = false,
}: VaultImportPreviewProps) {
  const hasWarnings = preview.warnings.length > 0;
  const hasCritical = preview.criticalMetrics.length > 0;

  // Filter categories with metrics
  const categoriesWithMetrics = Object.entries(preview.byCategory)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  // Filter statuses with metrics
  const statusesWithMetrics = Object.entries(preview.byStatus)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Import Preview</h2>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* File Info */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-purple-50 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{preview.filename}</p>
            <p className="text-sm text-gray-500">
              Source: {preview.source.type}
              {preview.source.version && ` (${preview.source.version})`}
            </p>
            {preview.source.collectedAt && (
              <p className="text-sm text-gray-500">
                Collected: {new Date(preview.source.collectedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Total Metrics */}
        <div className="p-4 bg-blue-50 rounded-lg flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-blue-900">Total Metrics</p>
            <p className="text-2xl font-bold text-blue-700">{preview.totalMetrics}</p>
          </div>
        </div>

        {/* By Category */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">By Category</h3>
          <div className="flex flex-wrap gap-2">
            {categoriesWithMetrics.map(([category, count]) => (
              <span
                key={category}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
              >
                <span className="font-medium text-gray-900">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <span className="text-gray-500">({count})</span>
              </span>
            ))}
          </div>
        </div>

        {/* By Status */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">By Status</h3>
          <div className="flex flex-wrap gap-2">
            {statusesWithMetrics.map(([status, count]) => {
              const colors = STATUS_COLORS[status] || STATUS_COLORS.unknown;
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${colors.bg}`}
                >
                  <span className={`font-medium capitalize ${colors.text}`}>{status}</span>
                  <span className={colors.text}>({count})</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Critical Metrics */}
        {hasCritical && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
              <span className="text-sm font-medium text-red-800">
                Critical Metrics ({preview.criticalMetrics.length})
              </span>
            </div>
            <ul className="space-y-1">
              {preview.criticalMetrics.map((metric, index) => (
                <li key={index} className="text-sm text-red-700">
                  {metric}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span className="text-sm font-medium text-amber-800">Warnings</span>
            </div>
            <ul className="space-y-1">
              {preview.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-amber-700">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success indicator */}
        {!hasCritical && !hasWarnings && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
              <span className="text-sm font-medium text-green-800">
                All metrics validated successfully
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isImporting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isImporting}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Importing...
            </>
          ) : (
            `Import ${preview.totalMetrics} Metrics`
          )}
        </button>
      </div>
    </div>
  );
}

export default VaultImportPreviewPanel;
