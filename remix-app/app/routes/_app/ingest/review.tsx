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
import { useFetcher, Link } from "react-router";
import {
  Check,
  X,
  Pencil,
  ArrowRight,
} from "lucide-react";
import type { Route } from "./+types/review";
import { requireUser, requireRole, assertSubjectAccess } from "~/lib/authz.server";
import type { AppRole } from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import { getDb, withTenantDb } from "~/lib/db.server";
import type { TenantCtx } from "~/lib/db.server";
import { eq, and, sql } from "drizzle-orm";
import { labDocuments, labExtractions, metrics, auditLog } from "../../../../db/schema";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { StatusBadge } from "~/components/ui/StatusBadge";
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

// ── Decision token mapping (BAKED round-4) ──────────────────────────────────
// review decision → canonical status token:
//   approved → optimal · edited → borderline · rejected → deficient ·
//   pending  → neutral (no judgment yet)
// "edited" is INFERRED: an extraction is approved AND its approvedValue differs
// from rawValue (the real schema has no separate 'edited' status — there are
// only pending_review/approved/rejected).
type Decision = "approved" | "edited" | "rejected" | "pending";

function decisionOf(e: typeof labExtractions.$inferSelect): Decision {
  if (e.status === "rejected") return "rejected";
  if (e.status === "approved") {
    return e.approvedValue != null && e.approvedValue !== e.rawValue
      ? "edited"
      : "approved";
  }
  return "pending";
}

const EDGE_COLOR: Record<Decision, string> = {
  approved: "var(--optimal)",
  edited: "var(--borderline)",
  rejected: "var(--deficient)",
  pending: "var(--n-200)",
};

// ── Document status banner label ─────────────────────────────────────────────

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

// ── SSR-safe media query (≤760px Document/Fields tab toggle) ─────────────────
// CSS owns the ≤1080 stacking (zt-review-grid) and ≤760 stat-strip collapse;
// only the one-panel-at-a-time tab toggle needs JS. Starts false on server +
// first client render (no hydration mismatch), then syncs after mount.

function useNarrow(maxWidth = 760): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [maxWidth]);
  return narrow;
}

// ── Per-field review row (zt-frow idiom) ─────────────────────────────────────

function FieldRow({
  extraction,
  isSelected,
  onSelect,
  last,
}: {
  extraction: (typeof labExtractions.$inferSelect);
  isSelected: boolean;
  onSelect: () => void;
  last: boolean;
}) {
  const fetcher = useFetcher<typeof action>();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");

  const isPending = extraction.status === "pending_review";
  const isRejected = extraction.status === "rejected";
  const decision = decisionOf(extraction);

  const displayName = extraction.resolvedMetricName ?? extraction.rawAnalyteName;
  const displayValue = extraction.approvedValue ?? extraction.rawValue;
  const displayUnit =
    extraction.approvedUnit ?? extraction.resolvedUnit ?? extraction.rawUnit;
  const isEdited = decision === "edited";

  // → catId/metricId mapping line (universal mapping idiom). Unrecognized
  // analytes have no resolved catId — show the unmapped treatment.
  const mapping = extraction.resolvedCategory
    ? `→ ${extraction.resolvedCategory}`
    : "not tracked · skipped";

  // Confidence readout. GAP: the schema stores confidence as an enum
  // (high|low), not a numeric float — so the design's "CONF 0.98" becomes
  // "CONF HIGH" / "CONF LOW · CHECK SOURCE" (mono, borderline when low).
  const lowConf = extraction.confidence === "low";

  // Dedup note from the last approve response.
  const approveResult =
    fetcher.data && fetcher.data.action === "approve" ? fetcher.data : null;
  const wasDeduped = approveResult?.deduped === true;
  const collectionDateLabel = extraction.collectedAt
    ? new Date(extraction.collectedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const busy = fetcher.state !== "idle";

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(String(extraction.rawValue));
    setEditing(true);
    onSelect();
  };

  return (
    <div
      className={"zt-frow" + (isSelected ? " is-selected" : "")}
      onClick={onSelect}
      style={{
        borderBottom: last ? "none" : "1px solid var(--border)",
        opacity: isRejected ? 0.6 : 1,
      }}
    >
      {/* left edge decision bar */}
      <span className="zt-frow-edge" style={{ background: EDGE_COLOR[decision] }} />

      {/* name + mapping + confidence */}
      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
        <div
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: isRejected ? "var(--text-muted)" : "var(--text)",
            textDecoration: isRejected ? "line-through" : "none",
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 3,
            flexWrap: "wrap",
          }}
        >
          <span className="zt-eyebrow" style={{ letterSpacing: "0.06em" }}>
            {mapping}
          </span>
          <span
            className="zt-tnum"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: lowConf ? "var(--borderline)" : "var(--text-faint)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            CONF {extraction.confidence}
            {lowConf ? " · CHECK SOURCE" : ""}
          </span>
        </div>
        {/* dedup note */}
        {wasDeduped && (
          <div
            style={{
              marginTop: 4,
              fontSize: "var(--text-2xs)",
              color: "var(--text-faint)",
              fontStyle: "italic",
            }}
          >
            Already in tracker
            {collectionDateLabel ? ` for ${collectionDateLabel}` : ""} — not duplicated
          </div>
        )}
      </div>

      {/* value (or inline edit) */}
      <div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 84 }}>
        {editing ? (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={(e) => e.stopPropagation()}
          >
            <fetcher.Form method="post" style={{ display: "inline-flex", gap: 6 }}>
              <input type="hidden" name="intent" value="edit-approve" />
              <input type="hidden" name="extractionId" value={String(extraction.id)} />
              <input type="hidden" name="editedUnit" value={displayUnit} />
              <input
                className="zt-fedit zt-tnum"
                type="number"
                step="any"
                name="editedValue"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              <button
                type="submit"
                className="zt-fact"
                title="Save value & approve (edited)"
                disabled={busy}
                style={{ ["--fact" as string]: "var(--borderline)", ["--fact-bg" as string]: "var(--borderline-bg)" }}
              >
                <Check size={14} strokeWidth={2.2} />
              </button>
            </fetcher.Form>
          </span>
        ) : (
          <>
            <div
              className="zt-tnum"
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
                color: isRejected ? "var(--text-faint)" : "var(--ink)",
              }}
            >
              {displayValue}
              {isEdited && (
                <span title={`extracted ${extraction.rawValue}`} style={{ color: "var(--borderline)" }}>
                  *
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "var(--text-2xs)",
                color: "var(--text-faint)",
                fontFamily: "var(--font-mono)",
                marginTop: 2,
              }}
            >
              {displayUnit}
            </div>
          </>
        )}
      </div>

      {/* per-field actions — NO bulk-approve control (T-05-BULK / LAB-04) */}
      <div
        style={{ display: "flex", gap: 4, flex: "0 0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Approve — only actionable while pending; reflects on-state once approved */}
        {isPending ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="approve" />
            <input type="hidden" name="extractionId" value={String(extraction.id)} />
            <button
              type="submit"
              className="zt-fact"
              title="Approve"
              disabled={busy}
              style={{ ["--fact" as string]: "var(--optimal)", ["--fact-bg" as string]: "var(--optimal-bg)" }}
            >
              <Check size={15} strokeWidth={2.2} />
            </button>
          </fetcher.Form>
        ) : (
          <span
            className={"zt-fact" + (decision === "approved" ? " is-on" : "")}
            title={decision === "approved" ? "Approved" : "Approve"}
            aria-hidden="true"
            style={{ ["--fact" as string]: "var(--optimal)", ["--fact-bg" as string]: "var(--optimal-bg)", cursor: "default" }}
          >
            <Check size={15} strokeWidth={2.2} />
          </span>
        )}

        {/* Edit — only while pending */}
        {isPending ? (
          <button
            type="button"
            className={"zt-fact" + (editing ? " is-on" : "")}
            title="Edit value"
            disabled={busy}
            onClick={startEdit}
            style={{ ["--fact" as string]: "var(--borderline)", ["--fact-bg" as string]: "var(--borderline-bg)" }}
          >
            <Pencil size={14} strokeWidth={2} />
          </button>
        ) : (
          <span
            className={"zt-fact" + (isEdited ? " is-on" : "")}
            title={isEdited ? "Edited" : "Edit"}
            aria-hidden="true"
            style={{ ["--fact" as string]: "var(--borderline)", ["--fact-bg" as string]: "var(--borderline-bg)", cursor: "default" }}
          >
            <Pencil size={14} strokeWidth={2} />
          </span>
        )}

        {/* Reject — only while pending; reflects on-state once rejected */}
        {isPending ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="reject" />
            <input type="hidden" name="extractionId" value={String(extraction.id)} />
            <button
              type="submit"
              className="zt-fact"
              title="Reject"
              disabled={busy}
              style={{ ["--fact" as string]: "var(--deficient)", ["--fact-bg" as string]: "var(--deficient-bg)" }}
            >
              <X size={15} strokeWidth={2.2} />
            </button>
          </fetcher.Form>
        ) : (
          <span
            className={"zt-fact" + (decision === "rejected" ? " is-on" : "")}
            title={decision === "rejected" ? "Rejected" : "Reject"}
            aria-hidden="true"
            style={{ ["--fact" as string]: "var(--deficient)", ["--fact-bg" as string]: "var(--deficient-bg)", cursor: "default" }}
          >
            <X size={15} strokeWidth={2.2} />
          </span>
        )}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IngestReview({ loaderData }: Route.ComponentProps) {
  const { doc, extractions, docs } = loaderData;
  const pollingFetcher = useFetcher<typeof loader>();
  const [selectedExtractionId, setSelectedExtractionId] = useState<number | null>(null);

  // ≤760px: one panel at a time via the Document/Fields pill toggle.
  const isNarrow = useNarrow(760);
  const [tab, setTab] = useState<"fields" | "document">("fields");

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

  // Decision counts (the masthead readout + commit gate).
  const counts = { approved: 0, edited: 0, rejected: 0, pending: 0, total: 0 };
  for (const e of currentExtractions) {
    counts[decisionOf(e)]++;
    counts.total++;
  }
  const writable = counts.approved + counts.edited;
  const allDecided = counts.pending === 0;

  // Masthead right slot — mono decision counts + the commit affordance.
  // NOTE (real-API gap): there is NO batch commit/finalize action. Each
  // approve/edit/reject persists immediately and per-field (LAB-05). The
  // design's "Write N to metrics" button is therefore a completion affordance
  // that links back to Ingest once every field is decided (gate: pending = 0),
  // not a deferred write trigger. Approved/edited values are already saved.
  const progress = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--gap-lg)",
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      <span
        className="zt-tnum"
        style={{
          display: "flex",
          gap: 12,
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: "var(--optimal)" }}>✓ {counts.approved}</span>
        <span style={{ color: "var(--borderline)" }}>~ {counts.edited}</span>
        <span style={{ color: "var(--deficient)" }}>× {counts.rejected}</span>
        <span style={{ color: "var(--text-muted)" }}>· {counts.pending} pending</span>
      </span>
      {allDecided ? (
        <Link
          to="/ingest"
          className="zt-btn-ink"
          style={{ textDecoration: "none" }}
          title={`${writable} field${writable === 1 ? "" : "s"} written to metrics`}
        >
          Done — {writable} written
          <ArrowRight size={15} strokeWidth={2} />
        </Link>
      ) : (
        <button type="button" className="zt-btn-ink" disabled title="Decide every field first">
          {counts.pending} field{counts.pending === 1 ? "" : "s"} to review
        </button>
      )}
    </div>
  );

  // Split panels (shared by desktop split + mobile tab toggle).
  const docPanel = (
    <Card padding="none" style={{ padding: "var(--gap-card)" }}>
      <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
        Source PDF — page {selectedExtraction?.pageNumber ?? 1}
      </div>
      <PdfPageViewer
        pdfUrl={`/ingest/documents/${currentDoc.id}/raw`}
        pageNumber={selectedExtraction?.pageNumber ?? 1}
        highlightSnippet={selectedExtraction?.sourceTextSnippet ?? undefined}
        width={520}
      />
    </Card>
  );

  const drawDateLabel = selectedExtraction?.collectedAt
    ? new Date(selectedExtraction.collectedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const fieldsPanel = (
    <Card padding="none">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--gap-lg)",
          padding: "var(--gap-row) var(--gap-card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span className="zt-eyebrow">{currentDoc.fileName}</span>
        <span className="zt-eyebrow zt-tnum">
          {counts.total} field{counts.total === 1 ? "" : "s"}
          {drawDateLabel ? ` · ${drawDateLabel}` : ""}
        </span>
      </div>
      {currentExtractions.map((extraction, i) => (
        <FieldRow
          key={extraction.id}
          extraction={extraction}
          isSelected={extraction.id === selectedExtraction?.id}
          last={i === currentExtractions.length - 1}
          onSelect={() => setSelectedExtractionId(extraction.id)}
        />
      ))}
    </Card>
  );

  return (
    <div data-screen-label="Ingest review">
      <PageHeader
        eyebrow="LAB INGEST"
        crumbs={[{ label: "Ingest", to: "/ingest" }, { label: "Review" }]}
        title="Review extractions"
        right={currentExtractions.length > 0 ? progress : undefined}
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

      {/* Main review surface — split view (desktop) / tab toggle (≤760) */}
      {currentExtractions.length > 0 && (
        <>
          {isNarrow && (
            <div style={{ display: "flex", gap: 8, marginBottom: "var(--gap-lg)" }}>
              {(["fields", "document"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={"zt-pill" + (tab === t ? " is-active" : "")}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {isNarrow ? (
            tab === "document" ? docPanel : fieldsPanel
          ) : (
            <div className="zt-review-grid">
              {docPanel}
              {fieldsPanel}
            </div>
          )}

          {/* footer note + open-document link */}
          <div
            style={{
              marginTop: "var(--gap-lg)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "var(--gap-lg)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Approved and edited values are written to your metrics as you decide; rejected
              fields are dropped. Each decision is saved immediately.
            </span>
            <Link to={`/ingest/documents/${currentDoc.id}`} className="zt-link">
              Open document <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>
        </>
      )}

      {/* Empty state when pending_review but no extractions (W2-era empty) */}
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
