/**
 * WHOOP Module
 *
 * Exports WHOOP parser and mapper utilities.
 */

// JSON Parser
export { parseWhoopJson, validateWhoopJson } from './parser';
export type { WhoopParseResult } from './parser';

// JSON Mapper
export { mapWhoopToMetrics } from './mapper';
export type { WhoopMapConfig, WhoopMapResult } from './mapper';

// CSV Parser
export { parseWhoopCsv, validateWhoopCsv, isWhoopCsv } from './csv-parser';
export type { WhoopCsvParseResult } from './csv-parser';

// CSV Mapper
export { mapWhoopCsvToMetrics, calculateCsvAverages } from './csv-mapper';
export type { WhoopCsvMapConfig, WhoopCsvMapResult } from './csv-mapper';
