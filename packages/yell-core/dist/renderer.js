/**
 * Yell Renderer
 *
 * SSR renderer for Yell YAML → HTML with hydration support.
 * Handles token resolution, expression evaluation, and component rendering.
 */
import { getComponent } from './registry.js';
let nodeIdCounter = 0;
function nextId() {
    return `yell-${nodeIdCounter++}`;
}
/**
 * Resolve a token reference like $tokens.primary to its value.
 */
function resolveToken(tokens, ref) {
    if (!tokens || !ref.startsWith('$tokens.'))
        return undefined;
    const path = ref.slice(8).split('.');
    let value = tokens;
    for (const key of path) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        }
        else {
            return undefined;
        }
    }
    return value;
}
/**
 * Recursively resolve $tokens.X references in a value.
 */
function resolveValue(value, tokens) {
    if (typeof value === 'string' && value.startsWith('$tokens.')) {
        return resolveToken(tokens, value) ?? value;
    }
    if (Array.isArray(value)) {
        return value.map(v => resolveValue(v, tokens));
    }
    if (value && typeof value === 'object') {
        const resolved = {};
        for (const [k, v] of Object.entries(value)) {
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
function resolveNode(node, tokens, state) {
    // YAML puts type/layout/gap at node level, not inside props.
    // Merge everything except type/children/slots.
    const nodeObj = node;
    const { type: _t, children, slots, ...rest } = nodeObj;
    const merged = { ...rest, ...(node.props || {}) };
    const props = {};
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
                const leftVal = left.split('.').reduce((o, k) => o && typeof o === 'object' ? o[k] : undefined, state);
                let rightVal = right.trim();
                if (rightVal === 'true')
                    rightVal = true;
                else if (rightVal === 'false')
                    rightVal = false;
                else if (rightVal === 'null')
                    rightVal = null;
                else if (!isNaN(Number(rightVal)))
                    rightVal = Number(rightVal);
                else if (typeof rightVal === 'string' && rightVal.startsWith("'") && rightVal.endsWith("'")) {
                    rightVal = rightVal.slice(1, -1);
                }
                switch (op) {
                    case '==':
                        showWhen = leftVal == rightVal;
                        break;
                    case '!=':
                        showWhen = leftVal != rightVal;
                        break;
                    case '>':
                        showWhen = Number(leftVal) > Number(rightVal);
                        break;
                    case '<':
                        showWhen = Number(leftVal) < Number(rightVal);
                        break;
                    case '>=':
                        showWhen = Number(leftVal) >= Number(rightVal);
                        break;
                    case '<=':
                        showWhen = Number(leftVal) <= Number(rightVal);
                        break;
                }
            }
        }
        else if (typeof cond === 'boolean') {
            showWhen = cond;
        }
        delete props.showWhen;
    }
    return { props, showWhen, children: node.children || [] };
}
/**
 * Reset the node ID counter (useful for testing).
 */
export function resetIdCounter() {
    nodeIdCounter = 0;
}
/**
 * Render a YellConfig to HTML string with hydration map.
 */
export function renderToString(config, registry, options = { registry, pretty: false }) {
    resetIdCounter();
    const hydrationMap = {};
    const { registry: reg } = options;
    const tokens = config.tokens;
    const state = {};
    function renderNode(node) {
        const nodeId = nextId();
        const def = getComponent(reg, node.type);
        const { props, showWhen, children } = resolveNode(node, tokens, state);
        if (!showWhen)
            return '';
        const eventNames = [];
        for (const key of Object.keys(props)) {
            if (key.startsWith('on'))
                eventNames.push(key);
        }
        if (eventNames.length > 0) {
            hydrationMap[nodeId] = { type: node.type, events: eventNames };
        }
        // Render children to HTML strings
        const renderedChildren = children.map(c => renderNode(c)).join('');
        // If component has a render function, call it
        if (def?.component) {
            const comp = def.component;
            try {
                return comp({ ...props, children: renderedChildren });
            }
            catch {
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
    }
    else if (config.app?.children) {
        html += config.app.children.map(c => renderNode(c)).join('');
    }
    return { html, hydrationMap };
}
/**
 * Validate a YellConfig against a registry.
 * Returns list of validation errors.
 */
export function validateConfig(config, registry) {
    const errors = [];
    function validateNode(node, path) {
        if (!getComponent(registry, node.type)) {
            errors.push(`Unknown component "${node.type}" at ${path}`);
        }
        node.children?.forEach((c, i) => validateNode(c, `${path}/${node.type}[${i}]`));
    }
    if (config.app?.shell)
        validateNode(config.app.shell, 'shell');
    if (config.app?.children)
        config.app.children.forEach((c, i) => validateNode(c, `children[${i}]`));
    return errors;
}
