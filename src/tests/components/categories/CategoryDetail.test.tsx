/**
 * Tests for CategoryDetail Component
 *
 * Tests the category detail view with metric cards.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryDetail } from '@/components/categories/CategoryDetail';
import {
  autonomicSummary,
  emptyCategorySummary,
  inflammatorySummary,
} from '@/tests/fixtures/dashboard-fixtures';

describe('CategoryDetail', () => {
  it('should render category title', () => {
    render(<CategoryDetail category={autonomicSummary} />);
    expect(screen.getByText('Autonomic')).toBeInTheDocument();
  });

  it('should render category description', () => {
    render(<CategoryDetail category={autonomicSummary} />);
    expect(screen.getByText(/HRV, recovery, sleep/i)).toBeInTheDocument();
  });

  it('should render metric count', () => {
    render(<CategoryDetail category={autonomicSummary} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/metrics/i)).toBeInTheDocument();
  });

  it('should render all metrics', () => {
    render(<CategoryDetail category={autonomicSummary} />);
    expect(screen.getByText('HRV (RMSSD)')).toBeInTheDocument();
    expect(screen.getByText('Recovery Score')).toBeInTheDocument();
    expect(screen.getByText('Resting Heart Rate')).toBeInTheDocument();
  });

  it('should show empty state when no metrics', () => {
    render(<CategoryDetail category={emptyCategorySummary} />);
    expect(screen.getByText(/No metrics recorded/i)).toBeInTheDocument();
  });

  it('should show overall status badge', () => {
    render(<CategoryDetail category={autonomicSummary} />);
    // Multiple status badges exist (category + metrics), check at least one exists
    const statusBadges = screen.getAllByRole('status', { name: /Status: Optimal/i });
    expect(statusBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('should show borderline status', () => {
    render(<CategoryDetail category={inflammatorySummary} />);
    // Multiple status badges exist (category + metrics), check at least one exists
    const statusBadges = screen.getAllByRole('status', { name: /Status: Borderline/i });
    expect(statusBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('should render back link when provided', () => {
    render(<CategoryDetail category={autonomicSummary} backLink="/" backLabel="Dashboard" />);
    const backLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('should show last updated date', () => {
    render(<CategoryDetail category={autonomicSummary} />);
    expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
  });

  it('should render category icon', () => {
    render(<CategoryDetail category={autonomicSummary} />);
    // Check for the icon container
    const iconContainer = screen.getByTestId('category-icon');
    expect(iconContainer).toBeInTheDocument();
  });
});
