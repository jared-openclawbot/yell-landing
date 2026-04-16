/**
 * Yell Registry
 * 
 * Component registry for mapping YAML types to renderable components.
 */

import type { ComponentDef, ComponentRegistry } from './types.js';

/**
 * Create an empty registry.
 */
export function createRegistry(): ComponentRegistry {
  return new Map();
}

/**
 * Register a component in the registry.
 */
export function registerComponent(
  registry: ComponentRegistry,
  type: string,
  definition: Omit<ComponentDef, 'type'>
): void {
  registry.set(type, { type, ...definition });
}

/**
 * Get a component from the registry.
 */
export function getComponent(
  registry: ComponentRegistry,
  type: string
): ComponentDef | undefined {
  return registry.get(type);
}

/**
 * Check if a type is registered.
 */
export function isRegistered(
  registry: ComponentRegistry,
  type: string
): boolean {
  return registry.has(type);
}

/**
 * Get all registered types.
 */
export function getRegisteredTypes(registry: ComponentRegistry): string[] {
  return Array.from(registry.keys());
}

/**
 * Validate that all types in a node tree are registered.
 * Returns array of unknown types found.
 */
export function findUnregisteredTypes(
  registry: ComponentRegistry,
  nodes: { type: string }[]
): string[] {
  const unregistered: string[] = [];

  for (const node of nodes) {
    if (!registry.has(node.type)) {
      if (!unregistered.includes(node.type)) {
        unregistered.push(node.type);
      }
    }
  }

  return unregistered;
}