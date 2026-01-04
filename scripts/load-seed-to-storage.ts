/**
 * Load Seed Data to Storage Format
 *
 * Converts seed-data.json to localStorage format and outputs it.
 * This can be used to:
 * 1. Generate a console command to paste in browser
 * 2. Verify the data structure
 *
 * Run: npx tsx scripts/load-seed-to-storage.ts
 */

import { readFileSync, writeFileSync } from 'fs';

const SEED_PATH = '/Users/mac/Code/Tracker/.dev/seed-data.json';
const OUTPUT_PATH = '/Users/mac/Code/Tracker/.dev/localStorage-data.json';

interface SeedData {
  metrics: any[];
  summary: any;
}

interface StoredMetrics {
  metrics: any[];
  lastUpdated: string;
  syncVersion: number;
}

async function main() {
  console.log('📦 Loading seed data...\n');

  // Read seed data
  const seedContent = readFileSync(SEED_PATH, 'utf-8');
  const seedData: SeedData = JSON.parse(seedContent);

  console.log(`Found ${seedData.metrics.length} metrics`);

  // Convert to localStorage format
  const storageData: StoredMetrics = {
    metrics: seedData.metrics,
    lastUpdated: new Date().toISOString(),
    syncVersion: 1,
  };

  // Write to file for verification
  writeFileSync(OUTPUT_PATH, JSON.stringify(storageData, null, 2));
  console.log(`\n📁 Wrote localStorage format to: ${OUTPUT_PATH}`);

  // Generate console command
  const compactData = JSON.stringify(storageData);
  const consoleCommand = `localStorage.setItem('wellness_tracker_metrics', '${compactData.replace(/'/g, "\\'")}'); location.reload();`;

  console.log('\n📋 Console command length:', consoleCommand.length, 'characters');
  console.log('\n✅ To load in browser:');
  console.log('   1. Open http://localhost:4322');
  console.log('   2. Open browser DevTools (F12)');
  console.log('   3. Go to Console tab');
  console.log('   4. Run the command from .dev/console-load.js');

  // Write console command to file (too long for terminal)
  writeFileSync('/Users/mac/Code/Tracker/.dev/console-load.js', consoleCommand);
  console.log('\n📁 Console command saved to: .dev/console-load.js');

  // Show summary
  console.log('\n📊 Data Summary:');
  const byCategory: Record<string, number> = {};
  for (const m of seedData.metrics) {
    byCategory[m.category] = (byCategory[m.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count}`);
  }
}

main().catch(console.error);
