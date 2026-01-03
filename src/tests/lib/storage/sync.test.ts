/**
 * Tests for Sync Status Tracking
 *
 * Tests sync status management in LocalStorageAdapter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter } from '@/lib/storage/local';
import type { Metric, MetricCategory } from '@/types/metrics';

// Helper to create a valid metric input
function createMetricInput(overrides: Partial<Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>> = {}): Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'> {
  return {
    name: 'Test Metric',
    value: 100,
    unit: 'mg/dL',
    category: 'vitamins' as MetricCategory,
    subcategory: 'b-vitamins',
    timestamp: new Date().toISOString(),
    improvement: 'higher is better',
    source: 'manual',
    ...overrides,
  } as Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>;
}

describe('Sync Status Tracking', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(async () => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
    await adapter.initialize();
  });

  describe('getSyncStatus', () => {
    it('should return empty summary with no metrics', async () => {
      const result = await adapter.getSyncStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        local: 0,
        synced: 0,
        pending: 0,
        total: 0,
        lastUpdated: expect.any(String),
      });
    });

    it('should count local metrics correctly', async () => {
      // Add multiple metrics
      await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      await adapter.addMetric(createMetricInput({ name: 'Metric 2' }));
      await adapter.addMetric(createMetricInput({ name: 'Metric 3' }));

      const result = await adapter.getSyncStatus();

      expect(result.success).toBe(true);
      expect(result.data?.local).toBe(3);
      expect(result.data?.synced).toBe(0);
      expect(result.data?.pending).toBe(0);
      expect(result.data?.total).toBe(3);
    });

    it('should count synced metrics after markAsSynced', async () => {
      const metric1 = await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      const metric2 = await adapter.addMetric(createMetricInput({ name: 'Metric 2' }));

      // Mark first metric as synced
      await adapter.markAsSynced([metric1.data!.id]);

      const result = await adapter.getSyncStatus();

      expect(result.success).toBe(true);
      expect(result.data?.local).toBe(1);
      expect(result.data?.synced).toBe(1);
      expect(result.data?.total).toBe(2);
    });

    it('should count pending metrics after update', async () => {
      // Add a metric
      const addResult = await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      const metricId = addResult.data!.id;

      // Mark as synced
      await adapter.markAsSynced([metricId]);

      // Update the metric (should change to pending)
      await adapter.updateMetric(metricId, { value: 200 });

      const result = await adapter.getSyncStatus();

      expect(result.success).toBe(true);
      expect(result.data?.local).toBe(0);
      expect(result.data?.synced).toBe(0);
      expect(result.data?.pending).toBe(1);
      expect(result.data?.total).toBe(1);
    });
  });

  describe('markAsSynced', () => {
    it('should mark metrics as synced', async () => {
      const addResult = await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      const metricId = addResult.data!.id;

      // Verify initial status is local
      const beforeSync = await adapter.getMetricById(metricId);
      expect(beforeSync.data?.syncStatus).toBe('local');

      // Mark as synced
      const syncResult = await adapter.markAsSynced([metricId]);
      expect(syncResult.success).toBe(true);

      // Verify status changed
      const afterSync = await adapter.getMetricById(metricId);
      expect(afterSync.data?.syncStatus).toBe('synced');
    });

    it('should mark multiple metrics as synced', async () => {
      const metric1 = await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      const metric2 = await adapter.addMetric(createMetricInput({ name: 'Metric 2' }));
      const metric3 = await adapter.addMetric(createMetricInput({ name: 'Metric 3' }));

      // Mark first two as synced
      await adapter.markAsSynced([metric1.data!.id, metric2.data!.id]);

      const result = await adapter.getSyncStatus();

      expect(result.data?.synced).toBe(2);
      expect(result.data?.local).toBe(1);
    });

    it('should handle non-existent metric IDs gracefully', async () => {
      const result = await adapter.markAsSynced(['non-existent-id']);

      expect(result.success).toBe(true);
      // No error, just no metrics were updated
    });

    it('should persist sync status to storage', async () => {
      const addResult = await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      const metricId = addResult.data!.id;

      await adapter.markAsSynced([metricId]);

      // Create a new adapter instance to verify persistence
      const newAdapter = new LocalStorageAdapter();
      await newAdapter.initialize();

      const metricResult = await newAdapter.getMetricById(metricId);
      expect(metricResult.data?.syncStatus).toBe('synced');
    });
  });

  describe('syncStatus transitions', () => {
    it('should transition local → synced → pending', async () => {
      // Add metric (local)
      const addResult = await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      const metricId = addResult.data!.id;

      let metric = await adapter.getMetricById(metricId);
      expect(metric.data?.syncStatus).toBe('local');
      expect(metric.data?.syncVersion).toBe(1);

      // Mark as synced
      await adapter.markAsSynced([metricId]);
      metric = await adapter.getMetricById(metricId);
      expect(metric.data?.syncStatus).toBe('synced');

      // Update metric (should become pending)
      await adapter.updateMetric(metricId, { value: 200 });
      metric = await adapter.getMetricById(metricId);
      expect(metric.data?.syncStatus).toBe('pending');
      expect(metric.data?.syncVersion).toBe(2);

      // Mark as synced again
      await adapter.markAsSynced([metricId]);
      metric = await adapter.getMetricById(metricId);
      expect(metric.data?.syncStatus).toBe('synced');
    });

    it('should keep local status on update if not synced', async () => {
      const addResult = await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));
      const metricId = addResult.data!.id;

      // Update without syncing first
      await adapter.updateMetric(metricId, { value: 200 });

      const metric = await adapter.getMetricById(metricId);
      expect(metric.data?.syncStatus).toBe('local');
      expect(metric.data?.syncVersion).toBe(2);
    });
  });

  describe('lastUpdated tracking', () => {
    it('should update lastUpdated on metric changes', async () => {
      const status1 = await adapter.getSyncStatus();
      const lastUpdated1 = status1.data?.lastUpdated;

      // Wait a tiny bit and add a metric
      await new Promise(resolve => setTimeout(resolve, 10));
      await adapter.addMetric(createMetricInput({ name: 'Metric 1' }));

      const status2 = await adapter.getSyncStatus();
      const lastUpdated2 = status2.data?.lastUpdated;

      expect(new Date(lastUpdated2!).getTime()).toBeGreaterThan(new Date(lastUpdated1!).getTime());
    });
  });
});
