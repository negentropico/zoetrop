# 08 · Import · WHOOP

- **Route:** `/import/whoop` (`app/routes/import/whoop.tsx`)
- **Archetype:** **Form / file upload** + async result state
- **Screenshots:** `desktop.png` · `mobile.png`
- **Informs:** **Phase 5 (Lab Ingest Pipeline)** — its direct predecessor

## Purpose
Upload a WHOOP Analyzer JSON export, parse it, preview the extracted metrics,
and (eventually) commit them. This **upload → parse → preview → commit** flow is
the structural ancestor of the Phase 5 lab-PDF ingest review UI.

## Data shown
- Instructions card ("upload `whoop_analysis_report.json`").
- **Drag-and-drop zone** (dashed border; "Browse files"; selected-file state
  with name/size/Remove).
- **Parse** submit button (disabled until a file is chosen; "Parsing…" state).
- **Result states:** error card; success card; **Import Summary** (counts);
  **Preview (first 10)** metric list; **Save to Database** CTA.
- "How to export from WHOOP" ordered list + default path code chip.

## Current structure
Stacked frame cards. Dropzone turns **blue** when dragging; primary buttons are
ink/white (`gray-900`); "Save to Database" is **green**; code chips grey.

## Screen-specific violations
- Drag-active state **blue** → V4 (→ periwinkle).
- Buttons are bespoke (ink/white, green) → use brand **Button** variants.
- Code chips / mono path not in Space Mono → V1/V10.
- Generic, system-y copy → V7 (apply brand voice).

## Redesign goals
- Dropzone → brand treatment: warm dashed `--border-strong`, **periwinkle**
  drag-active (`--focus-50` fill), Lucide `upload` / `file-json` icon, ≥44px
  targets.
- Buttons → brand `Button` (periwinkle primary, neutral secondary); success →
  Vital tone; disabled per brand.
- Counts/paths → Space Mono; summary numbers tabular.
- **Anticipate Phase 5:** the redesign should sketch how this scales to the
  lab-ingest review UI — source document **side-by-side** with extracted fields,
  **per-field approve / edit / reject**, **confidence flags** (e.g. K-levels /
  low-confidence), and range-validation warnings. A clean two-pane
  review pattern designed here pays off directly in Phase 5.
- Empty/instruction copy → calm brand voice.
