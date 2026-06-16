/**
 * sync-core.ts — copy the design-roundtrip CORE source into the gitignored
 * .staging-core directory so this harness can import from @design-roundtrip/*
 * without a published npm package (A2 SHA-pinned local-sync pattern).
 *
 * Usage: npm run design:sync-core   (run once, or whenever CORE changes)
 *
 * The synced copy is gitignored and NOT committed. .staging-core/.source-sha
 * records the CORE commit SHA for provenance + staleness tracking.
 *
 * Override the CORE location with DESIGN_ROUNDTRIP_CORE (absolute, or relative
 * to the repo root).
 */

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
// Repo root is 3 levels up: bin/ → harness/ → design-bridge/ → zoetrop/ (repo root).
const REPO_ROOT = join(dirname(__filename), '..', '..', '..');

// Default: sibling ngtops checkout — zoetrop sits directly under Code/, so from
// the repo root the CORE is 1 up (zoetrop → Code) then NGT/ngtops/…
const CORE_DEFAULT = join(REPO_ROOT, '..', 'NGT', 'ngtops', 'services', 'design-roundtrip');
// resolve (not join) so an ABSOLUTE override is honoured as-is; a relative
// override stays anchored to the repo root.
const CORE = process.env['DESIGN_ROUNDTRIP_CORE']
  ? resolve(REPO_ROOT, process.env['DESIGN_ROUNDTRIP_CORE'])
  : CORE_DEFAULT;

const CORE_SRC = join(CORE, 'src');
const DEST = join(REPO_ROOT, 'design-bridge', 'harness', '.staging-core');
const DEST_SRC = join(DEST, 'src');

if (!existsSync(CORE_SRC)) {
  console.error(`ERROR: CORE src not found at ${CORE_SRC}`);
  console.error(`Set DESIGN_ROUNDTRIP_CORE (absolute, or relative to the repo root) to override.`);
  process.exit(1);
}

// Clear and recreate dest
if (existsSync(DEST)) rmSync(DEST, { recursive: true });
mkdirSync(DEST, { recursive: true });

/** Recursively copy a directory. */
function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

// Copy src/
copyDir(CORE_SRC, DEST_SRC);

// Copy package.json (records CORE deps for reference)
const pkgSrc = join(CORE, 'package.json');
if (existsSync(pkgSrc)) copyFileSync(pkgSrc, join(DEST, 'package.json'));

// Record source SHA (provenance pin)
let sha = '(unknown)';
try {
  sha = execSync('git rev-parse HEAD', { cwd: CORE }).toString().trim();
} catch {
  // Not a git repo or git not available — record placeholder
}
writeFileSync(join(DEST, '.source-sha'), sha + '\n');

console.log(`sync-core: copied ${CORE_SRC} → ${relative(REPO_ROOT, DEST_SRC)}`);
console.log(`sync-core: CORE source SHA = ${sha}`);
