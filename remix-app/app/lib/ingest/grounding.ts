// grounding.ts — pure grounding check, no I/O, no imports
// LAB-03 criterion 2: sourceTextSnippet must be an exact substring of the source page text.
// Ungrounded extraction → confidence 'low_confidence'.

export type GroundingResult = 'grounded' | 'low_confidence';

/**
 * Check that `snippet` (verbatim text from the LLM extraction) actually appears
 * in the page text extracted by unpdf.
 *
 * @param snippet       The sourceTextSnippet returned by the LLM
 * @param pageTexts     Per-page text array from unpdf.extractText({ mergePages: false })
 * @param pageNumber    1-based page index where the extraction was found
 * @returns 'grounded' if the snippet is found in the page; 'low_confidence' otherwise
 */
export function checkGrounding(
  snippet: string,
  pageTexts: string[],
  pageNumber: number,
): GroundingResult {
  // Normalize: collapse whitespace and lowercase. PDF text extraction can
  // introduce irregular spacing (ligatures, column layout, hyphenation).
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const page = pageTexts[pageNumber - 1] ?? '';
  return normalize(page).includes(normalize(snippet)) ? 'grounded' : 'low_confidence';
}
