import {
  pgTable,
  varchar,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  pgEnum,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const metricCategoryEnum = pgEnum('metric_category', [
  'vitamins',
  'minerals',
  'inflammatory',
  'metabolic',
  'hormones',
  'autonomic',
  'bodyComposition',
  'lipids',
  'hematology',
]);

export const metricStatusEnum = pgEnum('metric_status', [
  'optimal',
  'borderline',
  'deficient',
  'excess',
]);

export const dataSourceEnum = pgEnum('data_source', [
  'manual',
  'whoop',
  'dexa',
  'bloodwork',
  'csv',
  'vault',
]);

export const syncStatusEnum = pgEnum('sync_status', [
  'local',
  'synced',
  'pending',
]);

export const supplementTierEnum = pgEnum('supplement_tier', [
  'tier1',
  'tier2',
  'tier3',
  'as_needed',
]);

export const protocolChangeTypeEnum = pgEnum('protocol_change_type', [
  'added',
  'removed',
  'dosage_changed',
  'timing_changed',
  'frequency_changed',
]);

export const cessationPhaseEnum = pgEnum('cessation_phase', [
  'acute',       // Days 1-21
  'stabilization', // Days 22-60
  'clearing',    // Days 61-120
  'optimization', // Days 121-150
]);

export const appRoleEnum = pgEnum('app_role', ['owner', 'practitioner', 'client']);

// Core metrics table
export const metrics = pgTable('metrics', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  value: real('value').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  category: metricCategoryEnum('category').notNull(),
  subcategory: varchar('subcategory', { length: 100 }),
  timestamp: timestamp('timestamp').notNull(),
  description: text('description'),
  improvement: varchar('improvement', { length: 50 }).notNull(), // 'higher is better' | 'lower is better' | 'target range'
  referenceMin: real('reference_min'),
  referenceMax: real('reference_max'),
  optimalMin: real('optimal_min'),
  optimalMax: real('optimal_max'),
  source: dataSourceEnum('source').notNull(),
  syncStatus: syncStatusEnum('sync_status').notNull().default('local'),
  syncVersion: integer('sync_version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Protocol versions (601 → 602 → 603)
export const protocolVersions = pgTable('protocol_versions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  version: varchar('version', { length: 10 }).notNull(), // global unique removed in Plan 02; per-subject composite UNIQUE added in Plan 04 (TEN-04)
  effectiveDate: timestamp('effective_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
}, (t) => [
  // TEN-04: per-subject version uniqueness (old global UNIQUE dropped in migration 0002)
  uniqueIndex('protocol_versions_tenant_subject_version_unique').on(t.tenantId, t.subjectId, t.version),
  // TEN-01: composite index for efficient tenant+subject scoping
  index('idx_protocol_versions_tenant_subject').on(t.tenantId, t.subjectId),
]);

// Protocol changes (what changed between versions)
export const protocolChanges = pgTable('protocol_changes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  versionId: integer('version_id').notNull().references(() => protocolVersions.id),
  supplementName: varchar('supplement_name', { length: 255 }).notNull(),
  changeType: protocolChangeTypeEnum('change_type').notNull(),
  oldDosage: varchar('old_dosage', { length: 100 }),
  newDosage: varchar('new_dosage', { length: 100 }),
  rationale: text('rationale'),
  createdAt: timestamp('created_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Milestones with biometric snapshots
export const milestones = pgTable('milestones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  protocolVersion: varchar('protocol_version', { length: 10 }),
  biometricSnapshot: jsonb('biometric_snapshot'), // Snapshot of key metrics at this point
  createdAt: timestamp('created_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Supplements with genetic basis
export const supplements = pgTable('supplements', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  dosage: real('dosage').notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  frequency: varchar('frequency', { length: 100 }).notNull(), // e.g., "daily", "twice daily", "3x/week"
  tier: supplementTierEnum('tier').notNull(),
  geneticBasis: text('genetic_basis'), // Which genetic variants justify this supplement
  timing: varchar('timing', { length: 100 }), // e.g., "with meals", "AM only", "before bed"
  notes: text('notes'),
  isActive: integer('is_active').notNull().default(1), // Boolean as int for SQLite compat
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Supplement log (track when supplements are taken)
export const supplementLog = pgTable('supplement_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  supplementId: integer('supplement_id').notNull().references(() => supplements.id),
  takenAt: timestamp('taken_at').notNull(),
  dosage: real('dosage'), // Override if different from default
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Correlations (calculated relationships between supplements and metrics)
export const correlations = pgTable('correlations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  supplementId: integer('supplement_id').notNull().references(() => supplements.id),
  metricName: varchar('metric_name', { length: 255 }).notNull(),
  correlation: real('correlation').notNull(), // Pearson correlation coefficient (-1 to 1)
  lagDays: integer('lag_days').notNull().default(0), // Days offset for the correlation
  sampleSize: integer('sample_size').notNull(),
  pValue: real('p_value'), // Statistical significance
  calculatedAt: timestamp('calculated_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Cessation tracking (FAAH-based 120+ day protocol)
export const cessationLog = pgTable('cessation_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  startDate: timestamp('start_date').notNull(),
  currentPhase: cessationPhaseEnum('current_phase').notNull().default('acute'),
  endDate: timestamp('end_date'), // Null if still in progress
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Tenancy spine (D-03 full spine)
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subjects.tenantId],
    references: [tenants.id],
  }),
}));

export const protocolVersionsRelations = relations(protocolVersions, ({ many }) => ({
  changes: many(protocolChanges),
}));

export const protocolChangesRelations = relations(protocolChanges, ({ one }) => ({
  version: one(protocolVersions, {
    fields: [protocolChanges.versionId],
    references: [protocolVersions.id],
  }),
}));

export const supplementsRelations = relations(supplements, ({ many }) => ({
  logs: many(supplementLog),
  correlations: many(correlations),
}));

export const supplementLogRelations = relations(supplementLog, ({ one }) => ({
  supplement: one(supplements, {
    fields: [supplementLog.supplementId],
    references: [supplements.id],
  }),
}));

export const correlationsRelations = relations(correlations, ({ one }) => ({
  supplement: one(supplements, {
    fields: [correlations.supplementId],
    references: [supplements.id],
  }),
}));

// Re-export Better-Auth tables so drizzleAdapter can locate them via barrel import
export * from './auth-schema';
