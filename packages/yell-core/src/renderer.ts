/**
 * Yell Renderer
 * 
 * SSR renderer for Yell YAML → HTML with hydration support.
 * Handles token resolution, expression evaluation, and component rendering.
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

let nodeIdCounter = 0;
function nextId(): string {
  return `yell-${nodeIdCounter++}`;
}

/**
 * Resolve a token reference like $tokens.primary to its value.
 */
function resolveToken(tokens: Record<string, unknown> | undefined, ref: string): string | number | undefined {
  if (!tokens || !ref.startsWith('$tokens.')) return undefined;
  const path = ref.slice(8).split('.');
  let value: unknown = tokens;
  for (const key of path) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return value as string | number;
}

/**
 * Recursively resolve $tokens.X references in a value.
 */
function resolveValue(value: unknown, tokens: Record<string, unknown> | undefined): unknown {
  if (typeof value === 'string' && value.startsWith('$tokens.')) {
    return resolveToken(tokens, value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map(v => resolveValue(v, tokens));
  }
  if (value && typeof value === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      resolved[k] = resolveValue(v, tokens);
    }
    return resolved;
  }
  return value;
}

/**
 * Resolve props: merge node fields + props, expand tokens, evaluate showWhen.
 * YAML puts layout/gap/type at node level (not inside props), so we merge.
 */
function resolveNode(
  node: YellNode,
  tokens: Record<string, unknown> | undefined,
  state: Record<string, unknown>
): { props: Record<string, unknown>; showWhen: boolean; children: YellNode[] } {
  // YAML puts type/layout/gap at node level, not inside props.
  // Merge everything except type/children/slots.
  const nodeObj = node as unknown as Record<string, unknown>;
  const { type: _t, children, slots, ...rest } = nodeObj;
  const merged = { ...rest, ...(node.props || {}) };

  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    props[k] = resolveValue(v, tokens);
  }

  // Evaluate showWhen expression
  let showWhen = true;
  if (props.showWhen !== undefined) {
    const cond = props.showWhen;
    if (typeof cond === 'string') {
      const match = cond.match(/^(\w+(?:\.\w+)*)\s*(==|!=|>|<|>=|<=)\s*(.+)$/);
      if (match) {
        const [, left, op, right] = match;
        const leftVal = left.split('.').reduce((o: unknown, k: string) =>
          o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined, state);
        let rightVal: unknown = right.trim();
        if (rightVal === 'true') rightVal = true;
        else if (rightVal === 'false') rightVal = false;
        else if (rightVal === 'null') rightVal = null;
        else if (!isNaN(Number(rightVal))) rightVal = Number(rightVal);
        else if (typeof rightVal === 'string' && rightVal.startsWith("'") && rightVal.endsWith("'")) {
          rightVal = rightVal.slice(1, -1);
        }

        switch (op) {
          case '==': showWhen = leftVal == rightVal; break;
          case '!=': showWhen = leftVal != rightVal; break;
          case '>': showWhen = Number(leftVal) > Number(rightVal); break;
          case '<': showWhen = Number(leftVal) < Number(rightVal); break;
          case '>=': showWhen = Number(leftVal) >= Number(rightVal); break;
          case '<=': showWhen = Number(leftVal) <= Number(rightVal); break;
        }
      }
    } else if (typeof cond === 'boolean') {
      showWhen = cond;
    }
    delete props.showWhen;
  }

  return { props, showWhen, children: node.children || [] };
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
  const { registry: reg } = options;
  const tokens = config.tokens as Record<string, unknown> | undefined;
  const state: Record<string, unknown> = {};

  function renderNode(node: YellNode): string {
    const nodeId = nextId();
    const def = getComponent(reg, node.type);

    const { props, showWhen, children } = resolveNode(node, tokens, state);
    if (!showWhen) return '';

    const eventNames: string[] = [];
    for (const key of Object.keys(props)) {
      if (key.startsWith('on')) eventNames.push(key);
    }
    if (eventNames.length > 0) {
      hydrationMap[nodeId] = { type: node.type, events: eventNames };
    }

    // Render children to HTML strings
    const renderedChildren = children.map(c => renderNode(c)).join('');

    // If component has a render function, call it
    if (def?.component) {
      const comp = def.component as (props: Record<string, unknown>) => string;
      try {
        return comp({ ...props, children: renderedChildren });
      } catch {
        // Fallback to generic tag
      }
    }

    // Fallback: render as generic tag with data attrs
    const attrs = Object.entries(props)
      .map(([k, v]) => `data-${k}="${String(v)}"`)
      .join(' ');
    return `<div id="${nodeId}" ${attrs}>${renderedChildren}</div>`;
  }

  let html = '';

  if (config.app?.shell) {
    html += renderNode(config.app.shell);
  } else if (config.app?.children) {
    html += config.app.children.map(c => renderNode(c)).join('');
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

  function validateNode(node: YellNode, path: string) {
    if (!getComponent(registry, node.type)) {
      errors.push(`Unknown component "${node.type}" at ${path}`);
    }
    node.children?.forEach((c, i) => validateNode(c, `${path}/${node.type}[${i}]`));
  }

  if (config.app?.shell) validateNode(config.app.shell, 'shell');
  if (config.app?.children) config.app.children.forEach((c, i) => validateNode(c, `children[${i}]`));

  return errors;
}
