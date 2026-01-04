/**
 * useSeedData Hook
 *
 * Loads and applies initial seed data to the application.
 * Used for first-time setup or data reset.
 */

import { useState, useCallback } from 'react';
import { useMetrics } from './useMetrics';
import type { Metric } from '@/types/metrics';

interface SeedDataSummary {
  totalMetrics: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  dateRange: { start: string; end: string };
}

interface SeedData {
  version: string;
  generatedAt: string;
  profile: {
    id: string;
    name: string;
    createdAt: string;
  };
  metrics: Metric[];
  summary: SeedDataSummary;
}

type LoadStep = 'idle' | 'loading' | 'preview' | 'importing' | 'complete' | 'error';

export interface UseSeedDataReturn {
  step: LoadStep;
  summary: SeedDataSummary | null;
  error: string | null;
  importedCount: number;
  loadSeedData: () => Promise<void>;
  confirmImport: () => Promise<void>;
  reset: () => void;
}

export function useSeedData(): UseSeedDataReturn {
  const [step, setStep] = useState<LoadStep>('idle');
  const [seedData, setSeedData] = useState<SeedData | null>(null);
  const [summary, setSummary] = useState<SeedDataSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const { importMetrics, clearMetrics } = useMetrics();

  const loadSeedData = useCallback(async () => {
    setStep('loading');
    setError(null);

    try {
      // Fetch the seed data file
      const response = await fetch('/.dev/seed-data.json');
      if (!response.ok) {
        throw new Error('Seed data file not found. Run: npx tsx scripts/seed-initial-data.ts');
      }

      const data: SeedData = await response.json();

      setSeedData(data);
      setSummary(data.summary);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seed data');
      setStep('error');
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!seedData) {
      setError('No seed data loaded');
      setStep('error');
      return;
    }

    setStep('importing');

    try {
      // Clear existing data first
      await clearMetrics(true);

      // Import all metrics
      await importMetrics(seedData.metrics);

      setImportedCount(seedData.metrics.length);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import seed data');
      setStep('error');
    }
  }, [seedData, importMetrics, clearMetrics]);

  const reset = useCallback(() => {
    setStep('idle');
    setSeedData(null);
    setSummary(null);
    setError(null);
    setImportedCount(0);
  }, []);

  return {
    step,
    summary,
    error,
    importedCount,
    loadSeedData,
    confirmImport,
    reset,
  };
}

export default useSeedData;
