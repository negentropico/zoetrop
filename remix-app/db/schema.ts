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
import { relations, sql } from 'drizzle-orm';
import { user } from './auth-schema';

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
  'lab', // ← D-16: added for LLM-assisted lab ingest pipeline (Plan 05-01)
]);

// ── Lab ingest pipeline enums (Plan 05-01) ─────────────────────────────────────
export const labDocStatusEnum = pgEnum('lab_doc_status', [
  'uploaded',
  'processing',
  'pending_review',
  'completed',
  'failed',
]);

export const labExtractionStatusEnum = pgEnum('lab_extraction_status', [
  'pending_review',
  'approved',
  'rejected',
]);

export const confidenceLevelEnum = pgEnum('confidence_level', [
  'high',
  'low',
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

export const biologicalSexEnum = pgEnum('biological_sex', ['male', 'female', 'intersex']);

export const programTypeEnum = pgEnum('program_type', [
  'cessation',
  'substance_taper',
  'lifestyle_modification',
  'general',
]);

// ── Invites table (D-06: hand-rolled, single-use, role-scoped, expiring) ─────
// SECURITY: Only the SHA-256 hex hash of the raw token is stored (D-06 / T-031-INV-2).
// The raw token NEVER appears in this table. The logical FK from createdBy/consumedBy
// to user.id is valid because user is imported from ./auth-schema (which is also
// re-exported at the bottom of this file).
export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(), // SHA-256 hex of raw token — no raw-token column
  role: appRoleEnum('role').notNull(),              // the role this invite grants
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  createdBy: text('created_by').notNull().references(() => user.id),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),              // NULL = not yet used
  consumedBy: text('consumed_by').references(() => user.id),
  revokedAt: timestamp('revoked_at'),                // NULL = not revoked
  createdAt: timestamp('created_at').defaultNow(),
  subjectId: text('subject_id').references(() => subjects.id), // nullable — owner-bootstrap invites have no subject (D-01)
}, (t) => [
  index('idx_invites_tenant').on(t.tenantId),
  index('idx_invites_token_hash').on(t.tokenHash),
]);

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
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),   // NOT NULL — final state (Plan 04, migration 0004)
  subjectId: text('subject_id').notNull().references(() => subjects.id), // NOT NULL — final state (Plan 04, migration 0004)
});

// Protocol versions (P0 → P6)
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
  isActive: boolean('is_active').notNull().default(true),
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
  // Intake fields (v1.1 ONB-01) — all nullable; forward-looking demographic + program fields
  dob: timestamp('dob'),
  biologicalSex: biologicalSexEnum('biological_sex'),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  goals: text('goals'),
  intakeNotes: text('intake_notes'),
  programType: programTypeEnum('program_type'),
  programStartDate: timestamp('program_start_date'),
});

// Genetic variant profiles per subject/tenant.
// `gene` is the join key for the Phase 4 genetics knowledge module (D-03).
export const subjectGenotypes = pgTable('subject_genotypes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  gene: varchar('gene', { length: 100 }).notNull(),
  rsid: varchar('rsid', { length: 20 }),
  genotype: varchar('genotype', { length: 50 }).notNull(),
  assaySource: varchar('assay_source', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
}, (t) => [
  index('idx_subject_genotypes_tenant_subject').on(t.tenantId, t.subjectId),
]);

// ── Practitioner–Subject assignments (AUTH-03 / Phase 7) ─────────────────────
// Maps which subjects a practitioner is assigned to within a tenant.
// RLS policy (Plan 02 migration 0010): tenant-scoped — owner/practitioner can
// read their own tenant's assignments; app_user cannot cross tenant boundaries.
// `revokedAt` IS NULL means the assignment is currently active.
// Unique active index prevents duplicate assignments per (tenant, practitioner, subject).
export const practitionerSubjectAssignments = pgTable(
  'practitioner_subject_assignments',
  {
    id: text('id').primaryKey(),                                              // crypto.randomUUID()
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    practitionerId: text('practitioner_id').notNull().references(() => user.id),
    subjectId: text('subject_id').notNull().references(() => subjects.id),
    assignedBy: text('assigned_by').notNull().references(() => user.id),      // owner who created assignment
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
    revokedAt: timestamp('revoked_at'),                                        // null = active; non-null = revoked (soft-delete)
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('idx_psa_tenant').on(t.tenantId),
    index('idx_psa_practitioner').on(t.practitionerId),
    index('idx_psa_subject').on(t.subjectId),
    // PARTIAL unique index — active assignments only (revoked_at IS NULL).
    // Only active rows participate in uniqueness, so a revoked row no longer
    // occupies the key and a revoke-then-reassign cycle works correctly (CR-02).
    // A 23505 unique_violation therefore means a genuinely active duplicate, never
    // a stale revoked row.
    uniqueIndex('idx_psa_active_unique').on(t.tenantId, t.practitionerId, t.subjectId).where(sql`revoked_at IS NULL`),
  ]
);

// ── Lab ingest pipeline tables (Plan 05-01) ────────────────────────────────────

// lab_documents — uploaded PDF files awaiting or completed extraction (LAB-01)
// pdfBytes stored as text (base64) for pilot; TODO: migrate to Vercel Blob at M2
export const labDocuments = pgTable('lab_documents', {
  id: text('id').primaryKey(),                          // UUID v4, set by the upload action
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  uploadedBy: text('uploaded_by').notNull().references(() => user.id),
  status: labDocStatusEnum('status').notNull().default('uploaded'),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  pdfBytes: text('pdf_bytes'),                          // base64 PDF; nullable (set null after all extractions resolved)
  pageCount: integer('page_count'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('idx_lab_documents_tenant_subject').on(t.tenantId, t.subjectId),
  index('idx_lab_documents_status').on(t.status),
]);

// lab_extractions — per-field LLM extraction results awaiting practitioner review (LAB-02/04)
// Raw fields: verbatim from LLM. Resolved fields: matched from dictionary (D-01).
export const labExtractions = pgTable('lab_extractions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  labDocumentId: text('lab_document_id').notNull().references(() => labDocuments.id),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  // Raw extraction from LLM (verbatim)
  rawAnalyteName: varchar('raw_analyte_name', { length: 255 }).notNull(),
  rawValue: real('raw_value').notNull(),
  rawUnit: varchar('raw_unit', { length: 50 }).notNull(),
  sourceTextSnippet: text('source_text_snippet'),       // verbatim text from the PDF page
  pageNumber: integer('page_number'),
  // Validation results (LAB-03)
  confidence: confidenceLevelEnum('confidence').notNull().default('high'),
  rangeFlag: varchar('range_flag', { length: 50 }),     // 'normal' | 'below_reference' | 'above_reference' | 'no_range_data'
  unrecognized: boolean('unrecognized').notNull().default(false),
  // Resolved (dictionary-matched) fields — populated for recognized analytes (D-01)
  resolvedMetricName: varchar('resolved_metric_name', { length: 255 }),
  resolvedCategory: metricCategoryEnum('resolved_category'),
  resolvedSubcategory: varchar('resolved_subcategory', { length: 100 }),
  resolvedUnit: varchar('resolved_unit', { length: 50 }),
  resolvedReferenceMin: real('resolved_reference_min'),
  resolvedReferenceMax: real('resolved_reference_max'),
  resolvedOptimalMin: real('resolved_optimal_min'),
  resolvedOptimalMax: real('resolved_optimal_max'),
  resolvedImprovement: varchar('resolved_improvement', { length: 50 }),
  // Review outcome (LAB-04)
  status: labExtractionStatusEnum('status').notNull().default('pending_review'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: text('reviewed_by').references(() => user.id),
  // Specimen collection date captured from the lab report (LAB-06-FIX / gap-closure)
  // Nullable: not every PDF yields a parseable collection date.
  // Source: LLM extraction reads "Collected"/"Date Collected"/"Collection Date"/"Specimen Collected" field.
  collectedAt: timestamp('collected_at'),
  // Final approved value (may be edited during review)
  approvedValue: real('approved_value'),
  approvedUnit: varchar('approved_unit', { length: 50 }),
  // FK to committed metric row (set after approval — LAB-05)
  committedMetricId: varchar('committed_metric_id', { length: 36 }).references(() => metrics.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('idx_lab_extractions_doc').on(t.labDocumentId),
  index('idx_lab_extractions_tenant_subject').on(t.tenantId, t.subjectId),
]);

// audit_log — lifecycle event log for the lab ingest pipeline (LAB-05 / D-13)
// SECURITY: NO PHI field values — only IDs and metadata. D-13 constraint.
// Verified by ingest-schema.test.ts: no column named 'value' or 'name'.
export const auditLog = pgTable('audit_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: text('user_id').notNull().references(() => user.id),
  role: appRoleEnum('role').notNull(),
  action: varchar('action', { length: 50 }).notNull(),   // 'upload' | 'extraction-complete' | 'approve' | 'reject' | 'metric-insert'
  tableName: varchar('table_name', { length: 100 }),     // 'metrics' | 'lab_documents' | etc.
  operation: varchar('operation', { length: 20 }),       // 'insert' | 'update'
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  // Nullable (migration 0013): auth events (sign-in/out/sign-up) have NO clinical
  // subject at write time — NULL is semantically honest. FK validates when non-NULL.
  subjectId: text('subject_id').references(() => subjects.id),
  // NO PHI columns — only the entity ID (not its value), D-13
  entityId: text('entity_id'),                           // ID of the affected row (not its value or name)
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (t) => [
  index('idx_audit_log_tenant_subject').on(t.tenantId, t.subjectId),
  index('idx_audit_log_timestamp').on(t.timestamp),
]);

// consent_log — per-subject consent records for PHI processing (LAB-06 / D-08)
// Consent gate: upload action checks for a consentLog row before any PHI insert.
// D-09: designed generically for future client intake (not pilot-specific).
export const consentLog = pgTable('consent_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  consentedAt: timestamp('consented_at').notNull(),
  consentVersion: varchar('consent_version', { length: 50 }).notNull(), // e.g. 'v1-pilot-self'
  consentedByUserId: text('consented_by_user_id').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_consent_log_subject').on(t.subjectId),
]);

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

export const invitesRelations = relations(invites, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invites.tenantId],
    references: [tenants.id],
  }),
  createdByUser: one(user, {
    fields: [invites.createdBy],
    references: [user.id],
  }),
}));

export const subjectGenotypesRelations = relations(subjectGenotypes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subjectGenotypes.tenantId],
    references: [tenants.id],
  }),
  subject: one(subjects, {
    fields: [subjectGenotypes.subjectId],
    references: [subjects.id],
  }),
}));

export const labDocumentsRelations = relations(labDocuments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [labDocuments.tenantId],
    references: [tenants.id],
  }),
  subject: one(subjects, {
    fields: [labDocuments.subjectId],
    references: [subjects.id],
  }),
  uploadedByUser: one(user, {
    fields: [labDocuments.uploadedBy],
    references: [user.id],
  }),
  extractions: many(labExtractions),
}));

export const labExtractionsRelations = relations(labExtractions, ({ one }) => ({
  document: one(labDocuments, {
    fields: [labExtractions.labDocumentId],
    references: [labDocuments.id],
  }),
  tenant: one(tenants, {
    fields: [labExtractions.tenantId],
    references: [tenants.id],
  }),
  subject: one(subjects, {
    fields: [labExtractions.subjectId],
    references: [subjects.id],
  }),
  reviewedByUser: one(user, {
    fields: [labExtractions.reviewedBy],
    references: [user.id],
  }),
  committedMetric: one(metrics, {
    fields: [labExtractions.committedMetricId],
    references: [metrics.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
  tenant: one(tenants, {
    fields: [auditLog.tenantId],
    references: [tenants.id],
  }),
  subject: one(subjects, {
    fields: [auditLog.subjectId],
    references: [subjects.id],
  }),
}));

export const consentLogRelations = relations(consentLog, ({ one }) => ({
  subject: one(subjects, {
    fields: [consentLog.subjectId],
    references: [subjects.id],
  }),
  consentedByUser: one(user, {
    fields: [consentLog.consentedByUserId],
    references: [user.id],
  }),
}));

// ── Engine corpus tables (Plan 06-02) ─────────────────────────────────────────

// evidence_tier ('k1'|'k2'|'k3'|'k4') — DISTINCT from confidence_level ('high'|'low')
// D-05: new non-nullable K enum; named distinctly to avoid collision with confidenceLevelEnum.
export const evidenceTierEnum = pgEnum('evidence_tier', ['k1', 'k2', 'k3', 'k4']);

// geneticVariants — non-PHI corpus table for population-level gene/variant knowledge.
// NO tenantId/subjectId — D-06: corpus tables hold non-PHI population-level knowledge.
// PHI (subject's actual genotype) stays in subject_genotypes.
// join key: gene (case-sensitive, matches subject_genotypes.gene)
export const geneticVariants = pgTable('genetic_variants', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  gene: varchar('gene', { length: 100 }).notNull(),
  rsid: varchar('rsid', { length: 20 }),
  // Genotype pattern: the specific allele combo this entry applies to (e.g. 'Val/Met', 'A/G').
  // NULL = gene-level fallback (applies to any variant in this gene).
  genotypePattern: varchar('genotype_pattern', { length: 50 }),
  category: varchar('category', { length: 50 }).notNull(),
  impact: varchar('impact', { length: 50 }).notNull(),
  clinicalImplication: text('clinical_implication').notNull(),
  // Non-PHI knowledge source — NOT the subject's assay source (that is in subject_genotypes.assaySource)
  knowledgeSource: varchar('knowledge_source', { length: 255 }),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_genetic_variants_gene').on(t.gene),
]);

// variantProtocolMap — evidence-tiered finding→action edges for genetic variants.
// One row per (variant, genotype pattern, action). Non-PHI.
// D-08: both variant-mapping and metric-rule recommendations carry their own evidence-tier K.
export const variantProtocolMap = pgTable('variant_protocol_map', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  variantId: integer('variant_id').notNull().references(() => geneticVariants.id),
  // Evidence tier — non-nullable (ROADMAP SC1, D-05)
  evidenceTier: evidenceTierEnum('evidence_tier').notNull(),
  // Pre-hedged, non-imperative recommendation text (authored once in corpus).
  // Assembled at render time as: "K{N} ({label}): {recommendationText}"
  recommendationText: text('recommendation_text').notNull(),
  // Evidence citation (DOI, SR title, or "Expert consensus: IFM 2023")
  evidenceCitation: text('evidence_citation'),
  // Optional supplementary action details (dose, timing) stored separately
  actionDetail: text('action_detail'),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_variant_protocol_map_variant').on(t.variantId),
  index('idx_variant_protocol_map_tier').on(t.evidenceTier),
]);

// metricProtocolMap — evidence-tiered finding→action edges for lab/metric findings.
// D-04: the metric→protocol rule layer, the third corpus source beyond the two genetic tables.
// Non-PHI. Triggered when a subject's metric is in a non-optimal condition.
// D-08: carries its own evidenceTier K (distinct from detection confidence).
export const metricProtocolMap = pgTable('metric_protocol_map', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  // Trigger condition: metric name + status combination
  metricName: varchar('metric_name', { length: 255 }).notNull(),
  // 'deficient'|'excess'|'borderline'|'any_non_optimal'
  conditionStatus: varchar('condition_status', { length: 50 }).notNull(),
  category: metricCategoryEnum('category').notNull(),
  evidenceTier: evidenceTierEnum('evidence_tier').notNull(),
  recommendationText: text('recommendation_text').notNull(),
  evidenceCitation: text('evidence_citation'),
  actionDetail: text('action_detail'),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_metric_protocol_map_name').on(t.metricName),
  index('idx_metric_protocol_map_category').on(t.category),
]);

// reports — frozen versioned snapshot per subject report generation.
// tenantId/subjectId scoped (PHI-adjacent: links to a subject).
// snapshot is typed as ReportSnapshot (see app/types/report.ts) — immutable after write (D-17).
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),                     // crypto.randomUUID() set by caller
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  generatedBy: text('generated_by').notNull().references(() => user.id),
  corpusVersion: varchar('corpus_version', { length: 50 }).notNull(),
  // Frozen snapshot — contains inputs summary + graded recommendations. No raw PHI values.
  snapshot: jsonb('snapshot').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_reports_tenant_subject').on(t.tenantId, t.subjectId),
]);

// Re-export Better-Auth tables so drizzleAdapter can locate them via barrel import
export * from './auth-schema';
