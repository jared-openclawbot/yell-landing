# @yell/schema

Schema definitions, prop validation, and AI component manifests for Yell.

## Install

```bash
npm install @yell/schema
```

Note: `@yell/schema` depends on `@yell/core`. Both are installed together when you install schema.

## Usage

### Define Component Schemas

```typescript
import { createSchemaRegistry, registerComponentSchema, validateProps } from '@yell/schema';

const registry = createSchemaRegistry();

registerComponentSchema(registry, {
  name: 'Button',
  version: 'v1',
  description: 'Primary interactive button',
  props: [
    { name: 'label', type: 'string', required: true },
    { name: 'variant', type: 'enum', enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
    { name: 'disabled', type: 'boolean', default: false },
  ],
  events: [
    { name: 'onClick', payload: 'null', description: 'Fires on click' },
  ],
});

registerComponentSchema(registry, {
  name: 'Container',
  description: 'Layout container',
  props: [
    { name: 'layout', type: 'enum', enum: ['stack', 'grid', 'flex', 'columns'] },
    { name: 'gap', type: 'number' },
  ],
  slots: [
    { name: 'default', description: 'Child components' },
  ],
});
```

### Validate Props

```typescript
// Valid props — returns empty array
const errors1 = validateProps('Button', { label: 'Click', variant: 'primary' }, registry);
console.log(errors1); // []

// Invalid prop — returns errors
const errors2 = validateProps('Button', { label: 'Click', variant: 'invalid' }, registry);
console.log(errors2);
// [
//   {
//     path: 'Button.variant',
//     message: 'Invalid value "invalid". Expected one of: primary|secondary|ghost',
//     type: 'invalid_enum',
//     suggestion: 'Use one of: primary, secondary, ghost'
//   }
// ]

// Missing required prop
const errors3 = validateProps('Button', {}, registry);
console.log(errors3);
// [{ path: 'Button.label', message: 'Missing required prop "label"', type: 'missing_required' }]
```

### Generate AI Manifest

```typescript
import { getComponentManifest, buildSystemPromptSection } from '@yell/schema';

const manifest = getComponentManifest(registry);

console.log(manifest);
// {
//   components: [
//     {
//       name: 'Button',
//       version: 'v1',
//       description: 'Primary interactive button',
//       props: [...],
//       events: [{ name: 'onClick', payload: 'null' }]
//     }
//   ]
// }

// Add to AI system prompt
const systemSection = buildSystemPromptSection(manifest);
```

### Use with @yell/ai-adapter

```typescript
import { getComponentManifest } from '@yell/schema';
import { YellAIAdapter } from '@yell/ai-adapter';

const manifest = getComponentManifest(registry);

const adapter = new YellAIAdapter({
  model: 'llama3.2',
  baseURL: 'http://localhost:11434/v1',
});

adapter.appendToSystemPrompt(systemSection);

const result = await adapter.generateYAML({
  prompt: 'Create a login form',
});

if (result.ok) {
  console.log(result.yaml);
}
```

## API

### `createSchemaRegistry(): SchemaRegistry`

Create an empty schema registry.

### `registerComponentSchema(registry, schema)`

Register a component schema.

### `validateProps(type, props, registry): ValidationError[]`

Validate props against a component schema. Returns structured errors.

### `getComponentManifest(registry): ComponentManifest`

Generate a manifest of all registered components for AI systems.

### `buildSystemPromptSection(manifest): string`

Generate a system prompt section from a manifest.

## ValidationError

```typescript
interface ValidationError {
  path: string;      // 'Button.variant'
  message: string;   // Human-readable error
  type: 'unknown_component' | 'invalid_prop' | 'missing_required' | 'invalid_type' | 'invalid_enum';
  suggestion?: string; // Suggested fix
}
```
