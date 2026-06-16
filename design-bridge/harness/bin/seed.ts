/**
 * seed.ts — generate the outbound package for a round/line (README + BRIEF +
 * RETURN-SPEC + current-state token snapshot). seed never touches an adapter,
 * so its DEEP import pulls no heavy deps.
 *
 * Run: npm run design:seed                  (defaults to round1 — the charter foundation)
 *      npm run design:seed -- --round=round4 (a refinement line)
 */

import { seed } from '@design-roundtrip/core/seed';
import { designBridgeConfig } from '../design-bridge.config';

const roundArg = process.argv.find((a) => a.startsWith('--round='));
const round = roundArg ? roundArg.split('=')[1]! : 'round1';
const outDir = `${designBridgeConfig.dirs.rounds}/${round}/package`;
const title =
  round === 'round1'
    ? 'ZOETROP-R1 charter — design language, IA spine, calm-instrument screen system (foundation)'
    : 'Refinement line — current-state foundation snapshot';

const result = seed(designBridgeConfig, { round, outDir, title });

console.log(JSON.stringify(result.manifest, null, 2));
console.log(`\nseeded ${round} → ${result.packageDir} (${result.manifest.wrote.length} files)`);
