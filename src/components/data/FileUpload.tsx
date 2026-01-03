/**
 * FileUpload Component
 *
 * File selection via click or drag-and-drop.
 * Supports file type filtering and error display.
 */

import { useState, useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';

export interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  error?: string;
  disabled?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept,
  error,
  disabled = false,
}: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [disabled, onFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className="w-full">
      <div
        data-testid="file-dropzone"
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full h-48 px-4 py-6
          border-2 border-dashed rounded-lg
          transition-colors duration-200
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-50'
            : 'cursor-pointer bg-white hover:bg-gray-50'
          }
          ${error ? 'border-red-300' : ''}
        `}
        aria-label="File upload dropzone"
        aria-disabled={disabled}
      >
        <Upload
          className={`w-10 h-10 mb-3 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`}
          aria-hidden="true"
        />

        <p className="mb-2 text-sm text-gray-700">
          <span className="font-semibold">Select File</span> or drag and drop
        </p>

        <p className="text-xs text-gray-500">
          {accept ? `Accepted: ${accept}` : 'Any file type'}
        </p>

        <input
          ref={inputRef}
          type="file"
          data-testid="file-input"
          accept={accept}
          disabled={disabled}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default FileUpload;
