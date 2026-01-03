/**
 * Tests for WhoopImport Component
 *
 * Tests the import flow orchestration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WhoopImport } from '@/components/data/WhoopImport';
import { clearLocalStorage } from '@/tests/fixtures/dashboard-fixtures';

// Mock the storage adapter
vi.mock('@/lib/storage/local', () => ({
  LocalStorageAdapter: class MockLocalStorageAdapter {
    async initialize() {
      return { success: true };
    }
    async getMetrics() {
      const stored = localStorage.getItem('wellness-metrics');
      if (stored) {
        const data = JSON.parse(stored);
        return { success: true, data: data.metrics };
      }
      return { success: true, data: [] };
    }
    async addMetric() {
      return { success: true };
    }
    async updateMetric() {
      return { success: true };
    }
    async deleteMetric() {
      return { success: true };
    }
    async exportMetrics() {
      return { success: true, data: '[]' };
    }
    async importMetrics(metrics: any[]) {
      return { success: true, data: metrics };
    }
    async clearMetrics() {
      return { success: true };
    }
    async getSyncStatus() {
      return { success: true, data: { local: 0, synced: 0, pending: 0 } };
    }
  },
}));

describe('WhoopImport', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  afterEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
  });

  it('should render initial upload state', () => {
    render(<WhoopImport />);
    expect(screen.getByText('Import WHOOP Data')).toBeInTheDocument();
    expect(screen.getByText(/Select File/i)).toBeInTheDocument();
  });

  it('should show file upload component', () => {
    render(<WhoopImport />);
    expect(screen.getByTestId('file-dropzone')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  it('should accept .json and .csv files', () => {
    render(<WhoopImport />);
    const input = screen.getByTestId('file-input');
    expect(input).toHaveAttribute('accept', '.json,.csv');
  });

  it('should show back button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<WhoopImport onCancel={onCancel} />);
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('should call onCancel when back button clicked', async () => {
    const onCancel = vi.fn();
    render(<WhoopImport onCancel={onCancel} />);

    const backButton = screen.getByText('Back to Dashboard');
    fireEvent.click(backButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('should show description text', () => {
    render(<WhoopImport />);
    expect(screen.getByText(/Import your WHOOP health metrics/i)).toBeInTheDocument();
  });

  it('should show supported formats', () => {
    render(<WhoopImport />);
    expect(screen.getByText(/CSV/)).toBeInTheDocument();
    expect(screen.getByText(/JSON/)).toBeInTheDocument();
  });
});
