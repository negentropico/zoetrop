/**
 * index.tsx — Combined Ingest overview (/ingest, round-3 IA, design-r35/W3)
 *
 * Import + Ingest merged into one section: the two old link-hub overviews are
 * replaced by THIS single surface — a Sources list (Lab PDFs / WHOOP / Vault)
 * and the Review gate row with the live pending-field count (round-4
 * "gate-count flow-back"), plus document rows under the gate. /import
 * redirects here; /import/whoop and /import/vault stay as aliases under the
 * Ingest nav group.
 *
 * IMPORTANT: This file MUST NOT contain an upload Dropzone, upload action, or
 * extractionWorker call. There is exactly ONE upload surface: the named
 * ingest/upload route → routes/_app/ingest/upload.tsx (05-02). This overview
 * merely links to it. (LAB-04 / D-10: single upload surface constraint.)
 */

import { Link } from "react-router";
import type { Route } from "./+types/index";
import { and, desc, eq } from "drizzle-orm";
import {
  ChevronRight,
  ClipboardCheck,
  FileText,
  FileUp,
  FolderOpen,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";
import { requireUser, assertSubjectAccess } from "~/lib/authz.server";
import { getActiveSubject } from "~/lib/data.server";
import { getDb } from "~/lib/db.server";
import { labDocuments, labExtractions } from "../../../../db/schema";
import { Card } from "~/components/ui/Card";
import { CatChip } from "~/components/ui/CatChip";
import { PageHeader } from "~/components/ui/PageHeader";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ingest - Zoetrop" },
    {
      name: "description",
      content: "Every source that writes to your metrics, and the review gate in front of them",
    },
  ];
}

// ── Loader ─────────────────────────────────────────────────────────────────
// Same tenant/subject scoping sequence as review.tsx (requireUser →
// getActiveSubject → assertSubjectAccess → scoped selects).

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getActiveSubject(request, user.tenantId!);
  assertSubjectAccess(user, subject, user.tenantId!);

  const db = getDb();

  const [docs, pendingExtractions] = await Promise.all([
    db
      .select({
        id: labDocuments.id,
        fileName: labDocuments.fileName,
        status: labDocuments.status,
        pageCount: labDocuments.pageCount,
        createdAt: labDocuments.createdAt,
      })
      .from(labDocuments)
      .where(
        and(
          eq(labDocuments.tenantId, user.tenantId!),
          eq(labDocuments.subjectId, subject.id)
        )
      )
      .orderBy(desc(labDocuments.createdAt)),
    db
      .select({ id: labExtractions.id })
      .from(labExtractions)
      .where(
        and(
          eq(labExtractions.tenantId, user.tenantId!),
          eq(labExtractions.subjectId, subject.id),
          eq(labExtractions.status, "pending_review")
        )
      ),
  ]);

  // Docs still in the pipeline (not yet fully reviewed/failed)
  const pendingDocs = docs.filter(
    (d) =>
      d.status === "uploaded" ||
      d.status === "processing" ||
      d.status === "pending_review"
  ).length;

  return {
    pendingFields: pendingExtractions.length,
    pendingDocs,
    hasDocs: docs.length > 0,
    docs: docs.slice(0, 5),
  };
}

// ── Row primitives (zt-mrow link rows, insights-overview idiom) ─────────────

function SourceRow({
  icon,
  to,
  name,
  desc,
  status,
  statusColor,
  family,
  last,
}: {
  icon: LucideIcon;
  to: string;
  name: string;
  desc: string;
  status: string;
  statusColor?: string;
  family?: "vital" | "energy" | "focus" | null;
  last?: boolean;
}) {
  return (
    <Link to={to} style={{ textDecoration: "none", display: "block" }}>
      <div
        className="zt-mrow"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--gap-lg)",
          padding: "var(--gap-row) var(--gap-card)",
          borderBottom: last ? "none" : "1px solid var(--border)",
          cursor: "pointer",
        }}
      >
        <CatChip icon={icon} family={family ?? null} size={36} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text)" }}>
            {name}
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginTop: 2,
              textWrap: "pretty",
            }}
          >
            {desc}
          </div>
        </div>
        <span
          className="zt-eyebrow zt-tnum"
          style={{ flex: "0 0 auto", color: statusColor ?? "var(--text-muted)" }}
        >
          {status}
        </span>
        <ChevronRight size={16} strokeWidth={1.5} color="var(--text-faint)" />
      </div>
    </Link>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function IngestIndex({ loaderData }: Route.ComponentProps) {
  const { pendingFields, pendingDocs, hasDocs, docs } = loaderData;

  const labStatus =
    pendingDocs > 0
      ? `${pendingDocs} doc${pendingDocs === 1 ? "" : "s"} pending`
      : "0 pending";

  // Round-4 gate-count flow-back: borderline tint while fields are pending.
  const gateStatus =
    pendingFields > 0
      ? `${pendingFields} field${pendingFields === 1 ? "" : "s"} pending`
      : hasDocs
        ? "reviewed"
        : "0 pending";
  const gateColor = pendingFields > 0 ? "var(--borderline)" : "var(--text-muted)";

  return (
    <div>
      <PageHeader
        eyebrow="DATA INGEST"
        title="Ingest"
        sub="Every source that writes to your metrics, and the review gate in front of them."
      />

      {/* Sources — Lab PDFs (live pipeline) + WHOOP/Vault (manual imports) */}
      <section className="zt-section">
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-lg)" }}>
          Sources
        </div>
        <Card padding="none">
          <SourceRow
            icon={FileUp}
            to="/ingest/upload"
            name="Lab PDFs"
            desc="AI-assisted extraction from lab report PDFs"
            status={labStatus}
            statusColor={pendingDocs > 0 ? "var(--borderline)" : undefined}
          />
          <SourceRow
            icon={HeartPulse}
            to="/import/whoop"
            name="WHOOP"
            desc="HRV, recovery, sleep → Autonomic"
            status="manual · JSON export"
          />
          <SourceRow
            icon={FolderOpen}
            to="/import/vault"
            name="Vault"
            desc="Protocol notes and targets from Obsidian"
            status="manual import"
            last
          />
        </Card>
      </section>

      {/* Review gate — pending-field count + document rows (round-4 flow-back) */}
      <section className="zt-section">
        <div className="zt-eyebrow" style={{ marginBottom: "var(--gap-lg)" }}>
          Review gate
        </div>
        <Card padding="none">
          <SourceRow
            icon={ClipboardCheck}
            to="/ingest/review"
            name="Extraction review"
            desc="Approve, edit, or reject each field before metrics are written"
            status={gateStatus}
            statusColor={gateColor}
            family="energy"
            last={docs.length === 0}
          />
          {docs.map((doc, i) => (
            <Link
              key={doc.id}
              to={`/ingest/documents/${doc.id}`}
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                className="zt-mrow"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--gap-lg)",
                  padding: "var(--gap-row) var(--gap-card)",
                  borderBottom: i < docs.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                }}
              >
                <CatChip icon={FileText} size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      color: "var(--text)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {doc.fileName}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                    {[
                      "Lab PDF",
                      doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : null,
                      doc.pageCount ? `${doc.pageCount} page${doc.pageCount === 1 ? "" : "s"}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <span className="zt-eyebrow" style={{ flex: "0 0 auto" }}>
                  {doc.status.replace(/_/g, " ")}
                </span>
                <ChevronRight size={16} strokeWidth={1.5} color="var(--text-faint)" />
              </div>
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}
