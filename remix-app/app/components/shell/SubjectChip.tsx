// SubjectChip — persistent active-subject switcher in the sidebar footer.
// Sits ABOVE SidebarAccount in the .zn-foot block (D-05 PHI-safety affordance).
// Mirrors the SidebarAccount pattern exactly: same state/effects/trigger/dropdown
// structure, same .zn-account-menu / .is-rail popover CSS, same .zn-fly-backdrop.
//
// PHI-safety invariants:
//   - NEVER writes document.cookie — all subject switches are server-POST forms (Pitfall 2)
//   - Does NOT import any .server.ts module — receives subjects + activeSubjectId via
//     loader props only (build-gate, Pitfall 7 / T-01-server-leak)
//   - Elevated accent state ("VIEWING CLIENT") makes operating on a client unmistakable
import { useEffect, useState } from "react";
import { Form, useLocation } from "react-router";
import { ChevronDown, Check } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";

export interface SubjectChipProps {
  subjects: Array<{ id: string; displayName: string }>;
  activeSubjectId: string | null;
  /** Rail mode — popover opens to the right instead of upward. */
  collapsed: boolean;
}

export function SubjectChip({ subjects, activeSubjectId, collapsed }: SubjectChipProps) {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();

  // Resolve the active subject: match by id, fall back to first (owner)
  const activeSubject = subjects.find((s) => s.id === activeSubjectId) ?? subjects[0] ?? null;

  // A non-owner subject is active when the active subject is NOT subjects[0] (the owner).
  // In v1.1 the owner is always the first-created subject (index 0).
  const isClientActive = !!(activeSubject && subjects[0] && activeSubject.id !== subjects[0].id);

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

  // No subjects — nothing to render
  if (!subjects.length) return null;

  return (
    <div className="zn-account-wrap">
      <button
        type="button"
        className={"zn-account" + (open ? " is-open" : "")}
        onClick={() => setOpen((a) => !a)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          isClientActive
            ? `Switch active subject — currently viewing ${activeSubject?.displayName ?? "client"}`
            : "Switch active subject — currently viewing owner"
        }
        style={
          isClientActive
            ? {
                background: "var(--focus-50)",
                border: "1px solid var(--accent)",
                borderLeft: "2px solid var(--accent)",
              }
            : undefined
        }
      >
        <Avatar
          name={activeSubject?.displayName ?? ""}
          size={30}
          ring={isClientActive ? "focus" : null}
        />
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
              color: isClientActive ? "var(--accent)" : undefined,
            }}
          >
            {activeSubject?.displayName ?? ""}
          </span>
          <span
            style={{
              display: "block",
              color: isClientActive ? "var(--accent)" : "var(--text-muted)",
              fontSize: "var(--text-2xs)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginTop: 2,
              opacity: isClientActive ? 1 : undefined,
            }}
          >
            {isClientActive ? "VIEWING CLIENT" : "VIEWING"}
          </span>
        </span>
        <span className="zn-account-chev">
          <ChevronDown size={15} strokeWidth={1.8} color={isClientActive ? "var(--accent)" : undefined} />
        </span>
      </button>

      {open && (
        <div
          className={"zn-account-menu" + (collapsed ? " is-rail" : "")}
          role="menu"
          aria-label="Switch active subject"
        >
          {/* Header — non-interactive eyebrow */}
          <div
            className="zn-account-head"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
            }}
          >
            SWITCH SUBJECT
          </div>

          <div className="zn-account-sep" />

          {/* Subject rows — owner first (index 0), then clients alphabetically */}
          {subjects.map((s, i) => {
            const isActive =
              s.id === (activeSubjectId ?? subjects[0]?.id);
            const isOwner = i === 0;
            return (
              <Form key={s.id} method="post" action="/subject-switch">
                <input type="hidden" name="subjectId" value={s.id} />
                <button
                  type="submit"
                  className="zn-menu-item"
                  role="menuitem"
                  style={
                    isActive
                      ? { fontWeight: 600, background: "var(--surface-sunken)" }
                      : undefined
                  }
                >
                  <Avatar name={s.displayName} size={24} />
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.displayName}
                  </span>
                  <Badge tone={isOwner ? "neutral" : "focus"} variant="soft">
                    {isOwner ? "OWNER" : "CLIENT"}
                  </Badge>
                  {isActive && (
                    <Check size={14} strokeWidth={2} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  )}
                </button>
              </Form>
            );
          })}
        </div>
      )}

      {open && (
        <div className="zn-fly-backdrop" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
