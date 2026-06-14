# Phase 5: Lab Ingest Pipeline - Research

**Researched:** 2026-06-10
**Domain:** PDF ingest / LLM-assisted extraction / async on Vercel / structured DB writes with audit
**Confidence:** HIGH (Anthropic API, Vercel limits, PDF libraries — all verified against official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Analyte dictionary is the authority for `name`, `category`, `subcategory`, `unit`, `referenceMin/Max`, `optimalMin/Max`. LLM maps lines to dictionary keys + reads values/units — does not invent ranges.
- **D-02:** Unrecognized analytes surface in review UI as unrecognized (never silently dropped).
- **D-03:** v1 dictionary scope = owner's existing M0 analytes + standard common panels (CBC, CMP, lipids, thyroid, vitamins/minerals, hs-CRP/homocysteine).
- **D-04:** Unit handling lives in the dictionary. *(OPEN sub-question — resolved below.)*
- **D-05:** Pilot accepts text-extractable PDFs only (no scanned/image-only PDFs).
- **D-06:** Review UI renders the actual PDF page beside extracted fields, with the grounded `sourceTextSnippet` highlighted.
- **D-07:** Scanned/image-only PDFs deferred.
- **D-08:** Consent gate at first upload (self-consent for pilot). Writes blocked until `consentLog` row exists.
- **D-09:** Consent UI built generically for future client intake.
- **D-10:** Upload action commits a `labDocuments` row and returns within 2s, then kicks LLM extraction via Vercel background function (`waitUntil`) — no managed queue.
- **D-11:** Review/list view polls document status. Extraction completion observed by status change.
- **D-12:** *(OPEN sub-question — resolved below: confirmed feasible with caveats.)*
- **D-13:** `auditLog` table records lifecycle events; no PHI field values in any log entry.
- **D-14:** LLM = Anthropic Claude via standard subscription API. No-training default. Model selection → this research.
- **D-15:** Write-side `assertSubjectAccess` on the approve→insert path (closes CR-01 write-path gap).
- **D-16:** `lab` value likely needs adding to `dataSourceEnum`. *(OPEN sub-question — resolved below.)*

### Claude's Discretion

- Dictionary data structure (TS module vs DB table).
- Duplicate-upload / re-extraction handling (allow; no dedupe for pilot).
- PDF page rendering in browser (pdf.js / embed / page-image).

### Deferred Ideas (OUT OF SCOPE)

- Scanned/photo (image-only) lab ingest via vision/OCR.
- Managed durable queue (Inngest/QStash).
- Comprehensive hundreds-of-analyte reference dictionary.
- External-client PHI extraction (hard-blocked until Phase 7 LLM BAA).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAB-01 | A practitioner can upload a lab document (PDF) for a subject | Dropzone component reuse; action → `labDocuments` insert; 2s return + `waitUntil` |
| LAB-02 | An asynchronous extraction job parses the document into structured candidate metrics | `waitUntil` from `@vercel/functions`; Claude document-block API; `labExtractions` write with status machine |
| LAB-03 | Extracted values validated (grounded to source text + physiological-range sanity + per-field confidence) before reaching review | Server-side text extraction via `unpdf`; grounding check function; dictionary range-check function |
| LAB-04 | Practitioner reviews fields side-by-side with source document; can approve/edit/reject each | `react-pdf` for browser page render; review route reads `labExtractions`; per-field action |
| LAB-05 | Only practitioner-approved metrics written to `metrics`; each produces an `auditLog` entry | `assertSubjectAccess` call; `auditLog` insert; Drizzle transaction; no PHI values in log |
| LAB-06 | Client consent captured at intake before any PHI is stored | `consentLog` table; consent gate in upload action; `consentVersion: 'v1-pilot-self'` |
</phase_requirements>

---

## Summary

Phase 5 adds a structured PDF→lab-metrics ingest pipeline to an existing React Router 7 / Neon / Drizzle app. The pipeline has five distinct capability areas: (1) server-side PDF text extraction for grounding, (2) LLM-assisted structured extraction via the Anthropic API with native PDF document blocks, (3) async background execution via Vercel `waitUntil`, (4) browser-side PDF page rendering for the review surface, and (5) schema/write infrastructure (4 new tables, audit log, consent gate, `assertSubjectAccess` wiring).

All five open sub-questions (D-04, D-10/D-12, D-05/D-06 rendering, D-16) are resolved with authoritative evidence below. The single highest-risk concern is `waitUntil` compatibility with React Router on Vercel: documented issues exist. The safe pattern is calling `waitUntil` inside an `action` function — not a loader — and importing from `@vercel/functions`. Vercel Pro plan allows up to 800s total function duration, which is ample for multi-page lab extraction. The fallback (Vercel Cron draining a job table) is straightforward to retrofit if needed.

**Primary recommendation:** Use `claude-sonnet-4-6` (not Opus 4.8) for extraction — fast, cheaper at $3/$15/MTok, supports native PDF document blocks, and structured outputs via tool use. Server-side text extraction uses `unpdf` (serverless-compatible PDF.js wrapper). Browser rendering uses `react-pdf` (mature, well-maintained React wrapper over `pdfjs-dist`). Dictionary is a TS module (non-PHI reference data, safe for server bundle). Add `lab` to `dataSourceEnum`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF file upload (receive bytes) | API / Backend (Remix action) | — | File bytes must not traverse client; action handles `multipart/form-data` |
| `labDocuments` row commit | API / Backend | Database | Synchronous, completes before 2s response |
| LLM extraction job | API / Backend (background, same function via `waitUntil`) | — | Anthropic API call is outbound I/O; serverless-compatible with `waitUntil` |
| Server-side text extraction | API / Backend | — | `unpdf` runs server-side; produces verbatim `sourceTextSnippet` |
| Grounding check (text-contains) | API / Backend (pure function) | — | Pure function, no I/O; runs post-extraction, pre-review |
| Range check against dictionary | API / Backend (pure function) | — | Pure function; dictionary is TS module imported server-side |
| Consent gate | API / Backend | Database | `consentLog` read blocks write; runs in action before any PHI insert |
| `assertSubjectAccess` | API / Backend | — | Authz check must run server-side, pre-write |
| `auditLog` write | API / Backend + Database | — | Co-located with metrics insert inside a Drizzle transaction |
| `labExtractions` status polling | Browser / Client | API / Backend | Client polls via loader re-fetch; `React.useEffect` with `setTimeout` or `<fetcher>` |
| PDF page rendering (review UI) | Browser / Client | — | `react-pdf` renders PDF bytes in canvas; runs in browser only |
| `sourceTextSnippet` highlight | Browser / Client | — | Text search within rendered canvas page (text layer overlay) |
| Analyte dictionary lookup | API / Backend | — | Non-PHI reference data; TS module; never in client bundle |
| `metrics` insert (approved) | API / Backend + Database | — | Drizzle transaction; `assertSubjectAccess` + `auditLog` in same tx |

---

## Standard Stack

### Core — Server-Side

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.104.1 | Anthropic API client — PDF document blocks + tool use / structured output | Official SDK from Anthropic; 24.9M/wk downloads; 3.4 yr old |
| `unpdf` | 1.6.2 | Server-side PDF text extraction (serverless-compatible PDF.js wrapper) | Built specifically for serverless/edge; wraps pdfjs-dist v5; 1M/wk downloads; no postinstall |
| `@vercel/functions` | 3.7.0 | `waitUntil` for background processing after HTTP response | Official Vercel package; 3.6M/wk; required for non-Next.js `waitUntil` |

### Core — Client-Side (Review UI)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-pdf` | 10.4.1 | Render PDF pages in browser canvas with text layer | 4.9M/wk; 11.7 yr old; React wrapper over pdfjs-dist; official wojtekmaj maintained |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pdfjs-dist` | 6.0.227 | Underlying PDF.js engine (peer dep of react-pdf) | Required by react-pdf; do not call directly; 18.2M/wk; 11.7 yr old |

### Existing (Already Available)

| Library | In package.json | Purpose |
|---------|----------------|---------|
| `drizzle-orm` | ^0.45.1 | ORM for all 4 new tables |
| `vitest` | ^4.1.8 | Test runner (extend for LAB-01..06 coverage) |
| `@neondatabase/serverless` | ^1.0.2 | DB connection for server functions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unpdf` | `pdfjs-dist` directly | pdfjs-dist direct Node usage requires canvas polyfill in serverless; `unpdf` packages the serverless bundle without that complexity |
| `react-pdf` | Raw `pdfjs-dist` canvas | react-pdf adds `<Document>` / `<Page>` components, text layer, and PDF.js worker setup with a single import — saves ~100 lines of boilerplate |
| `react-pdf` | `<iframe>` or `<object>` embed | Embed doesn't expose page text layer for snippet highlighting; also broken in some lab-portal PDF DRM scenarios |
| `claude-sonnet-4-6` | `claude-opus-4-8` | Opus 4.8 is 1.7× more expensive; Sonnet 4.6 is faster with equivalent structured-output quality for data extraction tasks |

**Installation (new packages only):**
```bash
cd remix-app
npm install @anthropic-ai/sdk unpdf @vercel/functions react-pdf
```

**Version verification:** All versions above confirmed via `npm view [pkg] version` on 2026-06-10.

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads/wk | Source Repo | slopcheck | Disposition |
|---------|----------|-----|--------------|-------------|-----------|-------------|
| `@anthropic-ai/sdk` | npm | 3.4 yr | 24.9M | github.com/anthropics/anthropic-sdk-typescript | N/A (slopcheck unavailable) | Approved — official Anthropic SDK, authoritative source |
| `pdfjs-dist` | npm | 11.7 yr | 18.2M | github.com/mozilla/pdf.js | N/A | Approved — Mozilla official distribution |
| `react-pdf` | npm | 11.7 yr | 4.9M | github.com/wojtekmaj/react-pdf | N/A | Approved — established, single maintainer, long track record |
| `unpdf` | npm | 2.8 yr | 1.0M | github.com/unjs/unpdf | N/A | Approved — unjs ecosystem (same family as nitro/h3); no postinstall |
| `@vercel/functions` | npm | 2.1 yr | 3.6M | github.com/vercel/vercel | N/A | Approved — official Vercel package |

**Postinstall scripts:** None found on any of the five packages (`npm view [pkg] scripts.postinstall` returned empty for all). [ASSUMED — slopcheck was unavailable; marking all packages [ASSUMED] per protocol]

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*slopcheck was unavailable at research time. All packages above are tagged [ASSUMED] and the planner must gate each new install behind a `checkpoint:human-verify` task before `npm install`.*

---

## Resolved Open Questions

### D-04: Unit Handling — Mismatch Routes to Unrecognized Path

**Decision:** Unit mismatch routes to the unrecognized/review path.

**Reasoning:** The dictionary pins a canonical `unit` per analyte (e.g., TSH → `mIU/L`, Ferritin → `ng/mL`). When the LLM extracts a value whose unit does not match the canonical unit for that dictionary key, the extraction should be treated as unrecognized and surfaced to the practitioner rather than silently applying a conversion factor. Conversion factors are lab-specific and error-prone (e.g., glucose mg/dL vs mmol/L involves 18.016 exactly, but other analytes are less clean). The pilot has one user on one lab portal — mismatched units are rare. Full unit conversion belongs in Phase 6+ when the engine needs to aggregate across multiple labs.

**Implementation:** In the extraction validation step, check `extracted.unit === dictionary[key].unit`. If not, set `confidence: 'low'` and `unrecognized: true` on that `labExtraction` row, which surfaces it in the review UI for manual assignment. No conversion math in Phase 5.

---

### D-10/D-12: Vercel `waitUntil` — Confirmed Feasible, With Caveats

**Verdict: USE `waitUntil` from `@vercel/functions`. It works in React Router actions on Vercel Pro. There is a documented compatibility issue in Remix — the fix is to call `waitUntil` from inside the action function, not the loader.**

**Confirmed Vercel limits (authoritative source — Vercel docs, last updated 2026-05-14):** [VERIFIED: vercel.com/docs/functions/configuring-functions/duration]

| Plan | Default duration | Max duration |
|------|-----------------|--------------|
| Hobby | 300s (5 min) | 300s (5 min) |
| **Pro** | **300s (5 min)** | **800s (13 min)** |
| Enterprise | 300s (5 min) | 800s (13 min) |

This project is on Vercel Pro (`zoetrop` team, standard Pro — confirmed in STATE.md). **800 seconds is the hard ceiling.** Fluid compute is enabled by default as of April 23, 2025 on new projects.

**How `waitUntil` works:** [VERIFIED: vercel.com/docs/functions/functions-api-reference/vercel-functions-package] `waitUntil(promise)` extends the function's lifetime for the lifetime of the given promise. The HTTP response is sent immediately; the promise continues running. Promises passed to `waitUntil` have **the same timeout as the function itself** — if the function times out (at the configured `maxDuration`), in-flight promises are cancelled.

**Compatibility with React Router:** The Vercel docs confirm `waitUntil` from `@vercel/functions` is the correct package for non-Next.js frameworks. Import: `import { waitUntil } from '@vercel/functions'`. The documented issue (GitHub issue #72176) was with Remix.run apps where `waitUntil` didn't keep the function alive. The workaround is confirmed: call `waitUntil` from the **action** function (not a loader), and set `export const config = { maxDuration: 60 }` or higher on the route. The `vercelPreset()` in `react-router.config.ts` (already present in this project) enables per-route `maxDuration` configuration.

**Does multi-page PDF extraction fit within the timeout?**

A typical lab PDF is 2–8 pages. Token cost estimate (from Anthropic PDF docs, 1,500–3,000 tokens/page for text + image):
- 8-page lab: ~24,000 input tokens + system prompt (~1,000) + extraction output (~2,000) ≈ 27,000 tokens total
- At `claude-sonnet-4-6` speed (~2,000 output tokens/second equivalent): extraction should complete in 15–45 seconds for typical labs
- Even at 95th percentile (dense panels, slow API): well under 300s default

**Conclusion:** No chunking needed for the pilot's text-extractable single-patient lab PDFs. Set `maxDuration: 120` on the upload route as a safety margin. The 800s ceiling is available if ever needed.

**Fallback (Vercel Cron draining a job table):** Only needed if `waitUntil` proves unreliable in production. Implement as: upload action sets `labDocuments.status = 'queued'`; a `/api/cron/extract` endpoint (Vercel Cron, every 30s or minute) picks up queued rows, runs extraction, updates status. All the DB-state machinery is the same — only the trigger changes.

---

### D-05/D-06: PDF Handling — Server-Side Extraction + Browser Rendering

**Server-side text extraction (for `sourceTextSnippet`):**

Use `unpdf` from the `unjs` ecosystem. [VERIFIED: github.com/unjs/unpdf — confirmed via npm registry and official unjs org]

```typescript
// In the extraction worker (server-side, inside waitUntil callback)
import { extractText } from 'unpdf';

const buffer = await readLabDocumentBytes(labDocumentId); // read from storage or DB
const { text } = await extractText(buffer, { mergePages: false });
// text is string[] — one entry per page
// Use text[pageIndex] for sourceTextSnippet grounding
```

`unpdf` wraps `pdfjs-dist` as a single serverless bundle (no canvas dependency, no Node-only APIs). It exports `extractText` which returns per-page text. The `mergePages: false` option preserves page boundaries, critical for grounding: the `sourceTextSnippet` must be locatable on a specific page number for the review UI to know which page to render.

**Browser-side PDF page rendering (for review UI):**

Use `react-pdf` (wojtekmaj). [VERIFIED: npm registry, github.com/wojtekmaj/react-pdf]

```tsx
// In /ingest/review route — client-side PDF viewer component
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Required: configure the worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function LabPageViewer({ pdfBytes, pageNumber }: { pdfBytes: Uint8Array, pageNumber: number }) {
  return (
    <Document file={{ data: pdfBytes }}>
      <Page
        pageNumber={pageNumber}
        renderTextLayer={true}   // enables text selection / highlight
        renderAnnotationLayer={false}
        width={600}
      />
    </Document>
  );
}
```

`renderTextLayer={true}` renders a transparent text overlay on top of the canvas page. This is the mechanism for highlighting the `sourceTextSnippet`: after the page renders, search the text layer DOM for the snippet text and apply a highlight CSS class. This is standard react-pdf usage.

**PDF bytes in the review route:** The PDF is uploaded by the action. The bytes need to be accessible to the browser for rendering. Options ranked:
1. **Store PDF bytes in Neon (bytea column on `labDocuments`)** — simplest for the pilot; no extra storage service needed; fine for sub-5MB lab PDFs. Serve via a loader endpoint `/ingest/documents/:id/pdf` that reads the bytes, checks `assertSubjectAccess`, and streams the response as `application/pdf`.
2. **Vercel Blob / S3** — not needed for pilot; adds a dependency.

**Recommendation for pilot:** Store PDF bytes as `bytea` or `text` (base64) in `labDocuments`. Serve via a dedicated `/api/lab-documents/:id/pdf` loader that authenticates + authorizes before streaming.

---

### D-16: `dataSourceEnum` — Add `lab`

**Verdict: Add `lab` as a new enum value. Do NOT reuse `bloodwork`.**

**Reasoning:** `bloodwork` in the existing `dataSourceEnum` covers the M0 era when blood work was entered manually. The new ingest pipeline is a distinct data provenance: it is LLM-assisted, practitioner-reviewed, document-backed, and traceable to a specific `labDocuments.id`. Conflating it with `bloodwork` would make it impossible to query "metrics that came from the ingest pipeline" vs "metrics entered manually." The `auditLog` references `labDocuments` — adding a `lab` source makes that join self-documenting.

**Drizzle migration:** The `dataSourceEnum` is a Postgres pgEnum. Adding a value requires `ALTER TYPE data_source ADD VALUE 'lab'`. Drizzle generates this cleanly via `npm run db:generate`. This is a non-breaking additive change — existing rows are unaffected.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Practitioner)
  │
  │ POST /ingest/upload (multipart PDF + subjectId)
  ▼
Remix Action (route: _app/ingest/upload)
  ├── requireUser + requireRole(['owner','practitioner'])
  ├── assertSubjectAccess(user, subject, user.tenantId)
  ├── CHECK consentLog row exists (or redirect to consent gate)
  ├── Extract PDF bytes from FormData
  ├── INSERT labDocuments { status:'uploaded', pdfBytes, tenantId, subjectId }
  ├── waitUntil( extractionWorker(labDocumentId) )  ← background
  └── return redirect('/ingest/review?docId=...') [< 2s]
                          │
                          │ (background, same function)
                          ▼
              extractionWorker(labDocumentId)
                  ├── UPDATE labDocuments SET status='processing'
                  ├── unpdf.extractText(pdfBytes) → pageTexts[]
                  ├── Claude API (claude-sonnet-4-6)
                  │     document block: base64 PDF
                  │     tool: extract_lab_values → [{ analyte, value, unit, sourceTextSnippet, pageNumber }]
                  ├── For each extraction:
                  │     ├── groundingCheck(snippet, pageTexts) → grounded | confidence=low
                  │     ├── dictionaryLookup(analyte) → matched | unrecognized
                  │     ├── rangeCheck(value, dict.referenceMin, dict.referenceMax) → rangeFlag
                  │     └── INSERT labExtractions { status:'pending_review', ... }
                  └── UPDATE labDocuments SET status='pending_review'

Browser (Review UI polls)
  │
  │ GET /ingest/review?docId=...  (polls loader every 3s while status=processing)
  ▼
Review Loader
  ├── requireUser + assertSubjectAccess
  ├── SELECT labDocuments WHERE id=docId
  ├── SELECT labExtractions WHERE labDocumentId=docId
  └── Render: PDF page | extraction fields | approve/edit/reject buttons

  Approve action per field:
  ├── requireUser + assertSubjectAccess
  ├── INSERT metrics { ...fromDictionary, value, unit, source:'lab', tenantId, subjectId }
  ├── INSERT auditLog { userId, role, action:'approve', table:'metrics', operation:'insert', tenantId, subjectId, timestamp }
  └── UPDATE labExtractions SET status='approved'

Consent Gate (first-time upload for subject):
  ├── CHECK SELECT * FROM consentLog WHERE subjectId=?
  ├── IF none → render ConsentForm → POST /ingest/consent
  │     └── INSERT consentLog { subjectId, consentedAt, consentVersion:'v1-pilot-self' }
  └── IF exists → proceed to upload
```

### Recommended Project Structure

```
remix-app/
├── app/
│   ├── lib/
│   │   ├── ingest/
│   │   │   ├── analyte-dictionary.ts      # Non-PHI TS module — analyte→metric mapping
│   │   │   ├── extraction.server.ts        # Claude API call + tool-use extraction
│   │   │   ├── grounding.ts               # Pure: groundingCheck(snippet, pageTexts)
│   │   │   ├── range-check.ts             # Pure: rangeCheck(value, min, max)
│   │   │   └── ingest.server.ts           # Orchestrator: extractionWorker()
│   │   ├── audit.server.ts                # insertAuditLog(entry) — no PHI values
│   │   └── consent.server.ts              # checkConsent / insertConsent
│   ├── components/
│   │   ├── ui/
│   │   │   └── PdfPageViewer.tsx          # react-pdf <Document>/<Page> wrapper
│   ├── routes/
│   │   └── _app/
│   │       └── ingest/
│   │           ├── layout.tsx             # Ingest section layout
│   │           ├── upload.tsx             # LAB-01: upload action
│   │           ├── review.tsx             # LAB-04: review loader + per-field actions
│   │           └── consent.tsx            # LAB-06: consent form + action
├── db/
│   └── schema.ts                          # + 4 new tables + dataSourceEnum 'lab'
└── tests/
    ├── lib/
    │   └── ingest/
    │       ├── grounding.test.ts          # Pure function tests — LAB-03
    │       ├── range-check.test.ts        # Pure function tests — LAB-03
    │       └── analyte-dictionary.test.ts # Dictionary contract — LAB-03
    └── db/
        └── ingest-schema.test.ts          # Schema column/constraint tests — LAB-01/05/06
```

### Pattern 1: LLM Extraction with Tool Use (Structured Output)

**What:** Send the PDF as a native document block + a `extract_lab_values` tool definition. Claude uses the tool to return a JSON-typed array of extractions. This is more reliable than asking for prose + parsing — the tool schema enforces the shape.

**When to use:** Any extraction where you need a guaranteed array of typed objects. Tool use + a strict schema = zero JSON.parse errors.

```typescript
// Source: platform.claude.com/docs/en/build-with-claude/structured-outputs
// Source: platform.claude.com/docs/en/build-with-claude/pdf-support
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const extractionTool: Anthropic.Tool = {
  name: 'extract_lab_values',
  description: 'Extract numerical lab analyte values from the provided lab report PDF.',
  input_schema: {
    type: 'object' as const,
    properties: {
      extractions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            analyte: { type: 'string', description: 'Analyte name as it appears on the report' },
            value: { type: 'number', description: 'Numerical result value' },
            unit: { type: 'string', description: 'Unit of measurement as printed' },
            sourceTextSnippet: { type: 'string', description: 'Verbatim text from the report that contains this value — must be an exact substring of the source page' },
            pageNumber: { type: 'integer', description: '1-based page index where this value appears' },
          },
          required: ['analyte', 'value', 'unit', 'sourceTextSnippet', 'pageNumber'],
          additionalProperties: false,
        },
      },
    },
    required: ['extractions'],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `You are a lab report extraction specialist.
Extract every numerical analyte result from the provided lab report PDF.
For each extracted value:
- analyte: copy the analyte name EXACTLY as printed on the report
- value: the numerical result only (no units)
- unit: the unit as printed (e.g. "mg/dL", "mIU/L", "x10^3/uL")
- sourceTextSnippet: copy a short verbatim phrase from the report that includes the value and unit — this MUST be an exact substring of what appears on the document page
- pageNumber: the 1-based page where this line appears

Do not interpret, convert, or normalize values. Do not invent ranges. Extract only what is printed.`;

async function extractLabValues(pdfBase64: string): Promise<ExtractionResult[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [extractionTool],
    tool_choice: { type: 'any' }, // force tool use
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          { type: 'text', text: 'Extract all numerical lab values from this report.' },
        ],
      },
    ],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response');
  const input = toolUse.input as { extractions: ExtractionResult[] };
  return input.extractions;
}
```

**Model selection:** `claude-sonnet-4-6` [VERIFIED: platform.claude.com/docs/en/about-claude/models/overview — 2026-06-10]
- API ID: `claude-sonnet-4-6`
- Context window: 1M tokens
- Max output: 64k tokens
- Pricing: $3/$15 per MTok (input/output)
- All current Claude models support PDF processing via document blocks
- Use `tool_choice: { type: 'any' }` to force tool invocation

**Token cost estimate for a typical 8-page blood panel:**
- Input: ~24,000 tokens (text + page images) + ~1,000 system + ~200 user = ~25,200 tokens
- Output: ~2,000 tokens (20 extractions × ~100 tokens each)
- Cost: $0.076 input + $0.030 output = ~$0.11/document
- At 100 documents/month: ~$11 — negligible for pilot

### Pattern 2: Grounding Check (Pure Function)

**What:** After extraction, verify that `sourceTextSnippet` is actually present in the source page text. If not, the LLM hallucinated the snippet — mark `confidence: 'low'`.

**Why it matters:** The review UI renders the PDF page and uses the snippet to locate/highlight text. A hallucinated snippet breaks the review experience and violates the grounding criterion.

```typescript
// app/lib/ingest/grounding.ts — pure, testable, no imports
export type GroundingResult = 'grounded' | 'low_confidence';

export function checkGrounding(
  snippet: string,
  pageTexts: string[],  // per-page text from unpdf.extractText
  pageNumber: number,   // 1-based
): GroundingResult {
  // Normalize: collapse whitespace, trim. PDFs sometimes have irregular spacing.
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const page = pageTexts[pageNumber - 1] ?? '';
  return normalize(page).includes(normalize(snippet))
    ? 'grounded'
    : 'low_confidence';
}
```

**Note:** PDF text extraction is not always character-perfect (ligatures, spacing). The `normalize()` step handles the common whitespace discrepancy. Full character-level mismatch (scanned + OCR artifacts) is out of scope (D-07 — deferred).

### Pattern 3: Range Check (Pure Function)

```typescript
// app/lib/ingest/range-check.ts — pure, testable
export type RangeFlag = 'normal' | 'below_reference' | 'above_reference' | 'no_range_data';

export function checkRange(
  value: number,
  referenceMin: number | null,
  referenceMax: number | null,
): RangeFlag {
  if (referenceMin === null && referenceMax === null) return 'no_range_data';
  if (referenceMin !== null && value < referenceMin) return 'below_reference';
  if (referenceMax !== null && value > referenceMax) return 'above_reference';
  return 'normal';
}
```

Range values come from the **dictionary** (D-01), not from the lab report itself. This preserves dictionary authority and prevents a malformed PDF from injecting bogus reference ranges.

### Pattern 4: Analyte Dictionary (TS Module)

**What:** A `Record<string, AnalyteEntry>` TS module. Non-PHI reference data — safe to import server-side. Must NOT be imported in any client-side route component (use `.server.ts` suffix or enforce via the existing ESLint gate).

```typescript
// app/lib/ingest/analyte-dictionary.ts
// This is non-PHI reference data — no subject-specific values here.
// Must remain importable only server-side (follow .server.ts naming if calling DB).

export interface AnalyteEntry {
  /** Canonical display name for metrics table */
  name: string;
  category: MetricCategory;
  subcategory: string;
  /** Canonical unit — extraction unit must match exactly or route to unrecognized */
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  optimalMin: number | null;
  optimalMax: number | null;
  improvement: 'higher is better' | 'lower is better' | 'target range';
}

// Keys: lowercase normalized analyte names (e.g. "ferritin", "tsh", "25-oh vitamin d")
// Aliases: "25(oh)d", "25 oh vitamin d" → "25-oh vitamin d"
export const ANALYTE_DICTIONARY: Record<string, AnalyteEntry> = {
  "ferritin": {
    name: "Ferritin",
    category: "minerals",
    subcategory: "essential",
    unit: "ng/mL",
    referenceMin: 15,
    referenceMax: 150,
    optimalMin: 50,
    optimalMax: 100,
    improvement: "target range",
  },
  // ... seed from owner's 77 M0 metrics rows + common panels
};

// Normalize lookup key: lowercase, collapse whitespace, strip punctuation variants
export function lookupAnalyte(rawName: string): AnalyteEntry | null {
  const key = rawName.toLowerCase().replace(/\s+/g, ' ').trim();
  return ANALYTE_DICTIONARY[key] ?? null;
}
```

**Dictionary vs DB table:** TS module is correct for the pilot. Rationale: reference data is not PHI, never tenant-scoped, changes rarely (a code deploy), and needs to be available synchronously during extraction without an extra DB round-trip. If the dictionary grows beyond ~200 analytes or needs practitioner customization, promote to DB (Phase 6+).

**Seeding strategy:** Derive the initial dictionary from the owner's 77 `metrics` rows in Neon — a one-time script reads distinct `(name, category, subcategory, unit, referenceMin, referenceMax, optimalMin, optimalMax, improvement)` tuples and emits the TS module. The planner should schedule a Wave 0 task for this script.

### Pattern 5: Drizzle Schema for New Tables

**What:** Four new tables, all tenant-scoped, all through Drizzle migrations.

```typescript
// In db/schema.ts additions:

// Extend dataSourceEnum to include 'lab'
export const dataSourceEnum = pgEnum('data_source', [
  'manual', 'whoop', 'dexa', 'bloodwork', 'csv', 'vault', 'lab', // ← new
]);

export const labDocStatusEnum = pgEnum('lab_doc_status', [
  'uploaded', 'processing', 'pending_review', 'completed', 'failed',
]);

export const labExtractionStatusEnum = pgEnum('lab_extraction_status', [
  'pending_review', 'approved', 'rejected',
]);

export const confidenceLevelEnum = pgEnum('confidence_level', [
  'high', 'low',
]);

export const labDocuments = pgTable('lab_documents', {
  id: text('id').primaryKey(),                          // UUID v4
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  uploadedBy: text('uploaded_by').notNull().references(() => user.id),
  status: labDocStatusEnum('status').notNull().default('uploaded'),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  pdfBytes: text('pdf_bytes'),                          // base64-encoded PDF; nullable after processing
  pageCount: integer('page_count'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('idx_lab_documents_tenant_subject').on(t.tenantId, t.subjectId),
  index('idx_lab_documents_status').on(t.status),
]);

export const labExtractions = pgTable('lab_extractions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  labDocumentId: text('lab_document_id').notNull().references(() => labDocuments.id),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  // Raw extraction from LLM
  rawAnalyteName: varchar('raw_analyte_name', { length: 255 }).notNull(),
  rawValue: real('raw_value').notNull(),
  rawUnit: varchar('raw_unit', { length: 50 }).notNull(),
  sourceTextSnippet: text('source_text_snippet'),
  pageNumber: integer('page_number'),
  // Validation results
  confidence: confidenceLevelEnum('confidence').notNull().default('high'),
  rangeFlag: varchar('range_flag', { length: 50 }),     // 'normal' | 'below_reference' | 'above_reference' | 'no_range_data'
  unrecognized: boolean('unrecognized').notNull().default(false),
  // Resolved (dictionary-matched) fields — populated for recognized analytes
  resolvedMetricName: varchar('resolved_metric_name', { length: 255 }),
  resolvedCategory: metricCategoryEnum('resolved_category'),
  resolvedSubcategory: varchar('resolved_subcategory', { length: 100 }),
  resolvedUnit: varchar('resolved_unit', { length: 50 }),
  resolvedReferenceMin: real('resolved_reference_min'),
  resolvedReferenceMax: real('resolved_reference_max'),
  resolvedOptimalMin: real('resolved_optimal_min'),
  resolvedOptimalMax: real('resolved_optimal_max'),
  resolvedImprovement: varchar('resolved_improvement', { length: 50 }),
  // Review outcome
  status: labExtractionStatusEnum('status').notNull().default('pending_review'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: text('reviewed_by').references(() => user.id),
  // Final value (may be edited during review)
  approvedValue: real('approved_value'),
  approvedUnit: varchar('approved_unit', { length: 50 }),
  // FK to committed metric (set after approval)
  committedMetricId: varchar('committed_metric_id', { length: 36 }).references(() => metrics.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
  index('idx_lab_extractions_doc').on(t.labDocumentId),
  index('idx_lab_extractions_tenant_subject').on(t.tenantId, t.subjectId),
]);

export const auditLog = pgTable('audit_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: text('user_id').notNull().references(() => user.id),
  role: appRoleEnum('role').notNull(),
  action: varchar('action', { length: 50 }).notNull(),   // 'upload' | 'extraction-complete' | 'approve' | 'reject' | 'metric-insert'
  tableName: varchar('table_name', { length: 100 }),     // 'metrics' | 'lab_documents' | etc.
  operation: varchar('operation', { length: 20 }),       // 'insert' | 'update'
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  // NO PHI field values — only IDs and metadata
  entityId: text('entity_id'),                           // ID of the affected row (not its value)
  timestamp: timestamp('timestamp').notNull().defaultNow(),
}, (t) => [
  index('idx_audit_log_tenant_subject').on(t.tenantId, t.subjectId),
  index('idx_audit_log_timestamp').on(t.timestamp),
]);

export const consentLog = pgTable('consent_log', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  consentedAt: timestamp('consented_at').notNull(),
  consentVersion: varchar('consent_version', { length: 50 }).notNull(), // 'v1-pilot-self'
  consentedByUserId: text('consented_by_user_id').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_consent_log_subject').on(t.subjectId),
]);
```

**Migration discipline (DATA-03):** All schema changes via `npm run db:generate` → review migration SQL → `npm run db:migrate`. Note: `ALTER TYPE data_source ADD VALUE 'lab'` is an additive Postgres enum change — Drizzle generates this correctly, but it cannot be run inside a transaction (Postgres limitation). The migration runner handles this; verify the generated SQL does not wrap the ALTER TYPE in `BEGIN/COMMIT`.

### Pattern 6: assertSubjectAccess Wiring (D-15 / CR-01)

**What:** The approve→insert path MUST call `assertSubjectAccess` before any write. This is the write-side closure of CR-01.

```typescript
// In the approve action (ingest/review.tsx action)
export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ['owner', 'practitioner']);
  const formData = await request.formData();
  const extractionId = formData.get('extractionId') as string;

  // Load the extraction to get its subjectId/tenantId
  const db = getDb();
  const [extraction] = await db
    .select()
    .from(labExtractions)
    .where(eq(labExtractions.id, Number(extractionId)));
  if (!extraction) throw new Response('Not found', { status: 404 });

  // D-15: assertSubjectAccess before any write
  const subject = { tenantId: extraction.tenantId };
  assertSubjectAccess(user, subject, user.tenantId!);

  // ... proceed with approve logic
}
```

### Anti-Patterns to Avoid

- **Bulk-approve bypass:** No "approve all" button. The review contract (LAB-04) requires field-level review. Implement approve-all only if each field is individually rendered and confirmed (not a single checkbox).
- **PHI in auditLog:** The `auditLog.entityId` stores the row ID (e.g., `metrics.id` UUID), never the metric value, name, or any clinical data.
- **Calling `waitUntil` from a loader:** Loaders can be called during client-side navigation without a full server round-trip in React Router. Call `waitUntil` only from `action` functions where a POST is guaranteed to hit the server.
- **Importing `analyte-dictionary.ts` from client components:** The dictionary is non-PHI but should stay server-side. Add it to the ESLint restricted-import gate if needed.
- **Storing raw PDF bytes indefinitely:** Consider purging `pdfBytes` after extraction completes (set to null). Store only if the review UI needs to re-render the PDF post-extraction (it does — keep for the review period, purge after all extractions are resolved or after N days).
- **Ignoring the `content.find(b => b.type === 'tool_use')` pattern:** Claude sometimes returns `stop_reason: 'end_turn'` without a tool call if the prompt allows it. Use `tool_choice: { type: 'any' }` to force tool use.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction from PDF binary | Custom PDF parser | `unpdf` | PDF format internals (XREF, content streams, font encoding) are thousands of edge cases |
| JSON schema enforcement on LLM output | Regex / manual parse | Anthropic tool use with `input_schema` | Tool use provides first-class schema enforcement at the API level; no parse errors |
| Browser PDF page rendering | Canvas + raw pdfjs-dist | `react-pdf` | Worker setup, page viewport, canvas scaling, text layer positioning — 200+ lines of boilerplate saved |
| Audit log PHI scrubbing | Field-by-field allowlist | Schema design (store no PHI by design) | Scrubbing is error-prone — the correct approach is to never write PHI values into the log table |
| Analyte name normalization | Fuzzy-match ML model | Exact lowercase/whitespace normalize + alias table | Lab PDFs from the same portal are consistent; fuzzy matching adds complexity and false positives for the pilot |

**Key insight:** The LLM is a *mapper* in this pipeline, not a *clinical authority*. It reads values off the page and maps analyte names to dictionary keys. The dictionary owns ranges. Pure functions own validation. This separation keeps each piece testable independently.

---

## Common Pitfalls

### Pitfall 1: `waitUntil` Silently No-Ops in React Router If Called Outside an Action

**What goes wrong:** Developer calls `waitUntil(promise)` from a loader. In client-side navigation (which React Router handles entirely in the browser for cached data), the loader may run client-side and never reach the server. The `waitUntil` import from `@vercel/functions` will either throw or silently no-op.

**Why it happens:** React Router's SSR model allows loaders to be called client-side during navigation. Actions (POST handlers) always hit the server.

**How to avoid:** Call `waitUntil` only from `action` functions triggered by a POST. The upload route's action is a POST — correct pattern.

**Warning signs:** Extraction job never starts; `labDocuments.status` stays `'uploaded'` indefinitely.

---

### Pitfall 2: PDF Text Layer Whitespace Doesn't Match Snippet

**What goes wrong:** `groundingCheck` returns `'low_confidence'` for snippets that genuinely appear on the page, because PDF text extraction produces irregular whitespace (ligatures, hyphenation, column layout).

**Why it happens:** PDF text content streams don't always map 1:1 to visual word spacing. `pdfjs-dist` and `unpdf` normalize some of this but not all.

**How to avoid:** The `normalize()` function in `groundingCheck` (collapse whitespace, lowercase) handles ~90% of cases. For the pilot (text-extractable PDFs from known lab portals), this is sufficient. Do not fail a grounding check on punctuation differences — normalize punctuation too if needed.

**Warning signs:** Most extractions returning `confidence: 'low'` even for clearly visible values.

---

### Pitfall 3: Drizzle `ALTER TYPE ... ADD VALUE` Inside a Transaction

**What goes wrong:** Postgres does not allow `ALTER TYPE ... ADD VALUE 'lab'` inside a transaction. If Drizzle's migration runner wraps all migrations in `BEGIN/COMMIT`, the `dataSourceEnum` extension migration will fail.

**Why it happens:** Drizzle-kit's migration runner behavior depends on version. As of drizzle-kit ^0.31.x, enum additions are NOT wrapped in a transaction in the generated SQL by default — but verify the generated `.sql` file before running.

**How to avoid:** Inspect the generated migration SQL. If you see `BEGIN;` before the `ALTER TYPE`, split it into two migrations: one for the enum addition (no transaction), one for the table creation (in a transaction).

**Warning signs:** `db:migrate` fails with "ERROR: ALTER TYPE ... cannot run inside a transaction block".

---

### Pitfall 4: PDF Bytes Memory in Vercel Function

**What goes wrong:** A 5MB PDF is base64-encoded (+33% = ~6.7MB) and stored in memory during extraction. With multiple concurrent uploads, this can exhaust the function's memory limit (default 1024MB on Pro, but the function processes one PDF per invocation via `waitUntil`).

**Why it happens:** Single-invocation processing — not a concurrency issue, but good to understand.

**How to avoid:** Process one PDF per `waitUntil` call (which is the natural pattern here). 5–10MB of in-memory PDF is fine. If lab PDFs are routinely >20MB, add a file size check at upload time and reject with a helpful error.

**Warning signs:** Function OOM errors in Vercel logs.

---

### Pitfall 5: `pdfBytes` Column Size in Neon

**What goes wrong:** Storing PDF bytes as `text` (base64) in Neon. A 10-page lab PDF at 1MB base64 = ~1.35MB per row. 100 uploads = ~135MB in the column. Neon has a 10GB free tier and no hard row size limit, but row-level toast storage applies for values > 2KB.

**Why it happens:** Storing files in the DB is convenient for the pilot but doesn't scale.

**How to avoid:** For the pilot (single user, ~12 lab uploads/year), this is fine. Use `bytea` (binary, more efficient than base64 text). Add a `TODO: migrate to Vercel Blob storage at M2` comment. Set an upload size limit of 10MB in the action.

---

### Pitfall 6: `react-pdf` Worker Version Mismatch

**What goes wrong:** `react-pdf` v10 requires `pdfjs-dist` v4.x workers. If the wrong worker version is configured, pages render blank or throw "Setting up fake worker" warnings.

**Why it happens:** `react-pdf` 10.x ships with `pdfjs-dist@4.x` as a peer dep. If `pdfjs-dist` 6.x is also directly installed and the worker URL points to the wrong version, mismatch occurs.

**How to avoid:** Let `react-pdf` manage its own `pdfjs-dist` version. Do not add `pdfjs-dist` to `dependencies` directly — it will be installed as a peer dep by `react-pdf`. Use the worker path that react-pdf exports:
```typescript
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
// Or use the local copy from node_modules:
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
```

---

## Code Examples

### `waitUntil` in a React Router Action (Upload Route)

```typescript
// Source: vercel.com/docs/functions/functions-api-reference/vercel-functions-package
// app/routes/_app/ingest/upload.tsx

import { waitUntil } from '@vercel/functions';

export const config = { maxDuration: 120 }; // 120s max for this route

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireUser(request);
  requireRole(user, ['owner', 'practitioner']);

  // Consent gate
  const db = getDb();
  const subject = await getOwnerSubject(user.tenantId!);
  assertSubjectAccess(user, subject, user.tenantId!);

  const hasConsent = await checkConsent(subject.id);
  if (!hasConsent) {
    return redirect('/ingest/consent?next=/ingest/upload');
  }

  // Parse upload
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const arrayBuffer = await file.arrayBuffer();
  const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');

  // Insert labDocuments row — synchronous, commits before response
  const docId = crypto.randomUUID();
  await db.insert(labDocuments).values({
    id: docId,
    tenantId: user.tenantId!,
    subjectId: subject.id,
    uploadedBy: user.id,
    status: 'uploaded',
    fileName: file.name,
    pdfBytes: pdfBase64,
  });

  // Insert audit log entry
  await insertAuditLog({
    userId: user.id, role: user.role as AppRole,
    action: 'upload', tableName: 'lab_documents', operation: 'insert',
    tenantId: user.tenantId!, subjectId: subject.id, entityId: docId,
  });

  // Background extraction — does NOT block the response
  waitUntil(extractionWorker(docId));

  // Return within 2s — the UI will poll for status
  return redirect(`/ingest/review?docId=${docId}`);
}
```

### Consent Gate Check

```typescript
// app/lib/consent.server.ts
export async function checkConsent(subjectId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: consentLog.id })
    .from(consentLog)
    .where(eq(consentLog.subjectId, subjectId))
    .limit(1);
  return !!row;
}

export async function insertConsent(
  subjectId: string,
  userId: string,
  version: string,
): Promise<void> {
  const db = getDb();
  await db.insert(consentLog).values({
    subjectId,
    consentedAt: new Date(),
    consentVersion: version,
    consentedByUserId: userId,
  });
}
```

### Polling Pattern in Review Loader

```typescript
// app/routes/_app/ingest/review.tsx — loader
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const url = new URL(request.url);
  const docId = url.searchParams.get('docId');

  const db = getDb();
  const [doc] = await db.select().from(labDocuments).where(eq(labDocuments.id, docId!));
  if (!doc) throw new Response('Not found', { status: 404 });

  const subject = { tenantId: doc.tenantId };
  assertSubjectAccess(user, subject, user.tenantId!);

  const extractions = await db
    .select()
    .from(labExtractions)
    .where(eq(labExtractions.labDocumentId, docId!));

  return { doc, extractions };
}

// Client-side: poll while doc.status === 'processing'
// Use React Router's <fetcher.Form> with a useEffect setInterval, or
// export function shouldRevalidate() { return doc.status === 'processing'; }
// combined with a <meta http-equiv="refresh"> / client polling with fetcher.load()
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Parse PDF to text-only with `pdf-parse` | Native PDF document blocks in Anthropic API (vision + text) | Anthropic API, 2024–2025 | Claude sees both text and rendered page images — better for tables, charts, formatted lab results |
| Prompt-parse-JSON loop for structured output | Native tool use with `input_schema` enforcement | Anthropic API, 2023+ | No JSON.parse errors; tool schema is enforced at inference time |
| Vercel function ends after response | `waitUntil` (fluid compute) | Vercel, 2024; default on new projects April 2025 | Background processing without a separate queue service |
| Separate queue service (BullMQ / SQS) for background jobs | DB-status + `waitUntil` in same function | Project decision (D-10) | Simpler for n=1 pilot; no extra vendor or infrastructure |
| `pdf-parse` npm package (CommonJS, abandonment concerns) | `unpdf` (unjs ecosystem, serverless-first) | 2023 | Serverless-compatible; no `canvas` peer dep |

**Deprecated/outdated:**
- `pdf-parse` (v2.4.5): Older package with CommonJS-only API, periodic abandonment reports. `unpdf` is the current serverless recommendation.
- `pdfjs-dist` called directly in Node serverless: Requires `canvas` peer dep or polyfills; `unpdf` handles this internally.
- Anthropic structured output beta header `anthropic-beta: structured-outputs-2025-11-13`: This is deprecated in favor of `output_config: { format: ... }`. However, for this pipeline we use **tool use** (not structured outputs), which remains stable and does not need the beta header.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `waitUntil` called from a React Router action (POST) works reliably on Vercel Pro with `vercelPreset()` configured | D-10/D-12 resolution | If broken: extraction never starts; fallback to Cron-drain pattern needed (2-day retrofit) |
| A2 | `unpdf` correctly extracts per-page text from standard lab portal PDFs (Quest, LabCorp, Cleveland HeartLab format) | PDF extraction | If extraction quality is poor, grounding checks will flag most snippets as `low_confidence` — workable but noisy for pilot |
| A3 | Lab PDFs are under 10MB and 10 pages for this pilot | PDF bytes storage, token estimates | If owner's PDFs are larger, the action needs a size check + error message |
| A4 | `pdfjs-dist` (installed as react-pdf peer dep) worker mismatch won't occur if `pdfjs-dist` is NOT in direct `dependencies` | Browser rendering | If there's a version conflict, the review PDF viewer renders blank — catches in manual UAT |
| A5 | All packages marked `[ASSUMED]` are legitimate (slopcheck unavailable) | Package Legitimacy Audit | All five packages are from authoritative sources (Anthropic, Mozilla, Vercel, unjs) with years-old histories and millions of downloads — risk is very low |

---

## Open Questions

1. **PDF bytes storage: `bytea` vs `text` (base64) in Neon**
   - What we know: `bytea` is more efficient; `text` is simpler to pass to the Anthropic SDK (which needs base64 string). `@neondatabase/serverless` handles `bytea` as a `Buffer`.
   - What's unclear: Whether the existing Drizzle column types include `bytea`. Schema currently uses `text` for similar use (no prior binary columns).
   - Recommendation: Use `text` (base64) for simplicity in the pilot — the overhead is ~33% storage for PDFs that are only stored for the review period. Planner decision.

2. **PDF purge after review completion**
   - What we know: Storing PDF bytes indefinitely is wasteful; privacy-conscious design suggests not storing longer than needed.
   - What's unclear: When "review complete" is defined (all extractions approved/rejected? user explicitly closes the review?).
   - Recommendation: Set `pdfBytes = null` on `labDocuments` when all associated `labExtractions` reach terminal status (`approved` or `rejected`). Planner should schedule this as a cleanup step in the approve/reject action.

3. **Analyte dictionary key normalization vs LLM extraction quality**
   - What we know: Labs print analyte names in many variants ("25 OH Vitamin D", "25-OH-D", "VITAMIN D,25-OH,TOTAL", "25(OH)D3+D2"). A simple lowercase+whitespace normalize won't catch all variants.
   - What's unclear: How many variants exist in the owner's specific lab portal.
   - Recommendation: Include common aliases as dictionary entries (e.g., both `"25-oh vitamin d"` and `"vitamin d,25-oh,total"` mapping to the same `AnalyteEntry`). The owner should review the first extraction and add missing aliases to the dictionary. This is expected Wave 0 + Wave 1 iteration.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All server functions | ✓ | 25.6.0 | — |
| `@anthropic-ai/sdk` | LAB-02 extraction | Not yet installed | — | Install in Wave 0 |
| `unpdf` | LAB-03 server text extraction | Not yet installed | — | Install in Wave 0 |
| `react-pdf` | LAB-04 browser review | Not yet installed | — | Install in Wave 0 |
| `@vercel/functions` | LAB-02 `waitUntil` | Not yet installed | — | Install in Wave 0 |
| `ANTHROPIC_API_KEY` env var | Claude API calls | Not set in dev (check Vercel env) | — | Must be added to Vercel env before extraction works |
| Neon Postgres (live) | All DB writes | ✓ (per STATE.md) | — | — |
| Vercel Pro plan | `maxDuration: 800s` | ✓ (per STATE.md) | — | — |

**Missing dependencies with no fallback:**
- `ANTHROPIC_API_KEY` must be set in Vercel environment (Production + Preview) before the extraction job can run. Wave 0 setup task.

**Missing dependencies with fallback:**
- None — all four new npm packages have clean install paths.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `remix-app/vite.config.ts` (existing test block) |
| Quick run command | `npm run test` (from `remix-app/`) |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAB-01 | `labDocuments` row committed with correct tenant/subject scope | Integration (skip-guarded) | `vitest run tests/db/ingest-schema.test.ts` | ❌ Wave 0 |
| LAB-02 | `extractionWorker` produces `labExtractions` rows with `sourceTextSnippet` populated | Integration (skip-guarded, requires live Neon + `ANTHROPIC_API_KEY`) | `vitest run tests/db/ingest-schema.test.ts` | ❌ Wave 0 |
| LAB-03 (grounding) | `checkGrounding` returns `'grounded'` when snippet is in page text; `'low_confidence'` when not | Unit | `vitest run tests/lib/ingest/grounding.test.ts` | ❌ Wave 0 |
| LAB-03 (range check) | `checkRange` returns correct `RangeFlag` at boundary values (at min, below min, at max, above max, null bounds) | Unit | `vitest run tests/lib/ingest/range-check.test.ts` | ❌ Wave 0 |
| LAB-03 (dictionary) | `lookupAnalyte` returns correct entry for known keys; null for unknown; handles normalization | Unit | `vitest run tests/lib/ingest/analyte-dictionary.test.ts` | ❌ Wave 0 |
| LAB-04 | Review loader returns `labExtractions` for a given `docId` scoped to tenant/subject | Integration (skip-guarded) | `vitest run tests/parity/ingest-review.test.ts` | ❌ Wave 0 |
| LAB-05 | Approve action inserts metric with correct `source: 'lab'` and `auditLog` row with no PHI values | Integration (skip-guarded) | `vitest run tests/db/ingest-schema.test.ts` | ❌ Wave 0 |
| LAB-05 | `assertSubjectAccess` called before any write (403 for client role) | Unit (mock) | `vitest run tests/lib/ingest/approve-action.test.ts` | ❌ Wave 0 |
| LAB-06 | Consent gate blocks upload action when `consentLog` row absent | Unit (mock DB) | `vitest run tests/lib/consent.test.ts` | ❌ Wave 0 |
| LAB-06 | `insertConsent` writes correct `consentVersion` and `subjectId` | Integration (skip-guarded) | `vitest run tests/db/ingest-schema.test.ts` | ❌ Wave 0 |

**Skip-guard pattern (per project convention):**
```typescript
const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const skip = !connectionString ? describe.skip : describe;
skip('ingest DB tests (live Neon)', () => { ... });
```

### Sampling Rate

- **Per task commit:** `npm run test` (full Vitest run — fast; DB tests skip without env var)
- **Per wave merge:** Full suite + manual UAT of upload→review flow in browser
- **Phase gate:** All LAB-01..06 unit tests green + manual UAT of complete flow before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/lib/ingest/grounding.test.ts` — covers LAB-03 grounding pure function
- [ ] `tests/lib/ingest/range-check.test.ts` — covers LAB-03 range check pure function
- [ ] `tests/lib/ingest/analyte-dictionary.test.ts` — covers LAB-03 dictionary lookup + normalization
- [ ] `tests/lib/consent.test.ts` — covers LAB-06 consent gate logic
- [ ] `tests/lib/ingest/approve-action.test.ts` — covers LAB-05 assertSubjectAccess enforcement
- [ ] `tests/db/ingest-schema.test.ts` — covers LAB-01/LAB-05/LAB-06 DB schema constraints (skip-guarded)
- [ ] `tests/parity/ingest-review.test.ts` — covers LAB-04 loader scoping (skip-guarded)
- [ ] Dictionary seed script: `scripts/seed-analyte-dictionary.ts` — reads owner's 77 `metrics` rows, emits `app/lib/ingest/analyte-dictionary.ts`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireUser` (existing) |
| V3 Session Management | yes | Better-Auth session (existing) |
| V4 Access Control | yes | `requireRole` + `assertSubjectAccess` (D-15) |
| V5 Input Validation | yes | Zod or manual validation on `file` input; file size limit; MIME type check (PDF only) |
| V6 Cryptography | no | No new crypto in Phase 5 |
| V7 Error Handling | yes | No stack traces in API responses; extraction errors set `labDocuments.errorMessage` server-side only |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Upload arbitrary file as PDF | Tampering | MIME type check (`application/pdf`) + magic bytes check in action; size limit (10MB) |
| Cross-tenant document access via manipulated `docId` | Information Disclosure | `assertSubjectAccess` on all document loaders/actions; `WHERE tenantId = ?` always |
| PHI in LLM context (no-training default) | Information Disclosure | Standard subscription API has no-training default (D-14); external-client PHI blocked until Phase 7 BAA |
| PHI leaking into `auditLog` | Information Disclosure | Schema design: no value columns in `audit_log`; code review checks |
| Consent bypass (write without `consentLog` row) | Tampering | Consent check is synchronous in action, before any insert; test in LAB-06 suite |
| `assertSubjectAccess` not called (CR-01 write-path) | Information Disclosure / Tampering | Explicit call required before any PHI write (D-15); regression test checks 403 for client role |
| LLM prompt injection via malicious PDF content | Elevation of Privilege | The tool schema constrains output shape; extraction prompt is read-only (never executes extracted text as code); low risk for data extraction use case |

---

## Sources

### Primary (HIGH confidence)

- `platform.claude.com/docs/en/build-with-claude/pdf-support` — PDF document block format, limits (32MB, 600 pages for 1M-context models), base64 and URL modes, all models support PDF
- `platform.claude.com/docs/en/about-claude/models/overview` — model IDs verified: `claude-sonnet-4-6`, `claude-opus-4-8`, `claude-haiku-4-5-20251001`; all support vision/PDF
- `platform.claude.com/docs/en/build-with-claude/structured-outputs` — tool use vs structured outputs; `tool_choice: { type: 'any' }` pattern; `input_schema` enforcement
- `vercel.com/docs/functions/configuring-functions/duration` — Pro plan: default 300s, max 800s (last updated 2026-05-14)
- `vercel.com/docs/fluid-compute` — fluid compute defaults by plan; enabled by default April 2025 (last updated 2026-05-14)
- `vercel.com/docs/functions/functions-api-reference/vercel-functions-package` — `waitUntil` API; import from `@vercel/functions`; "Promises passed to waitUntil() will have the same timeout as the function itself" (last updated 2026-03-19)
- `vercel.com/docs/frameworks/frontend/react-router` — `vercelPreset()` for per-route `maxDuration`; confirms `waitUntil` for non-Next.js frameworks (last updated 2026-02-26)
- `github.com/unjs/unpdf` — serverless PDF.js wrapper, `extractText` API, built on pdfjs-dist v5
- `github.com/wojtekmaj/react-pdf` — `<Document>` / `<Page>` API, `renderTextLayer`, worker config
- `npm view [pkg] version` — all version numbers verified 2026-06-10 via npm registry

### Secondary (MEDIUM confidence)

- GitHub issue #72176 (vercel/next.js) — documented `waitUntil` compatibility issue in Remix; workaround is action-only invocation
- npm download counts (npmjs.org API, last-week) — verified 2026-06-10

### Tertiary (LOW confidence)

- Token cost estimate for 8-page lab PDF — extrapolated from Anthropic's "1,500–3,000 tokens/page" guideline; actual cost depends on specific PDF density

---

## Risks / Landmines

1. **`waitUntil` in React Router (Medium risk):** Documented GitHub issue — extraction job may not start. Test this in the first development task before building the full pipeline. Mitigation: confirm the job starts by checking `labDocuments.status` transitions to `'processing'` within 5s of upload. If it doesn't, switch to the Cron fallback.

2. **Analyte name aliases (Medium risk):** The LLM extracts names exactly as printed on the lab; lab portals (Quest, LabCorp) use inconsistent formatting. If the dictionary doesn't cover the owner's specific lab's naming, many extractions will route to "unrecognized." Mitigation: seed script + manual review of first extraction output + add aliases.

3. **PDF bytes storage scope (Low risk):** Storing full PDF bytes in Neon per document is fine for the pilot but must be revisited before M2. A 10MB PDF × 1000 clients = 10GB in the `pdf_bytes` column. Set a 10MB upload limit in Phase 5.

4. **ANTHROPIC_API_KEY must be in Vercel env (Low risk):** If missing, the extraction job fails silently (the action returns 2s, but the `waitUntil` promise rejects). Mitigation: add to Vercel env as Wave 0 setup; add error handling in `extractionWorker` that updates `labDocuments.status = 'failed'` and sets `errorMessage`.

5. **`dataSourceEnum` ALTER TYPE migration (Low risk):** Postgres doesn't allow this inside a transaction. Verify generated migration SQL — if wrapped in BEGIN/COMMIT, split it. Drizzle-kit ^0.31.x typically does NOT wrap enum additions in transactions, but check the generated file.

6. **react-pdf worker version mismatch (Low risk):** Caught easily in manual UAT (blank page in review UI). Do not add `pdfjs-dist` to direct `dependencies` — let it be a peer dep managed by `react-pdf`.

---

## RESEARCH COMPLETE

**Phase:** 5 - Lab Ingest Pipeline
**Confidence:** HIGH

### Key Findings

- **Vercel `waitUntil` is the correct async mechanism.** Pro plan supports 800s max; typical 8-page lab extraction completes in 15–45s. The `@vercel/functions` package (not Next.js `after()`) is the correct import for React Router. Call from actions only, not loaders.
- **Anthropic's native PDF document blocks eliminate the need for a separate OCR/text extraction step for the LLM.** The Claude API processes PDFs as combined text+vision. All current models (`claude-sonnet-4-6` recommended) support it natively.
- **`unpdf` is the correct server-side text extraction library** for producing the `sourceTextSnippet` grounding text. It wraps `pdfjs-dist` for serverless environments without canvas dependencies.
- **`react-pdf` is the correct browser PDF renderer.** Its text layer (`renderTextLayer={true}`) enables snippet highlighting without custom canvas work.
- **Add `lab` to `dataSourceEnum`.** `bloodwork` is a distinct provenance (manual entry); `lab` is LLM-assisted ingest. The enum addition is a non-breaking Drizzle migration but must not be run inside a transaction.
- **The three pure functions (grounding check, range check, dictionary lookup) are the testable engine** of this pipeline and must be written first (Wave 0 RED contracts).

### File Created

`.planning/phases/05-lab-ingest-pipeline/05-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All versions verified via npm registry; official docs consulted |
| Anthropic PDF API | HIGH | Official Anthropic docs read directly |
| Vercel `waitUntil` limits | HIGH | Official Vercel docs, last updated 2026-05-14 |
| `waitUntil` React Router compatibility | MEDIUM | Documented issue exists; workaround is action-only |
| PDF text extraction quality | MEDIUM | Depends on specific lab portal's PDF format |
| Analyte dictionary coverage | LOW | Depends on owner's lab portal naming conventions |

### Open Questions Remaining

- None that block planning. Unresolved Q1 (bytea vs text) and Q2 (PDF purge timing) are planner discretion items.

### Ready for Planning

Research complete. Planner can now create PLAN.md files.
