/**
 * Yell Core
 * 
 * Declarative UI runtime for YAML-defined interfaces.
 * 
 * @example
 * import { parseYAML, createRegistry, registerComponent, renderToString } from 'yell-core';
 * 
 * const registry = createRegistry();
 * registerComponent(registry, 'Button', {
 *   component: ButtonComponent,
 * });
 * 
 * const yaml = `
 *   type: Button
 *   props:
 *     label: Click me
 * `;
 * 
 * const config = parseYAML(yaml);
 * const { html } = renderToString(config, registry);
 */

export { parseYAML, normalizeNode, flattenConfig, tryParseYAML } from './parser.js';
export { createRegistry, registerComponent, getComponent, isRegistered, getRegisteredTypes, findUnregisteredTypes } from './registry.js';
export { registerFunction, getFunction, isFunctionRegistered, getRegisteredFunctions, clearFunctions } from './registry.js';
export { escapeAttr, escapeText, renderToString, resetIdCounter, validateConfig } from './renderer.js';
export type { UnsafeHTML } from './renderer.js';
export { isUnsafeHTML } from './renderer.js';
export {
  buildTokenManifest,
  expandTokenRef,
  getTokenValue,
  tokensAsCSS,
  tokensAsMap,
  validateTokens,
} from './tokens.js';
export { minifyHTML, minifyCSS } from './minify.js';
export {
  generateCSRFToken,
  validateCSRFToken,
  generateSignedToken,
  validateSignedToken,
  injectCSRFToken,
  extractCSRFToken,
} from './security/csrf.js';
export {
  loadDesignSystem,
  loadDesignCSS,
  validateDesignConfig,
} from './design_system.js';
export { defaultTokens } from './default_tokens.js';
export type { DesignSystem, DesignSystemOptions } from './design_system.js';
export type {
  TokenManifest,
  ResolvedToken,
  TokenCategory,
  TokenValidationResult,
} from './tokens.js';
export type { MinifyOptions } from './minify.js';
export type { SignedToken, CSRFContext } from './security/csrf.js';

export type {
  YellNode,
  ComponentDef,
  EventHandlers,
  ResolvedNode,
  RenderContext,
  ComponentRegistry,
  YellConfig,
  SSRRenderOptions,
  SSRRenderResult,
  HydrationMap,
  TokenMap,
} from './types.js';
