import * as React from 'react';

/** User avatar — image or auto initials, with optional metric ring and status dot. */
export interface AvatarProps {
  /** Image URL. Falls back to initials from `name`. */
  src?: string | null;
  /** Full name — used for initials + alt text. */
  name?: string;
  /** Pixel diameter. @default 40 */
  size?: number;
  /** Metric-colored ring around the avatar. */
  ring?: 'energy' | 'vital' | 'focus' | null;
  /** Presence dot. */
  status?: 'online' | 'away' | 'off' | null;
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
