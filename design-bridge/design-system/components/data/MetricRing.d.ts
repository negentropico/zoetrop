import * as React from 'react';

/**
 * Signature progress ring — sweeps on mount. Center shows label/sublabel or custom children.
 *
 * @startingPoint section="Data" subtitle="Animated metric progress ring" viewport="700x260"
 */
export interface MetricRingProps {
  /** Progress amount. With `max`, treated as value/max; otherwise 0..1. */
  value?: number;
  /** Denominator for `value`. @default 1 */
  max?: number;
  /** Ring color family. @default "focus" */
  tone?: 'energy' | 'vital' | 'focus';
  /** Pixel diameter. @default 120 */
  size?: number;
  /** Stroke width. @default 12 */
  thickness?: number;
  trackColor?: string;
  /** Big center value. */
  label?: React.ReactNode;
  /** Mono caption under the value. */
  sublabel?: string | null;
  /** Replaces the default center content entirely. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function MetricRing(props: MetricRingProps): JSX.Element;
