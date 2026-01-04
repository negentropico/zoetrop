/**
 * Tests for Vault Markdown Parser
 */

import { describe, it, expect } from 'vitest';
import { parseVaultMarkdown } from '@/lib/vault/parser';

const SAMPLE_BLOOD_WORK = `# 04 - Blood Work

## Metabolic Panel

| Marker | M2 Value | Optimal Range | Status | 2026 Priority |
|--------|:--------:|:-------------:|:------:|:-------------:|
| **Glucose** | 82 mg/dL | 75-90 | ✅ Optimal | Medium |
| **HbA1c** | 5.2% | <5.3% | ✅ Optimal | Medium |
| **Creatinine** | 1.18 mg/dL | 0.7-1.1 | ⚠️ Elevated | High |
| **eGFR** | 78 mL/min | >90 | ⚠️ Low | High |

---

## Lipid Panel

| Marker | M2 Value | Optimal Range | Status | 2026 Priority |
|--------|:--------:|:-------------:|:------:|:-------------:|
| **Total Cholesterol** | 175 mg/dL | <200 | ✅ Good | Low |
| **HDL** | 43 mg/dL | >40 | ✅ Adequate | Medium |
| **LDL** | 115 mg/dL | <100 | ⚠️ Above | High |
`;

const SAMPLE_HORMONES = `# Hormonal Panel

| Marker | M2 Value | Optimal | Status |
|--------|:--------:|:-------:|:------:|
| **Total Testosterone** | 470 ng/dL | 500-800 | 🔴 LOW |
| **TSH** | 2.30 μIU/mL | 0.4-4.0 | ✅ Normal |
`;

const EMPTY_CONTENT = '';

const NO_TABLES = `# Just a Heading

Some text without any tables.

## Another Section

More text here.
`;

describe('parseVaultMarkdown', () => {
  it('should parse blood work tables into staging format', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, {
      file: 'test.md',
      type: 'vault',
      collectedAt: '2025-05-01',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.summary.totalMetrics).toBe(7);
  });

  it('should correctly categorize metabolic panel metrics', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    expect(result.success).toBe(true);
    const metabolicCategory = result.data?.categories.find((c) => c.category === 'metabolic');
    expect(metabolicCategory).toBeDefined();
    expect(metabolicCategory?.metrics.length).toBe(4);
  });

  it('should correctly categorize lipid panel metrics', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    expect(result.success).toBe(true);
    const lipidsCategory = result.data?.categories.find((c) => c.category === 'lipids');
    expect(lipidsCategory).toBeDefined();
    expect(lipidsCategory?.metrics.length).toBe(3);
  });

  it('should parse metric values correctly', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    expect(result.success).toBe(true);
    const metabolic = result.data?.categories.find((c) => c.category === 'metabolic');
    const glucose = metabolic?.metrics.find((m) => m.name === 'Glucose');

    expect(glucose).toBeDefined();
    expect(glucose?.value).toBe(82);
    expect(glucose?.unit).toBe('mg/dL');
  });

  it('should parse status from emoji', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    expect(result.success).toBe(true);
    const metabolic = result.data?.categories.find((c) => c.category === 'metabolic');

    const glucose = metabolic?.metrics.find((m) => m.name === 'Glucose');
    expect(glucose?.status).toBe('optimal');

    const creatinine = metabolic?.metrics.find((m) => m.name === 'Creatinine');
    expect(creatinine?.status).toBe('borderline');
  });

  it('should parse deficient status', () => {
    const result = parseVaultMarkdown(SAMPLE_HORMONES, { file: 'test.md' });

    expect(result.success).toBe(true);
    const hormones = result.data?.categories.find((c) => c.category === 'hormones');
    const testosterone = hormones?.metrics.find((m) => m.name === 'Total Testosterone');

    expect(testosterone?.status).toBe('deficient');
  });

  it('should parse range format "75-90"', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    const metabolic = result.data?.categories.find((c) => c.category === 'metabolic');
    const glucose = metabolic?.metrics.find((m) => m.name === 'Glucose');

    expect(glucose?.optimalRange).toBeDefined();
    expect(glucose?.optimalRange?.min).toBe(75);
    expect(glucose?.optimalRange?.max).toBe(90);
  });

  it('should parse range format "<100"', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    const lipids = result.data?.categories.find((c) => c.category === 'lipids');
    const ldl = lipids?.metrics.find((m) => m.name === 'LDL');

    expect(ldl?.optimalRange).toBeDefined();
    expect(ldl?.optimalRange?.operator).toBe('lt');
    expect(ldl?.optimalRange?.value).toBe(100);
  });

  it('should parse range format ">90"', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    const metabolic = result.data?.categories.find((c) => c.category === 'metabolic');
    const egfr = metabolic?.metrics.find((m) => m.name === 'eGFR');

    expect(egfr?.optimalRange).toBeDefined();
    expect(egfr?.optimalRange?.operator).toBe('gt');
    expect(egfr?.optimalRange?.value).toBe(90);
  });

  it('should fail on empty content', () => {
    const result = parseVaultMarkdown(EMPTY_CONTENT, { file: 'test.md' });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Empty content');
  });

  it('should fail when no tables found', () => {
    const result = parseVaultMarkdown(NO_TABLES, { file: 'test.md' });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('No tables found in markdown');
  });

  it('should set source metadata correctly', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, {
      file: '/path/to/blood_work.md',
      type: 'vault',
      collectedAt: '2025-05-01',
      version: 'M2',
    });

    expect(result.success).toBe(true);
    expect(result.data?.source.file).toBe('/path/to/blood_work.md');
    expect(result.data?.source.type).toBe('vault');
    expect(result.data?.source.collectedAt).toBe('2025-05-01');
    expect(result.data?.source.version).toBe('M2');
  });

  it('should calculate summary statistics', () => {
    const result = parseVaultMarkdown(SAMPLE_BLOOD_WORK, { file: 'test.md' });

    expect(result.success).toBe(true);
    expect(result.data?.summary.totalMetrics).toBe(7);
    expect(result.data?.summary.byCategory.metabolic).toBe(4);
    expect(result.data?.summary.byCategory.lipids).toBe(3);
    expect(result.data?.summary.byStatus.optimal).toBeGreaterThan(0);
    expect(result.data?.summary.byStatus.borderline).toBeGreaterThan(0);
  });
});
