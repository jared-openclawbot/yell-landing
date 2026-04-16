/**
 * Yell Schema Registry
 * 
 * Schema registry for component contracts, validation, and AI manifests.
 */

import { z } from 'zod';
import type {
  ComponentSchema,
  SchemaRegistry,
  ValidationError,
  ComponentManifest,
  PropSchema,
} from './types.js';

// Zod schema for internal use
const propSchemaZod = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'enum', 'component', 'array']),
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  enum: z.array(z.string()).optional(),
  componentRef: z.string().optional(),
  arrayOf: z.string().optional(),
  description: z.string().optional(),
});

const componentSchemaZod = z.object({
  name: z.string(),
  version: z.string().optional(),
  description: z.string().optional(),
  props: z.array(propSchemaZod),
  slots: z.array(z.object({
    name: z.string(),
    accepts: z.array(z.string()).optional(),
    description: z.string().optional(),
  })).optional(),
  events: z.array(z.object({
    name: z.string(),
    payload: z.string().optional(),
    description: z.string().optional(),
  })).optional(),
});

/**
 * Create an empty schema registry.
 */
export function createSchemaRegistry(): SchemaRegistry {
  return { schemas: new Map() };
}

/**
 * Register a component schema.
 */
export function registerComponentSchema(
  registry: SchemaRegistry,
  schema: ComponentSchema
): void {
  const key = schema.version ? `${schema.name}@${schema.version}` : schema.name;
  registry.schemas.set(key, schema);
}

/**
 * Get a schema by name (optionally with version).
 */
export function getComponentSchema(
  registry: SchemaRegistry,
  name: string,
  version?: string
): ComponentSchema | undefined {
  const key = version ? `${name}@${version}` : name;
  return registry.schemas.get(key);
}

/**
 * Get schema, trying versioned first then unversioned.
 */
export function resolveSchema(
  registry: SchemaRegistry,
  name: string
): ComponentSchema | undefined {
  // Try exact match with version first
  for (const [key, schema] of registry.schemas) {
    if (key === name || key.startsWith(`${name}@`)) {
      return schema;
    }
  }
  return undefined;
}

/**
 * Validate props against a component schema.
 */
export function validateProps(
  type: string,
  props: Record<string, unknown> | undefined,
  registry: SchemaRegistry
): ValidationError[] {
  const errors: ValidationError[] = [];
  const schema = resolveSchema(registry, type);

  if (!schema) {
    return [{ path: type, message: `Unknown component "${type}"`, type: 'unknown_component' }];
  }

  const propMap = new Map<string, PropSchema>(schema.props.map(p => [p.name, p]));

  // Check required props
  for (const prop of schema.props) {
    if (prop.required && (props === undefined || !(prop.name in props))) {
      errors.push({
        path: `${type}.${prop.name}`,
        message: `Missing required prop "${prop.name}"`,
        type: 'missing_required',
        suggestion: `Add "${prop.name}" to props`,
      });
    }
  }

  // Validate provided props
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      const propDef = propMap.get(key);
      if (!propDef) {
        errors.push({
          path: `${type}.${key}`,
          message: `Unknown prop "${key}" on ${type}`,
          type: 'invalid_prop',
        });
        continue;
      }

      // Type check
      switch (propDef.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push({
              path: `${type}.${key}`,
              message: `Expected string for "${key}", got ${typeof value}`,
              type: 'invalid_type',
            });
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            errors.push({
              path: `${type}.${key}`,
              message: `Expected number for "${key}", got ${typeof value}`,
              type: 'invalid_type',
            });
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push({
              path: `${type}.${key}`,
              message: `Expected boolean for "${key}", got ${typeof value}`,
              type: 'invalid_type',
            });
          }
          break;
        case 'enum':
          if (propDef.enum && !propDef.enum.includes(String(value))) {
            errors.push({
              path: `${type}.${key}`,
              message: `Invalid value "${value}" for "${key}". Expected one of: ${propDef.enum.join('|')}`,
              type: 'invalid_enum',
              suggestion: `Use one of: ${propDef.enum.join(', ')}`,
            });
          }
          break;
      }
    }
  }

  return errors;
}

/**
 * Build an AI manifest from the registry.
 */
export function getComponentManifest(registry: SchemaRegistry): ComponentManifest {
  const components: ComponentManifest['components'] = [];

  for (const schema of registry.schemas.values()) {
    components.push({
      name: schema.name,
      version: schema.version,
      description: schema.description,
      props: schema.props.map(p => ({
        name: p.name,
        type: p.type + (p.enum ? ` (${p.enum.join('|')})` : ''),
        required: p.required ?? false,
        default: p.default,
        enum: p.enum,
        description: p.description,
      })),
      slots: schema.slots?.map(s => s.name),
      events: schema.events?.map(e => ({ name: e.name, payload: e.payload })),
    });
  }

  return { components };
}

/**
 * Build a system prompt section from manifest (for AI adapters).
 */
export function buildSystemPromptSection(manifest: ComponentManifest): string {
  let section = '\nCOMPONENTS:\n';

  for (const comp of manifest.components) {
    section += `\n## ${comp.name}${comp.version ? `@${comp.version}` : ''}`;
    if (comp.description) section += `\n${comp.description}`;
    section += '\nProps:';
    for (const prop of comp.props) {
      const req = prop.required ? ' (required)' : '';
      const def = prop.default !== undefined ? ` [default: ${JSON.stringify(prop.default)}]` : '';
      section += `\n  - ${prop.name}: ${prop.type}${req}${def}`;
      if (prop.description) section += `\n    "${prop.description}"`;
    }
    if (comp.slots?.length) {
      section += `\nSlots: ${comp.slots.join(', ')}`;
    }
    if (comp.events?.length) {
      section += `\nEvents: ${comp.events.map(e => e.name).join(', ')}`;
    }
  }

  return section;
}

/**
 * Validate a full YAML node tree against the schema registry.
 */
export function validateNodes(
  nodes: { type: string; props?: Record<string, unknown>; children?: unknown[] }[],
  registry: SchemaRegistry
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const node of nodes) {
    const nodeErrors = validateProps(node.type, node.props, registry);
    errors.push(...nodeErrors);

    if (node.children) {
      errors.push(...validateNodes(node.children as typeof nodes, registry));
    }
  }

  return errors;
}