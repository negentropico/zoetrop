// nav-tree.ts — single source of truth for the consolidated left sidebar,
// the collapsed-rail flyout, and shell-wide breadcrumbs.
// Tier 1 = NavGroup (Dashboard / Metrics / Protocol / Insights / Reports / Ingest),
// Tier 2 = NavChild. Hidden children (e.g. Ingest → Consent) exist only so
// crumbsForPath can title them — they never render in the accordion/flyout.
// Round-3 IA (design-r35/W3): Import + Ingest merged into ONE Ingest group —
// Overview · Lab PDFs · WHOOP · Vault · Review. /import/whoop and /import/vault
// keep their routes as aliases under the Ingest group (children may live
// outside the group's `base` prefix — groupOfPath also matches children).
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Dna,
  Droplet,
  Dumbbell,
  FileText,
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
  /** Hidden from the mobile BottomTab / mobile drawer primary list (still in sidebar rail). */
  mobileHidden?: boolean;
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
      // Round-3 rename: label-only — route stays /protocol/cessation.
      { label: "Phasing", to: "/protocol/cessation" },
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
    id: "reports",
    label: "Reports",
    icon: FileText,
    base: "/reports",
    children: [
      { label: "All reports", to: "/reports", end: true },
      { label: "Generate", to: "/reports/generate" },
    ],
  },
  {
    // Combined Ingest group (round-3 IA): every source that writes to metrics
    // plus the review gate. WHOOP/Vault keep their /import/* routes as aliases.
    id: "ingest",
    label: "Ingest",
    icon: FileUp,
    base: "/ingest",
    children: [
      { label: "Overview", to: "/ingest", end: true },
      { label: "Lab PDFs", to: "/ingest/upload" },
      { label: "WHOOP", to: "/import/whoop" },
      { label: "Vault", to: "/import/vault" },
      { label: "Review", to: "/ingest/review" },
      { label: "Consent", to: "/ingest/consent", hidden: true },
    ],
  },
];

/** Group owning `pathname` — exact base, base-or-deeper prefix, or an alias
 *  child living outside the base (e.g. /import/whoop under Ingest); null when
 *  no group matches (e.g. /settings). */
export function groupOfPath(pathname: string): NavGroup | null {
  return (
    NAV_TREE.find(
      (g) =>
        pathname === g.base ||
        pathname.startsWith(g.base + "/") ||
        (g.children ?? []).some((c) => isChildActive(pathname, c)),
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
