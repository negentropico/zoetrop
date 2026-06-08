// ThemeToggle: 40px button, sun/moon icons from lucide-react.
// Writes localStorage key "zt-theme". Sets data-theme on documentElement.
// Initial state reads from documentElement (set by no-flash script in root.tsx).
// Source: docs/design-system/_rounds/round1 + 04.1-RESEARCH.md § ThemeToggle
import { useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Read from documentElement (set by inline no-flash script before paint).
    // Falls back to "light" on SSR (suppressHydrationWarning on <html> handles mismatch).
    if (typeof document === "undefined") return "light";
    return (
      (document.documentElement.getAttribute("data-theme") as "light" | "dark") ||
      "light"
    );
  });

  const toggle = () => {
    const next: "light" | "dark" = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("zt-theme", next);
    } catch {
      // Ignore storage errors (private browsing, quota, etc.)
    }
    setTheme(next);
  };

  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={isDark ? "Light theme" : "Dark theme"}
      className="zt-theme-toggle inline-flex items-center justify-center"
      style={{
        width: 40,
        height: 40,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text-muted)",
        cursor: "pointer",
        transition: "color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
      }}
    >
      {isDark ? (
        <Sun size={19} strokeWidth={1.9} color="currentColor" />
      ) : (
        <Moon size={19} strokeWidth={1.9} color="currentColor" />
      )}
    </button>
  );
}
