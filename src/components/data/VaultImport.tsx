/**
 * VaultImport Component
 *
 * Orchestrates the Obsidian vault import flow:
 * idle → selecting → parsing → preview → importing → complete
 *
 * Supports single or multiple .md files from the vault.
 */

import { useVaultImport } from '@/hooks/useVaultImport';
import { FileUpload } from './FileUpload';
import { VaultImportPreviewPanel } from './VaultImportPreview';
import { CheckCircle, ArrowLeft, FileText, AlertCircle, FolderOpen } from 'lucide-react';
import { useCallback, useRef } from 'react';

export interface VaultImportProps {
  onComplete?: (count: number) => void;
  onCancel?: () => void;
}

export function VaultImport({ onComplete, onCancel }: VaultImportProps) {
  const {
    step,
    preview,
    error,
    handleFile,
    handleFiles,
    confirmImport,
    reset,
    importedCount,
  } = useVaultImport();

  const multiFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleMultiFileClick = () => {
    multiFileInputRef.current?.click();
  };

  const handleMultiFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        handleFiles(Array.from(files));
      }
      // Reset input so same files can be selected again
      if (multiFileInputRef.current) {
        multiFileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  // Idle/Selecting state - show file upload
  if (step === 'idle' || step === 'selecting') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 mb-4">
            <FileText className="w-8 h-8 text-purple-600" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Vault Data</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Import health metrics from your Obsidian vault markdown files.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supports blood work, body composition, and other health data tables.
          </p>
        </div>

        {/* Single file upload */}
        <FileUpload
          onFileSelect={handleFile}
          accept=".md"
          error={error || undefined}
          disabled={step === 'selecting'}
        />

        {/* Multiple files option */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm text-gray-500">or</span>
          </div>
        </div>

        <div className="text-center">
          <input
            ref={multiFileInputRef}
            type="file"
            accept=".md"
            multiple
            onChange={handleMultiFileChange}
            className="hidden"
            aria-label="Select multiple markdown files"
          />
          <button
            type="button"
            onClick={handleMultiFileClick}
            disabled={step === 'selecting'}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-4 h-4" aria-hidden="true" />
            Select Multiple Files
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Select multiple .md files to import at once
          </p>
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

  // Parsing state - show loading
  if (step === 'parsing') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 mb-4">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Parsing Vault Data</h2>
        <p className="text-gray-600">Extracting metrics from markdown tables...</p>
      </div>
    );
  }

  // Preview state - show preview panel
  if (step === 'preview' && preview) {
    return (
      <VaultImportPreviewPanel
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
      <VaultImportPreviewPanel
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h2>
        <p className="text-gray-600 mb-6">
          Successfully imported {importedCount} metric{importedCount !== 1 ? 's' : ''} from vault.
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Import More Files
          </button>
          <button
            type="button"
            onClick={handleComplete}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Failed</h2>
        <p className="text-red-600 mb-6 max-w-md mx-auto">
          {error || 'An unexpected error occurred during import.'}
        </p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default VaultImport;
