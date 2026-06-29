import * as React from 'react';

/** On/off toggle. Track color when on maps to a metric family. */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  /** On-state color. @default "focus" */
  tone?: 'energy' | 'vital' | 'focus';
  /** @default "md" */
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Optional trailing label. */
  label?: string | null;
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;
