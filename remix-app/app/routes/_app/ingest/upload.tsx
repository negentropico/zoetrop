/**
 * upload.tsx — LAB-01 lab PDF upload action with waitUntil background extraction
 *
 * Security measures (see threat model in 05-02-PLAN.md):
 *   T-05-AUTHZ: requireUser → requireRole → assertSubjectAccess before any write
 *   T-05-CONSENT: checkConsent before any PHI insert (LAB-06/D-08)
 *   T-05-UP: MIME type (application/pdf) + magic bytes (%PDF) check + 10MB size limit
 *   T-05-LLM: extraction via extractionWorker (tool-schema-constrained, never executes extracted text)
 *
 * waitUntil pattern (D-10/D-12):
 *   The action inserts the labDocuments row synchronously, then calls
 *   waitUntil(extractionWorker(docId)) to run LLM extraction in the background.
 *   The response (redirect) is returned within 2s. The worker runs up to maxDuration.
 *
 * IMPORTANT: waitUntil is called from the action ONLY — never from a loader
 *   (React Router issue #72176 workaround — RESEARCH lines 803-857).
 */

import { useState, useRef } from "react";
import { redirect, Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { waitUntil } from "@vercel/functions";
import type { Route } from "./+types/upload";
import { requireUser } from "~/lib/authz.server";
import { requireRole } from "~/lib/authz.server";
import { assertSubjectAccess } from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import type { TenantCtx } from "~/lib/data.server";
import { checkConsent } from "~/lib/consent.server";
import { insertAuditLog } from "~/lib/audit.server";
import { extractionWorker } from "~/lib/ingest/ingest.server";
import { getDb } from "~/lib/db.server";
import { labDocuments } from "../../../../db/schema";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
import { Dropzone } from "~/components/ui/Dropzone";
import type { AppRole } from "~/lib/authz.server";

// ── Vercel function config ─────────────────────────────────────────────────
// NOTE: We intentionally do NOT set a per-route `export const config` here.
// The @vercel/react-router preset compiles one serverless function PER unique
// route config, so a per-route `maxDuration` would split this route into its
// own bundle. Under that split, React Router single-fetch `.data` requests for
// OTHER routes (e.g. POST /ingest/consent.data from the hydrated consent form)
// get mis-routed across bundles and 404 — which broke the upload→consent flow.
// Keeping all routes on one default bundle makes `.data` routing correct.
// Background extraction duration is covered by Fluid compute (enabled on the
// project), which keeps the function alive for waitUntil() work; a single lab
// PDF extraction completes well within the default window.

// ── Meta ───────────────────────────────────────────────────────────────────

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Upload Lab Report - Zoetrop" },
    { name: "description", content: "Upload a lab PDF for AI-assisted extraction" },
  ];
}

// ── Action ─────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  // T-05-AUTHZ: Authentication + authorization sequence
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]);

  // Resolve subject from tenant
  const subject = await getOwnerSubject(user.tenantId!);
  assertSubjectAccess(user, subject, user.tenantId!);
  const ctx: TenantCtx = { userId: user.id, tenantId: user.tenantId!, subjectId: subject.id };

  // T-05-CONSENT: Consent gate — BEFORE any PHI write (LAB-06/D-08)
  const hasConsent = await checkConsent(ctx);
  if (!hasConsent) {
    return redirect("/ingest/consent?next=/ingest/upload");
  }

  // Parse the uploaded file
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return { error: "No file provided", success: false };
  }

  // T-05-UP: 10MB size limit (10 * 1024 * 1024 bytes)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return {
      error: "File too large. Maximum size is 10MB.",
      success: false,
    };
  }

  // T-05-UP: MIME type check
  if (file.type !== "application/pdf") {
    return {
      error: "Invalid file type. Only PDF files are accepted.",
      success: false,
    };
  }

  // T-05-UP: Magic bytes check — PDF files start with %PDF (0x25 0x50 0x44 0x46)
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const isPdf =
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46;   // F

  if (!isPdf) {
    return {
      error: "Invalid file content. File does not appear to be a PDF (%PDF header missing).",
      success: false,
    };
  }

  // Encode to base64 for storage (stored as text in Neon — pilot only, TODO: Vercel Blob at M2)
  const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

  // Insert labDocuments row synchronously (commits before the response returns)
  const db = getDb();
  const docId = crypto.randomUUID();

  await db.insert(labDocuments).values({
    id: docId,
    tenantId: user.tenantId!,
    subjectId: subject.id,
    uploadedBy: user.id,
    status: "uploaded",
    fileName: file.name,
    pdfBytes: pdfBase64,
  });

  // Audit log the upload event — D-13: no PHI values
  await insertAuditLog({
    userId: user.id,
    role: user.role as AppRole,
    action: "upload",
    tableName: "lab_documents",
    operation: "insert",
    tenantId: user.tenantId!,
    subjectId: subject.id,
    entityId: docId,
  });

  // Background extraction — does NOT block the response (D-10)
  // IMPORTANT: waitUntil must be called from the action, not a loader (Pitfall 1)
  waitUntil(extractionWorker(docId));

  // Return within 2s — review UI polls for status changes
  return redirect(`/ingest/review?docId=${docId}`);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function UploadLabReport() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
  };

  const handleRemove = () => {
    setFile(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/ingest/upload", {
        method: "POST",
        body: formData,
      });

      if (response.redirected) {
        window.location.href = response.url;
        return;
      }

      const result = await response.json();
      if (!result.success && result.error) {
        setError(result.error);
        setUploading(false);
      }
    } catch {
      setError("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="LAB INGEST"
        title="Upload lab report"
        sub="Upload a PDF lab report for AI-assisted extraction and review."
        right={
          <Link
            to="/ingest/consent?next=/ingest/upload"
            className="zt-pill"
            style={{ textDecoration: "none" }}
          >
            <ShieldCheck size={13} strokeWidth={2} />
            Consent
          </Link>
        }
      />

      <div className="zt-grid-split">
        {/* Left: upload form */}
        <div>
          <Card padding="lg" style={{ marginBottom: "var(--gap-lg)" }}>
            <div className="zt-eyebrow" style={{ marginBottom: 8 }}>
              Lab report PDF
            </div>
            <p
              style={{
                marginTop: 0,
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                marginBottom: 20,
              }}
            >
              Upload a text-extractable PDF lab report (LabCorp, Quest, etc.).
              Scanned/image-only PDFs are not supported in the pilot.
            </p>

            <form ref={formRef} onSubmit={handleSubmit} method="post" encType="multipart/form-data">
              {!file && (
                <Dropzone
                  accept=".pdf,application/pdf"
                  onFile={handleFile}
                  label="Drag and drop your lab PDF here"
                />
              )}

              {file && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {file.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {file.size ? (file.size / 1024).toFixed(1) + " KB" : "ready"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemove}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: 6,
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--energy)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--energy)",
                    fontSize: "var(--text-sm)",
                    marginBottom: 16,
                  }}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={!file || uploading}
              >
                {uploading ? "Uploading…" : "Upload and extract"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: info */}
        <div>
          <Card padding="lg">
            <div className="zt-eyebrow" style={{ marginBottom: 12 }}>
              How it works
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 20,
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                lineHeight: "var(--leading-relaxed)",
              }}
            >
              <li>Upload your PDF lab report.</li>
              <li>AI extracts analyte values using the lab dictionary.</li>
              <li>Review extracted fields side-by-side with the source PDF.</li>
              <li>Approve, edit, or reject each field.</li>
              <li>Approved values are saved to your tracker.</li>
            </ol>
            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
            >
              Text-extractable PDFs only (pilot). Extraction runs in the
              background — the review page loads within 2 seconds.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
