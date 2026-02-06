#!/usr/bin/env npx tsx
/**
 * Migrate Seed Data to SQLite
 *
 * Loads the seed-data.json and imports it into the SQLite database.
 * Run with: npx tsx scripts/migrate-to-sqlite.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SQLiteAdapter } from '../src/lib/storage/sqlite';

const SEED_PATH = join(process.cwd(), 'public/.dev/seed-data.json');
const DB_PATH = join(process.cwd(), 'data/wellness.db');

async function migrate() {
  console.log('🗄️  SQLite Migration Script\n');

  // Check if seed data exists
  if (!existsSync(SEED_PATH)) {
    console.error(`❌ Seed data not found at: ${SEED_PATH}`);
    console.log('   Run the seed script first: npx tsx scripts/seed-initial-data.ts');
    process.exit(1);
  }

  // Load seed data
  console.log('📖 Loading seed data...');
  const seedData = JSON.parse(readFileSync(SEED_PATH, 'utf-8'));
  console.log(`   Found ${seedData.metrics.length.toLocaleString()} metrics\n`);

  // Initialize SQLite adapter
  console.log(`📁 Initializing SQLite database at: ${DB_PATH}`);
  const adapter = new SQLiteAdapter(DB_PATH);
  const initResult = await adapter.initialize();

  if (!initResult.success) {
    console.error('❌ Failed to initialize database:', initResult.error);
    process.exit(1);
  }
  console.log('   Database initialized\n');

  // Check if database already has data
  const existingCount = await adapter.getCount();
  if (existingCount > 0) {
    console.log(`⚠️  Database already contains ${existingCount.toLocaleString()} metrics`);
    console.log('   Use --force to clear and reimport\n');

    if (!process.argv.includes('--force')) {
      console.log('   Skipping import. Use --force to override.');
      adapter.close();
      process.exit(0);
    }

    console.log('   --force detected, clearing existing data...');
    await adapter.clearMetrics(true);
  }

  // Import metrics in batches
  console.log('📥 Importing metrics...');
  const batchSize = 1000;
  const metrics = seedData.metrics;
  let imported = 0;

  for (let i = 0; i < metrics.length; i += batchSize) {
    const batch = metrics.slice(i, i + batchSize);
    const result = await adapter.importMetrics(batch);

    if (!result.success) {
      console.error(`❌ Failed to import batch at index ${i}:`, result.error);
      adapter.close();
      process.exit(1);
    }

    imported += batch.length;
    const percent = Math.round((imported / metrics.length) * 100);
    process.stdout.write(`   Progress: ${imported.toLocaleString()} / ${metrics.length.toLocaleString()} (${percent}%)\r`);
  }

  console.log(`\n\n✅ Successfully imported ${imported.toLocaleString()} metrics`);

  // Show category breakdown
  console.log('\n📊 Category Breakdown:');
  const categories: Record<string, number> = {};
  for (const m of metrics) {
    categories[m.category] = (categories[m.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count.toLocaleString()}`);
  }

  // Verify
  const finalCount = await adapter.getCount();
  console.log(`\n🔍 Verification: ${finalCount.toLocaleString()} metrics in database`);
  console.log(`📁 Database file: ${adapter.getDbPath()}`);

  adapter.close();
  console.log('\n✨ Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
