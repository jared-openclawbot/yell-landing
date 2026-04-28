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
export { renderToString, resetIdCounter, validateConfig } from './renderer.js';
export {
  buildTokenManifest,
  expandTokenRef,
  getTokenValue,
  tokensAsCSS,
  tokensAsMap,
  validateTokens,
} from './tokens.js';
export type {
  TokenManifest,
  ResolvedToken,
  TokenCategory,
  TokenValidationResult,
} from './tokens.js';

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