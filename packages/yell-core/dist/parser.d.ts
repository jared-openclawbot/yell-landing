/**
 * Yell Parser
 *
 * Parses YAML into Yell AST (YellNode tree).
 */
import type { YellNode, YellConfig } from './types.js';
/**
 * Parse a YAML string into a YellConfig object.
 */
export declare function parseYAML(yaml: string): YellConfig;
/**
 * Normalize a raw YAML-parsed object into a clean YellNode.
 * Handles various input shapes and ensures consistent structure.
 */
export declare function normalizeNode(input: unknown): YellNode | null;
/**
 * Flatten a YellConfig into a linear array of YellNodes.
 * Useful for validation and rendering passes.
 */
export declare function flattenConfig(config: YellConfig): YellNode[];
/**
 * Validate that a YAML string produces valid Yell YAML structure.
 * Returns null if parsing fails.
 */
export declare function tryParseYAML(yaml: string): YellConfig | null;
