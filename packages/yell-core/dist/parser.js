/**
 * Yell Parser
 *
 * Parses YAML into Yell AST (YellNode tree).
 */
import { parseDocument } from 'yaml';
/**
 * Parse a YAML string into a YellConfig object.
 */
export function parseYAML(yaml) {
    const doc = parseDocument(yaml);
    return doc.toJS();
}
/**
 * Normalize a raw YAML-parsed object into a clean YellNode.
 * Handles various input shapes and ensures consistent structure.
 */
export function normalizeNode(input) {
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
export function flattenConfig(config) {
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
export function tryParseYAML(yaml) {
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
