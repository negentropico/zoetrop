/**
 * round.ts — emit the round-level tracking artifacts for zoetrop's design line using the evolved
 * CORE round/ledger module (B5 charter framing). Writes alongside the outbound packages:
 *
 *   round1/round-manifest.json + DECISIONS.md  — the ZOETROP-R1 CHARTER, FROZEN.
 *       Its three sessions are BACKFILLED history, reconstructed from the three prior design rounds
 *       that ran BEFORE this harness existed (the origin the CORE was ported from):
 *         S1.0 = prior round1 (Zoetrop Redesign — the design language + token system + first screens)
 *         S1.1 = prior round2 (Left Nav Prototype — the consolidated-sidebar interaction model, BAKED)
 *         S1.2 = prior round3 (+4/+5) (the "calm instrument" screen language — frames charts, canonical
 *                status tokens, populated states, dark + mobile sweeps — FINAL)
 *       Locked at S1.0 (the brand language + token families); all freeze criteria met → the charter is
 *       archived. Further work runs as refinement LINEs per ROUNDTRIP.md.
 *
 *   round4/round-manifest.json + DECISIONS.md  — the FIRST harness-native refinement LINE (skeleton;
 *       lineType: refinement, charter: ZOETROP-R1). Staged, not yet run — see round4/PROMPT-LINE-reports.md.
 *
 * Source for the backfill is the prior rounds' prose ledgers (docs/design-system/_rounds/round2/README.md
 * and round3/round3-return/CHANGES.md + INTEGRATION-PLAN.md). This records the decisions; it does not
 * re-ingest the design artifacts. Dates are when each round landed/baked (git-grounded).
 *
 * Run: npm run design:round
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  newManifest,
  markStage,
  recordSession,
  markLocked,
  writeManifest,
  renderManifestLedger,
  type LedgerBlock,
  type RoundManifest,
  type FreezeCriterion,
} from '@design-roundtrip/round';
import { designBridgeConfig } from '../design-bridge.config';

const roundsDir = designBridgeConfig.dirs.rounds;
const sha = readFileSync(resolve('design-bridge/harness/.staging-core/.source-sha'), 'utf8').trim();

// ─────────────────────────────────────────────────────────────────────────────
// CHARTER ZOETROP-R1 (FROZEN) — backfilled foundation
// ─────────────────────────────────────────────────────────────────────────────

// Freeze criteria — what the shipped foundation PROVES (archetype B, already met: the DS is live).
const charterFreeze: FreezeCriterion[] = [
  { id: 'tokenized', met: true, kind: 'freeze-blocking', note: 'every value is a token in remix-app/app/app.css; rounds added only new tokens in existing families' },
  { id: 'both-themes', met: true, kind: 'freeze-blocking', note: 'light :root + html[data-theme="dark"] parity via variable-remap — no per-component dark selectors (round3 dark sweep: the remap system held)' },
  { id: 'contrast-floor', met: true, kind: 'freeze-blocking', note: 'AA verified; round3 dark sweep fixed --vital-500/--energy-500 used as text on dark cards' },
  { id: 'canonical-status-tokens', met: true, kind: 'freeze-blocking', note: 'status carried only by --optimal/--borderline/--deficient/--excess, consumed by every component (one-edit remap)' },
  { id: 'left-nav-baked', met: true, kind: 'freeze-blocking', note: 'the consolidated left-sidebar interaction model shipped and is BAKED (round2)' },
  { id: 'reduced-motion-js-off-ok', met: true, kind: 'freeze-blocking', note: 'content renders JS-off; ring sweep is mount-only and reduced-motion collapses to instant via the global rule' },
  { id: 'owner-accept', met: true, kind: 'human-required', note: 'owner baked all round-3 chart/status/density decisions live (2026-06-12)' },
];

// The three backfilled sessions (reconstructed from the prior rounds' README/CHANGES ledgers).
const blocks: LedgerBlock[] = [
  {
    session: 'S1.0',
    title: 'Foundation — brand language, token system, first screens (prior round1)',
    status: 'closed',
    closedDate: '2026-06-07',
    propagation: 'brand-dna',
    recordVsDecide: {
      record: ['the product domain (functional-health / wellness tracking)'],
      decide: ['the visual language', 'the full token system', 'the core component library', 'the first screen set'],
    },
    outputs: {
      selected:
        'The Zoetrop language: three metric hue families — Energy (amber --energy), Vital (teal --vital), Focus (periwinkle --focus, the default action colour) — over warm Paper/Mist/Ink neutrals (never blue-grey); Space Grotesk display / Hanken Grotesk body / Space Mono data (tabular figures, UPPERCASE micro-labels); large-radius "frame" cards, pill controls, soft warm ink-tinted shadows; spiral + phyllotaxis brand motifs. Shipped the full token system (tokens/*.css) + 11 core components (Button/Badge/Avatar/Card/IconButton/Input/Switch/SegmentedControl/MetricRing/ProgressBar/Stat) + first screens (dashboard, metrics, protocol, correlations, detail, import).',
      rejected: 'Gradients (banned); blue-grey neutrals (warm-tinted only); emoji. No data-density forking yet.',
      tokenDelta:
        'Established the foundation vocabulary in tokens/*.css: metric ramps (energy/vital/focus 50–600), warm neutral ramp --n-0…--n-950, semantic surface/text/border/accent aliases, status (--success/--warning/--danger), Fibonacci spacing, radii (xs→2xl + pill), warm ink-tinted shadows, motion (--ease-*, --dur-*). Dark via html[data-theme="dark"] warm-dark remap; Tailwind v4 @theme inline bridge.',
      contrastNotes: 'Warm neutral ramp tuned for AA body text on paper; dark = warm-dark (never blue-grey), color-scheme: dark.',
      motionNotes: 'Brisk, eased, never bouncy; metric rings sweep on mount; reduced-motion collapses to instant via the global rule.',
      nextConstraints: 'Brand language + token families LOCKED. Navigation / IA to be resolved next (becomes S1.1).',
    },
  },
  {
    session: 'S1.1',
    title: 'IA spine — consolidated left sidebar (prior round2, BAKED)',
    status: 'closed',
    closedDate: '2026-06-10',
    propagation: 'physics',
    recordVsDecide: {
      record: ['the locked brand language + token system (S1.0)'],
      decide: ['the global navigation / chrome interaction model'],
    },
    outputs: {
      selected:
        'One consolidated left sidebar replacing top-nav + bottom-tab + 5 per-section sub-navs: 264px expanded / 64px collapsed icon rail (cookie-persisted collapse); single-open accordion for section groups (re-opens the active group on nav); flyout on the collapsed rail (hover, viewport-clamped, Escape to close); mobile (≤760px) off-canvas drawer + 56px sticky top bar; unified PageHeader (meta row eyebrow-left / crumb-right, then title row). Landed via nav-tree.ts + Sidebar/SidebarAccount/MobileTopBar + AppShell, routes.ts flattened.',
      rejected: 'The prior chrome — top-nav + bottom-tab + per-section sub-navs. BAKED: the interaction model is no longer up for redesign in later rounds.',
      tokenDelta: 'Added the zn-* sidebar-geometry CSS section in app.css (shell geometry only; no brand-token changes).',
      contrastNotes: 'Inherited the locked S1.0 palette; no new colour.',
      motionNotes: 'Accordion + flyout transitions; reduced-motion respected; off-canvas drawer on mobile.',
      nextConstraints: 'Chrome BAKED. Refine the screen-level instrument language next — charts, status, density (becomes S1.2).',
    },
  },
  {
    session: 'S1.2',
    title: 'Calm-instrument screen language (prior rounds 3+4+5, FINAL)',
    status: 'closed',
    closedDate: '2026-06-12',
    propagation: 'physics',
    recordVsDecide: {
      record: ['the locked language (S1.0)', 'the baked left-nav IA (S1.1)'],
      decide: ['the chart language', 'the status-token system', 'compact density', 'populated states (ingest review, public register, WHOOP/Vault, invites)', 'dark + mobile reconciliation'],
    },
    outputs: {
      selected:
        'North star: every screen reads as one calm instrument — neutral structure, ink data, status carried only by the four canonical status colours, at a compact data-dense rhythm. Chart language = "frames" (ringed ink dot + hairline frame tick; thin connecting line; optimal band as a quiet vital tint at 50% with a mono band tag; milestones not dates; linear-fit projections; ONE app-wide frame-card tooltip). Status maps through canonical tokens on bands/dots/badges only — never the trend line. Populated states: ingest-review split-view (review decision IS the status language; commit gates on pending=0; field→source-line linkage), public register (landing/login on dot-grain), WHOOP/Vault direct-write imports (only lab PDFs are review-gated), settings invites flow. Dark full sweep + mobile ≤760px sweep both reconciled.',
      rejected: 'Airy/cozy density exploration (→ compact default; the data-density attribute mechanism removed). Correlation heatmap (built, reviewed, DROPPED — the table reads better at sparse pair counts). % MetricRing for status share (→ frame strip; rings reserved for true completion metrics only).',
      tokenDelta:
        '14 new tokens (all extending existing families): --optimal/--borderline/--deficient (+ -bg), --surface-low/--surface-low-2, --gap-card/--gap-section/--gap-row, --zn-page-top/--zn-brand-pad/--zn-brand-gap. 3 changed (deliberate, flagged): --dur-ring 900→1600ms; --vital-500/--energy-500 dark-only one step brighter. New zt-* component class layer + the ztPulse keyframe.',
      contrastNotes: 'Dark sweep: --vital-500/--energy-500 used as text on dark cards lifted one step (variable remap only, no per-component dark selectors). Body/title 11–16:1 (AAA); status tags ~4.5:1 (AA).',
      motionNotes: 'Ring sweep mount-only at --dur-ring 1600ms, 60ms stagger; data updates at --dur-base; reduced-motion → instant. Mobile sweep verdict taken from real layout geometry (screenshot artifacts noted).',
      nextConstraints: 'FINAL — foundation frozen. Open carry-overs become refinement LINEs: Reports surface has NO design treatment (deferred 3×); landing/login marketing copy is placeholder; real extraction sample pending.',
    },
  },
];

let charter: RoundManifest = newManifest('ZOETROP-R1', 'per-surface-import');
charter = {
  ...charter,
  lineType: 'charter',
  charter: 'ZOETROP-R1',
  medium: 'screen',
  syncedSha: sha,
  seedPath: `${roundsDir}/round1/package`,
  freezeCriteria: charterFreeze,
};
charter = markStage(charter, 'seeded', true);
charter = markStage(charter, 'returned', true); // all three sessions returned + integrated (pre-harness)
charter = markStage(charter, 'frozen', true); // foundation is shipped + live → archived
for (const b of blocks) charter = recordSession(charter, b);
charter = markLocked(charter, 'S1.0'); // brand language + token families locked at the foundation

writeManifest(resolve(`${roundsDir}/round1/round-manifest.json`), charter);
writeFileSync(resolve(`${roundsDir}/round1/DECISIONS.md`), renderManifestLedger(charter) + '\n');

// ─────────────────────────────────────────────────────────────────────────────
// round4 — FIRST refinement LINE (skeleton; staged, not yet run)
// ─────────────────────────────────────────────────────────────────────────────

let line: RoundManifest = newManifest('round4', 'per-surface-import');
line = {
  ...line,
  lineType: 'refinement',
  charter: 'ZOETROP-R1',
  medium: 'screen',
  surface: 'reports',
  syncedSha: sha,
  seedPath: `${roundsDir}/round4/package`,
};
line = markStage(line, 'seeded', true);
line = markStage(line, 'returned', false); // staged for the first refinement line — see PROMPT-LINE-reports.md

writeManifest(resolve(`${roundsDir}/round4/round-manifest.json`), line);
writeFileSync(resolve(`${roundsDir}/round4/DECISIONS.md`), renderManifestLedger(line) + '\n');

console.log(`round: wrote ${roundsDir}/round1/{round-manifest.json,DECISIONS.md} (charter ZOETROP-R1 FROZEN, synced ${sha.slice(0, 8)}, sessions: ${Object.keys(charter.sessions ?? {}).join(', ')}, lockedAt ${charter.lockedAt})`);
console.log(`round: wrote ${roundsDir}/round4/{round-manifest.json,DECISIONS.md} (first refinement LINE, lineType refinement, staged)`);
