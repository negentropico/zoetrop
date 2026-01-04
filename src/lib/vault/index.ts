/**
 * Vault Module
 *
 * Exports vault parser and mapper utilities for importing
 * health metrics from Obsidian vault markdown files.
 */

// Parser
export { parseVaultMarkdown, parseVaultFiles } from './parser';

// Mapper
export { mapStagingToMetrics, previewStagingImport } from './mapper';
export type { StagingMapConfig, StagingMapResult } from './mapper';
