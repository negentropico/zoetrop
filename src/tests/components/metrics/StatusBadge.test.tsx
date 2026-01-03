/**
 * Tests for StatusBadge Component
 *
 * Tests the status indicator badge with color, icon, and text.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/metrics/StatusBadge';
import type { MetricStatus } from '@/types/metrics';

describe('StatusBadge', () => {
  const statuses: MetricStatus[] = ['optimal', 'borderline', 'deficient', 'excess'];

  it.each(statuses)('should render %s status with correct label', (status) => {
    render(<StatusBadge status={status} />);

    const labels: Record<MetricStatus, string> = {
      optimal: 'Optimal',
      borderline: 'Borderline',
      deficient: 'Deficient',
      excess: 'Excess',
    };

    expect(screen.getByText(labels[status])).toBeInTheDocument();
  });

  it('should render with green background for optimal', () => {
    render(<StatusBadge status="optimal" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-green-600');
  });

  it('should render with yellow background for borderline', () => {
    render(<StatusBadge status="borderline" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-yellow-500');
  });

  it('should render with red background for deficient', () => {
    render(<StatusBadge status="deficient" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-red-600');
  });

  it('should render with orange background for excess', () => {
    render(<StatusBadge status="excess" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-orange-700');
  });

  it('should show icon by default', () => {
    render(<StatusBadge status="optimal" />);
    expect(screen.getByTestId('status-icon')).toBeInTheDocument();
  });

  it('should hide icon when showIcon is false', () => {
    render(<StatusBadge status="optimal" showIcon={false} />);
    expect(screen.queryByTestId('status-icon')).not.toBeInTheDocument();
  });

  it('should show label by default', () => {
    render(<StatusBadge status="optimal" />);
    expect(screen.getByText('Optimal')).toBeInTheDocument();
  });

  it('should hide label when showLabel is false', () => {
    render(<StatusBadge status="optimal" showLabel={false} />);
    expect(screen.queryByText('Optimal')).not.toBeInTheDocument();
  });

  it('should have accessible name', () => {
    render(<StatusBadge status="optimal" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAccessibleName(/Status: Optimal/i);
  });

  it('should render small size', () => {
    render(<StatusBadge status="optimal" size="sm" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('text-xs');
  });

  it('should render large size', () => {
    render(<StatusBadge status="optimal" size="lg" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('text-base');
  });
});
