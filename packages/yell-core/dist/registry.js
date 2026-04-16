/**
 * Yell Registry
 *
 * Component registry for mapping YAML types to renderable components.
 */
/**
 * Create an empty registry.
 */
export function createRegistry() {
    return new Map();
}
/**
 * Register a component in the registry.
 */
export function registerComponent(registry, type, definition) {
    registry.set(type, { type, ...definition });
}
/**
 * Get a component from the registry.
 */
export function getComponent(registry, type) {
    return registry.get(type);
}
/**
 * Check if a type is registered.
 */
export function isRegistered(registry, type) {
    return registry.has(type);
}
/**
 * Get all registered types.
 */
export function getRegisteredTypes(registry) {
    return Array.from(registry.keys());
}
/**
 * Validate that all types in a node tree are registered.
 * Returns array of unknown types found.
 */
export function findUnregisteredTypes(registry, nodes) {
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
