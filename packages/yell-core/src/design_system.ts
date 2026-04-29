/**
 * Yell Design System Loader
 * 
 * Loads the default design tokens and merges with user overrides.
 * The merged token set is used for CSS generation and component rendering.
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYAML } from 'yaml';
import { buildTokenManifest } from './tokens.js';
import { defaultTokens } from './default_tokens.js';
import type { TokenMap } from './types.js';
import type { TokenManifest } from './tokens.js';

export interface DesignSystemOptions {
  /**
   * Path to a user-provided design_config.yml that overrides defaults.
   */
  overridePath?: string;
  /**
   * Raw YAML string to use as override (takes precedence over overridePath).
   */
  overrideYAML?: string;
  /**
   * Extra tokens to merge on top (highest priority).
   */
  extraTokens?: TokenMap;
}

interface RawDesignConfig {
  brand?: Record<string, string>;
  surface?: Record<string, string>;
  text?: Record<string, string>;
  typography?: Record<string, unknown>;
  spacing?: Record<string, string | number>;
  radius?: Record<string, string>;
  shadow?: Record<string, string>;
  animation?: Record<string, unknown>;
  zIndex?: Record<string, string | number>;
  components?: Record<string, unknown>;
}

/**
 * Recursively merge override over defaults.
 */
function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Convert flat dot-notation keys into nested object.
 * e.g. { "brand.primary": "#FF0000" } → { brand: { primary: "#FF0000" } }
 */
function undotKeys(obj: Record<string, string | number | unknown>): TokenMap {
  const result: TokenMap = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let current: TokenMap = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part] as TokenMap;
    }
    current[parts[parts.length - 1]] = value as string | number | TokenMap;
  }
  return result;
}

/**
 * Flatten nested object to dot-notation.
 */
function flattenToDot(
  node: Record<string, unknown>,
  prefix: string = '',
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(node)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenToDot(value as Record<string, unknown>, newKey));
    } else if (typeof value === 'string' || typeof value === 'number') {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Load and merge all token sources into a single TokenMap.
 */
function loadTokenMap(options: DesignSystemOptions): TokenMap {
  // Start with default Yell design tokens
  const defaults = defaultTokens as unknown as Record<string, unknown>;
  const flatDefaults = flattenToDot(defaults);

  // Load file override if provided
  let flatOverride: Record<string, string | number> = {};
  if (options.overrideYAML) {
    try {
      const parsed = parseYAML(options.overrideYAML) as RawDesignConfig;
      flatOverride = flattenToDot(parsed as Record<string, unknown>);
    } catch { /* ignore invalid YAML, use empty */ }
  } else if (options.overridePath && existsSync(options.overridePath)) {
    try {
      const fileContent = readFileSync(options.overridePath, 'utf8');
      const parsed = parseYAML(fileContent) as RawDesignConfig;
      flatOverride = flattenToDot(parsed as Record<string, unknown>);
    } catch { /* ignore */ }
  }

  // Merge: defaults < file override < extra tokens
  const flatMerged = { ...flatDefaults, ...flatOverride };

  // Extra tokens have highest priority
  if (options.extraTokens) {
    const flatExtra = flattenToDot(options.extraTokens as Record<string, unknown>);
    Object.assign(flatMerged, flatExtra);
  }

  return undotKeys(flatMerged);
}

/**
 * DesignSystem — loaded and resolved token set for Yell.
 */
export interface DesignSystem {
  tokens: TokenMap;
  manifest: TokenManifest;
  css: string;
}

/**
 * Load the Yell design system with optional user overrides.
 * 
 * @example
 * // Use defaults only
 * const ds = loadDesignSystem();
 * 
 * @example
 * // Override with user's design_config.yml
 * const ds = loadDesignSystem({ overridePath: './my_design_config.yml' });
 * 
 * @example
 * // Override with inline YAML string
 * const ds = loadDesignSystem({
 *   overrideYAML: `brand:\n  primary: "#FF0000"\n`
 * });
 */
export function loadDesignSystem(options: DesignSystemOptions = {}): DesignSystem {
  const tokens = loadTokenMap(options);
  const manifest = buildTokenManifest(tokens);
  const css = manifest.cssVariables;
  return { tokens, manifest, css };
}

/**
 * Load only the CSS string (convenience).
 */
export function loadDesignCSS(options: DesignSystemOptions = {}): string {
  return loadDesignSystem(options).css;
}

/**
 * Validate a user's design_config.yml without loading the full system.
 */
export function validateDesignConfig(yamlContent: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  try {
    const parsed = parseYAML(yamlContent);
    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, errors: ['config must be an object'], warnings: [] };
    }
    return { valid: true, errors: [], warnings: [] };
  } catch (e) {
    return { valid: false, errors: [(e as Error).message], warnings: [] };
  }
}
