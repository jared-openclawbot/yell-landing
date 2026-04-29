(function(global) {
/* ── Yell Core — playground bundle (inline build) ── */
"use strict";
/* ── parser.js ── */
/**
 * Yell Parser
 *
 * Parses YAML into Yell AST (YellNode tree).
 */
/**
 * Parse a YAML string into a YellConfig object.
 */
function parseYAML(yaml) {
    const doc = jsyaml.load(yaml);
    return doc;
}
/**
 * Normalize a raw YAML-parsed object into a clean YellNode.
 * Handles various input shapes and ensures consistent structure.
 */
function normalizeNode(input) {
    if (!input || typeof input !== 'object') {
        return null;
    }
    const obj = input;
    if (obj === null) {
        return null;
    }
    const type = typeof obj.type === 'string' ? obj.type : 'unknown';
    const { type: _t, children, slots, ...props } = obj;
    const normalized = {
        type,
        props: Object.keys(props).length > 0 ? props : undefined,
    };
    if (Array.isArray(children)) {
        normalized.children = children.map(normalizeNode).filter((n) => n !== null);
    }
    if (slots && typeof slots === 'object') {
        normalized.slots = {};
        for (const [key, value] of Object.entries(slots)) {
            if (Array.isArray(value)) {
                normalized.slots[key] = value.map(normalizeNode).filter((n) => n !== null);
            }
        }
    }
    return normalized;
}
/**
 * Flatten a YellConfig into a linear array of YellNodes.
 * Useful for validation and rendering passes.
 */
function flattenConfig(config) {
    const nodes = [];
    const addNode = (node) => {
        nodes.push(node);
        if (node.children) {
            node.children.forEach(addNode);
        }
    };
    if (config.app?.shell) {
        addNode(config.app.shell);
    }
    if (config.app?.children) {
        config.app.children.forEach(addNode);
    }
    return nodes;
}
/**
 * Validate that a YAML string produces valid Yell YAML structure.
 * Returns null if parsing fails.
 */
function tryParseYAML(yaml) {
    try {
        const parsed = parseYAML(yaml);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}

/* ── registry.js ── */
/**
 * Yell Registry
 *
 * Component registry for mapping YAML types to renderable components.
 */
/**
 * Create an empty registry.
 */
function createRegistry() {
    return new Map();
}
/**
 * Register a component in the registry.
 */
function registerComponent(registry, type, definition) {
    registry.set(type, { type, ...definition });
}
/**
 * Get a component from the registry.
 */
function getComponent(registry, type) {
    return registry.get(type);
}
/**
 * Check if a type is registered.
 */
function isRegistered(registry, type) {
    return registry.has(type);
}
/**
 * Get all registered types.
 */
function getRegisteredTypes(registry) {
    return Array.from(registry.keys());
}
/**
 * Validate that all types in a node tree are registered.
 * Returns array of unknown types found.
 */
function findUnregisteredTypes(registry, nodes) {
    const unregistered = [];
    for (const node of nodes) {
        if (!registry.has(node.type)) {
            if (!unregistered.includes(node.type)) {
                unregistered.push(node.type);
            }
        }
    }
    return unregistered;
}
// ─── Function Registry (global, for event handler resolution) ──────────────
/**
 * Global function registry — maps handler names to actual functions.
 * Used by SSR to defer function execution to client-side hydration.
 *
 * This is a GLOBAL registry (not per-render-context) so that:
 * - Functions are registered once and reused across renders
 * - Testing can mock at module level via registerFunction
 */
const fnRegistry = new Map();
/**
 * Register a named function (event handler) in the global registry.
 * SSR resolves `onClick: handleClick` → actual function via this registry.
 */
function registerFunction(name, fn) {
    fnRegistry.set(name, fn);
}
/**
 * Get a registered function by name. Returns undefined if not found.
 */
function getFunction(name) {
    return fnRegistry.get(name);
}
/**
 * Check if a function is registered.
 */
function isFunctionRegistered(name) {
    return fnRegistry.has(name);
}
/**
 * Get all registered function names.
 */
function getRegisteredFunctions() {
    return Array.from(fnRegistry.keys());
}
/**
 * Clear all registered functions. Use in tests to reset state.
 */
function clearFunctions() {
    fnRegistry.clear();
}

/* ── renderer.js ── */
/**
 * Yell Renderer
 *
 * SSR renderer for Yell YAML → HTML with hydration support.
 * Handles token resolution, expression evaluation, and component rendering.
 */
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
 * Escape a string for safe use inside an HTML attribute value.
 * Prevents XSS via attribute injection.
 */
function escapeAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
/**
 * Escape a string for safe use as text content inside an HTML element.
 * Prevents XSS via text node injection.
 */
function escapeText(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
/**
 * Check if a value is marked as trusted/unsafe HTML.
 */
function isUnsafeHTML(value) {
    return typeof value === 'object' && value !== null && '__unsafeHTML' in value;
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
function resetIdCounter() {
    nodeIdCounter = 0;
}
/**
 * Render a YellConfig to HTML string with hydration map.
 */
function renderToString(config, registry, options = { registry, pretty: false }) {
    resetIdCounter();
    const hydrationMap = {};
    const { registry: reg } = options;
    const tokens = config.tokens;
    const state = {};
    // Build token manifest and generate CSS if tokens are present
    let tokenCSS = '';
    if (tokens) {
        try {
            const manifest = buildTokenManifest(tokens);
            tokenCSS = `<style>:root{${Object.entries(manifest.resolved)
                .map(([name, t]) => `--${name.replace(/\./g, '-').toLowerCase()}:${t.value}`)
                .join(';')}}</style>`;
        }
        catch {
            // If token resolution fails, skip CSS injection
        }
    }
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
            // Escape text props before passing to component (security boundary)
            // Unless the value is explicitly marked as UnsafeHTML (trusted HTML)
            const safeProps = {};
            for (const [k, v] of Object.entries(props)) {
                if (isUnsafeHTML(v)) {
                    safeProps[k] = v.__unsafeHTML;
                }
                else if (typeof v === 'string') {
                    // String event handler names like onClick: "handleClick" → resolve to function
                    if (k.startsWith('on') && getFunction(v)) {
                        safeProps[k] = getFunction(v);
                    }
                    else {
                        safeProps[k] = escapeText(v);
                    }
                }
                else {
                    safeProps[k] = v;
                }
            }
            try {
                return comp({ ...safeProps, children: renderedChildren });
            }
            catch {
                // Fallback to generic tag
            }
        }
        // Escape all prop values for the generic fallback tag.
        // This is a security boundary: even if a component doesn't escape,
        // the renderer protects against attribute injection.
        const isForm = node.type.toLowerCase() === 'form' && props.csrf === true;
        if (isForm) {
            delete props.csrf;
        }
        const safeAttrs = Object.entries(props)
            .map(([k, v]) => `data-${k}="${escapeAttr(String(v))}"`)
            .join(' ');
        const csrfInput = isForm ? '<input type="hidden" name="_csrf" value="$__CSRF_TOKEN__">' : '';
        return `<div id="${nodeId}" ${safeAttrs}>${csrfInput}${renderedChildren}</div>`;
    }
    let html = '';
    if (config.app?.shell) {
        html += renderNode(config.app.shell);
    }
    else if (config.app?.children) {
        html += config.app.children.map(c => renderNode(c)).join('');
    }
    // Inject token CSS at the start of body
    if (tokenCSS) {
        html = tokenCSS + html;
    }
    // Apply minification if requested
    if (options.minify === true) {
        html = minifyHTML(html);
    }
    return { html, hydrationMap };
}
/**
 * Validate a YellConfig against a registry.
 * Returns list of validation errors.
 */
function validateConfig(config, registry) {
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

/* ── tokens.js ── */
/**
 * Yell Design Tokens
 *
 * Parses, validates, and expands design token declarations from YAML config.
 * Produces a resolved TokenManifest used by the renderer and agent adapters.
 */
// Resolve a token reference like $tokens.colors.primary to its value.
// Uses cache for performance and to prevent circular references.
function expandTokenRef(ref, tokens, cache = new Map()) {
    if (!ref.startsWith('$tokens.'))
        return undefined;
    const key = ref.slice(8); // "colors.primary"
    // Check cache first
    const cached = cache.get(key);
    if (cached !== undefined) {
        return cached;
    }
    // Navigate the token tree
    const parts = key.split('.');
    let current = tokens;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // We've reached a primitive before the last part
        if (typeof current !== 'object' || current === null) {
            return undefined;
        }
        const next = current[part];
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
function detectCategory(tokenName) {
    const lower = tokenName.toLowerCase();
    if (lower.includes('color') || lower.includes('primary') || lower.includes('danger') || lower.includes('bg'))
        return 'colors';
    if (lower.includes('space') || lower.includes('spacing') || lower.includes('gap') || lower.includes('margin') || lower.includes('padding'))
        return 'spacing';
    if (lower.includes('font') || lower.includes('text') || lower.includes('size') || lower.includes('weight') || lower.includes('line'))
        return 'typography';
    if (lower.includes('shadow') || lower.includes('elevation'))
        return 'shadow';
    if (lower.includes('border') || lower.includes('radius') || lower.includes('width'))
        return 'border';
    if (lower.includes('animation') || lower.includes('duration') || lower.includes('ease'))
        return 'animation';
    if (lower.includes('motion') || lower.includes('transition'))
        return 'motion';
    return 'colors'; // default fallback
}
// Resolve a raw value — handles token references or literals
function resolveValue(value, tokens, cache) {
    if (typeof value !== 'string')
        return value;
    if (value.startsWith('$tokens.')) {
        return expandTokenRef(value, tokens, cache) ?? value;
    }
    return value;
}
// Collect all token paths and their raw values from the nested structure
function collectTokens(node, prefix, result) {
    if (typeof node !== 'object' || node === null)
        return;
    for (const [key, value] of Object.entries(node)) {
        const tokenKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string' || typeof value === 'number') {
            result.set(tokenKey, value);
        }
        else if (typeof value === 'object' && value !== null) {
            collectTokens(value, tokenKey, result);
        }
    }
}
// Resolve all tokens in a token map and produce a flat manifest
function buildTokenManifest(rawTokens) {
    // Collect all token paths and their raw values
    const tokenPaths = new Map();
    collectTokens(rawTokens, '', tokenPaths);
    // Cache for resolved values (prevents circular/algo references)
    const cache = new Map();
    const resolved = {};
    const categories = {
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
    const cssParts = [];
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
function getTokenValue(ref, manifest) {
    if (!ref.startsWith('$tokens.'))
        return undefined;
    const key = ref.slice(8); // "colors.primary"
    return manifest.resolved[key]?.value;
}
// Export all tokens as CSS custom properties string
function tokensAsCSS(manifest) {
    return manifest.cssVariables;
}
// Export tokens as JSON-serializable map for agents
function tokensAsMap(manifest) {
    const result = {};
    for (const [name, token] of Object.entries(manifest.resolved)) {
        result[name] = token.value;
    }
    return result;
}
function validateTokens(rawTokens) {
    const errors = [];
    const warnings = [];
    if (typeof rawTokens !== 'object' || rawTokens === null) {
        errors.push('tokens must be an object');
        return { valid: false, errors, warnings };
    }
    function traverse(node, path) {
        if (typeof node !== 'object' || node === null)
            return;
        for (const [key, value] of Object.entries(node)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                traverse(value, currentPath);
            }
            else if (typeof value === 'string' || typeof value === 'number') {
                if (typeof value === 'string' &&
                    !value.startsWith('$tokens.') &&
                    !value.startsWith('#') &&
                    !value.includes('px') &&
                    !value.includes('em') &&
                    !value.includes('rem') &&
                    !value.includes('rgb') &&
                    !value.includes('hsl') &&
                    !value.includes('var(') &&
                    value.includes(' ')) {
                    warnings.push(`token "${currentPath}" has unquoted string "${value}" — should be quoted or use CSS units`);
                }
            }
            else if (Array.isArray(value)) {
                errors.push(`invalid token at "${currentPath}": arrays are not allowed`);
            }
            else {
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

/* ── minify.js ── */
/**
 * Simple HTML minifier for production output.
 * Removes unnecessary whitespace, comments, and newlines.
 */
const DEFAULT_OPTIONS = {
    removeComments: true,
    collapseWhitespace: true,
    minifyCSS: false,
};
/**
 * Minify an HTML string.
 * Note: this is a simple regex-based minifier suitable for Yell's output.
 * For production use with complex HTML, consider using html-minifier-terser.
 */
function minifyHTML(html, options = DEFAULT_OPTIONS) {
    let result = html;
    // Remove HTML comments
    if (options.removeComments) {
        result = result.replace(/<!--[\s\S]*?-->/g, '');
    }
    // Collapse whitespace between tags
    if (options.collapseWhitespace) {
        // Remove newlines and multiple spaces between tags
        result = result.replace(/>\s+</g, '><');
        result = result.replace(/\s{2,}/g, ' ');
        // But preserve whitespace inside <pre>, <textarea>, <style>, <script>
        // (handle these by restoring content in those tags)
        result = result.replace(/(<(?:pre|style|script|textarea)[^>]*>)([\s\S]*?)(<\/\1>)/gi, (match, open, content, close) => {
            return open + content.replace(/\s+/g, ' ') + close;
        });
        // Remove spaces around attributes
        result = result.replace(/\s+(\w+=)/g, '$1');
        result = result.replace(/(\w+=)\s+/g, '$1');
    }
    // Remove unnecessary attributes (empty data-* attributes)
    result = result.replace(/\s+data-(\w+)=""/g, '');
    // Collapse multiple spaces inside attribute values
    result = result.replace(/(\w+="[^"]*?)\s{2,}([^"]*?")/g, '$1 $2');
    // Remove trailing slash from self-closing tags (HTML5 style)
    // But keep it for void elements
    result = result.replace(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)([^>]*)\/>/gi, '<$1$2>');
    return result.trim();
}
/**
 * Minify a CSS string (basic minification).
 */
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // remove comments
        .replace(/\s+/g, ' ') // collapse whitespace
        .replace(/\s*([{}:;,])\s*/g, '$1') // remove spaces around special chars
        .replace(/;}/g, '}') // remove last semicolon before }
        .trim();
}

/* ── playground.mjs ── */
/**
 * Yell Playground — ES Module using @yell/core
 * 
 * Replaces the inline renderer with @yell/core renderToString.
 * Built from packages/yell-core for use in playground.html.
 */


// Re-export for playground use
{ createRegistry, registerComponent, registerFunction, getFunction, renderToString, parseYAML, escapeAttr, escapeText };

// ─── Built-in component definitions ──────────────────────────────────────────
// These mirror the playground's built-in types (Text, Button, etc.)
// Registered when initPlayground() is called.

function makeTextComponent() {
  return {
    component: ({ content, variant }) => {
      content = escapeText(String(content || ''));
      variant = variant || 'p';
      if (variant === 'h1') return `<h1>${content}</h1>`;
      if (variant === 'h2') return `<h2>${content}</h2>`;
      if (variant === 'h3') return `<h3>${content}</h3>`;
      return `<p>${content}</p>`;
    }
  };
}

function makeButtonComponent() {
  return {
    component: ({ label, variant, disabled }) => {
      label = escapeText(String(label || ''));
      variant = escapeAttr(String(variant || 'primary'));
      const disabledAttr = disabled ? ' disabled' : '';
      return `<button class="yell-btn yell-btn--${variant}"${disabledAttr}>${label}</button>`;
    }
  };
}

function makeContainerComponent() {
  return {
    component: ({ layout, gap, children }) => {
      layout = layout || 'stack';
      gap = gap || '16';
      let style = '';
      if (layout === 'grid') style = `display:grid;gap:${gap}px`;
      else if (layout === 'stack') style = `display:flex;flex-direction:column;gap:${gap}px`;
      else if (layout === 'row') style = `display:flex;gap:${gap}px`;
      return `<div style="${style}">${children || ''}</div>`;
    }
  };
}

function makeInputComponent() {
  return {
    component: ({ name, type, placeholder }) => {
      name = escapeAttr(String(name || ''));
      type = escapeAttr(String(type || 'text'));
      placeholder = escapeAttr(String(placeholder || ''));
      return `<input type="${type}" name="${name}" placeholder="${placeholder}" />`;
    }
  };
}

function makeCardComponent() {
  return {
    component: ({ title, description, badge, price }) => {
      title = escapeText(String(title || ''));
      description = escapeText(String(description || ''));
      badge = escapeText(String(badge || ''));
      price = escapeText(String(price || ''));
      const badgeHtml = badge && badge !== 'none' ? `<span class="badge badge--${escapeAttr(badge)}">${badge}</span>` : '';
      return `<div class="yell-card">${badgeHtml}<h3>${title}</h3><p>${description}</p><div class="price">${price}</div></div>`;
    }
  };
}

function makeModalComponent() {
  return {
    component: ({ label, body }) => {
      label = escapeText(String(label || 'Confirm'));
      body = escapeText(String(body || ''));
      return `<div class="yell-modal-overlay" id="mOverlay"><div class="yell-modal"><h3>${label}</h3><p>${body}</p><div class="yell-modal-actions"><button class="yell-btn yell-btn--ghost" onclick="document.getElementById('mOverlay').style.display='none'">Cancel</button><button class="yell-btn yell-btn--primary" onclick="confirmAction()">Confirm</button></div></div></div><button class="yell-btn yell-btn--primary" onclick="document.getElementById('mOverlay').style.display='flex'">${label}</button>`;
    }
  };
}

function makeHeaderComponent() {
  return {
    component: ({ logo }) => {
      logo = escapeText(String(logo || ''));
      return `<header style="display:flex;gap:24px;align-items:center;padding:16px 24px;border-bottom:1px solid #30363d"><a href="#" style="font-weight:bold;font-size:18px;color:#58a6ff;text-decoration:none">${logo}</a></header>`;
    }
  };
}

function makeSidebarComponent() {
  return {
    component: ({ items }) => {
      let itemsArr = [];
      try { itemsArr = JSON.parse(items); } catch {}
      const ul = itemsArr.map(item => `<li><a href="#">${escapeText(item)}</a></li>`).join('');
      return `<aside style="padding:16px;background:#161b22;border-radius:8px;border:1px solid #30363d"><ul>${ul}</ul></aside>`;
    }
  };
}

function makeStatCardComponent() {
  return {
    component: ({ label, value }) => {
      label = escapeText(String(label || ''));
      value = escapeText(String(value || '0'));
      return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
    }
  };
}

function makePricingCardComponent() {
  return {
    component: ({ tier, price, features, variant, featured }) => {
      tier = escapeText(String(tier || ''));
      price = escapeText(String(price || ''));
      variant = escapeAttr(String(variant || 'ghost'));
      const featuredClass = featured ? ' featured' : '';
      let featuresArr = [];
      try { featuresArr = JSON.parse(features); } catch {}
      const featList = featuresArr.map(f => `<li>${escapeText(f)}</li>`).join('');
      return `<div class="pricing-card${featuredClass}"><h3>${tier}</h3><div class="price">${price}</div><ul>${featList}</ul></div>`;
    }
  };
}

function makeFormComponent() {
  return {
    component: ({ children }) => {
      return `<form class="yell-form" onsubmit="return false">${children || ''}</form>`;
    }
  };
}

function makeFieldComponent() {
  return {
    component: ({ label, name, type, default: defaultVal }) => {
      label = escapeText(String(label || ''));
      name = escapeAttr(String(name || ''));
      type = escapeAttr(String(type || 'text'));
      defaultVal = escapeAttr(String(defaultVal || ''));
      return `<div class="field"><label>${label}</label><input type="${type}" name="${name}" value="${defaultVal}" /></div>`;
    }
  };
}

function makeRepoCardComponent() {
  return {
    component: ({ name, description, url, stars, language }) => {
      name = escapeText(String(name || ''));
      description = escapeText(String(description || ''));
      url = escapeAttr(String(url || '#'));
      stars = escapeText(String(stars || '0'));
      language = escapeText(String(language || ''));
      return `<a class="repo-card" href="${url}" target="_blank"><div class="repo-name">${name}</div><div class="repo-desc">${description}</div><div class="repo-meta"><span class="repo-stars">${stars} stars</span> ${language}</div></a>`;
    }
  };
}

/**
 * Initialize playground with @yell/core and register built-in components.
 * Returns { registry, renderFn }.
 */
function initPlayground() {
  const registry = createRegistry();
  
  registerComponent(registry, 'Text', makeTextComponent());
  registerComponent(registry, 'Button', makeButtonComponent());
  registerComponent(registry, 'Container', makeContainerComponent());
  registerComponent(registry, 'Input', makeInputComponent());
  registerComponent(registry, 'Card', makeCardComponent());
  registerComponent(registry, 'Modal', makeModalComponent());
  registerComponent(registry, 'Header', makeHeaderComponent());
  registerComponent(registry, 'Sidebar', makeSidebarComponent());
  registerComponent(registry, 'StatCard', makeStatCardComponent());
  registerComponent(registry, 'PricingCard', makePricingCardComponent());
  registerComponent(registry, 'Form', makeFormComponent());
  registerComponent(registry, 'Field', makeFieldComponent());
  registerComponent(registry, 'RepoCard', makeRepoCardComponent());
  
  function renderFn(yaml) {
    const config = parseYAML(yaml);
    const { html } = renderToString(config, registry);
    return html;
  }
  
  return { registry, renderFn };
}

/* ── Bundle export — initPlayground available globally ── */
global.initPlayground = initPlayground;
})(this);
