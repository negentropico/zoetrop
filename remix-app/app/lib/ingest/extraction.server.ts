/**
 * extraction.server.ts — Anthropic claude-sonnet-4-6 tool-use lab extraction (LAB-02)
 *
 * Sends the lab PDF as a native document block to Claude with the
 * extract_lab_values tool, which forces structured output (no JSON.parse risk).
 * Returns a typed array of ExtractionResult rows.
 *
 * SECURITY: The prompt never executes extracted text (prompt-injection
 * mitigation T-05-LLM). The tool schema is strict (additionalProperties:false)
 * and tool_choice: { type: 'any' } forces Claude to use the tool — no
 * freeform text output.
 *
 * Phase 7 LLM-BAA external-client PHI boundary (D-14):
 *   This extraction client sends PDFs to the Anthropic standard subscription
 *   API (no-training default). External-client PHI is hard-blocked until
 *   Phase 7 when a BAA is established with the LLM provider. Pilot operation
 *   is owner-only (self-consent, D-08/D-14). Do NOT relax this boundary
 *   before Phase 7.
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * ExtractionResult — a single analyte row extracted from the PDF.
 * All fields are verbatim from the LLM output; validation happens in
 * ingest.server.ts (checkGrounding, lookupAnalyte, checkRange).
 */
export interface ExtractionResult {
  analyte: string;            // Analyte name as printed on the report
  value: number;              // Numerical result value
  unit: string;               // Unit as printed (e.g. "mg/dL", "mIU/L")
  sourceTextSnippet: string;  // Verbatim text from the report containing this value
  pageNumber: number;         // 1-based page index
}

// ── Tool definition ────────────────────────────────────────────────────────

const extractionTool: Anthropic.Tool = {
  name: "extract_lab_values",
  description:
    "Extract numerical lab analyte values from the provided lab report PDF.",
  input_schema: {
    type: "object" as const,
    properties: {
      extractions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            analyte: {
              type: "string",
              description: "Analyte name as it appears on the report",
            },
            value: {
              type: "number",
              description: "Numerical result value",
            },
            unit: {
              type: "string",
              description: "Unit of measurement as printed",
            },
            sourceTextSnippet: {
              type: "string",
              description:
                "Verbatim text from the report that contains this value — must be an exact substring of the source page",
            },
            pageNumber: {
              type: "integer",
              description: "1-based page index where this value appears",
            },
          },
          required: [
            "analyte",
            "value",
            "unit",
            "sourceTextSnippet",
            "pageNumber",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["extractions"],
    additionalProperties: false,
  },
};

// ── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a lab report extraction specialist.
Extract every numerical analyte result from the provided lab report PDF.
For each extracted value:
- analyte: copy the analyte name EXACTLY as printed on the report
- value: the numerical result only (no units)
- unit: the unit as printed (e.g. "mg/dL", "mIU/L", "x10^3/uL")
- sourceTextSnippet: copy a short verbatim phrase from the report that includes the value and unit — this MUST be an exact substring of what appears on the document page
- pageNumber: the 1-based page where this line appears

Do not interpret, convert, or normalize values. Do not invent ranges. Extract only what is printed.`;

// ── Client ─────────────────────────────────────────────────────────────────
// Constructed at module load. ANTHROPIC_API_KEY must be set in the Vercel
// environment (Production + Preview) before extraction runs — see Plan 02
// user_setup. Not required for unit tests (client is mocked).

const client = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

// ── extractLabValues ───────────────────────────────────────────────────────
//
// Sends the base64-encoded PDF to Claude as a native document block.
// Forces tool use via tool_choice: { type: 'any' } — guaranteed structured
// output, no JSON.parse errors.
//
// Throws if no tool_use block is returned (should not happen with type:'any').

export async function extractLabValues(
  pdfBase64: string
): Promise<ExtractionResult[]> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [extractionTool],
    tool_choice: { type: "any" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: "Extract all numerical lab values from this report.",
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      "Anthropic extraction: no tool_use block in response — extraction failed"
    );
  }

  const input = toolUse.input as { extractions: ExtractionResult[] };
  return input.extractions;
}
