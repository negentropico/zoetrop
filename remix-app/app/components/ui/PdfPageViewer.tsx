/**
 * PdfPageViewer.tsx — SSR-safe wrapper around the react-pdf renderer.
 *
 * Why this wrapper exists: react-pdf pulls in pdfjs-dist, whose module
 * evaluation references the browser-only `DOMMatrix` global. If that module is
 * imported into the SERVER bundle it crashes the serverless function on
 * cold-start import (`ReferenceError: DOMMatrix is not defined`), which 500s
 * EVERY route (the server build is shared) — confirmed in Vercel runtime logs.
 *
 * Fix: keep ALL react-pdf code in PdfPageViewerInner.tsx and load it ONLY on the
 * client, via a mounted guard + dynamic import(). The factory inside lazy() only
 * runs when the inner element is first rendered, and the mounted guard ensures
 * that never happens on the server (or during the first, pre-hydration client
 * render) — so react-pdf/pdfjs-dist never executes server-side, and SSR output
 * matches the first client render (no hydration mismatch).
 *
 * Callers import { PdfPageViewer } from "~/components/ui/PdfPageViewer" exactly
 * as before — the wrapper is a drop-in replacement.
 */

import { lazy, Suspense, useEffect, useState } from "react";
import type { PdfPageViewerProps } from "./PdfPageViewerInner";

export type { PdfPageViewerProps };

// Dynamic import: this factory only executes when <PdfPageViewerInner /> is first
// rendered. The mounted guard below prevents that on the server, keeping
// pdfjs-dist out of the server runtime entirely.
const PdfPageViewerInner = lazy(() =>
  import("./PdfPageViewerInner").then((m) => ({ default: m.PdfPageViewerInner }))
);

function PdfLoadingPlaceholder() {
  return (
    <div
      style={{
        padding: "40px 24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "var(--text-sm)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)",
      }}
    >
      Loading PDF…
    </div>
  );
}

export function PdfPageViewer(props: PdfPageViewerProps) {
  const [mounted, setMounted] = useState(false);

  // Runs only on the client, after hydration.
  useEffect(() => setMounted(true), []);

  // Server render + first (pre-hydration) client render → placeholder only.
  // Guarantees react-pdf is never imported/evaluated on the server and that the
  // SSR markup matches the initial client markup (no hydration warning).
  if (!mounted) return <PdfLoadingPlaceholder />;

  return (
    <Suspense fallback={<PdfLoadingPlaceholder />}>
      <PdfPageViewerInner {...props} />
    </Suspense>
  );
}
