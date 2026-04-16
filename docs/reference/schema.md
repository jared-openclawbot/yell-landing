# Schema Validation

> Schema validation ensures that components receive the correct props according to their type definitions.

## Overview

The `@yell/schema` package provides a schema registry where each component can define a typed contract. Props are validated at parse time, before any rendering occurs.

## Installation

```bash
npm install @yell/schema
```

## Usage

```typescript
import { createSchemaRegistry, registerComponentSchema, validateProps } from '@yell/schema';

const registry = createSchemaRegistry();

// Register a component schema
registerComponentSchema(registry, {
  name: 'Button',
  version: 'v1',
  props: [
    { name: 'label', type: 'string', required: true },
    { name: 'variant', type: 'enum', enum: ['primary', 'secondary', 'ghost'], default: 'primary' },
    { name: 'disabled', type: 'boolean', default: false },
  ],
});

// Validate props
const errors = validateProps('Button', { label: 'Click' }, registry);
if (errors.length > 0) {
  console.error(errors);
}
```

## Schema Format

```typescript
{
  name: string;           // Component name (e.g., 'Button')
  version?: string;      // Optional version (e.g., 'v1', 'v2')
  description?: string;  // Human-readable description
  props: PropSchema[];
  events?: EventSchema[];
}

interface PropSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'node';
  required?: boolean;
  default?: unknown;
  enum?: string[];       // For type: 'enum'
  description?: string;  // For AI generation hints
}
```

## Validation Errors

The validator returns structured errors:

```typescript
interface ValidationError {
  type: 'missing_required' | 'invalid_type' | 'invalid_enum' | 'unknown_component' | 'invalid_prop';
  path: string;          // e.g., 'Button.props.variant'
  message: string;
  suggestion?: string;   // For enum errors, includes valid options
}
```

## Building System Prompts

Use `buildSystemPromptSection()` to generate a component manifest for AI prompts:

```typescript
import { getComponentManifest, buildSystemPromptSection } from '@yell/schema';

const manifest = getComponentManifest(registry);
const section = buildSystemPromptSection(manifest);
```

## See also

- [Components](/core-concepts/components.html)
- [CLI Reference](/reference/cli.html)
- [Quick Start](/getting-started/quick-start.html)