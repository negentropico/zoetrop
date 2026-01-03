/**
 * useWhoopImport Hook
 *
 * State machine for WHOOP import flow:
 * idle → selecting → preview → importing → complete
 *                  ↘ error
 */

import { useState, useCallback } from 'react';
import { parseWhoopJson } from '@/lib/whoop/parser';
import { mapWhoopToMetrics } from '@/lib/whoop/mapper';
import { useMetrics } from './useMetrics';
import type { ImportPreview, PreviewMetric, UseWhoopImportReturn } from '@/types/components';
import type { AutonomicSubcategory } from '@/types/metrics';

type ImportStep = 'idle' | 'selecting' | 'preview' | 'importing' | 'complete' | 'error';

export function useWhoopImport(): UseWhoopImportReturn {
  const [step, setStep] = useState<ImportStep>('idle');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const { importWhoopData, metrics: existingMetrics } = useMetrics();

  // Store the parsed report for later import
  const [parsedReport, setParsedReport] = useState<unknown>(null);

  const handleFile = useCallback(async (file: File) => {
    setStep('selecting');
    setError(null);

    try {
      const text = await file.text();
      const parseResult = parseWhoopJson(text);

      if (!parseResult.success || !parseResult.data) {
        setError(parseResult.errors.join(', ') || 'Failed to parse WHOOP JSON');
        setStep('error');
        return;
      }

      // Map to metrics for preview
      const mapResult = mapWhoopToMetrics(parseResult.data);

      // Build preview
      const previewMetrics: PreviewMetric[] = mapResult.metrics.map((m) => {
        // Check if we already have this metric
        const existing = existingMetrics.find(
          (em) => em.name === m.name && em.category === 'autonomic'
        );

        return {
          name: m.name,
          value: m.value,
          unit: m.unit,
          subcategory: m.subcategory as AutonomicSubcategory,
          willReplace: !!existing,
          existingValue: existing?.value,
        };
      });

      const importPreview: ImportPreview = {
        source: 'whoop',
        filename: file.name,
        dataPeriod: {
          start: parseResult.data.data_period?.start || 'Unknown',
          end: parseResult.data.data_period?.end || 'Unknown',
        },
        metrics: previewMetrics,
        warnings: parseResult.warnings || mapResult.skipped.map((s) => `Skipped: ${s}`),
        errors: [],
      };

      setParsedReport(parseResult.data);
      setPreview(importPreview);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setStep('error');
    }
  }, [existingMetrics]);

  const confirmImport = useCallback(async () => {
    if (!parsedReport) {
      setError('No data to import');
      setStep('error');
      return;
    }

    setStep('importing');

    try {
      const result = await importWhoopData(parsedReport);

      if (result) {
        setImportedCount(result.metrics.length);
        setStep('complete');
      } else {
        setError('Failed to import metrics');
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('error');
    }
  }, [parsedReport, importWhoopData]);

  const reset = useCallback(() => {
    setStep('idle');
    setPreview(null);
    setError(null);
    setParsedReport(null);
    setImportedCount(0);
  }, []);

  return {
    step,
    preview,
    error,
    handleFile,
    confirmImport,
    reset,
    importedCount,
  };
}

export default useWhoopImport;
