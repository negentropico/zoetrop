/**
 * Tests for CategoryCard Component
 *
 * Tests the category card display in the dashboard grid.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { autonomicSummary, emptyCategorySummary, inflammatorySummary } from '@/tests/fixtures/dashboard-fixtures';

describe('CategoryCard', () => {
  it('should render category name', () => {
    render(<CategoryCard summary={autonomicSummary} />);
    expect(screen.getByText('Autonomic')).toBeInTheDocument();
  });

  it('should render category description', () => {
    render(<CategoryCard summary={autonomicSummary} />);
    expect(screen.getByText(/HRV, recovery, sleep/i)).toBeInTheDocument();
  });

  it('should render metric count', () => {
    render(<CategoryCard summary={autonomicSummary} />);
    expect(screen.getByText(/3 metrics/i)).toBeInTheDocument();
  });

  it('should render status indicator for optimal', () => {
    render(<CategoryCard summary={autonomicSummary} />);
    const card = screen.getByTestId('category-card');
    expect(card).toHaveAttribute('data-status', 'optimal');
  });

  it('should render status indicator for borderline', () => {
    render(<CategoryCard summary={inflammatorySummary} />);
    const card = screen.getByTestId('category-card');
    expect(card).toHaveAttribute('data-status', 'borderline');
  });

  it('should render empty state for categories with no metrics', () => {
    render(<CategoryCard summary={emptyCategorySummary} />);
    expect(screen.getByText(/No data/i)).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<CategoryCard summary={autonomicSummary} onClick={onClick} />);

    await userEvent.click(screen.getByTestId('category-card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be keyboard navigable with Enter', async () => {
    const onClick = vi.fn();
    render(<CategoryCard summary={autonomicSummary} onClick={onClick} />);

    const card = screen.getByTestId('category-card');
    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should be keyboard navigable with Space', async () => {
    const onClick = vi.fn();
    render(<CategoryCard summary={autonomicSummary} onClick={onClick} />);

    const card = screen.getByTestId('category-card');
    card.focus();
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should have proper ARIA role', () => {
    render(<CategoryCard summary={autonomicSummary} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show selected state when selected', () => {
    render(<CategoryCard summary={autonomicSummary} selected />);
    const card = screen.getByTestId('category-card');
    expect(card).toHaveAttribute('aria-selected', 'true');
  });

  it('should display category icon', () => {
    render(<CategoryCard summary={autonomicSummary} />);
    // Icon should be present (heart-pulse for autonomic)
    expect(screen.getByTestId('category-icon')).toBeInTheDocument();
  });
});
