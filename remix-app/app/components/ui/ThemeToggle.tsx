// ThemeToggle: 40px button, sun/moon icons from lucide-react.
// Writes localStorage key "zt-theme". Sets data-theme on documentElement.
// Initial state reads from localStorage (same source as the no-flash inline
// script in root.tsx). A useLayoutEffect keeps data-theme in sync with React
// state and re-applies it after mount — this corrects the StrictMode / Suspense
// "reappear" path in which React's singleton acquisition strips all attributes
// from <html> (including data-theme) during the commit phase.
// Source: docs/design-system/_rounds/round1 + 04.1-RESEARCH.md § ThemeToggle
import { useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // SSR guard — server always starts with "light"; the no-flash script in
    // root.tsx corrects the visual theme before paint on the client.
    if (typeof document === "undefined") return "light";
    // Read from localStorage (the canonical persisted source, same as the
    // no-flash script). Falling back to data-theme is unreliable because React's
    // singleton acquisition can strip it from <html> before this effect fires.
    try {
      const stored = localStorage.getItem("zt-theme");
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // Ignore storage errors (private browsing, quota, etc.)
    }
    // No stored preference — mirror the OS setting (same logic as no-flash script).
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // Keep data-theme in sync with React state.
  // This fires after every commit (including initial mount) so it re-applies
  // data-theme even if React's <html> singleton acquisition stripped it.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = () => {
    const next: "light" | "dark" = theme === "dark" ? "light" : "dark";
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
