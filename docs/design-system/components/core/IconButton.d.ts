import * as React from 'react';

/** Icon-only control. Always supply `label` for accessibility. */
export interface IconButtonProps {
  /** @default "ghost" */
  variant?: 'ghost' | 'soft' | 'outline' | 'ink';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Fully rounded (pill/circle) instead of squircle. @default false */
  round?: boolean;
  disabled?: boolean;
  /** Accessible label (aria-label). */
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** The icon node. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
