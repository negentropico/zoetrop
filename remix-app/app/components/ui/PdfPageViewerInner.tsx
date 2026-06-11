/**
 * PdfPageViewerInner.tsx — Client-ONLY PDF page renderer with text-layer snippet
 * highlight and multi-page navigation.
 *
 * ⚠️ Never import this module from server code, a loader, or a top-level route
 * module import. It pulls in react-pdf → pdfjs-dist, whose module evaluation
 * references the browser-only `DOMMatrix` global. Imported on the server it
 * throws `ReferenceError: DOMMatrix is not defined` and crashes the serverless
 * function on cold start (every route 500s). It is loaded exclusively via the
 * mounted-guarded dynamic import in PdfPageViewer.tsx.
 *
 * Uses react-pdf (wojtekmaj) which wraps pdfjs-dist for browser canvas rendering.
 * renderTextLayer={true} enables the transparent text overlay needed for snippet
 * highlighting (D-06 grounded snippet location).
 *
 * PITFALL 6 guard: do NOT add pdfjs-dist to direct dependencies. react-pdf manages
 * its own pdfjs-dist version as a peer dep. The worker is referenced via import.meta.url
 * so Vite bundles the correct version from node_modules automatically.
 *
 * Worker config at module level (one-time setup, not per-render).
 *
 * LAB-04 / D-06: Renders the real PDF page beside extracted fields with the
 * grounded sourceTextSnippet highlighted. The viewer auto-jumps to the selected
 * extraction's page and lets the reviewer page through the full document for
 * context (prev/next + "jump to highlighted page").
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// ── Worker configuration (module-level, one-time) ──────────────────────────
// Use the copy of the worker shipped with pdfjs-dist (installed as react-pdf
// peer dep). Pitfall 6: do NOT install pdfjs-dist directly — let react-pdf
// manage its version to prevent worker/API mismatch.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ── Types ──────────────────────────────────────────────────────────────────

export interface PdfPageViewerProps {
  /** URL of the PDF to render — should point to /ingest/documents/:id */
  pdfUrl: string;
  /** 1-based page number the selected extraction is grounded on */
  pageNumber: number;
  /** Verbatim text snippet from the PDF to locate and highlight (D-06) */
  highlightSnippet?: string;
  /** Render width in pixels. @default 600 */
  width?: number;
}

// ── Highlight helper ───────────────────────────────────────────────────────

/**
 * After the text layer renders, search the text-layer DOM for the
 * highlightSnippet and apply a yellow highlight CSS class to all matching spans.
 *
 * PDF text layers render each word or token as individual <span> elements.
 * We concatenate them and search the concatenated text; then we mark spans
 * whose text is inside the matched range. This is a best-effort approach
 * (handles single-span and multi-word snippets via whitespace normalization).
 */
function applyTextLayerHighlight(
  container: HTMLElement,
  snippet: string
): void {
  if (!snippet) return;

  // Remove any existing highlights before re-applying
  container.querySelectorAll(".zt-pdf-highlight").forEach((el) => {
    el.classList.remove("zt-pdf-highlight");
  });

  const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const normalizedSnippet = normalize(snippet);
  if (!normalizedSnippet) return;

  const spans = Array.from(
    container.querySelectorAll<HTMLSpanElement>(".react-pdf__Page__textContent span")
  );

  // Build the concatenated text and track which chars map to which span
  let concatenated = "";
  const spanRanges: Array<{ span: HTMLSpanElement; start: number; end: number }> = [];
  for (const span of spans) {
    const text = span.textContent ?? "";
    const start = concatenated.length;
    concatenated += text;
    spanRanges.push({ span, start, end: start + text.length });
  }

  const normalizedConcat = normalize(concatenated);
  const matchIdx = normalizedConcat.indexOf(normalizedSnippet);
  if (matchIdx === -1) return;

  const matchEnd = matchIdx + normalizedSnippet.length;

  // Highlight spans that overlap with the matched range
  for (const { span, start, end } of spanRanges) {
    if (end > matchIdx && start < matchEnd) {
      span.classList.add("zt-pdf-highlight");
    }
  }
}

// ── Nav button ───────────────────────────────────────────────────────────────

function NavButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "4px 10px",
        fontSize: "var(--text-xs)",
        color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function PdfPageViewerInner({
  pdfUrl,
  pageNumber,
  highlightSnippet,
  width = 600,
}: PdfPageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  // The page currently shown. Initialised to the extraction's page and re-synced
  // whenever a different extraction is selected; also user-navigable.
  const [currentPage, setCurrentPage] = useState(pageNumber);

  // When the selected extraction changes, jump to its grounded page.
  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber]);

  // The snippet only belongs on the extraction's own page — don't highlight
  // (and don't search) while the reviewer is browsing other pages.
  const onSnippetPage = currentPage === pageNumber;

  // Re-apply highlights whenever the snippet or the shown page changes.
  useEffect(() => {
    if (!onSnippetPage || !highlightSnippet || !containerRef.current) return;
    applyTextLayerHighlight(containerRef.current, highlightSnippet);
  }, [highlightSnippet, currentPage, onSnippetPage]);

  function handlePageRenderSuccess() {
    // Text layer renders slightly after the page — poll briefly for it.
    if (!onSnippetPage || !highlightSnippet || !containerRef.current) return;
    const container = containerRef.current;
    const maxWait = 2000;
    const interval = 100;
    let elapsed = 0;
    const poll = setInterval(() => {
      const textLayer = container.querySelector(
        ".react-pdf__Page__textContent"
      );
      if (textLayer) {
        clearInterval(poll);
        applyTextLayerHighlight(container, highlightSnippet);
      } else {
        elapsed += interval;
        if (elapsed >= maxWait) clearInterval(poll);
      }
    }, interval);
  }

  const canPrev = currentPage > 1;
  const canNext = numPages != null && currentPage < numPages;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)",
        overflow: "hidden",
      }}
    >
      {/* Inline style for snippet highlight — injected once */}
      <style>{`
        .zt-pdf-highlight {
          background: rgba(255, 220, 0, 0.55) !important;
          border-radius: 2px;
          padding: 0 1px;
        }
      `}</style>

      {/* Page navigation bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-2)",
        }}
      >
        <NavButton onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
          ← Prev
        </NavButton>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            minWidth: 80,
            textAlign: "center",
          }}
        >
          Page {currentPage}
          {numPages ? ` / ${numPages}` : ""}
        </span>
        <NavButton onClick={() => setCurrentPage((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))} disabled={!canNext}>
          Next →
        </NavButton>
        {!onSnippetPage && (
          <NavButton onClick={() => setCurrentPage(pageNumber)}>
            ⤴ Jump to highlighted (p.{pageNumber})
          </NavButton>
        )}
      </div>

      {/* Scrollable page area */}
      <div ref={containerRef} style={{ overflow: "auto", maxHeight: 660 }}>
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              Loading PDF...
            </div>
          }
          error={
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                color: "var(--danger)",
                fontSize: "var(--text-sm)",
              }}
            >
              Failed to load PDF. The file may have been purged after review was completed.
            </div>
          }
          noData={
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              No PDF data available.
            </div>
          }
        >
          <Page
            key={currentPage}
            pageNumber={currentPage}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            width={width}
            onRenderSuccess={handlePageRenderSuccess}
          />
        </Document>
      </div>
    </div>
  );
}
