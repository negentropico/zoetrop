/**
 * WhoopImport Component
 *
 * Orchestrates the WHOOP import flow:
 * idle → selecting → preview → importing → complete
 */

import { useWhoopImport } from '@/hooks/useWhoopImport';
import { FileUpload } from './FileUpload';
import { ImportPreviewPanel } from './ImportPreviewPanel';
import { CheckCircle, ArrowLeft, Upload, AlertCircle } from 'lucide-react';

export interface WhoopImportProps {
  onComplete?: (count: number) => void;
  onCancel?: () => void;
}

export function WhoopImport({ onComplete, onCancel }: WhoopImportProps) {
  const {
    step,
    preview,
    error,
    handleFile,
    confirmImport,
    reset,
    importedCount,
  } = useWhoopImport();

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

  // Idle/Selecting state - show file upload
  if (step === 'idle' || step === 'selecting') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <Upload className="w-8 h-8 text-blue-600" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Import WHOOP Data
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Upload your WHOOP analysis JSON file to import your health metrics.
            The file should be exported from WHOOP Analyzer.
          </p>
        </div>

        <FileUpload
          onFileSelect={handleFile}
          accept=".json"
          error={error || undefined}
          disabled={step === 'selecting'}
        />

        {onCancel && (
          <div className="flex justify-center">
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

  // Preview state - show preview panel
  if (step === 'preview' && preview) {
    return (
      <ImportPreviewPanel
        preview={preview}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isImporting={false}
      />
    );
  }

  // Importing state - show preview with loading
  if (step === 'importing' && preview) {
    return (
      <ImportPreviewPanel
        preview={preview}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isImporting={true}
      />
    );
  }

  // Complete state - show success message
  if (step === 'complete') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Import Complete!
        </h2>
        <p className="text-gray-600 mb-6">
          Successfully imported {importedCount} metric{importedCount !== 1 ? 's' : ''} from WHOOP.
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Import Another File
          </button>
          <button
            type="button"
            onClick={handleComplete}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error state - show error message with retry option
  if (step === 'error') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Import Failed
        </h2>
        <p className="text-red-600 mb-6">
          {error || 'An unexpected error occurred during import.'}
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default WhoopImport;
