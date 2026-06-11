// SidebarAccount — footer account trigger + upward popover.
// Replaces AccountMenu (DropdownMenu opened downward — wrong for a sidebar
// footer; the popover needs the right-opening is-rail mode when collapsed).
// Owns: name/email + role Badge, /settings link, Theme row (embeds the
// existing ThemeToggle — NOT a reimplementation), and the no-JS Sign-out
// Form POST copied verbatim from AccountMenu.
import { useEffect, useState } from "react";
import { Form, Link, useLocation } from "react-router";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Badge, type BadgeProps } from "../ui/Badge";
import { ThemeToggle } from "../ui/ThemeToggle";

export interface SidebarAccountProps {
  user: { name: string; email: string; role: string };
  /** Rail mode — popover opens to the right instead of upward. */
  collapsed: boolean;
}

// Role badge color maps (copied from the retired AccountMenu.tsx)
const ROLE_TONE: Record<string, BadgeProps["tone"]> = {
  owner:        "neutral",
  practitioner: "focus",
  client:       "neutral",
};

const ROLE_VARIANT: Record<string, BadgeProps["variant"]> = {
  owner:        "solid",
  practitioner: "soft",
  client:       "soft",
};

export function SidebarAccount({ user, collapsed }: SidebarAccountProps) {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();

  // Close on navigation (pathname AND search — ingest review uses ?doc=)
  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);

  // Close when the sidebar collapses/expands (popover anchor moves)
  useEffect(() => {
    setOpen(false);
  }, [collapsed]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tone = ROLE_TONE[user.role] ?? "neutral";
  const variant = ROLE_VARIANT[user.role] ?? "soft";

  return (
    <div className="zn-account-wrap">
      <button
        type="button"
        className={"zn-account" + (open ? " is-open" : "")}
        onClick={() => setOpen((a) => !a)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account"
      >
        <Avatar name={user.name} size={30} />
        <span className="zn-label zn-account-name">
          <span
            style={{
              display: "block",
              fontWeight: 600,
              fontSize: "var(--text-sm)",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name}
          </span>
          <span
            style={{
              display: "block",
              color: "var(--text-muted)",
              fontSize: "var(--text-2xs)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: 2,
            }}
          >
            {user.role}
          </span>
        </span>
        <span className="zn-account-chev">
          <ChevronsUpDown size={15} strokeWidth={1.8} />
        </span>
      </button>

      {open && (
        <div
          className={"zn-account-menu" + (collapsed ? " is-rail" : "")}
          role="menu"
          aria-label="Account"
        >
          {/* Header — non-interactive user info + role badge */}
          <div className="zn-account-head">
            <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
              {user.name}
            </div>
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "var(--text-xs)",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </div>
            <div style={{ marginTop: 9 }}>
              <Badge tone={tone} variant={variant}>
                {user.role.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="zn-account-sep" />

          {/* Account settings */}
          <Link to="/settings" className="zn-menu-item" role="menuitem">
            <User size={16} strokeWidth={1.9} />
            Account settings
          </Link>

          {/* Theme row — embeds the existing ThemeToggle (40px button) */}
          <div
            className="zn-menu-item"
            role="menuitem"
            style={{
              justifyContent: "space-between",
              cursor: "default",
              height: "auto",
              padding: "4px 10px",
            }}
          >
            <span>Theme</span>
            <ThemeToggle />
          </div>

          <div className="zn-account-sep" />

          {/* Sign out — POST Form, no JS required */}
          <Form method="post" action="/logout">
            <button type="submit" className="zn-menu-item is-danger" role="menuitem">
              <LogOut size={16} strokeWidth={1.9} />
              Sign out
            </button>
          </Form>
        </div>
      )}

      {open && (
        <div className="zn-fly-backdrop" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
