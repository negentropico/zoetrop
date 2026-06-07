import * as React from 'react';

/** Base surface container — the "frame" every Zoetrope module sits in. */
export interface CardProps {
  /** Drop shadow depth. @default "sm" */
  elevation?: 'flat' | 'xs' | 'sm' | 'md' | 'lg';
  /** Metric-colored top hairline accent, or any CSS color. */
  accent?: 'energy' | 'vital' | 'focus' | 'ink' | string | null;
  /** Tint the whole surface with a metric-50 wash. */
  tone?: 'energy' | 'vital' | 'focus' | 'mist' | null;
  /** Inner padding. @default "lg" */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Adds hover lift + pointer. @default false */
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;
