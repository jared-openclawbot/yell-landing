/**
 * Yell Schema Registry — typed component schemas with Zod validation
 */

import { z } from 'zod';
import type {
  ComponentSchema,
  PropSchema,
  SchemaRegistry,
  ValidationError,
  ComponentManifest,
  ManifestComponent,
} from './types.js';

// ─── Zod Schemas for Props ───────────────────────────────────────────────────

function propSchemaToZod(prop: PropSchema): z.ZodTypeAny {
  switch (prop.type) {
    case 'string':   return z.string();
    case 'number':   return z.number().optional();
    case 'boolean':  return z.boolean();
    case 'enum':     return z.enum(prop.enum as [string, ...string[]]);
    case 'node':      return z.record(z.unknown());
    case 'array':     return z.array(z.unknown());
    default:         return z.unknown();
  }
}

function propSchemaToTsType(prop: PropSchema): string {
  switch (prop.type) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'enum':   return prop.enum ? prop.enum.map(v => `"${v}"`).join(' | ') : 'string';
    case 'node':   return 'Record<string, unknown>';
    case 'array':  return 'unknown[]';
    default:       return 'unknown';
  }
}

// ─── Registry ───────────────────────────────────────────────────────────────

export function createSchemaRegistry(): SchemaRegistry {
  return { schemas: new Map(), versions: new Map() };
}

export function registerComponentSchema(registry: SchemaRegistry, schema: ComponentSchema): void {
  const key = schema.version ? `${schema.name}@${schema.version}` : schema.name;
  registry.schemas.set(key, schema);
  if (!registry.versions.has(schema.name)) registry.versions.set(schema.name, []);
  const versions = registry.versions.get(schema.name)!;
  if (schema.version && !versions.includes(schema.version)) versions.push(schema.version);
}

export function getComponentSchema(registry: SchemaRegistry, name: string, version?: string): ComponentSchema | undefined {
  const key = version ? `${name}@${version}` : name;
  return registry.schemas.get(key);
}

export function getLatestVersion(registry: SchemaRegistry, name: string): ComponentSchema | undefined {
  const versions = registry.versions.get(name);
  if (!versions || versions.length === 0) return undefined;
  const latest = versions.sort().at(-1);
  return getComponentSchema(registry, name, latest);
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function validateProps(
  componentName: string,
  props: Record<string, unknown>,
  registry: SchemaRegistry,
  options?: { strict?: boolean },
): ValidationError[] {
  const errors: ValidationError[] = [];
  const schema = getLatestVersion(registry, componentName) ?? getComponentSchema(registry, componentName);

  if (!schema) {
    return [{
      type: 'unknown_component',
      path: componentName,
      message: `Unknown component "${componentName}". Did you register it in the schema registry?`,
      suggestion: `Register with: registerComponentSchema(registry, { name: "${componentName}", props: [...] })`,
    }];
  }

  // Required props
  for (const prop of schema.props.filter(p => p.required)) {
    if (props[prop.name] === undefined || props[prop.name] === null) {
      errors.push({
        type: 'missing_required',
        path: `${componentName}.${prop.name}`,
        message: `Missing required prop "${prop.name}" on <${componentName}>`,
        suggestion: `Add "${prop.name}" to your component props. Type: ${prop.type}`,
        expected: prop.type,
      });
    }
  }

  // Validate each provided prop
  for (const [key, value] of Object.entries(props)) {
    const propDef = schema.props.find(p => p.name === key);

    if (!propDef) {
      errors.push({
        type: 'invalid_prop',
        path: `${componentName}.${key}`,
        message: `Unknown prop "${key}" on <${componentName}>`,
        suggestion: schema.props.length > 0
          ? `Valid props: ${schema.props.map(p => p.name).join(', ')}`
          : `This component has no defined props yet`,
      });
      continue;
    }

    // Enum validation — check before type (more specific)
    if (propDef.type === 'enum' && propDef.enum && !propDef.enum.includes(String(value))) {
      errors.push({
        type: 'invalid_enum',
        path: `${componentName}.${key}`,
        message: `Invalid value "${value}" for "${key}". Allowed: ${propDef.enum.join(', ')}`,
        received: value,
        expected: propDef.enum.join(' | '),
        suggestion: `Choose one of: ${propDef.enum.join(', ')}`,
      });
      continue; // don't also emit a type error
    }

    // Type validation
    let valid = true;
    try {
      const zodSchema = propSchemaToZod(propDef);
      valid = zodSchema.safeParse(value).success;
    } catch { /* skip on Zod error */ }

    if (!valid) {
      errors.push({
        type: 'invalid_type',
        path: `${componentName}.${key}`,
        message: `Invalid type for "${key}": expected ${propDef.type}, got ${typeof value}`,
        received: typeof value,
        expected: propDef.type,
        suggestion: `Expected type: ${propDef.type}`,
      });
    }

    // Range validation for numbers
    if (propDef.type === 'number' && typeof value === 'number') {
      if (propDef.min !== undefined && value < propDef.min) {
        errors.push({ type: 'out_of_range', path: `${componentName}.${key}`, message: `Value ${value} for "${key}" is below minimum ${propDef.min}`, received: value, expected: `>= ${propDef.min}` });
      }
      if (propDef.max !== undefined && value > propDef.max) {
        errors.push({ type: 'out_of_range', path: `${componentName}.${key}`, message: `Value ${value} for "${key}" exceeds maximum ${propDef.max}`, received: value, expected: `<= ${propDef.max}` });
      }
    }
  }

  return errors;
}

// ─── Manifest for AI ────────────────────────────────────────────────────────

export function getComponentManifest(registry: SchemaRegistry): ComponentManifest {
  const components: ManifestComponent[] = [];
  for (const [key, schema] of registry.schemas) {
    if (key.includes('@')) continue; // skip versioned entries
    components.push({
      name: schema.name,
      version: schema.version,
      description: schema.description,
      props: schema.props.map(p => ({
        name: p.name,
        type: propSchemaToTsType(p),
        required: !!p.required,
        default: p.default,
        description: p.description,
        enum: p.enum,
      })),
      events: schema.events ?? [],
    });
  }
  return { version: '1.0', components };
}

export function buildSystemPromptSection(manifest: ComponentManifest): string {
  const lines: string[] = ['## Available Components', ''];
  for (const component of manifest.components) {
    lines.push(`### ${component.name}${component.version ? ` (${component.version})` : ''}`);
    if (component.description) lines.push(component.description);
    lines.push('');
    lines.push('**Props:**');
    if (component.props.length === 0) {
      lines.push('*(no defined props)*');
    }
    for (const prop of component.props) {
      const req = prop.required ? ' (required)' : '';
      const def = prop.default !== undefined ? ` = ${JSON.stringify(prop.default)}` : '';
      const enumStr = prop.enum ? ` — one of: ${prop.enum.join(', ')}` : '';
      lines.push(`- \`${prop.name}\`: ${prop.type}${req}${def}${enumStr}`);
      if (prop.description) lines.push(`  ${prop.description}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function schemaAsTypeScript(registry: SchemaRegistry): string {
  const lines: string[] = ['// Generated by @yell/schema', '// Do not edit manually', ''];
  for (const [key, schema] of registry.schemas) {
    if (key.includes('@')) continue;
    const interfaceName = schema.name.charAt(0).toUpperCase() + schema.name.slice(1) + 'Props';
    lines.push(`export interface ${interfaceName} {`);
    for (const prop of schema.props) {
      const req = prop.required ? '' : '?';
      lines.push(`  ${prop.name}${req}: ${propSchemaToTsType(prop)};`);
    }
    lines.push('}', '');
  }
  return lines.join('\n');
}
