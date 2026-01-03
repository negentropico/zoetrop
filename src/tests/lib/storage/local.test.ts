/**
 * LocalStorage Adapter Tests
 *
 * Tests for the LocalStorageAdapter implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter, STORAGE_KEY } from '@/lib/storage/local';
import { createMockMetric, createFullMockMetric } from './adapter.test';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  describe('initialize', () => {
    it('should initialize successfully with empty storage', async () => {
      const result = await adapter.initialize();
      expect(result.success).toBe(true);
    });

    it('should load existing metrics from storage', async () => {
      const existingData = {
        metrics: [createFullMockMetric()],
        lastUpdated: new Date().toISOString(),
        syncVersion: 1,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

      await adapter.initialize();
      const result = await adapter.getMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
    });

    it('should handle corrupted storage gracefully', async () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');
      const result = await adapter.initialize();

      // Should recover with empty state
      expect(result.success).toBe(true);
    });
  });

  describe('addMetric', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should add a metric with generated ID', async () => {
      const result = await adapter.addMetric(createMockMetric());

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.syncStatus).toBe('local');
      expect(result.data?.syncVersion).toBe(1);
    });

    it('should persist metric to localStorage', async () => {
      await adapter.addMetric(createMockMetric());

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.metrics.length).toBe(1);
    });

    it('should add multiple metrics', async () => {
      await adapter.addMetric(createMockMetric({ name: 'Vitamin D' }));
      await adapter.addMetric(createMockMetric({ name: 'Iron', category: 'minerals', subcategory: 'essential' }));

      const result = await adapter.getMetrics();
      expect(result.data?.length).toBe(2);
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      await adapter.initialize();
      await adapter.addMetric(createMockMetric({ name: 'Vitamin D', category: 'vitamins', subcategory: 'fat-soluble' }));
      await adapter.addMetric(createMockMetric({ name: 'Iron', category: 'minerals', subcategory: 'essential' }));
      await adapter.addMetric(createMockMetric({ name: 'B12', category: 'vitamins', subcategory: 'b-vitamins' }));
    });

    it('should return all metrics when no query provided', async () => {
      const result = await adapter.getMetrics();
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
    });

    it('should filter by category', async () => {
      const result = await adapter.getMetrics({ category: 'vitamins' });
      expect(result.data?.length).toBe(2);
      expect(result.data?.every(m => m.category === 'vitamins')).toBe(true);
    });

    it('should filter by name', async () => {
      const result = await adapter.getMetrics({ name: 'Iron' });
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].name).toBe('Iron');
    });
  });

  describe('getMetricById', () => {
    let metricId: string;

    beforeEach(async () => {
      await adapter.initialize();
      const result = await adapter.addMetric(createMockMetric());
      metricId = result.data!.id;
    });

    it('should return metric by ID', async () => {
      const result = await adapter.getMetricById(metricId);
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(metricId);
    });

    it('should return null for non-existent ID', async () => {
      const result = await adapter.getMetricById('non-existent-id');
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('updateMetric', () => {
    let metricId: string;

    beforeEach(async () => {
      await adapter.initialize();
      const result = await adapter.addMetric(createMockMetric({ value: 45 }));
      metricId = result.data!.id;
    });

    it('should update metric value', async () => {
      const result = await adapter.updateMetric(metricId, { value: 55 });

      expect(result.success).toBe(true);
      expect(result.data?.value).toBe(55);
    });

    it('should increment syncVersion on update', async () => {
      const result = await adapter.updateMetric(metricId, { value: 55 });
      expect(result.data?.syncVersion).toBe(2);
    });

    it('should return error for non-existent ID', async () => {
      const result = await adapter.updateMetric('non-existent', { value: 55 });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('deleteMetric', () => {
    let metricId: string;

    beforeEach(async () => {
      await adapter.initialize();
      const result = await adapter.addMetric(createMockMetric());
      metricId = result.data!.id;
    });

    it('should delete metric by ID', async () => {
      const deleteResult = await adapter.deleteMetric(metricId);
      expect(deleteResult.success).toBe(true);

      const getResult = await adapter.getMetricById(metricId);
      expect(getResult.data).toBeNull();
    });

    it('should return error for non-existent ID', async () => {
      const result = await adapter.deleteMetric('non-existent');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('getMetricHistory', () => {
    beforeEach(async () => {
      await adapter.initialize();
      // Add multiple readings of the same metric
      await adapter.addMetric(createMockMetric({ name: 'Vitamin D', value: 40, timestamp: '2024-01-01T00:00:00Z' }));
      await adapter.addMetric(createMockMetric({ name: 'Vitamin D', value: 45, timestamp: '2024-02-01T00:00:00Z' }));
      await adapter.addMetric(createMockMetric({ name: 'Vitamin D', value: 50, timestamp: '2024-03-01T00:00:00Z' }));
      await adapter.addMetric(createMockMetric({ name: 'Iron', value: 100, category: 'minerals', subcategory: 'essential' }));
    });

    it('should return all readings for a metric name', async () => {
      const result = await adapter.getMetricHistory('Vitamin D');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(3);
    });

    it('should sort by timestamp ascending', async () => {
      const result = await adapter.getMetricHistory('Vitamin D');
      const values = result.data?.map(m => m.value);
      expect(values).toEqual([40, 45, 50]);
    });
  });

  describe('exportMetrics', () => {
    beforeEach(async () => {
      await adapter.initialize();
      await adapter.addMetric(createMockMetric());
    });

    it('should export metrics as JSON string', async () => {
      const result = await adapter.exportMetrics();
      expect(result.success).toBe(true);
      expect(typeof result.data).toBe('string');

      const parsed = JSON.parse(result.data!);
      expect(parsed.metrics).toBeDefined();
      expect(Array.isArray(parsed.metrics)).toBe(true);
    });
  });

  describe('importMetrics', () => {
    beforeEach(async () => {
      await adapter.initialize();
    });

    it('should import valid metrics', async () => {
      const metricsToImport = [
        createFullMockMetric({ name: 'Imported 1' }),
        createFullMockMetric({ name: 'Imported 2' }),
      ];

      const result = await adapter.importMetrics(metricsToImport);
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);

      const allMetrics = await adapter.getMetrics();
      expect(allMetrics.data?.length).toBe(2);
    });
  });

  describe('clearMetrics', () => {
    beforeEach(async () => {
      await adapter.initialize();
      await adapter.addMetric(createMockMetric());
    });

    it('should require confirmation flag', async () => {
      const result = await adapter.clearMetrics(false);
      expect(result.success).toBe(false);

      const metrics = await adapter.getMetrics();
      expect(metrics.data?.length).toBe(1);
    });

    it('should clear all metrics when confirmed', async () => {
      const result = await adapter.clearMetrics(true);
      expect(result.success).toBe(true);

      const metrics = await adapter.getMetrics();
      expect(metrics.data?.length).toBe(0);
    });
  });
});
