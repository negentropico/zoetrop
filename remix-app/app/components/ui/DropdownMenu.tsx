// DropdownMenu — accessible dropdown primitive
// Manages open/close state, outside-click (mousedown), Escape key (returns focus to trigger),
// and ArrowDown/ArrowUp keyboard navigation between focusable panel children.
// All visual tokens are CSS vars — no hardcoded hex.
// Source: 03.1-PATTERNS.md § DropdownMenu.tsx + 03.1-UI-SPEC.md § Interaction Contracts
import { useState, useEffect, useRef, type ReactNode } from "react";

export interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  width?: number;
}

export function DropdownMenu({
  trigger,
  children,
  align = "right",
  width = 200,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Outside-click: close when mousedown lands outside the container.
  // Only attach the listener while open to avoid unnecessary overhead.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape key: close AND return focus to trigger (UI-SPEC interaction contract).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ArrowDown / ArrowUp: roving focus over focusable children in the panel.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (!containerRef.current) return;
      const panel = containerRef.current.querySelector('[role="menu"]');
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      );
      if (focusable.length === 0) return;
      e.preventDefault();
      const current = document.activeElement as HTMLElement;
      const idx = focusable.indexOf(current);
      if (e.key === "ArrowDown") {
        const next = idx < focusable.length - 1 ? idx + 1 : 0;
        focusable[next].focus();
      } else {
        const prev = idx > 0 ? idx - 1 : focusable.length - 1;
        focusable[prev].focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {/* Trigger wrapper — button semantics with ARIA */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {trigger}
      </button>

      {/* Dropdown panel — rendered only when open */}
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: align === "right" ? 0 : undefined,
            left: align === "left" ? 0 : undefined,
            width,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--shadow-lg)",
            padding: 4,
            zIndex: 50,
            // opacity + translateY animation — 120ms ease-out per UI-SPEC
            animation: "zt-dropdown-in var(--dur-fast) var(--ease-out) both",
          }}
        >
          {children}
        </div>
      )}

      <style>{`
        @keyframes zt-dropdown-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
