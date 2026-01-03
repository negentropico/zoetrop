/**
 * Tests for TrendIndicator Component
 *
 * Tests the trend direction and color based on improvement type.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendIndicator } from '@/components/metrics/TrendIndicator';

describe('TrendIndicator', () => {
  describe('higher is better metrics', () => {
    it('should show green up arrow for improving (increasing value)', () => {
      render(
        <TrendIndicator
          trend="improving"
          percentChange={15}
          improvement="higher is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator).toHaveClass('text-green-600');
      expect(screen.getByText('15.0%')).toBeInTheDocument();
    });

    it('should show red down arrow for declining (decreasing value)', () => {
      render(
        <TrendIndicator
          trend="declining"
          percentChange={-10}
          improvement="higher is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator).toHaveClass('text-red-600');
    });
  });

  describe('lower is better metrics', () => {
    it('should show green down arrow for improving (decreasing value)', () => {
      render(
        <TrendIndicator
          trend="improving"
          percentChange={-10}
          improvement="lower is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator).toHaveClass('text-green-600');
    });

    it('should show red up arrow for declining (increasing value)', () => {
      render(
        <TrendIndicator
          trend="declining"
          percentChange={20}
          improvement="lower is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator).toHaveClass('text-red-600');
    });
  });

  describe('stable trends', () => {
    it('should show gray indicator for stable', () => {
      render(
        <TrendIndicator
          trend="stable"
          percentChange={0}
          improvement="higher is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator).toHaveClass('text-gray-500');
    });
  });

  describe('percentage display', () => {
    it('should show percentage by default', () => {
      render(
        <TrendIndicator
          trend="improving"
          percentChange={15.5}
          improvement="higher is better"
        />
      );

      expect(screen.getByText('15.5%')).toBeInTheDocument();
    });

    it('should hide percentage when showPercentage is false', () => {
      render(
        <TrendIndicator
          trend="improving"
          percentChange={15}
          improvement="higher is better"
          showPercentage={false}
        />
      );

      expect(screen.queryByText('15.0%')).not.toBeInTheDocument();
    });

    it('should format percentage to one decimal', () => {
      render(
        <TrendIndicator
          trend="improving"
          percentChange={15.567}
          improvement="higher is better"
        />
      );

      expect(screen.getByText('15.6%')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have ARIA label for improving trend', () => {
      render(
        <TrendIndicator
          trend="improving"
          percentChange={15}
          improvement="higher is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator).toHaveAttribute('aria-label');
      expect(indicator.getAttribute('aria-label')).toMatch(/improving by 15/i);
    });

    it('should have ARIA label for declining trend', () => {
      render(
        <TrendIndicator
          trend="declining"
          percentChange={-10}
          improvement="higher is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator.getAttribute('aria-label')).toMatch(/declining by 10/i);
    });

    it('should have ARIA label for stable trend', () => {
      render(
        <TrendIndicator
          trend="stable"
          percentChange={0}
          improvement="higher is better"
        />
      );

      const indicator = screen.getByTestId('trend-indicator');
      expect(indicator.getAttribute('aria-label')).toMatch(/stable/i);
    });
  });
});
