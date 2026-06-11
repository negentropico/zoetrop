// MobileTopBar — ≤760px sticky hamburger bar (hidden on desktop via CSS).
// Opens the sidebar as an off-canvas drawer; replaces BottomTab.
import { Menu } from "lucide-react";
import { Wordmark } from "../ui/Wordmark";

export interface MobileTopBarProps {
  onMenu: () => void;
}

export function MobileTopBar({ onMenu }: MobileTopBarProps) {
  return (
    <div className="zn-topbar">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation menu"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          padding: 0,
          border: "none",
          background: "none",
          borderRadius: "var(--radius-md)",
          color: "var(--ink)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <Menu size={22} strokeWidth={1.8} />
      </button>
      <Wordmark />
    </div>
  );
}
