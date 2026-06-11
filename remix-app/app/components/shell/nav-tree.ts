// nav-tree.ts — single source of truth for the consolidated left sidebar,
// the collapsed-rail flyout, and shell-wide breadcrumbs.
// Tier 1 = NavGroup (Dashboard / Metrics / Protocol / Insights / Import / Ingest),
// Tier 2 = NavChild. Hidden children (e.g. Ingest → Consent) exist only so
// crumbsForPath can title them — they never render in the accordion/flyout.
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Dna,
  Download,
  Droplet,
  Dumbbell,
  FileUp,
  Flame,
  FlaskConical,
  Gem,
  GitCompare,
  HeartPulse,
  LayoutGrid,
  ListChecks,
  Pill,
  Zap,
} from "lucide-react";
import { CATEGORY_INFO, type MetricCategory } from "~/types/metrics";
import type { CrumbItem } from "~/components/ui/Crumb";

export interface NavChild {
  label: string;
  to: string;
  /** Exact match only (overview children whose `to` is a prefix of siblings). */
  end?: boolean;
  /** Breadcrumb-only — never rendered in the accordion or flyout. */
  hidden?: boolean;
  /** Page renders its own loader-derived Crumb — the shell must not (e.g.
   *  /metrics/:category, which is both a nav child and a param route). */
  ownCrumb?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  base: string;
  /** Group is a single exact link (no children) — e.g. Dashboard. */
  exact?: boolean;
  children?: NavChild[];
}

// Moved from the deleted routes/_app/metrics/layout.tsx — maps CATEGORY_INFO
// icon slugs to lucide components.
const LUCIDE_MAP: Record<string, LucideIcon> = {
  pill: Pill,
  gem: Gem,
  flame: Flame,
  zap: Zap,
  "flask-conical": FlaskConical,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  droplet: Droplet,
  dna: Dna,
};

const categories = Object.keys(CATEGORY_INFO) as MetricCategory[];

export const NAV_TREE: NavGroup[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, base: "/dashboard", exact: true },
  {
    id: "metrics",
    label: "Metrics",
    icon: Activity,
    base: "/metrics",
    children: [
      { label: "All categories", to: "/metrics", end: true },
      ...categories.map((cat) => ({
        label: CATEGORY_INFO[cat].label,
        to: `/metrics/${cat}`,
        ownCrumb: true,
      })),
    ],
  },
  {
    id: "protocol",
    label: "Protocol",
    icon: ListChecks,
    base: "/protocol",
    children: [
      { label: "Overview", to: "/protocol", end: true },
      { label: "Versions", to: "/protocol/versions" },
      { label: "Supplements", to: "/protocol/supplements" },
      { label: "Cessation", to: "/protocol/cessation" },
      { label: "Compare", to: "/protocol/compare" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    icon: GitCompare,
    base: "/insights",
    children: [
      { label: "Overview", to: "/insights", end: true },
      { label: "Correlations", to: "/insights/correlations" },
      { label: "Genetics", to: "/insights/genetics" },
    ],
  },
  {
    id: "import",
    label: "Import",
    icon: Download,
    base: "/import",
    children: [
      { label: "Overview", to: "/import", end: true },
      { label: "WHOOP", to: "/import/whoop" },
      { label: "Vault", to: "/import/vault" },
    ],
  },
  {
    id: "ingest",
    label: "Ingest",
    icon: FileUp,
    base: "/ingest",
    children: [
      { label: "Overview", to: "/ingest", end: true },
      { label: "Upload", to: "/ingest/upload" },
      { label: "Review", to: "/ingest/review" },
      { label: "Consent", to: "/ingest/consent", hidden: true },
    ],
  },
];

/** Group owning `pathname` — exact base or base-or-deeper prefix; null when
 *  no group matches (e.g. /settings). */
export function groupOfPath(pathname: string): NavGroup | null {
  return (
    NAV_TREE.find(
      (g) => pathname === g.base || pathname.startsWith(g.base + "/"),
    ) ?? null
  );
}

/** Child highlighting — exact for `end` children, otherwise base-or-deeper
 *  prefix so /metrics/vitamins/:id highlights Vitamins. */
export function isChildActive(pathname: string, child: NavChild): boolean {
  if (child.end) return pathname === child.to;
  return pathname === child.to || pathname.startsWith(child.to + "/");
}

/** Breadcrumb items for `pathname`, or null when no crumb should render.
 *  Crumbs appear only at depth >= 2 (group + child) — no zoetrop segment,
 *  and single-segment crumbs (/settings, group bases) are suppressed as pure
 *  title duplication. Anything deeper than an exact child (param routes) owns
 *  its loader-derived Crumb. */
export function crumbsForPath(pathname: string): CrumbItem[] | null {
  if (pathname === "/dashboard") return null;
  if (pathname === "/settings") return null; // single segment — title duplication
  const group = groupOfPath(pathname);
  if (!group || group.id === "dashboard") return null;
  if (pathname === group.base) return null; // single segment — title duplication
  const child = group.children?.find((c) => pathname === c.to);
  if (!child) return null; // deeper than an exact child — page owns its Crumb
  if (child.ownCrumb) return null; // child route renders its own Crumb
  return [{ label: group.label, to: group.base }, { label: child.label }];
}
