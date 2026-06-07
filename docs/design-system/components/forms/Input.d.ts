import * as React from 'react';

/** Text input with optional label, leading icon, hint and error states. */
export interface InputProps {
  label?: string | null;
  hint?: string | null;
  /** Error message — also turns the border red. */
  error?: string | null;
  iconLeft?: React.ReactNode;
  type?: string;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
