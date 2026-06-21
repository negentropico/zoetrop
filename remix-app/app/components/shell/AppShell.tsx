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
import { useSignature } from "../ui/Signature";

interface AppShellProps {
  children: ReactNode;
  user: { name: string; email: string; role: string };
  /** Initial collapse state from the zt-nav cookie (read in the layout loader). */
  navCollapsed: boolean;
  /** All subjects in the tenant — fed to SubjectChip. Empty for client role. */
  subjectList: Array<{ id: string; displayName: string }>;
  /** The active subject id from the zt-subject cookie, or null (owner default). */
  activeSubjectId: string | null;
}

export function AppShell({ children, user, navCollapsed, subjectList, activeSubjectId }: AppShellProps) {
  const { pathname, search } = useLocation();
  const [collapsed, setCollapsed] = useState(navCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Wire the root .zt-sig-on class (enables grain + motion under the honesty gate).
  // Called once at the app root so it activates globally on mount.
  useSignature();

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
        subjectList={subjectList}
        activeSubjectId={activeSubjectId}
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
          <footer>
          </footer>
        </div>
      </main>
    </div>
  );
}
