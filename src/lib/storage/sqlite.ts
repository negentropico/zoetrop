/**
 * SQLite Storage Adapter
 *
 * Implements StorageAdapter using better-sqlite3 for local persistence.
 * Data persists beyond browser sessions in a local .db file.
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { Metric, MetricCategory, SyncStatus, MetricRange } from '@/types/metrics';
import type {
  StorageAdapter,
  StorageResult,
  StorageError,
  MetricQuery,
  SyncStatusSummary,
} from './adapter';
import { validateMetric } from './validation';

const DEFAULT_DB_PATH = 'data/wellness.db';

/**
 * Row type for SQLite metrics table
 */
interface MetricRow {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  description: string | null;
  improvement: string;
  category: string;
  subcategory: string | null;
  reference_min: number | null;
  reference_max: number | null;
  optimal_min: number | null;
  optimal_max: number | null;
  source: string;
  sync_status: string;
  sync_version: number;
}

/**
 * SQLite implementation of StorageAdapter
 */
export class SQLiteAdapter implements StorageAdapter {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize database and create tables if needed
   */
  async initialize(): Promise<StorageResult<void>> {
    try {
      // Ensure data directory exists
      const path = await import('path');
      const fs = await import('fs');
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.dbPath);

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Create metrics table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS metrics (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          description TEXT,
          improvement TEXT NOT NULL,
          category TEXT NOT NULL,
          subcategory TEXT,
          reference_min REAL,
          reference_max REAL,
          optimal_min REAL,
          optimal_max REAL,
          source TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'local',
          sync_version INTEGER NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics(category);
        CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_metrics_sync_status ON metrics(sync_status);
      `);

      // Create metadata table for sync info
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Initialize last_updated if not exists
      const stmt = this.db.prepare('INSERT OR IGNORE INTO metadata (key, value) VALUES (?, ?)');
      stmt.run('last_updated', new Date().toISOString());
      stmt.run('sync_version', '0');

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to initialize SQLite database', error);
    }
  }

  /**
   * Get metrics with optional filtering
   */
  async getMetrics(query?: MetricQuery): Promise<StorageResult<Metric[]>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      let sql = 'SELECT * FROM metrics WHERE 1=1';
      const params: unknown[] = [];

      if (query?.category) {
        sql += ' AND category = ?';
        params.push(query.category);
      }
      if (query?.name) {
        sql += ' AND name = ?';
        params.push(query.name);
      }
      if (query?.syncStatus) {
        sql += ' AND sync_status = ?';
        params.push(query.syncStatus);
      }
      if (query?.startDate) {
        sql += ' AND timestamp >= ?';
        params.push(query.startDate.toISOString());
      }
      if (query?.endDate) {
        sql += ' AND timestamp <= ?';
        params.push(query.endDate.toISOString());
      }

      sql += ' ORDER BY timestamp DESC';

      if (query?.limit) {
        sql += ' LIMIT ?';
        params.push(query.limit);
      }
      if (query?.offset) {
        sql += ' OFFSET ?';
        params.push(query.offset);
      }

      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...params) as MetricRow[];
      const metrics = rows.map(this.rowToMetric);

      return { success: true, data: metrics };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get metrics', error);
    }
  }

  /**
   * Get a single metric by ID
   */
  async getMetricById(id: string): Promise<StorageResult<Metric | null>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      const stmt = this.db.prepare('SELECT * FROM metrics WHERE id = ?');
      const row = stmt.get(id) as MetricRow | undefined;

      return { success: true, data: row ? this.rowToMetric(row) : null };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get metric', error);
    }
  }

  /**
   * Get historical readings for a metric by name
   */
  async getMetricHistory(name: string): Promise<StorageResult<Metric[]>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      const stmt = this.db.prepare(
        'SELECT * FROM metrics WHERE name = ? ORDER BY timestamp ASC'
      );
      const rows = stmt.all(name) as MetricRow[];
      const metrics = rows.map(this.rowToMetric);

      return { success: true, data: metrics };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get metric history', error);
    }
  }

  /**
   * Add a new metric
   */
  async addMetric(
    metric: Omit<Metric, 'id' | 'syncStatus' | 'syncVersion'>
  ): Promise<StorageResult<Metric>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      const validation = validateMetric(metric);
      if (!validation.valid) {
        return this.createErrorResult('VALIDATION_ERROR', validation.errors.join(', '));
      }

      const newMetric: Metric = {
        ...metric,
        id: uuidv4(),
        syncStatus: 'local',
        syncVersion: 1,
      } as Metric;

      const stmt = this.db.prepare(`
        INSERT INTO metrics (
          id, name, value, unit, timestamp, description, improvement,
          category, subcategory, reference_min, reference_max,
          optimal_min, optimal_max, source, sync_status, sync_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        newMetric.id,
        newMetric.name,
        newMetric.value,
        newMetric.unit,
        newMetric.timestamp,
        newMetric.description || null,
        newMetric.improvement,
        newMetric.category,
        (newMetric as { subcategory?: string }).subcategory || null,
        newMetric.referenceRange?.min ?? null,
        newMetric.referenceRange?.max ?? null,
        newMetric.optimalRange?.min ?? null,
        newMetric.optimalRange?.max ?? null,
        newMetric.source,
        newMetric.syncStatus,
        newMetric.syncVersion
      );

      await this.updateLastUpdated();

      return { success: true, data: newMetric };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to add metric', error);
    }
  }

  /**
   * Update an existing metric
   */
  async updateMetric(id: string, updates: Partial<Metric>): Promise<StorageResult<Metric>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      // Get existing metric
      const existingResult = await this.getMetricById(id);
      if (!existingResult.success || !existingResult.data) {
        return this.createErrorResult('NOT_FOUND', `Metric with id ${id} not found`);
      }

      const existing = existingResult.data;
      const updatedMetric: Metric = {
        ...existing,
        ...updates,
        id: existing.id,
        syncStatus: existing.syncStatus === 'synced' ? 'pending' : 'local',
        syncVersion: existing.syncVersion + 1,
      } as Metric;

      const stmt = this.db.prepare(`
        UPDATE metrics SET
          name = ?, value = ?, unit = ?, timestamp = ?, description = ?,
          improvement = ?, category = ?, subcategory = ?,
          reference_min = ?, reference_max = ?, optimal_min = ?, optimal_max = ?,
          source = ?, sync_status = ?, sync_version = ?
        WHERE id = ?
      `);

      stmt.run(
        updatedMetric.name,
        updatedMetric.value,
        updatedMetric.unit,
        updatedMetric.timestamp,
        updatedMetric.description || null,
        updatedMetric.improvement,
        updatedMetric.category,
        (updatedMetric as { subcategory?: string }).subcategory || null,
        updatedMetric.referenceRange?.min ?? null,
        updatedMetric.referenceRange?.max ?? null,
        updatedMetric.optimalRange?.min ?? null,
        updatedMetric.optimalRange?.max ?? null,
        updatedMetric.source,
        updatedMetric.syncStatus,
        updatedMetric.syncVersion,
        id
      );

      await this.updateLastUpdated();

      return { success: true, data: updatedMetric };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to update metric', error);
    }
  }

  /**
   * Delete a metric by ID
   */
  async deleteMetric(id: string): Promise<StorageResult<void>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      const stmt = this.db.prepare('DELETE FROM metrics WHERE id = ?');
      const result = stmt.run(id);

      if (result.changes === 0) {
        return this.createErrorResult('NOT_FOUND', `Metric with id ${id} not found`);
      }

      await this.updateLastUpdated();

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to delete metric', error);
    }
  }

  /**
   * Import multiple metrics (atomic transaction)
   */
  async importMetrics(metrics: Metric[]): Promise<StorageResult<Metric[]>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      // Validate all before importing
      for (const metric of metrics) {
        const validation = validateMetric(metric);
        if (!validation.valid) {
          return this.createErrorResult(
            'VALIDATION_ERROR',
            `Invalid metric "${metric.name}": ${validation.errors.join(', ')}`
          );
        }
      }

      const importedMetrics: Metric[] = [];

      // Use transaction for atomic import
      const insertMany = this.db.transaction((items: Metric[]) => {
        const stmt = this.db!.prepare(`
          INSERT INTO metrics (
            id, name, value, unit, timestamp, description, improvement,
            category, subcategory, reference_min, reference_max,
            optimal_min, optimal_max, source, sync_status, sync_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const metric of items) {
          const m: Metric = {
            ...metric,
            id: metric.id || uuidv4(),
            syncStatus: 'local',
            syncVersion: metric.syncVersion || 1,
          } as Metric;

          stmt.run(
            m.id,
            m.name,
            m.value,
            m.unit,
            m.timestamp,
            m.description || null,
            m.improvement,
            m.category,
            (m as { subcategory?: string }).subcategory || null,
            m.referenceRange?.min ?? null,
            m.referenceRange?.max ?? null,
            m.optimalRange?.min ?? null,
            m.optimalRange?.max ?? null,
            m.source,
            m.syncStatus,
            m.syncVersion
          );

          importedMetrics.push(m);
        }
      });

      insertMany(metrics);
      await this.updateLastUpdated();

      return { success: true, data: importedMetrics };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to import metrics', error);
    }
  }

  /**
   * Export all metrics as JSON
   */
  async exportMetrics(): Promise<StorageResult<string>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      const metricsResult = await this.getMetrics();
      if (!metricsResult.success) {
        return this.createErrorResult('UNKNOWN', 'Failed to get metrics for export');
      }

      const lastUpdated = this.getMetadataValue('last_updated');
      const syncVersion = this.getMetadataValue('sync_version');

      const exportData = {
        metrics: metricsResult.data,
        lastUpdated,
        syncVersion: parseInt(syncVersion || '0', 10),
        exportedAt: new Date().toISOString(),
      };

      return { success: true, data: JSON.stringify(exportData, null, 2) };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to export metrics', error);
    }
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(confirm: boolean): Promise<StorageResult<void>> {
    if (!confirm) {
      return this.createErrorResult('VALIDATION_ERROR', 'Confirmation required to clear metrics');
    }

    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      this.db.exec('DELETE FROM metrics');
      await this.updateLastUpdated();

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to clear metrics', error);
    }
  }

  /**
   * Get sync status summary
   */
  async getSyncStatus(): Promise<StorageResult<SyncStatusSummary>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      const stmt = this.db.prepare(`
        SELECT
          sync_status,
          COUNT(*) as count
        FROM metrics
        GROUP BY sync_status
      `);
      const rows = stmt.all() as { sync_status: string; count: number }[];

      const counts = { local: 0, synced: 0, pending: 0 };
      for (const row of rows) {
        if (row.sync_status in counts) {
          counts[row.sync_status as keyof typeof counts] = row.count;
        }
      }

      const lastUpdated = this.getMetadataValue('last_updated') || new Date().toISOString();

      return {
        success: true,
        data: {
          local: counts.local,
          synced: counts.synced,
          pending: counts.pending,
          total: counts.local + counts.synced + counts.pending,
          lastUpdated,
        },
      };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to get sync status', error);
    }
  }

  /**
   * Mark metrics as synced
   */
  async markAsSynced(ids: string[]): Promise<StorageResult<void>> {
    try {
      if (!this.db) {
        return this.createErrorResult('UNKNOWN', 'Database not initialized');
      }

      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(
        `UPDATE metrics SET sync_status = 'synced' WHERE id IN (${placeholders})`
      );
      stmt.run(...ids);

      await this.updateLastUpdated();

      return { success: true };
    } catch (error) {
      return this.createErrorResult('UNKNOWN', 'Failed to mark metrics as synced', error);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get database file path
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Get count of metrics
   */
  async getCount(): Promise<number> {
    if (!this.db) return 0;
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM metrics');
    const row = stmt.get() as { count: number };
    return row.count;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private rowToMetric(row: MetricRow): Metric {
    const referenceRange: MetricRange | undefined =
      row.reference_min !== null && row.reference_max !== null
        ? { min: row.reference_min, max: row.reference_max }
        : undefined;

    const optimalRange: MetricRange | undefined =
      row.optimal_min !== null && row.optimal_max !== null
        ? { min: row.optimal_min, max: row.optimal_max }
        : undefined;

    return {
      id: row.id,
      name: row.name,
      value: row.value,
      unit: row.unit,
      timestamp: row.timestamp,
      description: row.description || undefined,
      improvement: row.improvement as Metric['improvement'],
      category: row.category as MetricCategory,
      subcategory: row.subcategory || undefined,
      referenceRange,
      optimalRange,
      source: row.source as Metric['source'],
      syncStatus: row.sync_status as SyncStatus,
      syncVersion: row.sync_version,
    } as Metric;
  }

  private async updateLastUpdated(): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
    );
    stmt.run('last_updated', new Date().toISOString());

    // Increment sync version
    const currentVersion = parseInt(this.getMetadataValue('sync_version') || '0', 10);
    stmt.run('sync_version', String(currentVersion + 1));
  }

  private getMetadataValue(key: string): string | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT value FROM metadata WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  private createErrorResult<T>(
    code: StorageError['code'],
    message: string,
    details?: unknown
  ): StorageResult<T> {
    return {
      success: false,
      error: { code, message, details },
    };
  }
}
