/**
 * Yell Design Tokens
 * 
 * Parses, validates, and expands design token declarations from YAML config.
 * Produces a resolved TokenManifest used by the renderer and agent adapters.
 */

import type { TokenMap } from './types.js';

// Token category types
export type TokenCategory = 'colors' | 'spacing' | 'typography' | 'shadow' | 'border' | 'animation' | 'layout' | 'motion';

export interface ResolvedToken {
  name: string;
  value: string | number;
  category: TokenCategory;
  resolved: boolean;
  raw?: string; // original reference if this was a token alias
}

export interface TokenManifest {
  version: string;
  resolved: Record<string, ResolvedToken>; // flat map: "colors.primary" -> token
  categories: Record<TokenCategory, Record<string, string | number>>;
  cssVariables: string; // ready-to-use CSS custom properties string
}

// Resolve a token reference like $tokens.colors.primary to its value.
// Uses cache for performance and to prevent circular references.
export function expandTokenRef(
  ref: string,
  tokens: TokenMap,
  cache: Map<string, string | number> = new Map(),
): string | number | undefined {
  if (!ref.startsWith('$tokens.')) return undefined;

  const key = ref.slice(8); // "colors.primary"

  // Check cache first
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Navigate the token tree
  const parts = key.split('.');
  let current: unknown = tokens;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // We've reached a primitive before the last part
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    const next = (current as Record<string, unknown>)[part];

    if (next === undefined) {
      return undefined;
    }

    // If this is the last part, resolve it
    if (i === parts.length - 1) {
      if (typeof next === 'string' || typeof next === 'number') {
        // If it's a token reference, recurse
        if (typeof next === 'string' && next.startsWith('$tokens.')) {
          const inner = expandTokenRef(next, tokens, cache);
          const finalVal = inner !== undefined ? inner : next;
          cache.set(key, finalVal);
          return finalVal;
        }
        cache.set(key, next);
        return next;
      }
      return undefined;
    }

    current = next;
  }

  return undefined;
}

// Detect category from token name (heuristic-based)
function detectCategory(tokenName: string): TokenCategory {
  const lower = tokenName.toLowerCase();
  if (lower.includes('color') || lower.includes('primary') || lower.includes('danger') || lower.includes('bg')) return 'colors';
  if (lower.includes('space') || lower.includes('spacing') || lower.includes('gap') || lower.includes('margin') || lower.includes('padding')) return 'spacing';
  if (lower.includes('font') || lower.includes('text') || lower.includes('size') || lower.includes('weight') || lower.includes('line')) return 'typography';
  if (lower.includes('shadow') || lower.includes('elevation')) return 'shadow';
  if (lower.includes('border') || lower.includes('radius') || lower.includes('width')) return 'border';
  if (lower.includes('animation') || lower.includes('duration') || lower.includes('ease')) return 'animation';
  if (lower.includes('motion') || lower.includes('transition')) return 'motion';
  return 'colors'; // default fallback
}

// Resolve a raw value — handles token references or literals
function resolveValue(
  value: string | number,
  tokens: TokenMap,
  cache: Map<string, string | number>,
): string | number {
  if (typeof value !== 'string') return value;
  if (value.startsWith('$tokens.')) {
    return expandTokenRef(value, tokens, cache) ?? value;
  }
  return value;
}

// Collect all token paths and their raw values from the nested structure
function collectTokens(
  node: unknown,
  prefix: string,
  result: Map<string, string | number>,
): void {
  if (typeof node !== 'object' || node === null) return;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    const tokenKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' || typeof value === 'number') {
      result.set(tokenKey, value);
    } else if (typeof value === 'object' && value !== null) {
      collectTokens(value, tokenKey, result);
    }
  }
}

// Resolve all tokens in a token map and produce a flat manifest
export function buildTokenManifest(rawTokens: TokenMap): TokenManifest {
  // Collect all token paths and their raw values
  const tokenPaths = new Map<string, string | number>();
  collectTokens(rawTokens, '', tokenPaths);

  // Cache for resolved values (prevents circular/algo references)
  const cache = new Map<string, string | number>();

  const resolved: Record<string, ResolvedToken> = {};
  const categories: Record<TokenCategory, Record<string, string | number>> = {
    colors: {},
    spacing: {},
    typography: {},
    shadow: {},
    border: {},
    animation: {},
    layout: {},
    motion: {},
  };

  // Resolve each token
  const entries = Array.from(tokenPaths.entries());
  for (const [tokenPath, rawValue] of entries) {
    // Resolve the value (handles token aliases recursively)
    const resolvedValue = resolveValue(rawValue, rawTokens, cache);
    const category = detectCategory(tokenPath);

    resolved[tokenPath] = {
      name: tokenPath,
      value: resolvedValue,
      category,
      resolved: true,
      raw: typeof rawValue === 'string' && rawValue.startsWith('$tokens.') ? rawValue : undefined,
    };

    // Index into category
    const lastSegment = tokenPath.split('.').pop() || tokenPath;
    if (categories[category]) {
      categories[category][lastSegment] = resolvedValue;
    }
  }

  // Build CSS variables string
  const cssParts: string[] = [];
  for (const [name, token] of Object.entries(resolved)) {
    const cssName = '--' + name.replace(/\./g, '-').toLowerCase();
    cssParts.push(`${cssName}:${token.value}`);
  }
  const cssVariables = ':root{' + cssParts.join(';') + '}';

  return {
    version: '1.0',
    resolved,
    categories,
    cssVariables,
  };
}

// Get token value by reference string
export function getTokenValue(ref: string, manifest: TokenManifest): string | number | undefined {
  if (!ref.startsWith('$tokens.')) return undefined;
  const key = ref.slice(8); // "colors.primary"
  return manifest.resolved[key]?.value;
}

// Export all tokens as CSS custom properties string
export function tokensAsCSS(manifest: TokenManifest): string {
  return manifest.cssVariables;
}

// Export tokens as JSON-serializable map for agents
export function tokensAsMap(manifest: TokenManifest): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const [name, token] of Object.entries(manifest.resolved)) {
    result[name] = token.value;
  }
  return result;
}

// Validate token structure matches expected schema
export interface TokenValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTokens(rawTokens: unknown): TokenValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof rawTokens !== 'object' || rawTokens === null) {
    errors.push('tokens must be an object');
    return { valid: false, errors, warnings };
  }

  function traverse(node: unknown, path: string): void {
    if (typeof node !== 'object' || node === null) return;

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value, currentPath);
      } else if (typeof value === 'string' || typeof value === 'number') {
        if (
          typeof value === 'string' &&
          !value.startsWith('$tokens.') &&
          !value.startsWith('#') &&
          !value.includes('px') &&
          !value.includes('em') &&
          !value.includes('rem') &&
          !value.includes('rgb') &&
          !value.includes('hsl') &&
          !value.includes('var(') &&
          value.includes(' ')
        ) {
          warnings.push(`token "${currentPath}" has unquoted string "${value}" — should be quoted or use CSS units`);
        }
      } else if (Array.isArray(value)) {
        errors.push(`invalid token at "${currentPath}": arrays are not allowed`);
      } else {
        errors.push(`invalid token value at "${currentPath}": expected string or number, got ${typeof value}`);
      }
    }
  }

  traverse(rawTokens, '');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
