/**
 * document.tsx — Lab document viewer page (/ingest/documents/:id)
 *
 * Round-4 design treatment (design-r35/W4a): filename masthead; meta stat-strip
 * (source · draw date · uploaded · extraction state); full-width REAL
 * PdfPageViewer with pager; right slot = "Review N pending" ink button or an
 * optimal badge once reviewed.
 *
 * The raw PDF bytes are served by the SEPARATE resource route
 * `/ingest/documents/:id/raw` (document-raw.tsx) so this page can render UI
 * while react-pdf fetches application/pdf bytes from there.
 *
 * Security:
 *   T-05-DOC: requireUser + assertSubjectAccess before any document data is
 *   returned. Cross-tenant docId yields 403. Same tenant-scoped authz sequence
 *   as review.tsx / the byte route.
 *
 * Draw date: collectedAt is per-extraction (LAB-06-FIX), not on the document.
 * W3 noted the join is needed — this loader reads the earliest non-null
 * collectedAt across the document's extractions as the specimen draw date.
 */

import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { Route } from "./+types/document";
import { requireUser, assertSubjectAccess } from "~/lib/authz.server";
import { getDb } from "~/lib/db.server";
import type { TenantCtx } from "~/lib/db.server";
import { listAssignedSubjectIds } from "~/lib/assignments.server";
import { eq, and } from "drizzle-orm";
import { labDocuments, labExtractions } from "../../../../db/schema";
import { Card } from "~/components/ui/Card";
import { PageHeader } from "~/components/ui/PageHeader";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { PdfPageViewer } from "~/components/ui/PdfPageViewer";

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  // T-05-DOC: Authentication + authorization BEFORE returning any document data
  const { user } = await requireUser(request);

  const docId = params.id;
  if (!docId) {
    throw new Response("Not found", { status: 404 });
  }

  const db = getDb();
  const [doc] = await db
    .select()
    .from(labDocuments)
    .where(eq(labDocuments.id, docId));

  if (!doc) {
    throw new Response("Not found", { status: 404 });
  }

  // T-05-DOC / Gate 3: assertSubjectAccess — 403 for cross-tenant docId OR unassigned practitioner.
  // Build ctx from doc row (post-load, pre-stream) so listAssignedSubjectIds can be called.
  // Gate 3 fires only for practitioners (assignedIds undefined for owners → Gate 3 skipped).
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: doc.subjectId };
  const assignedIds =
    user.role === "practitioner"
      ? await listAssignedSubjectIds(ctx, user.id)
      : undefined;
  assertSubjectAccess(user, { tenantId: doc.tenantId, id: doc.subjectId }, user.tenantId!, assignedIds);

  // Extraction state + draw date. collectedAt lives on labExtractions
  // (LAB-06-FIX), so join to surface the specimen draw date here (W3 note).
  const extractions = await db
    .select({
      status: labExtractions.status,
      collectedAt: labExtractions.collectedAt,
    })
    .from(labExtractions)
    .where(
      and(
        eq(labExtractions.labDocumentId, docId),
        eq(labExtractions.tenantId, user.tenantId!)
      )
    );

  const total = extractions.length;
  const pending = extractions.filter((e) => e.status === "pending_review").length;

  // Earliest non-null collectedAt = specimen draw date for the document.
  const drawDates = extractions
    .map((e) => e.collectedAt)
    .filter((d): d is Date => d != null)
    .map((d) => new Date(d).getTime());
  const drawDate = drawDates.length > 0 ? new Date(Math.min(...drawDates)).toISOString() : null;

  return {
    id: doc.id,
    fileName: doc.fileName,
    status: doc.status,
    pageCount: doc.pageCount,
    uploadedAt: doc.createdAt ? doc.createdAt.toISOString() : null,
    bytesPurged: doc.pdfBytes == null,
    total,
    pending,
    drawDate,
  };
}

// ── Component ──────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DocumentViewer({ loaderData }: Route.ComponentProps) {
  const { id, fileName, status, pageCount, uploadedAt, bytesPurged, total, pending, drawDate } =
    loaderData;

  const extractionState =
    total === 0
      ? status === "failed"
        ? "extraction failed"
        : "no fields"
      : `${total} field${total === 1 ? "" : "s"} · ${pending > 0 ? `${pending} pending` : "reviewed"}`;

  const meta = [
    { label: "Source", value: "Lab PDF" },
    { label: "Draw date", value: fmtDate(drawDate) },
    { label: "Uploaded", value: fmtDate(uploadedAt) },
    { label: "Extraction", value: extractionState },
  ];

  return (
    <div data-screen-label="Document viewer">
      <PageHeader
        eyebrow="LAB INGEST"
        crumbs={[
          { label: "Ingest", to: "/ingest" },
          { label: "Documents" },
          { label: fileName },
        ]}
        title={fileName}
        right={
          pending > 0 ? (
            <Link
              to={`/ingest/review?docId=${id}`}
              className="zt-btn-ink"
              style={{ textDecoration: "none" }}
            >
              Review {pending} pending
              <ArrowRight size={15} strokeWidth={2} />
            </Link>
          ) : total > 0 ? (
            <StatusBadge status="optimal" />
          ) : undefined
        }
      />

      {/* Meta stat strip — zt-stat-strip handles 2-col mobile collapse.
          Round-5 finding 2: NO inline gridTemplateColumns here. */}
      <section className="zt-section">
        <Card>
          <div className="zt-stat-strip">
            {meta.map((s) => (
              <div key={s.label} className="zt-stat">
                <div className="zt-eyebrow" style={{ marginBottom: 6 }}>
                  {s.label}
                </div>
                <div
                  className="zt-tnum zt-meta-val"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    color: "var(--text)",
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Full-width real PDF page viewer with pager */}
      <Card padding="none" style={{ padding: "var(--gap-card)", maxWidth: 760 }}>
        {bytesPurged ? (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
            }}
          >
            The original PDF was purged after review completed — the bytes are no longer
            stored (T-05-PURGE). Extracted values remain in your metrics.
          </div>
        ) : (
          <PdfPageViewer
            pdfUrl={`/ingest/documents/${id}/raw`}
            pageNumber={1}
            width={680}
          />
        )}
      </Card>
    </div>
  );
}
