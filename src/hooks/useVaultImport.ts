/**
 * useVaultImport Hook
 *
 * State machine for vault import flow:
 * idle → selecting → parsing → preview → importing → complete
 *                            ↘ error
 */

import { useState, useCallback } from 'react';
import { parseVaultMarkdown } from '@/lib/vault/parser';
import { mapStagingToMetrics, previewStagingImport } from '@/lib/vault/mapper';
import { useMetrics } from './useMetrics';
import type { StagingFile, StagingSource } from '@/types/staging';
import type { Metric } from '@/types/metrics';

type ImportStep = 'idle' | 'selecting' | 'parsing' | 'preview' | 'importing' | 'complete' | 'error';

export interface VaultImportPreview {
  filename: string;
  source: StagingSource;
  totalMetrics: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  criticalMetrics: string[];
  warnings: string[];
  stagingData: StagingFile;
}

export interface UseVaultImportReturn {
  step: ImportStep;
  preview: VaultImportPreview | null;
  error: string | null;
  importedCount: number;
  handleFile: (file: File) => Promise<void>;
  handleFiles: (files: File[]) => Promise<void>;
  confirmImport: () => Promise<void>;
  reset: () => void;
}

/**
 * Detect collection date from file content
 */
function detectCollectionDate(content: string, filename: string): string {
  // Look for date patterns in the content
  const datePatterns = [
    /Last Updated:\s*(\w+\s+\d+,?\s+\d{4})/i,
    /(\w+\s+\d{4})\s*\(/i, // "May 2025 ("
    /M\d\s*\((\w+\s+\d+,?\s+\d{4})\)/i, // "M2 (May 1, 2025)"
  ];

  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match) {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  // Default to current date
  return new Date().toISOString().split('T')[0];
}

/**
 * Detect version/milestone from content
 */
function detectVersion(content: string): string | undefined {
  const patterns = [
    /M(\d)\s+Value/i,
    /M(\d)\s*\(/i,
    /Milestone\s+(\d)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return `M${match[1]}`;
    }
  }

  return undefined;
}

export function useVaultImport(): UseVaultImportReturn {
  const [step, setStep] = useState<ImportStep>('idle');
  const [preview, setPreview] = useState<VaultImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [stagingData, setStagingData] = useState<StagingFile | null>(null);

  const { importMetrics } = useMetrics();

  const handleFile = useCallback(async (file: File) => {
    setStep('selecting');
    setError(null);

    try {
      const content = await file.text();
      setStep('parsing');

      // Detect metadata from content
      const collectedAt = detectCollectionDate(content, file.name);
      const version = detectVersion(content);

      // Parse the markdown
      const result = parseVaultMarkdown(content, {
        file: file.name,
        type: 'vault',
        collectedAt,
        version,
      });

      if (!result.success || !result.data) {
        setError(result.errors.join(', ') || 'Failed to parse vault file');
        setStep('error');
        return;
      }

      // Generate preview
      const previewInfo = previewStagingImport(result.data);

      const importPreview: VaultImportPreview = {
        filename: file.name,
        source: result.data.source,
        totalMetrics: previewInfo.totalMetrics,
        byCategory: previewInfo.byCategory,
        byStatus: previewInfo.byStatus,
        criticalMetrics: previewInfo.criticalMetrics,
        warnings: previewInfo.warnings,
        stagingData: result.data,
      };

      setStagingData(result.data);
      setPreview(importPreview);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setStep('error');
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 1) {
      return handleFile(files[0]);
    }

    setStep('selecting');
    setError(null);

    try {
      // Parse all files
      const parsedFiles: Array<{ content: string; source: Partial<StagingSource> }> = [];

      for (const file of files) {
        const content = await file.text();
        const collectedAt = detectCollectionDate(content, file.name);
        const version = detectVersion(content);

        parsedFiles.push({
          content,
          source: {
            file: file.name,
            type: 'vault',
            collectedAt,
            version,
          },
        });
      }

      setStep('parsing');

      // Use parseVaultFiles for multiple files
      const { parseVaultFiles } = await import('@/lib/vault/parser');
      const result = parseVaultFiles(parsedFiles);

      if (!result.success || !result.data) {
        setError(result.errors.join(', ') || 'Failed to parse vault files');
        setStep('error');
        return;
      }

      // Generate preview
      const previewInfo = previewStagingImport(result.data);

      const importPreview: VaultImportPreview = {
        filename: `${files.length} files`,
        source: result.data.source,
        totalMetrics: previewInfo.totalMetrics,
        byCategory: previewInfo.byCategory,
        byStatus: previewInfo.byStatus,
        criticalMetrics: previewInfo.criticalMetrics,
        warnings: previewInfo.warnings,
        stagingData: result.data,
      };

      setStagingData(result.data);
      setPreview(importPreview);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read files');
      setStep('error');
    }
  }, [handleFile]);

  const confirmImport = useCallback(async () => {
    if (!stagingData) {
      setError('No data to import');
      setStep('error');
      return;
    }

    setStep('importing');

    try {
      // Map staging to metrics
      const mapResult = mapStagingToMetrics(stagingData);

      if (mapResult.metrics.length === 0) {
        setError('No metrics could be mapped from staging data');
        setStep('error');
        return;
      }

      // Import metrics
      await importMetrics(mapResult.metrics);

      setImportedCount(mapResult.metrics.length);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('error');
    }
  }, [stagingData, importMetrics]);

  const reset = useCallback(() => {
    setStep('idle');
    setPreview(null);
    setError(null);
    setStagingData(null);
    setImportedCount(0);
  }, []);

  return {
    step,
    preview,
    error,
    importedCount,
    handleFile,
    handleFiles,
    confirmImport,
    reset,
  };
}

export default useVaultImport;
