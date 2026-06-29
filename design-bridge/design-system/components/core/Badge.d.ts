import * as React from 'react';

/** Small uppercase status/metric pill in Space Mono. */
export interface BadgeProps {
  /** Metric/status color family. @default "neutral" */
  tone?: 'energy' | 'vital' | 'focus' | 'neutral' | 'success' | 'danger';
  /** Fill style. @default "soft" */
  variant?: 'soft' | 'solid' | 'outline';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
