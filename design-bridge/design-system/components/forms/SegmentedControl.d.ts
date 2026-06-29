import * as React from 'react';

export interface SegOption { value: string; label: string; }

/** Compact pill tab switch for ranges/views (Day / Week / Month). */
export interface SegmentedControlProps {
  /** Options as strings or {value,label}. */
  options: (string | SegOption)[];
  value: string;
  onChange?: (value: string) => void;
  /** @default "md" */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
