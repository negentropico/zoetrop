// range-check.ts — pure physiological range check, no I/O, no imports
// LAB-03 criterion 3: validate extracted value against dictionary reference ranges.
// Range authority is the analyte dictionary (D-01), never the PDF.

export type RangeFlag =
  | 'normal'
  | 'below_reference'
  | 'above_reference'
  | 'no_range_data';

/**
 * Check whether `value` falls within the reference range.
 *
 * @param value         Extracted numerical value
 * @param referenceMin  Lower bound from the analyte dictionary (null if not defined)
 * @param referenceMax  Upper bound from the analyte dictionary (null if not defined)
 * @returns 'no_range_data' when both bounds are null;
 *          'below_reference' when value < referenceMin;
 *          'above_reference' when value > referenceMax;
 *          'normal' otherwise
 */
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
