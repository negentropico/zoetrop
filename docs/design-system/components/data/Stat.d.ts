import * as React from 'react';

export interface StatTrend { dir: 'up' | 'down'; value: string; }

/** Metric readout — mono eyebrow, big display value + unit, optional trend arrow. */
export interface StatProps {
  label: string;
  value: React.ReactNode;
  unit?: string | null;
  /** Colors the value. @default "neutral" */
  tone?: 'energy' | 'vital' | 'focus' | 'neutral';
  /** Trend chip, e.g. { dir: 'up', value: '12%' }. */
  trend?: StatTrend | null;
  /** @default "left" */
  align?: 'left' | 'center';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Stat(props: StatProps): JSX.Element;
