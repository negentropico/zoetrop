/**
 * index.tsx — Ingest section landing
 *
 * Lightweight landing page for the /ingest route. Redirects to the upload
 * surface or renders a simple overview Card with a link to /ingest/upload.
 *
 * IMPORTANT: This file MUST NOT contain an upload Dropzone, upload action, or
 * extractionWorker call. There is exactly ONE upload surface: the named
 * ingest/upload route → routes/_app/ingest/upload.tsx (05-02). This landing
 * merely links to it.
 *
 * LAB-04 / D-10: Single upload surface constraint enforced.
 */

import { redirect } from "react-router";

// Redirect the /ingest root directly to the upload surface so the first
// click on "Ingest" in the nav lands on the upload form.
export function loader() {
  return redirect("/ingest/upload");
}

// Default export is required by React Router even when the loader always
// redirects — this component is never rendered in normal flow.
export default function IngestIndex() {
  return null;
}
