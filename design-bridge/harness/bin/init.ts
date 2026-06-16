/**
 * init.ts — stand up the harness (RETURN-SPEC master + staging .gitignore).
 *
 * Imports the merged CORE `init` phase from its DEEP path (not the core barrel,
 * which pulls decode → tar; tar is not installed in this app). init pulls postcss
 * transitively via token-sync/parse, which IS available (Tailwind v4).
 *
 * Run: npm run design:init       (real)
 *      npm run design:init:dry   (manifest only, writes nothing)
 */

import { init } from '@design-roundtrip/core/init';
import { designBridgeConfig } from '../design-bridge.config';

const dryRun = process.argv.includes('--dry-run');
const result = init(designBridgeConfig, { dryRun });

console.log(JSON.stringify(result.manifest, null, 2));
console.log(
  dryRun
    ? `\n[dry-run] ${result.manifest.wrote.length} file(s) WOULD be written; nothing changed on disk.`
    : `\nwrote ${result.manifest.wrote.length} file(s); skipped ${result.manifest.skipped.length}.`,
);
