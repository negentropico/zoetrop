/**
 * Tests for MetricCard Component
 *
 * Tests the individual metric display with value, status, and ranges.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricCard } from '@/components/metrics/MetricCard';
import {
  optimalMetricWithCalc,
  borderlineMetricWithCalc,
  deficientMetricWithCalc,
  improvingMetricWithCalc,
} from '@/tests/fixtures/dashboard-fixtures';

describe('MetricCard', () => {
  it('should render metric name', () => {
    render(<MetricCard metric={optimalMetricWithCalc} />);
    expect(screen.getByText('HRV (RMSSD)')).toBeInTheDocument();
  });

  it('should render metric value', () => {
    render(<MetricCard metric={optimalMetricWithCalc} />);
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('should render metric unit', () => {
    render(<MetricCard metric={optimalMetricWithCalc} />);
    expect(screen.getByText('ms')).toBeInTheDocument();
  });

  it('should render status badge', () => {
    render(<MetricCard metric={optimalMetricWithCalc} />);
    expect(screen.getByText('Optimal')).toBeInTheDocument();
  });

  it('should render correct status for borderline', () => {
    render(<MetricCard metric={borderlineMetricWithCalc} />);
    expect(screen.getByText('Borderline')).toBeInTheDocument();
  });

  it('should render correct status for deficient', () => {
    render(<MetricCard metric={deficientMetricWithCalc} />);
    expect(screen.getByText('Deficient')).toBeInTheDocument();
  });

  it('should show reference range when showRanges is true', () => {
    render(<MetricCard metric={optimalMetricWithCalc} showRanges />);
    expect(screen.getByText(/Reference:/i)).toBeInTheDocument();
    expect(screen.getByText(/20-100/)).toBeInTheDocument();
  });

  it('should show optimal range when available', () => {
    render(<MetricCard metric={optimalMetricWithCalc} showRanges />);
    expect(screen.getByText(/Optimal:/i)).toBeInTheDocument();
    expect(screen.getByText(/50-100/)).toBeInTheDocument();
  });

  it('should hide ranges when showRanges is false', () => {
    render(<MetricCard metric={optimalMetricWithCalc} showRanges={false} />);
    expect(screen.queryByText(/Reference:/i)).not.toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<MetricCard metric={optimalMetricWithCalc} onClick={onClick} />);

    await userEvent.click(screen.getByTestId('metric-card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render in compact mode', () => {
    render(<MetricCard metric={optimalMetricWithCalc} compact />);
    const card = screen.getByTestId('metric-card');
    expect(card).toHaveClass('p-3');
  });

  it('should show timestamp', () => {
    render(<MetricCard metric={optimalMetricWithCalc} />);
    // Should show some form of date
    expect(screen.getByTestId('metric-timestamp')).toBeInTheDocument();
  });

  it('should have accessible name', () => {
    render(<MetricCard metric={optimalMetricWithCalc} />);
    const card = screen.getByTestId('metric-card');
    expect(card).toHaveAttribute('aria-label');
  });

  it('should render range visualization', () => {
    render(<MetricCard metric={optimalMetricWithCalc} showRanges />);
    expect(screen.getByTestId('range-indicator')).toBeInTheDocument();
  });

  it('should not show trend when showTrend is false', () => {
    render(<MetricCard metric={improvingMetricWithCalc} showTrend={false} />);
    expect(screen.queryByTestId('trend-indicator')).not.toBeInTheDocument();
  });
});
