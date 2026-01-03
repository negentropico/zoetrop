/**
 * Tests for FileUpload Component
 *
 * Tests file selection via click and drag-drop.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '@/components/data/FileUpload';

describe('FileUpload', () => {
  it('should render upload button', () => {
    render(<FileUpload onFileSelect={() => {}} />);
    expect(screen.getByText(/Select File/i)).toBeInTheDocument();
  });

  it('should accept specified file types', () => {
    render(<FileUpload onFileSelect={() => {}} accept=".json" />);
    const input = screen.getByTestId('file-input');
    expect(input).toHaveAttribute('accept', '.json');
  });

  it('should call onFileSelect when file is selected', async () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    const input = screen.getByTestId('file-input');

    await userEvent.upload(input, file);

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('should show error message when provided', () => {
    render(<FileUpload onFileSelect={() => {}} error="Invalid file format" />);
    expect(screen.getByText('Invalid file format')).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<FileUpload onFileSelect={() => {}} disabled />);
    const input = screen.getByTestId('file-input');
    expect(input).toBeDisabled();
  });

  it('should handle drag and drop', async () => {
    const onFileSelect = vi.fn();
    render(<FileUpload onFileSelect={onFileSelect} />);

    const dropzone = screen.getByTestId('file-dropzone');
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'application/json', getAsFile: () => file }],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('should show drag active state', () => {
    render(<FileUpload onFileSelect={() => {}} />);
    const dropzone = screen.getByTestId('file-dropzone');

    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveClass('border-blue-500');
  });
});
