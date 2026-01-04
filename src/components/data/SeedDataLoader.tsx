/**
 * SeedDataLoader Component
 *
 * Loads initial seed data into the application.
 * Used for first-time setup with pre-populated health metrics.
 */

import { useSeedData } from '@/hooks/useSeedData';
import {
  CheckCircle,
  ArrowLeft,
  Database,
  AlertCircle,
  Loader2,
  Activity,
  Calendar,
} from 'lucide-react';

export interface SeedDataLoaderProps {
  onComplete?: (count: number) => void;
  onCancel?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  autonomic: 'Autonomic (WHOOP)',
  vitamins: 'Vitamins',
  minerals: 'Minerals',
  metabolic: 'Metabolic',
  hormones: 'Hormones',
  lipids: 'Lipids',
  hematology: 'Hematology',
  bodyComposition: 'Body Composition',
  inflammatory: 'Inflammatory',
};

export function SeedDataLoader({ onComplete, onCancel }: SeedDataLoaderProps) {
  const {
    step,
    summary,
    error,
    importedCount,
    loadSeedData,
    confirmImport,
    reset,
  } = useSeedData();

  const handleConfirm = async () => {
    await confirmImport();
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  const handleComplete = () => {
    onComplete?.(importedCount);
    reset();
  };

  // Idle state - show load button
  if (step === 'idle') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
            <Database className="w-8 h-8 text-emerald-600" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Load Initial Profile Data
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Load your pre-generated health metrics from the seed data file.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Includes blood work, body composition, and WHOOP biometrics.
          </p>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadSeedData}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Database className="w-5 h-5" aria-hidden="true" />
            Load Seed Data
          </button>
        </div>

        {onCancel && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  // Loading state
  if (step === 'loading') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Seed Data</h2>
        <p className="text-gray-600">Fetching your health metrics...</p>
      </div>
    );
  }

  // Preview state
  if (step === 'preview' && summary) {
    const categories = Object.entries(summary.byCategory)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    const sources = Object.entries(summary.bySource)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Seed Data Preview</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Total Metrics */}
          <div className="p-4 bg-emerald-50 rounded-lg flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Total Metrics</p>
              <p className="text-2xl font-bold text-emerald-700">{summary.totalMetrics.toLocaleString()}</p>
            </div>
          </div>

          {/* Date Range */}
          <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-gray-700">Date Range</p>
              <p className="text-sm text-gray-600">
                {new Date(summary.dateRange.start).toLocaleDateString()} to{' '}
                {new Date(summary.dateRange.end).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* By Category */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">By Category</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(([category, count]) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  <span className="font-medium text-gray-900">
                    {CATEGORY_LABELS[category] || category}
                  </span>
                  <span className="text-gray-500">({count.toLocaleString()})</span>
                </span>
              ))}
            </div>
          </div>

          {/* By Source */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">By Source</h3>
            <div className="flex flex-wrap gap-2">
              {sources.map(([source, count]) => (
                <span
                  key={source}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 rounded-full text-sm"
                >
                  <span className="font-medium text-blue-900 capitalize">{source}</span>
                  <span className="text-blue-700">({count.toLocaleString()})</span>
                </span>
              ))}
            </div>
          </div>

          {/* Warning about overwrite */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> This will replace all existing metrics with the seed data.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Import {summary.totalMetrics.toLocaleString()} Metrics
          </button>
        </div>
      </div>
    );
  }

  // Importing state
  if (step === 'importing') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Importing Data</h2>
        <p className="text-gray-600">This may take a moment...</p>
      </div>
    );
  }

  // Complete state
  if (step === 'complete') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h2>
        <p className="text-gray-600 mb-6">
          Successfully imported {importedCount.toLocaleString()} metrics.
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleComplete}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            View Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Load Failed</h2>
        <p className="text-red-600 mb-6 max-w-md mx-auto">
          {error || 'An unexpected error occurred.'}
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default SeedDataLoader;
