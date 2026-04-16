/**
 * Yell Renderer
 *
 * SSR renderer for Yell YAML → HTML with hydration support.
 * Handles token resolution, expression evaluation, and component rendering.
 */
import type { YellConfig, ComponentRegistry, SSRRenderOptions, SSRRenderResult } from './types.js';
/**
 * Reset the node ID counter (useful for testing).
 */
export declare function resetIdCounter(): void;
/**
 * Render a YellConfig to HTML string with hydration map.
 */
export declare function renderToString(config: YellConfig, registry: ComponentRegistry, options?: SSRRenderOptions): SSRRenderResult;
/**
 * Validate a YellConfig against a registry.
 * Returns list of validation errors.
 */
export declare function validateConfig(config: YellConfig, registry: ComponentRegistry): string[];
