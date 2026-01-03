/**
 * Tests for ImportPreviewPanel Component
 *
 * Tests the preview display before confirming import.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportPreviewPanel } from '@/components/data/ImportPreviewPanel';
import { validImportPreview, importPreviewWithWarnings, importPreviewWithErrors } from '@/tests/fixtures/dashboard-fixtures';

describe('ImportPreviewPanel', () => {
  it('should render preview title', () => {
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Import Preview')).toBeInTheDocument();
  });

  it('should show filename', () => {
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText(validImportPreview.filename)).toBeInTheDocument();
  });

  it('should show data period', () => {
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText(/2025-12-01/)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-03/)).toBeInTheDocument();
  });

  it('should list all metrics to import', () => {
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('HRV (RMSSD)')).toBeInTheDocument();
    expect(screen.getByText('Recovery Score')).toBeInTheDocument();
    expect(screen.getByText('Resting Heart Rate')).toBeInTheDocument();
  });

  it('should show metric values', () => {
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/45/)).toBeInTheDocument(); // HRV value
    expect(screen.getByText(/72/)).toBeInTheDocument(); // Recovery value
  });

  it('should call onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Confirm/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('should show warnings when present', () => {
    render(
      <ImportPreviewPanel
        preview={importPreviewWithWarnings}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/Some optional fields were missing/)).toBeInTheDocument();
  });

  it('should show errors when present', () => {
    render(
      <ImportPreviewPanel
        preview={importPreviewWithErrors}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText(/Missing required field/)).toBeInTheDocument();
  });

  it('should disable confirm when there are errors', () => {
    render(
      <ImportPreviewPanel
        preview={importPreviewWithErrors}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /Confirm/i })).toBeDisabled();
  });

  it('should show loading state when isImporting', () => {
    render(
      <ImportPreviewPanel
        preview={validImportPreview}
        onConfirm={() => {}}
        onCancel={() => {}}
        isImporting
      />
    );

    expect(screen.getByText(/Importing/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importing/i })).toBeDisabled();
  });
});
