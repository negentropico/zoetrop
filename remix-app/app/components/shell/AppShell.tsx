// AppShell — consolidated left-nav chrome for all authenticated routes.
// MobileTopBar (≤760px hamburger) + Sidebar (264px expanded / 64px rail /
// off-canvas drawer) + class-driven content offset (.zn-app / .is-collapsed)
// + footer eyebrow. Breadcrumbs are owned by PageHeader (meta row), not the shell.
// Collapse state: initialized from the zt-nav cookie via the _app/layout.tsx
// loader (SSR-consistent — no flash), written client-side on toggle.
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { Sidebar } from "./Sidebar";
import { MobileTopBar } from "./MobileTopBar";
import { SpiralMark } from "../ui/SpiralMark";

interface AppShellProps {
  children: ReactNode;
  user: { name: string; email: string; role: string };
  /** Initial collapse state from the zt-nav cookie (read in the layout loader). */
  navCollapsed: boolean;
}

export function AppShell({ children, user, navCollapsed }: AppShellProps) {
  const { pathname, search } = useLocation();
  const [collapsed, setCollapsed] = useState(navCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    // Client-side cookie write — no fetcher/action; React state is
    // authoritative in-session, the server reads it on the next document request.
    document.cookie =
      "zt-nav=" + (next ? "1" : "0") + "; Path=/; Max-Age=31536000; SameSite=Lax";
  };

  // Close the drawer on navigation — pathname AND search (ingest review uses ?doc=)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, search]);

  // Escape closes the drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Body scroll-lock while the drawer is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div
      className={
        "zn-app min-h-screen bg-paper text-ink" + (collapsed ? " is-collapsed" : "")
      }
    >
      <MobileTopBar onMenu={() => setMobileOpen(true)} />
      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <div
          className="zn-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <main className="zn-main">
        <div className="zn-page">
          {children}
          <footer
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: 24,
              padding: "22px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              className="zt-eyebrow inline-flex items-center gap-2.5"
              style={{ gap: 10 }}
            >
              <SpiralMark size={16} color="var(--text-faint)" />
              zoetrop
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
