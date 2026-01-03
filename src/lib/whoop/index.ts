/**
 * WHOOP Module
 *
 * Exports WHOOP parser and mapper utilities.
 */

// Parser
export { parseWhoopJson, validateWhoopJson } from './parser';
export type { WhoopParseResult } from './parser';

// Mapper
export { mapWhoopToMetrics } from './mapper';
export type { WhoopMapConfig, WhoopMapResult } from './mapper';
