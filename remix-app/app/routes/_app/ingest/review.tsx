/**
 * review.tsx — LAB-04/05 lab extraction review surface
 *
 * Loader: requireUser + assertSubjectAccess → loads labDocuments + labExtractions
 * scoped by tenant/subject. Returns {doc, extractions}.
 *
 * Component: split view — left panel shows the real PDF page via PdfPageViewer
 * with the grounded sourceTextSnippet highlighted (D-06); right panel shows the
 * extracted fields list with per-field Approve / Edit / Reject controls.
 *
 * Polling: while doc.status === 'processing', the component polls the loader
 * every 3s via fetcher.load() to observe the uploaded → processing → pending_review
 * status transition (D-11).
 *
 * Action (Task 3): per-field approve/edit/reject writes.
 *   requireUser → requireRole(['owner','practitioner']) → load extraction →
 *   assertSubjectAccess → write in Drizzle transaction (D-15/LAB-05).
 *
 * Security:
 *   T-05-APPROVE: assertSubjectAccess before any write (D-15, CR-01 write-path).
 *   T-05-BULK: NO bulk-approve control — per-field only (LAB-04).
 *   T-05-AUDIT2: insertAuditLog with no PHI values (D-13).
 *   T-05-PURGE: pdfBytes set to null after all extractions reach terminal status.
 */

import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import type { Route } from "./+types/review";
import { requireUser, requireRole, assertSubjectAccess } from "~/lib/authz.server";
import type { AppRole } from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import { getDb, withTenantDb } from "~/lib/db.server";
import type { TenantCtx } from "~/lib/db.server";
import { eq, and, sql } from "drizzle-orm";
import { labDocuments, labExtractions, metrics, auditLog } from "../../../../db/schema";
import { Card } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
import { Input } from "~/components/ui/Input";
import { PdfPageViewer } from "~/components/ui/PdfPageViewer";

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);

  const url = new URL(request.url);
  const docId = url.searchParams.get("docId");

  if (!docId) {
    // No docId — show a list of recent documents instead of erroring
    const db = getDb();
    const subject = await getOwnerSubject(user.tenantId!);
    assertSubjectAccess(user, subject, user.tenantId!);
    const docs = await db
      .select()
      .from(labDocuments)
      .where(
        and(
          eq(labDocuments.tenantId, user.tenantId!),
          eq(labDocuments.subjectId, subject.id)
        )
      );
    return { doc: null, extractions: [], docs };
  }

  const db = getDb();
  const [doc] = await db
    .select()
    .from(labDocuments)
    .where(eq(labDocuments.id, docId));

  if (!doc) {
    throw new Response("Not found", { status: 404 });
  }

  // T-05-APPROVE: assertSubjectAccess — 403 for cross-tenant docId
  assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!);

  const extractions = await db
    .select()
    .from(labExtractions)
    .where(
      and(
        eq(labExtractions.labDocumentId, docId),
        eq(labExtractions.tenantId, user.tenantId!)
      )
    );

  return { doc, extractions, docs: null };
}

// ── Action (per-field approve/edit/reject — LAB-05 write path) ──────────────

export async function action({ request }: Route.ActionArgs) {
  // D-15 sequence: requireUser → requireRole → load → assertSubjectAccess → write
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  const formData = await request.formData();
  const intent = formData.get("intent") as string | null;
  const extractionId = formData.get("extractionId") as string | null;

  if (!extractionId) {
    throw new Response("extractionId required", { status: 400 });
  }

  const db = getDb();
  const [extraction] = await db
    .select()
    .from(labExtractions)
    .where(eq(labExtractions.id, Number(extractionId)));

  if (!extraction) {
    throw new Response("Extraction not found", { status: 404 });
  }

  // T-05-APPROVE: assertSubjectAccess BEFORE any write (D-15, CR-01 write-path)
  assertSubjectAccess(user, { tenantId: extraction.tenantId }, user.tenantId!);

  // Build TenantCtx from the extraction row's tenant+subject — used by withTenantDb
  // for the approve/reject write transactions (RLS WITH CHECK validates tenant_id).
  const ctx: TenantCtx = {
    userId: user.id,
    tenantId: extraction.tenantId,
    subjectId: extraction.subjectId,
  };

  const now = new Date();

  if (intent === "approve" || intent === "edit-approve") {
    // Get the approved value — edited value if provided, else raw value
    const editedValueStr = formData.get("editedValue") as string | null;
    const editedUnitStr = formData.get("editedUnit") as string | null;

    const approvedValue =
      editedValueStr && editedValueStr.trim() !== ""
        ? parseFloat(editedValueStr)
        : extraction.rawValue;
    const approvedUnit =
      editedUnitStr && editedUnitStr.trim() !== ""
        ? editedUnitStr
        : (extraction.resolvedUnit ?? extraction.rawUnit);

    // Compute metric timestamp: specimen collection date if captured, else now
    // reviewedAt stays 'now' (review time != collection time)
    const metricTimestamp: Date = extraction.collectedAt ?? now;

    const analyteName = extraction.resolvedMetricName ?? extraction.rawAnalyteName;

    // DEDUP: check for existing metric with same subjectId + same analyte name + same calendar day
    const dayStart = new Date(metricTimestamp);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const existingMetrics = await db
      .select({ id: metrics.id })
      .from(metrics)
      .where(
        and(
          eq(metrics.subjectId, extraction.subjectId),
          eq(metrics.name, analyteName),
          sql`${metrics.timestamp} >= ${dayStart}`,
          sql`${metrics.timestamp} < ${dayEnd}`
        )
      )
      .limit(1);

    const existingMetric = existingMetrics[0] ?? null;
    const deduped = existingMetric !== null;
    const metricId = deduped ? existingMetric.id : crypto.randomUUID();

    // withTenantDb transaction: conditionally INSERT metrics + UPDATE labExtractions + INSERT auditLog
    // ctx was constructed above from extraction.tenantId/subjectId after assertSubjectAccess (D-15).
    await withTenantDb(ctx, async (tx) => {
      if (!deduped) {
        // INSERT metrics row — source: 'lab' (LAB-05)
        await tx.insert(metrics).values({
          id: metricId,
          name: analyteName,
          value: approvedValue,
          unit: approvedUnit,
          category: extraction.resolvedCategory ?? "hematology",
          subcategory: extraction.resolvedSubcategory ?? undefined,
          timestamp: metricTimestamp,
          improvement: (extraction.resolvedImprovement ?? "target range") as
            | "higher is better"
            | "lower is better"
            | "target range",
          referenceMin: extraction.resolvedReferenceMin ?? undefined,
          referenceMax: extraction.resolvedReferenceMax ?? undefined,
          optimalMin: extraction.resolvedOptimalMin ?? undefined,
          optimalMax: extraction.resolvedOptimalMax ?? undefined,
          source: "lab",
          tenantId: extraction.tenantId,
          subjectId: extraction.subjectId,
        });
      }

      // UPDATE labExtractions → approved; link to committed metric (existing or new)
      await tx
        .update(labExtractions)
        .set({
          status: "approved",
          reviewedAt: now,
          reviewedBy: user.id,
          approvedValue,
          approvedUnit,
          committedMetricId: metricId,
          updatedAt: now,
        })
        .where(eq(labExtractions.id, extraction.id));

      // D-13: auditLog — no PHI values; operation indicates dedup to avoid re-insert
      await tx.insert(auditLog).values({
        userId: user.id,
        role: user.role as AppRole,
        action: "approve",
        tableName: "metrics",
        operation: deduped ? "dedup-link" : "insert",
        tenantId: extraction.tenantId,
        subjectId: extraction.subjectId,
        entityId: metricId,
        timestamp: now,
      });
    });

    // After approval: check if all extractions for this doc are terminal → purge pdfBytes
    await maybePurgeDocBytes(db, extraction.labDocumentId, now);

    return { ok: true, action: "approve" as const, deduped, metricId };
  }

  if (intent === "reject") {
    await withTenantDb(ctx, async (tx) => {
      await tx
        .update(labExtractions)
        .set({
          status: "rejected",
          reviewedAt: now,
          reviewedBy: user.id,
          updatedAt: now,
        })
        .where(eq(labExtractions.id, extraction.id));

      // D-13: auditLog — no PHI values
      await tx.insert(auditLog).values({
        userId: user.id,
        role: user.role as AppRole,
        action: "reject",
        tableName: "lab_extractions",
        operation: "update",
        tenantId: extraction.tenantId,
        subjectId: extraction.subjectId,
        entityId: String(extraction.id),
        timestamp: now,
      });
    });

    // After rejection: check if all extractions are terminal → purge pdfBytes
    await maybePurgeDocBytes(db, extraction.labDocumentId, now);

    return { ok: true, action: "reject" };
  }

  throw new Response("Unknown intent", { status: 400 });
}

// ── Purge helper (Open Question 2 / T-05-PURGE) ────────────────────────────

async function maybePurgeDocBytes(
  db: ReturnType<typeof getDb>,
  labDocumentId: string,
  now: Date
): Promise<void> {
  // Count non-terminal extractions for this document
  const nonTerminal = await db
    .select({ id: labExtractions.id })
    .from(labExtractions)
    .where(
      and(
        eq(labExtractions.labDocumentId, labDocumentId),
        eq(labExtractions.status, "pending_review")
      )
    );

  if (nonTerminal.length === 0) {
    // All extractions are terminal — purge bytes + mark completed
    await db
      .update(labDocuments)
      .set({ pdfBytes: null, status: "completed", updatedAt: now })
      .where(eq(labDocuments.id, labDocumentId));
  }
}

// ── Status badge helper ────────────────────────────────────────────────────

function StatusBadgeLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    uploaded: { label: "Uploaded", color: "var(--text-muted)" },
    processing: { label: "Processing…", color: "var(--accent)" },
    pending_review: { label: "Ready for review", color: "var(--vital)" },
    completed: { label: "Completed", color: "var(--vital)" },
    failed: { label: "Failed", color: "var(--danger)" },
  };
  const { label, color } = map[status] ?? { label: status, color: "var(--text-muted)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "var(--text-sm)",
        color,
        fontWeight: 500,
      }}
    >
      {status === "processing" && (
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            animation: "pulse 1.4s ease-in-out infinite",
          }}
        />
      )}
      {label}
    </span>
  );
}

// ── Per-field review row ────────────────────────────────────────────────────

function ExtractionRow({
  extraction,
  isSelected,
  onSelect,
}: {
  extraction: (typeof labExtractions.$inferSelect);
  isSelected: boolean;
  onSelect: () => void;
}) {
  const fetcher = useFetcher<typeof action>();
  const [editing, setEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<string>("");
  const [editedUnit, setEditedUnit] = useState<string>("");

  const isPending = extraction.status === "pending_review";
  const isApproved = extraction.status === "approved";
  const isRejected = extraction.status === "rejected";

  const displayName =
    extraction.resolvedMetricName ?? extraction.rawAnalyteName;
  const displayValue = extraction.approvedValue ?? extraction.rawValue;
  const displayUnit = extraction.approvedUnit ?? extraction.resolvedUnit ?? extraction.rawUnit;

  // Detect dedup outcome from the last approve action response
  const approveResult = fetcher.data && fetcher.data.action === "approve" ? fetcher.data : null;
  const wasDeduped = approveResult?.deduped === true;

  // Format collection date for dedup note
  const collectionDateLabel = extraction.collectedAt
    ? new Date(extraction.collectedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      onClick={onSelect}
      style={{
        padding: "14px 16px",
        borderRadius: "var(--radius-md)",
        border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
        background: isSelected ? "var(--focus-50)" : "var(--surface)",
        cursor: "pointer",
        marginBottom: 8,
        opacity: isRejected ? 0.55 : 1,
      }}
    >
      {/* Name + status row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
          {displayName}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {isApproved
            ? wasDeduped
              ? "Approved (linked)"
              : "Approved"
            : isRejected
              ? "Rejected"
              : extraction.unrecognized
                ? "Unrecognized"
                : "Pending"}
        </span>
      </div>

      {/* Value + unit */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-md)",
          fontWeight: 600,
          color: isRejected ? "var(--text-muted)" : "var(--ink)",
          marginBottom: isPending ? 12 : 0,
        }}
      >
        {displayValue} {displayUnit}
        {extraction.confidence === "low" && (
          <span
            style={{
              marginLeft: 8,
              fontSize: "var(--text-xs)",
              color: "var(--energy)",
              fontWeight: 500,
              fontFamily: "var(--font-text)",
            }}
          >
            low confidence
          </span>
        )}
      </div>

      {/* Dedup note: shown when approve returns deduped=true */}
      {wasDeduped && (
        <div
          style={{
            marginTop: 6,
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          Already in tracker{collectionDateLabel ? ` for ${collectionDateLabel}` : ""} — not duplicated
        </div>
      )}

      {/* Edit form */}
      {isPending && editing && (
        <div
          style={{ display: "flex", gap: 8, marginBottom: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="number"
            step="any"
            value={editedValue}
            onChange={(e) => setEditedValue(e.target.value)}
            placeholder={String(extraction.rawValue)}
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
            }}
          />
          <input
            type="text"
            value={editedUnit}
            onChange={(e) => setEditedUnit(e.target.value)}
            placeholder={displayUnit}
            style={{
              width: 80,
              padding: "6px 10px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              fontSize: "var(--text-sm)",
            }}
          />
        </div>
      )}

      {/* Per-field action buttons — NO bulk-approve control (T-05-BULK / LAB-04) */}
      {isPending && (
        <div
          style={{ display: "flex", gap: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          {!editing && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditing(true);
                setEditedValue(String(extraction.rawValue));
                setEditedUnit(displayUnit);
              }}
            >
              Edit
            </Button>
          )}

          {editing ? (
            <>
              <fetcher.Form method="post" style={{ display: "inline" }}>
                <input type="hidden" name="intent" value="edit-approve" />
                <input type="hidden" name="extractionId" value={String(extraction.id)} />
                <input type="hidden" name="editedValue" value={editedValue} />
                <input type="hidden" name="editedUnit" value={editedUnit} />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  disabled={fetcher.state !== "idle"}
                  style={{ background: "var(--accent)" }}
                >
                  Save & Approve
                </Button>
              </fetcher.Form>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <fetcher.Form method="post" style={{ display: "inline" }}>
              <input type="hidden" name="intent" value="approve" />
              <input type="hidden" name="extractionId" value={String(extraction.id)} />
              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={fetcher.state !== "idle"}
                style={{ background: "var(--accent)" }}
              >
                Approve
              </Button>
            </fetcher.Form>
          )}

          <fetcher.Form method="post" style={{ display: "inline" }}>
            <input type="hidden" name="intent" value="reject" />
            <input type="hidden" name="extractionId" value={String(extraction.id)} />
            <Button
              type="submit"
              size="sm"
              variant="danger"
              disabled={fetcher.state !== "idle"}
            >
              Reject
            </Button>
          </fetcher.Form>
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IngestReview({ loaderData }: Route.ComponentProps) {
  const { doc, extractions, docs } = loaderData;
  const pollingFetcher = useFetcher<typeof loader>();
  const [selectedExtractionId, setSelectedExtractionId] = useState<number | null>(null);

  // Use polled data if available, fallback to initial loaderData
  const currentDoc = pollingFetcher.data?.doc ?? doc;
  const currentExtractions = pollingFetcher.data?.extractions ?? extractions;

  // D-11: poll while status === 'processing' to observe status transitions
  const isProcessing = currentDoc?.status === "processing" || currentDoc?.status === "uploaded";
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isProcessing || !doc?.id) return;

    pollingRef.current = setInterval(() => {
      pollingFetcher.load(`/ingest/review?docId=${doc.id}`);
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isProcessing, doc?.id]);

  // Stop polling once no longer processing
  useEffect(() => {
    if (!isProcessing && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isProcessing]);

  // ── No-docId: document list view ──────────────────────────────────────────

  if (!doc && docs) {
    return (
      <div>
        <PageHeader
          eyebrow="LAB INGEST"
          title="Review extractions"
          sub="Select a document to review its extracted fields."
        />

        {docs.length === 0 ? (
          <Card padding="lg">
            <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              No lab documents uploaded yet.{" "}
              <a href="/ingest/upload" style={{ color: "var(--accent)" }}>
                Upload a lab report
              </a>{" "}
              to get started.
            </p>
          </Card>
        ) : (
          <div>
            {docs.map((d) => (
              <a
                key={d.id}
                href={`/ingest/review?docId=${d.id}`}
                style={{ textDecoration: "none", display: "block", marginBottom: 8 }}
              >
                <Card padding="md" interactive>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                        {d.fileName}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {d.createdAt?.toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadgeLabel status={d.status} />
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!currentDoc) return null;

  // Find the selected extraction for the PDF viewer
  const selectedExtraction =
    selectedExtractionId != null
      ? currentExtractions.find((e) => e.id === selectedExtractionId) ?? currentExtractions[0]
      : currentExtractions[0];

  return (
    <div>
      <PageHeader
        eyebrow="LAB INGEST"
        title={`Review: ${currentDoc.fileName}`}
        sub="Approve, edit, or reject each extracted field. Only approved fields are saved."
      />

      {/* Document status banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: "var(--gap-lg)",
          padding: "10px 16px",
          background: "var(--surface-sunken)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Document status:
        </span>
        <StatusBadgeLabel status={currentDoc.status} />
        {isProcessing && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Checking for updates…
          </span>
        )}
      </div>

      {/* Processing / no extractions state */}
      {(currentDoc.status === "uploaded" || currentDoc.status === "processing") && (
        <Card padding="lg" style={{ textAlign: "center", marginBottom: "var(--gap-lg)" }}>
          <div
            style={{
              marginBottom: 8,
              fontSize: "var(--text-md)",
              fontWeight: 600,
            }}
          >
            Extraction in progress
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
            The AI is extracting lab values from your PDF. This typically takes 15–60 seconds.
            This page will update automatically.
          </p>
        </Card>
      )}

      {currentDoc.status === "failed" && (
        <Card padding="lg" accent="energy" style={{ marginBottom: "var(--gap-lg)" }}>
          <div style={{ fontWeight: 600, color: "var(--danger)", marginBottom: 4 }}>
            Extraction failed
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
            {currentDoc.errorMessage ??
              "An error occurred during extraction. Please try uploading again."}
          </p>
        </Card>
      )}

      {/* Main review surface — split view */}
      {currentExtractions.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--gap-xl)",
            alignItems: "start",
          }}
        >
          {/* Left: PDF page viewer */}
          <div>
            <div
              className="zt-eyebrow"
              style={{ marginBottom: 8, fontSize: "var(--text-xs)" }}
            >
              Source PDF — page {selectedExtraction?.pageNumber ?? 1}
            </div>
            <PdfPageViewer
              pdfUrl={`/ingest/documents/${currentDoc.id}`}
              pageNumber={selectedExtraction?.pageNumber ?? 1}
              highlightSnippet={selectedExtraction?.sourceTextSnippet ?? undefined}
              width={560}
            />
          </div>

          {/* Right: extraction fields list */}
          <div>
            <div
              className="zt-eyebrow"
              style={{ marginBottom: 8, fontSize: "var(--text-xs)" }}
            >
              Extracted fields — {currentExtractions.filter((e) => e.status === "pending_review").length}{" "}
              pending review
            </div>
            <div>
              {currentExtractions.map((extraction) => (
                <ExtractionRow
                  key={extraction.id}
                  extraction={extraction}
                  isSelected={extraction.id === selectedExtraction?.id}
                  onSelect={() => setSelectedExtractionId(extraction.id)}
                />
              ))}
            </div>

            {currentExtractions.every((e) => e.status !== "pending_review") && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--surface-sunken)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                All fields reviewed. Approved metrics have been saved.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state when pending_review but no extractions */}
      {currentDoc.status === "pending_review" && currentExtractions.length === 0 && (
        <Card padding="lg">
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", margin: 0 }}>
            No analyte values were extracted from this document. The PDF may not contain
            recognizable lab values, or all values were unrecognized by the dictionary.
          </p>
        </Card>
      )}
    </div>
  );
}
