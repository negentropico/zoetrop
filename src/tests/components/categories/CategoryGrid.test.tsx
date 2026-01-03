/**
 * Tests for CategoryGrid Component
 *
 * Tests the responsive grid of category cards.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryGrid } from '@/components/categories/CategoryGrid';
import { allCategorySummaries, emptyCategorySummary } from '@/tests/fixtures/dashboard-fixtures';

describe('CategoryGrid', () => {
  it('should render all 9 category cards', () => {
    render(<CategoryGrid categories={allCategorySummaries} />);

    expect(screen.getAllByTestId('category-card')).toHaveLength(9);
  });

  it('should render each category by name', () => {
    render(<CategoryGrid categories={allCategorySummaries} />);

    expect(screen.getByText('Vitamins')).toBeInTheDocument();
    expect(screen.getByText('Minerals')).toBeInTheDocument();
    expect(screen.getByText('Inflammatory')).toBeInTheDocument();
    expect(screen.getByText('Metabolic')).toBeInTheDocument();
    expect(screen.getByText('Hormones')).toBeInTheDocument();
    expect(screen.getByText('Autonomic')).toBeInTheDocument();
    expect(screen.getByText('Body Composition')).toBeInTheDocument();
    expect(screen.getByText('Lipids')).toBeInTheDocument();
    expect(screen.getByText('Hematology')).toBeInTheDocument();
  });

  it('should call onCategoryClick with category when card clicked', async () => {
    const onCategoryClick = vi.fn();
    render(
      <CategoryGrid categories={allCategorySummaries} onCategoryClick={onCategoryClick} />
    );

    await userEvent.click(screen.getByText('Autonomic'));
    expect(onCategoryClick).toHaveBeenCalledWith('autonomic');
  });

  it('should show loading state', () => {
    render(<CategoryGrid categories={[]} loading />);

    expect(screen.getByTestId('category-grid-loading')).toBeInTheDocument();
  });

  it('should have responsive grid classes', () => {
    render(<CategoryGrid categories={allCategorySummaries} />);

    const grid = screen.getByTestId('category-grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).toHaveClass('lg:grid-cols-3');
  });

  it('should handle empty categories array', () => {
    const emptySummaries = Array(9).fill(emptyCategorySummary).map((s, i) => ({
      ...s,
      category: allCategorySummaries[i].category,
      info: allCategorySummaries[i].info,
    }));

    render(<CategoryGrid categories={emptySummaries} />);

    // All cards should show "No data"
    const noDataElements = screen.getAllByText(/No data/i);
    expect(noDataElements.length).toBeGreaterThan(0);
  });
});
