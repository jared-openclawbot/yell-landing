/**
 * Yell Renderer
 * 
 * SSR renderer for Yell YAML → HTML with hydration support.
 */

import type {
  YellNode,
  YellConfig,
  ComponentRegistry,
  SSRRenderOptions,
  SSRRenderResult,
  HydrationMap,
} from './types.js';
import { getComponent } from './registry.js';
import { normalizeNode } from './parser.js';

let nodeIdCounter = 0;
function nextId(): string {
  return `yell-${nodeIdCounter++}`;
}

/**
 * Reset the node ID counter (useful for testing).
 */
export function resetIdCounter(): void {
  nodeIdCounter = 0;
}

/**
 * Render a YellConfig to HTML string with hydration map.
 */
export function renderToString(
  config: YellConfig,
  registry: ComponentRegistry,
  options: SSRRenderOptions = { registry, pretty: false }
): SSRRenderResult {
  resetIdCounter();
  const hydrationMap: HydrationMap = {};
  const { registry: reg, pretty } = options;

  const renderNode = (node: YellNode, depth: number): string => {
    const nodeId = nextId();
    const component = getComponent(reg, node.type);

    // Base tag based on registered component or default
    const tag = component ? 'yell-component' : 'div';
    const attrs = node.props
      ? Object.entries(node.props)
          .map(([k, v]) => `data-${k}="${String(v)}"`)
          .join(' ')
      : '';

    const indent = pretty ? '  '.repeat(depth) : '';
    const newline = pretty ? '\n' : '';

    // Collect event names for hydration
    const eventNames: string[] = [];
    if (node.props) {
      for (const key of Object.keys(node.props)) {
        if (key.startsWith('on')) {
          eventNames.push(key);
        }
      }
    }

    if (eventNames.length > 0) {
      hydrationMap[nodeId] = { type: node.type, events: eventNames };
    }

    // Render children
    let childrenHtml = '';
    if (node.children && node.children.length > 0) {
      childrenHtml = node.children
        .map(child => renderNode(child, depth + 1))
        .join(newline);
    }

    // Build element string
    const openTag = `<${tag} id="${nodeId}" ${attrs}>${newline}`;
    const closeTag = `${newline}${indent}</${tag}>`;

    return openTag + childrenHtml + closeTag;
  };

  let html = '';

  if (config.shell) {
    html += renderNode(config.shell, 0);
  }

  if (config.children) {
    html += config.children
      .map(child => renderNode(child, 0))
      .join(newline);
  }

  return { html, hydrationMap };
}

/**
 * Validate a YellConfig against a registry.
 * Returns list of validation errors.
 */
export function validateConfig(
  config: YellConfig,
  registry: ComponentRegistry
): string[] {
  const errors: string[] = [];

  const validateNode = (node: YellNode, path: string) => {
    const component = getComponent(registry, node.type);

    if (!component) {
      errors.push(`Unknown component type "${node.type}" at ${path}`);
    }

    // TODO: If component has schema, validate props against it

    if (node.children) {
      node.children.forEach((child, i) => {
        validateNode(child, `${path}/${node.type}/${i}`);
      });
    }
  };

  if (config.shell) {
    validateNode(config.shell, 'shell');
  }

  if (config.children) {
    config.children.forEach((child, i) => {
      validateNode(child, `children[${i}]`);
    });
  }

  return errors;
}