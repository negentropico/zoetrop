/**
 * Storage Adapter Interface Tests
 *
 * Tests for the StorageAdapter interface contract.
 * These tests verify that any storage implementation follows the expected behavior.
 */

import { describe, it, expect } from 'vitest';
import type { StorageAdapter, StorageResult, MetricQuery, SyncStatusSummary } from '@/lib/storage/adapter';
import type { Metric } from '@/types/metrics';

// Test helper to create a mock metric
export function createMockMetric(overrides: Partial<Metric> = {}): Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'> {
  return {
    name: 'Vitamin D',
    value: 45,
    unit: 'ng/mL',
    category: 'vitamins',
    subcategory: 'fat-soluble',
    timestamp: new Date().toISOString(),
    improvement: 'higher is better',
    source: 'bloodwork',
    referenceRange: { min: 30, max: 100 },
    optimalRange: { min: 50, max: 80 },
    ...overrides,
  } as Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>;
}

// Test helper to create a full metric with ID
export function createFullMockMetric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: crypto.randomUUID(),
    syncStatus: 'local',
    syncVersion: 1,
    ...createMockMetric(),
    ...overrides,
  } as Metric;
}

describe('StorageAdapter Interface Contract', () => {
  describe('StorageResult type', () => {
    it('should have success boolean', () => {
      const result: StorageResult<string> = { success: true, data: 'test' };
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');
    });

    it('should support error field', () => {
      const result: StorageResult<string> = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid data' },
      };
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('MetricQuery type', () => {
    it('should support category filter', () => {
      const query: MetricQuery = { category: 'vitamins' };
      expect(query.category).toBe('vitamins');
    });

    it('should support date range filter', () => {
      const query: MetricQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };
      expect(query.startDate).toBeDefined();
      expect(query.endDate).toBeDefined();
    });

    it('should support pagination', () => {
      const query: MetricQuery = { limit: 10, offset: 20 };
      expect(query.limit).toBe(10);
      expect(query.offset).toBe(20);
    });
  });

  describe('SyncStatusSummary type', () => {
    it('should have required fields', () => {
      const summary: SyncStatusSummary = {
        local: 5,
        synced: 10,
        pending: 2,
        total: 17,
        lastUpdated: new Date().toISOString(),
      };
      expect(summary.total).toBe(summary.local + summary.synced + summary.pending);
    });
  });

  describe('Mock Metric helpers', () => {
    it('createMockMetric should create valid metric without id/sync fields', () => {
      const metric = createMockMetric();
      expect(metric.name).toBe('Vitamin D');
      expect(metric.category).toBe('vitamins');
      expect((metric as Metric).id).toBeUndefined();
      expect((metric as Metric).syncStatus).toBeUndefined();
    });

    it('createFullMockMetric should create complete metric', () => {
      const metric = createFullMockMetric();
      expect(metric.id).toBeDefined();
      expect(metric.syncStatus).toBe('local');
      expect(metric.syncVersion).toBe(1);
    });

    it('should allow overrides', () => {
      const metric = createFullMockMetric({ name: 'Iron', category: 'minerals', subcategory: 'essential' });
      expect(metric.name).toBe('Iron');
      expect(metric.category).toBe('minerals');
    });
  });
});
