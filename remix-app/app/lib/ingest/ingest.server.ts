/**
 * ingest.server.ts — extractionWorker background orchestrator (LAB-02/03)
 *
 * Orchestrates the full lab ingest pipeline for a single labDocuments row:
 *   1. UPDATE status → 'processing'
 *   2. unpdf extractText → per-page text array (for grounding)
 *   3. extractLabValues (Anthropic claude-sonnet-4-6) → raw extractions
 *   4. For each extraction: checkGrounding + lookupAnalyte + checkRange → INSERT labExtractions
 *   5. UPDATE status → 'pending_review' + insertAuditLog
 *
 * Called via waitUntil(extractionWorker(docId)) from the upload action so the
 * HTTP response returns within 2s while extraction runs in the background.
 *
 * Phase 7 LLM-BAA external-client PHI boundary (D-14):
 *   This worker processes PDFs for the pilot (owner-only). External-client
 *   PHI extraction is hard-blocked until Phase 7 BAA. Do NOT relax this
 *   boundary before Phase 7.
 *
 * Error handling (Risk #4):
 *   On any uncaught error, the worker sets labDocuments.status='failed' and
 *   stores the error message server-side only (V7 — no stack trace to client).
 *   The error is swallowed after recording so waitUntil ends cleanly.
 */

import { getDb } from "../db.server";
import { eq } from "drizzle-orm";
import { labDocuments, labExtractions } from "../../../db/schema";
import { extractText } from "unpdf";
import { extractLabValues } from "./extraction.server";
import { checkGrounding } from "./grounding";
import { checkRange } from "./range-check";
import { lookupAnalyte } from "./analyte-dictionary";
import { insertAuditLogAdmin } from "../audit.server";

// ── extractionWorker ───────────────────────────────────────────────────────
//
// Background job: called via waitUntil from the upload action. Processes one
// labDocuments row end-to-end and writes all labExtractions rows.

export async function extractionWorker(
  labDocumentId: string
): Promise<void> {
  const db = getDb();

  try {
    // 1. Transition to processing
    await db
      .update(labDocuments)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(labDocuments.id, labDocumentId));

    // 2. Load the document row (need pdfBytes, tenantId, subjectId, uploadedBy)
    const [doc] = await db
      .select()
      .from(labDocuments)
      .where(eq(labDocuments.id, labDocumentId))
      .limit(1);

    if (!doc) {
      throw new Error(`labDocument not found: ${labDocumentId}`);
    }

    if (!doc.pdfBytes) {
      throw new Error(`labDocument has no pdfBytes: ${labDocumentId}`);
    }

    // 3. Server-side text extraction (unpdf) — pageTexts array for grounding
    //    pdfBytes is stored as base64 text; decode to Uint8Array for unpdf.
    const pdfBuffer = Buffer.from(doc.pdfBytes, "base64");
    const { text: pageTexts } = await extractText(
      new Uint8Array(pdfBuffer),
      { mergePages: false }
    );

    // 4. LLM extraction (Anthropic claude-sonnet-4-6)
    const rawExtractions = await extractLabValues(doc.pdfBytes);

    // 5. Per-extraction validation pipeline → INSERT labExtractions
    for (const extraction of rawExtractions) {
      let confidence: "high" | "low" = "high";
      let unrecognized = false;
      let rangeFlag: string | null = null;

      // 5a. Grounding check — snippet must be verbatim in the PDF page text
      const groundingResult = checkGrounding(
        extraction.sourceTextSnippet,
        pageTexts,
        extraction.pageNumber
      );
      if (groundingResult === "low_confidence") {
        confidence = "low";
      }

      // 5b. Dictionary lookup — D-02: never drop unrecognized analytes
      const dictEntry = lookupAnalyte(extraction.analyte);

      let resolvedMetricName: string | undefined;
      let resolvedCategory: typeof doc.status extends string ? string : never | undefined;
      let resolvedSubcategory: string | undefined;
      let resolvedUnit: string | undefined;
      let resolvedReferenceMin: number | undefined;
      let resolvedReferenceMax: number | undefined;
      let resolvedOptimalMin: number | undefined;
      let resolvedOptimalMax: number | undefined;
      let resolvedImprovement: string | undefined;

      if (!dictEntry) {
        // D-02: unrecognized analyte — surfaces in review UI, never silently dropped
        unrecognized = true;
        confidence = "low";
        rangeFlag = "no_range_data";
      } else {
        // D-04: unit mismatch → unrecognized path (no silent conversion)
        if (extraction.unit !== dictEntry.unit) {
          unrecognized = true;
          confidence = "low";
          rangeFlag = "no_range_data";
        } else {
          // Recognized analyte with matching unit — populate resolved fields
          resolvedMetricName = dictEntry.name;
          resolvedSubcategory = dictEntry.subcategory;
          resolvedUnit = dictEntry.unit;
          resolvedReferenceMin = dictEntry.referenceMin ?? undefined;
          resolvedReferenceMax = dictEntry.referenceMax ?? undefined;
          resolvedOptimalMin = dictEntry.optimalMin ?? undefined;
          resolvedOptimalMax = dictEntry.optimalMax ?? undefined;
          resolvedImprovement = dictEntry.improvement;

          // 5c. Range check against dictionary bounds
          rangeFlag = checkRange(
            extraction.value,
            dictEntry.referenceMin,
            dictEntry.referenceMax
          );
        }
      }

      // Parse collectionDate string → Date; guard against empty/invalid
      let collectedAt: Date | null = null;
      if (extraction.collectionDate && extraction.collectionDate.trim() !== "") {
        const parsed = new Date(extraction.collectionDate);
        if (!isNaN(parsed.getTime())) {
          collectedAt = parsed;
        }
      }

      await db.insert(labExtractions).values({
        labDocumentId,
        tenantId: doc.tenantId,
        subjectId: doc.subjectId,
        // Raw extraction fields
        rawAnalyteName: extraction.analyte,
        rawValue: extraction.value,
        rawUnit: extraction.unit,
        sourceTextSnippet: extraction.sourceTextSnippet,
        pageNumber: extraction.pageNumber,
        // Specimen collection date (null if not parseable)
        collectedAt,
        // Validation results
        confidence,
        rangeFlag,
        unrecognized,
        // Resolved (dictionary-matched) fields
        ...(resolvedMetricName !== undefined && {
          resolvedMetricName,
          resolvedSubcategory,
          resolvedUnit,
          resolvedReferenceMin,
          resolvedReferenceMax,
          resolvedOptimalMin,
          resolvedOptimalMax,
          resolvedImprovement,
        }),
        // Resolved category requires mapping from string to enum
        ...(dictEntry && !unrecognized && {
          resolvedCategory: dictEntry.category,
        }),
        status: "pending_review",
      });
    }

    // 6. Update document status to pending_review
    await db
      .update(labDocuments)
      .set({ status: "pending_review", updatedAt: new Date() })
      .where(eq(labDocuments.id, labDocumentId));

    // 7. Audit log — D-13: no PHI values, only IDs and metadata
    // extractionWorker runs as a background job (waitUntil, no session) →
    // admin path (getDb/neondb_owner) bypasses RLS intentionally.
    await insertAuditLogAdmin({
      userId: doc.uploadedBy,
      role: "owner", // extraction runs server-side; role recorded for audit trail
      action: "extraction-complete",
      tableName: "lab_extractions",
      operation: "insert",
      tenantId: doc.tenantId,
      subjectId: doc.subjectId,
      entityId: labDocumentId,
    });
  } catch (err) {
    // Error handling: record failure server-side only (V7 — no stack to client)
    // Swallow after recording so waitUntil ends cleanly (Risk #4).
    const errorMessage =
      err instanceof Error ? err.message : "Unknown extraction error";
    try {
      await getDb()
        .update(labDocuments)
        .set({
          status: "failed",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(labDocuments.id, labDocumentId));
    } catch {
      // If the error update also fails, swallow silently — waitUntil must end cleanly
    }
  }
}
