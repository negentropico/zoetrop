/**
 * ImportPreviewPanel Component
 *
 * Displays preview of data to be imported with confirm/cancel actions.
 * Shows metrics, warnings, errors, and data period.
 */

import { AlertCircle, AlertTriangle, CheckCircle, FileJson, Loader2 } from 'lucide-react';
import type { ImportPreview } from '@/types/components';

export interface ImportPreviewPanelProps {
  preview: ImportPreview;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting?: boolean;
}

export function ImportPreviewPanel({
  preview,
  onConfirm,
  onCancel,
  isImporting = false,
}: ImportPreviewPanelProps) {
  const hasErrors = preview.errors.length > 0;
  const hasWarnings = preview.warnings.length > 0;

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
          <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
            <FileJson className="w-6 h-6 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{preview.filename}</p>
            <p className="text-sm text-gray-500 capitalize">Source: {preview.source}</p>
          </div>
        </div>

        {/* Data Period */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Data Period</p>
          <p className="text-sm text-gray-600">
            {preview.dataPeriod.start} to {preview.dataPeriod.end}
          </p>
        </div>

        {/* Metrics to Import */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Metrics to Import ({preview.metrics.length})
          </h3>
          <div className="space-y-2">
            {preview.metrics.map((metric) => (
              <div
                key={metric.name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-900">
                    {metric.value} {metric.unit}
                  </span>
                  {metric.willReplace && metric.existingValue !== undefined && (
                    <p className="text-xs text-amber-600">
                      Replaces: {metric.existingValue} {metric.unit}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

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

        {/* Errors */}
        {hasErrors && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
              <span className="text-sm font-medium text-red-800">Errors</span>
            </div>
            <ul className="space-y-1">
              {preview.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isImporting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={hasErrors || isImporting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Importing...
            </>
          ) : (
            'Confirm Import'
          )}
        </button>
      </div>
    </div>
  );
}

export default ImportPreviewPanel;
