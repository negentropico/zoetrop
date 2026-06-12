/**
 * document-raw.tsx — Authenticated PDF byte-streaming loader (T-05-DOC)
 *
 * Route: GET /ingest/documents/:id/raw
 *
 * This is the raw byte source consumed by PdfPageViewer (react-pdf). It is
 * intentionally SEPARATE from the viewer page (`/ingest/documents/:id`, see
 * document.tsx) so the page can render UI (masthead + stat strip + viewer)
 * while react-pdf fetches `application/pdf` bytes from this resource route.
 *
 * Security (unchanged from the original byte loader):
 *   T-05-DOC: requireUser + assertSubjectAccess before streaming any bytes.
 *   Cross-tenant docId yields 403. No bytes are ever served without
 *   successful auth + tenant-scoped authz.
 *
 * Loader-only (no UI component) — returns a streaming PDF response.
 *
 * LAB-04 / D-06: Bytes served here back the PDF render in the review surface
 * and the document viewer page.
 */

import type { Route } from "./+types/document-raw";
import { requireUser, assertSubjectAccess } from "~/lib/authz.server";
import { getDb } from "~/lib/db.server";
import { eq } from "drizzle-orm";
import { labDocuments } from "../../../../db/schema";

// ── Loader ─────────────────────────────────────────────────────────────────

export async function loader({ request, params }: Route.LoaderArgs) {
  // T-05-DOC: Authentication + authorization BEFORE reading any bytes
  const { user } = await requireUser(request);

  const docId = params.id;
  if (!docId) {
    throw new Response("Not found", { status: 404 });
  }

  // Load the labDocuments row to get tenantId for authz check
  const db = getDb();
  const [doc] = await db
    .select()
    .from(labDocuments)
    .where(eq(labDocuments.id, docId));

  if (!doc) {
    throw new Response("Not found", { status: 404 });
  }

  // T-05-DOC: assertSubjectAccess — 403 for cross-tenant docId
  assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!);

  // PDF bytes may have been purged after all extractions are resolved
  if (!doc.pdfBytes) {
    throw new Response("PDF bytes no longer available (purged after review completion)", {
      status: 410,
    });
  }

  // Decode base64 → binary and stream as application/pdf
  const pdfBuffer = Buffer.from(doc.pdfBytes, "base64");

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdfBuffer.length),
      // Inline display (browser renders in PDF viewer / react-pdf canvas)
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      // Prevent caching of PHI bytes
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
