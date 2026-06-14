// Sidebar — consolidated left nav, ported from _notes/sidebar.jsx.
// 264px expanded (single-open accordion, parent click expands) /
// 64px icon rail (hover flyout submenus) / off-canvas mobile drawer
// (≤760px — always the expanded variant; rail/flyout is desktop-only).
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SpiralMark } from "../ui/SpiralMark";
import { SidebarAccount } from "./SidebarAccount";
import { SubjectChip } from "./SubjectChip";
import {
  NAV_TREE,
  groupOfPath,
  isChildActive,
  type NavChild,
  type NavGroup,
} from "./nav-tree";

export interface SidebarProps {
  user: { name: string; email: string; role: string };
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  /** All subjects for the SubjectChip — empty for client role. */
  subjectList: Array<{ id: string; displayName: string }>;
  /** Active subject id from the zt-subject cookie, or null (owner default). */
  activeSubjectId: string | null;
}

/** matchMedia(760px) — false during SSR (harmless: the sidebar is off-canvas
 *  via CSS on mobile before hydration; drawer state starts closed). */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

function visibleChildren(g: NavGroup): NavChild[] {
  return (g.children ?? []).filter((c) => !c.hidden);
}

function groupActive(pathname: string, g: NavGroup): boolean {
  // Base prefix OR an alias child outside the base (e.g. /import/whoop under
  // the combined Ingest group — round-3 IA).
  return (
    pathname === g.base ||
    pathname.startsWith(g.base + "/") ||
    (g.children ?? []).some((c) => isChildActive(pathname, c))
  );
}

/* ------------------------------------------------------------------
   Flyout panel (collapsed rail) — fixed-positioned, viewport-clamped.
   ------------------------------------------------------------------ */
interface FlyoutProps {
  group: NavGroup;
  top: number;
  pathname: string;
  onEnter: () => void;
  onLeave: () => void;
  onNavigate: () => void;
}

function Flyout({ group, top, pathname, onEnter, onLeave, onNavigate }: FlyoutProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vh = window.innerHeight;
    const h = el.offsetHeight;
    const t = Math.max(10, Math.min(top, vh - h - 10));
    el.style.top = t + "px";
  }, [group, top]);
  return (
    <div
      ref={ref}
      className="zn-flyout"
      style={{ top }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      role="menu"
      aria-label={group.label}
    >
      <div className="zn-flyout-title">{group.label}</div>
      {visibleChildren(group).map((ch) => (
        <Link
          key={ch.to}
          to={ch.to}
          className={
            "zn-flyout-item" + (isChildActive(pathname, ch) ? " is-active" : "")
          }
          onClick={onNavigate}
          role="menuitem"
        >
          {ch.label}
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
   Sidebar
   ------------------------------------------------------------------ */
export function Sidebar({
  user,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  subjectList,
  activeSubjectId,
}: SidebarProps) {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  // On mobile the drawer always shows the expanded variant.
  const railMode = collapsed && !isMobile;

  const activeGroup = groupOfPath(pathname);

  /* single-open accordion — re-opens the active group on navigation */
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    activeGroup ? { [activeGroup.id]: true } : {},
  );
  const activeGroupId = activeGroup?.id ?? null;
  useEffect(() => {
    setOpen(activeGroupId ? { [activeGroupId]: true } : {});
  }, [pathname, activeGroupId]);
  const toggleGroup = (id: string) =>
    setOpen((prev) => (prev[id] ? {} : { [id]: true }));

  /* flyout state (collapsed rail, opens on hover) */
  const [fly, setFly] = useState<{ id: string; top: number } | null>(null);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (flyTimer.current) {
      clearTimeout(flyTimer.current);
      flyTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    flyTimer.current = setTimeout(() => setFly(null), 180);
  };
  const openFly = (g: NavGroup, e: React.MouseEvent<HTMLElement>) => {
    cancelClose();
    const r = e.currentTarget.getBoundingClientRect();
    setFly({ id: g.id, top: r.top - 8 });
  };
  useEffect(() => {
    setFly(null);
  }, [railMode, pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFly(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- expanded row ---------- */
  const renderExpandedGroup = (g: NavGroup) => {
    const kids = visibleChildren(g);
    const sectionActive = groupActive(pathname, g);
    const isOpen = !!open[g.id];

    // Close the drawer on link click — covers same-path clicks that don't
    // trigger the AppShell pathname/search effect.
    const onNavClick = isMobile ? onMobileClose : undefined;

    if (kids.length === 0) {
      const active = g.exact ? pathname === g.base : sectionActive;
      return (
        <Link
          key={g.id}
          to={g.base}
          className={"zn-row" + (active ? " is-active" : "")}
          onClick={onNavClick}
        >
          <g.icon size={19} strokeWidth={active ? 2.1 : 1.8} />
          <span className="zn-label">{g.label}</span>
        </Link>
      );
    }
    return (
      <div key={g.id} className="zn-group">
        <button
          type="button"
          onClick={() => toggleGroup(g.id)}
          className={"zn-row" + (sectionActive ? " is-section" : "")}
          aria-expanded={isOpen}
        >
          <g.icon size={19} strokeWidth={sectionActive ? 2.1 : 1.8} />
          <span className="zn-label">{g.label}</span>
          <span
            className="zn-chev"
            style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
          >
            <ChevronDown size={15} strokeWidth={2} />
          </span>
        </button>
        <div
          className="zn-kids"
          style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
          aria-hidden={!isOpen}
        >
          <div className="zn-kids-inner">
            {kids.map((ch) => (
              <Link
                key={ch.to}
                to={ch.to}
                className={
                  "zn-child" + (isChildActive(pathname, ch) ? " is-active" : "")
                }
                tabIndex={isOpen ? 0 : -1}
                onClick={onNavClick}
              >
                {ch.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ---------- collapsed rail item ---------- */
  const renderRailItem = (g: NavGroup) => {
    const kids = visibleChildren(g);
    const sectionActive = groupActive(pathname, g);
    const cls =
      "zn-rail-item" +
      (sectionActive ? " is-active" : "") +
      (fly && fly.id === g.id ? " is-fly" : "");

    if (kids.length === 0) {
      return (
        <Link key={g.id} to={g.base} className={cls} title={g.label} aria-label={g.label}>
          <g.icon size={20} strokeWidth={sectionActive ? 2.2 : 1.8} />
        </Link>
      );
    }
    return (
      <button
        key={g.id}
        type="button"
        className={cls}
        aria-label={g.label}
        aria-haspopup="menu"
        onMouseEnter={(e) => openFly(g, e)}
        onMouseLeave={scheduleClose}
        onClick={(e) => {
          if (fly && fly.id === g.id) setFly(null);
          else openFly(g, e);
        }}
      >
        <g.icon size={20} strokeWidth={sectionActive ? 2.2 : 1.8} />
      </button>
    );
  };

  const flyGroup = fly ? (NAV_TREE.find((g) => g.id === fly.id) ?? null) : null;

  return (
    <aside
      className={
        "zn-side" +
        (railMode ? " is-collapsed" : "") +
        (mobileOpen ? " is-mobile-open" : "")
      }
      aria-label="Sidebar"
    >
      {/* header */}
      <div className="zn-head">
        <Link to="/dashboard" className="zn-brand" aria-label="Zoetrop home">
          <SpiralMark size={24} />
          <span className="zn-label zn-wordmark">
            zoetrop
            <span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </Link>
        <button
          type="button"
          className="zn-collapse"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <PanelLeftOpen size={17} strokeWidth={1.8} />
          ) : (
            <PanelLeftClose size={17} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* nav */}
      <nav className="zn-nav" aria-label="Primary">
        {railMode
          ? NAV_TREE.map(renderRailItem)
          : (isMobile
              // Mobile drawer: hide mobileHidden groups unless we're currently in that section.
              // Resolves 6-item BottomTab overflow (RESEARCH Open-Q #3): Import hidden from
              // mobile primary nav but still visible when active on /import/*.
              ? NAV_TREE.filter((g) => !g.mobileHidden || groupActive(pathname, g))
              : NAV_TREE
            ).map(renderExpandedGroup)}
      </nav>

      {/* footer — SubjectChip (above) + account (below); theme lives in the account popover */}
      <div className="zn-foot">
        {subjectList.length > 0 && (
          <SubjectChip
            subjects={subjectList}
            activeSubjectId={activeSubjectId}
            collapsed={railMode}
          />
        )}
        <SidebarAccount user={user} collapsed={railMode} />
      </div>

      {/* flyout (rail only) */}
      {railMode && flyGroup && fly && (
        <Flyout
          group={flyGroup}
          top={fly.top}
          pathname={pathname}
          onEnter={cancelClose}
          onLeave={scheduleClose}
          onNavigate={() => setFly(null)}
        />
      )}
    </aside>
  );
}
