/**
 * useWhoopImport Hook
 *
 * State machine for WHOOP import flow:
 * idle → selecting → preview → importing → complete
 *                  ↘ error
 *
 * Supports both JSON (WHOOP Analyzer) and CSV (raw WHOOP export) formats.
 */

import { useState, useCallback } from 'react';
import { parseWhoopJson } from '@/lib/whoop/parser';
import { mapWhoopToMetrics } from '@/lib/whoop/mapper';
import { parseWhoopCsv, isWhoopCsv } from '@/lib/whoop/csv-parser';
import { mapWhoopCsvToMetrics, calculateCsvAverages } from '@/lib/whoop/csv-mapper';
import { useMetrics } from './useMetrics';
import type { ImportPreview, PreviewMetric, UseWhoopImportReturn } from '@/types/components';
import type { AutonomicSubcategory } from '@/types/metrics';
import type { WhoopCsvMapConfig } from '@/lib/whoop';

type ImportStep = 'idle' | 'selecting' | 'preview' | 'importing' | 'complete' | 'error';
type ImportFormat = 'json' | 'csv';

export function useWhoopImport(): UseWhoopImportReturn {
  const [step, setStep] = useState<ImportStep>('idle');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [importFormat, setImportFormat] = useState<ImportFormat>('json');
  const [csvConfig, setCsvConfig] = useState<WhoopCsvMapConfig>({ importMode: 'all' });

  const { importWhoopData, importWhoopCsvData, metrics: existingMetrics } = useMetrics();

  // Store the parsed data for later import
  const [parsedReport, setParsedReport] = useState<unknown>(null);
  const [parsedCsvContent, setParsedCsvContent] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setStep('selecting');
    setError(null);

    try {
      const text = await file.text();

      // Detect format: CSV or JSON
      const isCsv = file.name.endsWith('.csv') || isWhoopCsv(text);

      if (isCsv) {
        // Handle CSV import
        setImportFormat('csv');
        const parseResult = parseWhoopCsv(text);

        if (!parseResult.success || !parseResult.data) {
          setError(parseResult.errors.join(', ') || 'Failed to parse WHOOP CSV');
          setStep('error');
          return;
        }

        // Map to metrics for preview (using all mode for preview)
        const mapResult = mapWhoopCsvToMetrics(parseResult.data, { importMode: 'all' });
        const averages = calculateCsvAverages(parseResult.data);

        // Build preview metrics showing averages
        const previewMetrics: PreviewMetric[] = [];

        if (averages.avgHrv !== null) {
          const existing = existingMetrics.find((em) => em.name === 'HRV (RMSSD)');
          previewMetrics.push({
            name: 'HRV (RMSSD)',
            value: Math.round(averages.avgHrv * 10) / 10,
            unit: 'ms',
            subcategory: 'hrv',
            willReplace: !!existing,
            existingValue: existing?.value,
          });
        }

        if (averages.avgRecovery !== null) {
          const existing = existingMetrics.find((em) => em.name === 'Recovery Score');
          previewMetrics.push({
            name: 'Recovery Score',
            value: Math.round(averages.avgRecovery * 10) / 10,
            unit: '%',
            subcategory: 'recovery',
            willReplace: !!existing,
            existingValue: existing?.value,
          });
        }

        if (averages.avgRhr !== null) {
          const existing = existingMetrics.find((em) => em.name === 'Resting Heart Rate');
          previewMetrics.push({
            name: 'Resting Heart Rate',
            value: Math.round(averages.avgRhr * 10) / 10,
            unit: 'bpm',
            subcategory: 'hrv',
            willReplace: !!existing,
            existingValue: existing?.value,
          });
        }

        if (averages.avgSleep !== null) {
          const existing = existingMetrics.find((em) => em.name === 'Sleep Duration');
          previewMetrics.push({
            name: 'Sleep Duration',
            value: Math.round(averages.avgSleep * 100) / 100,
            unit: 'hours',
            subcategory: 'sleep',
            willReplace: !!existing,
            existingValue: existing?.value,
          });
        }

        if (averages.avgStrain !== null) {
          const existing = existingMetrics.find((em) => em.name === 'Daily Strain');
          previewMetrics.push({
            name: 'Daily Strain',
            value: Math.round(averages.avgStrain * 10) / 10,
            unit: 'strain',
            subcategory: 'recovery',
            willReplace: !!existing,
            existingValue: existing?.value,
          });
        }

        const importPreview: ImportPreview = {
          source: 'whoop-csv',
          filename: file.name,
          dataPeriod: parseResult.data.dateRange,
          metrics: previewMetrics,
          warnings: [
            `CSV contains ${parseResult.data.rowCount} days of data`,
            `Will create ${mapResult.summary.metricsCreated} individual metrics`,
            ...parseResult.warnings,
          ],
          errors: [],
        };

        setParsedCsvContent(text);
        setPreview(importPreview);
        setStep('preview');
      } else {
        // Handle JSON import
        setImportFormat('json');
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
      setStep('error');
    }
  }, [existingMetrics]);

  const confirmImport = useCallback(async () => {
    setStep('importing');

    try {
      if (importFormat === 'csv' && parsedCsvContent) {
        const result = await importWhoopCsvData(parsedCsvContent, csvConfig);

        if (result) {
          setImportedCount(result.metrics.length);
          setStep('complete');
        } else {
          setError('Failed to import CSV metrics');
          setStep('error');
        }
      } else if (importFormat === 'json' && parsedReport) {
        const result = await importWhoopData(parsedReport);

        if (result) {
          setImportedCount(result.metrics.length);
          setStep('complete');
        } else {
          setError('Failed to import metrics');
          setStep('error');
        }
      } else {
        setError('No data to import');
        setStep('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('error');
    }
  }, [importFormat, parsedReport, parsedCsvContent, csvConfig, importWhoopData, importWhoopCsvData]);

  const reset = useCallback(() => {
    setStep('idle');
    setPreview(null);
    setError(null);
    setParsedReport(null);
    setParsedCsvContent(null);
    setImportedCount(0);
    setImportFormat('json');
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
