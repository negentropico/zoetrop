import * as React from 'react';

/** Linear progress track — sweeps on mount, tone maps to metric family. */
export interface ProgressBarProps {
  value?: number;
  /** @default 1 */
  max?: number;
  /** @default "focus" */
  tone?: 'energy' | 'vital' | 'focus';
  /** Track height in px. @default 8 */
  height?: number;
  /** Show a % readout on the right. @default false */
  showValue?: boolean;
  label?: string | null;
  style?: React.CSSProperties;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element;
