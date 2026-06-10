// AccountMenu — avatar/initials trigger + dropdown panel
// Desktop top-right shell component: shows user name/email/role badge,
// Account settings link, theme toggle, and a no-JS Sign-out Form POST.
// Source: 03.1-PATTERNS.md § AccountMenu.tsx + 03.1-UI-SPEC.md § Account Menu
import { Form, Link } from "react-router";
import { User, LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Badge, type BadgeProps } from "../ui/Badge";
import { ThemeToggle } from "../ui/ThemeToggle";
import { DropdownMenu } from "../ui/DropdownMenu";

export interface AccountMenuProps {
  user: { name: string; email: string; role: string };
}

// Role badge color map (per 03.1-PATTERNS.md § AccountMenu.tsx)
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

// Shared menu item styles — 40px height, 44px min-height for touch (WCAG 2.5.5)
const ITEM_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  minHeight: 44,
  height: 40,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-text)",
  fontSize: "var(--text-sm)",
  color: "var(--text)",
  background: "none",
  border: "none",
  cursor: "pointer",
  textDecoration: "none",
  transition: "background var(--dur-fast) var(--ease-out)",
  boxSizing: "border-box",
};

function menuItemHover(e: React.MouseEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.background = "var(--surface-sunken)";
}
function menuItemLeave(e: React.MouseEvent<HTMLElement>) {
  (e.currentTarget as HTMLElement).style.background = "none";
}

export function AccountMenu({ user }: AccountMenuProps) {
  const tone = ROLE_TONE[user.role] ?? "neutral";
  const variant = ROLE_VARIANT[user.role] ?? "soft";

  const trigger = (
    // Pill trigger: Avatar + ChevronDown, styled per UI-SPEC
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: "var(--radius-pill)",
        border: "1.5px solid var(--border)",
        background: "transparent",
        cursor: "pointer",
        minHeight: 44,
        transition: "background var(--dur-fast) var(--ease-out)",
      }}
      aria-label="Open account menu"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--surface-sunken)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <Avatar name={user.name} size={32} />
      <ChevronDown size={16} color="var(--text-muted)" />
    </span>
  );

  return (
    <DropdownMenu trigger={trigger} align="right" width={200}>
      {/* Panel header — non-interactive user info + role badge */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 4,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-base)",
            fontWeight: 500,
            color: "var(--ink)",
            lineHeight: 1.3,
          }}
        >
          {user.name}
        </span>
        <span
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.email}
        </span>
        <div style={{ marginTop: 4 }}>
          <Badge tone={tone} variant={variant}>
            {user.role.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Account settings — Link to /settings */}
      <Link
        to="/settings"
        role="menuitem"
        style={ITEM_BASE}
        onMouseEnter={menuItemHover}
        onMouseLeave={menuItemLeave}
      >
        <User size={16} color="currentColor" />
        Account settings
      </Link>

      {/* Theme toggle row */}
      <div
        role="menuitem"
        style={{
          ...ITEM_BASE,
          justifyContent: "space-between",
          cursor: "default",
        }}
      >
        <span>Theme</span>
        <ThemeToggle />
      </div>

      {/* Sign out — POST Form, no JS required */}
      <Form method="post" action="/logout">
        <button
          type="submit"
          role="menuitem"
          style={{
            ...ITEM_BASE,
            color: "var(--danger)",
          }}
          onMouseEnter={menuItemHover}
          onMouseLeave={menuItemLeave}
        >
          <LogOut size={16} color="currentColor" />
          Sign out
        </button>
      </Form>
    </DropdownMenu>
  );
}
