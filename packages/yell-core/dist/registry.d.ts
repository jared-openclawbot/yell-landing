/**
 * Yell Registry
 *
 * Component registry for mapping YAML types to renderable components.
 */
import type { ComponentDef, ComponentRegistry } from './types.js';
/**
 * Create an empty registry.
 */
export declare function createRegistry(): ComponentRegistry;
/**
 * Register a component in the registry.
 */
export declare function registerComponent(registry: ComponentRegistry, type: string, definition: Omit<ComponentDef, 'type'>): void;
/**
 * Get a component from the registry.
 */
export declare function getComponent(registry: ComponentRegistry, type: string): ComponentDef | undefined;
/**
 * Check if a type is registered.
 */
export declare function isRegistered(registry: ComponentRegistry, type: string): boolean;
/**
 * Get all registered types.
 */
export declare function getRegisteredTypes(registry: ComponentRegistry): string[];
/**
 * Validate that all types in a node tree are registered.
 * Returns array of unknown types found.
 */
export declare function findUnregisteredTypes(registry: ComponentRegistry, nodes: {
    type: string;
}[]): string[];
