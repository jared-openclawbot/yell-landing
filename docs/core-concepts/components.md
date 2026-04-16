# Components

Components are the building blocks of Yell. Each component has a type, a schema (prop contract), and a render implementation.

## Registry

The component registry maps type strings to component definitions:

```typescript
import { createRegistry, registerComponent } from '@yell/core';

const registry = createRegistry();

registerComponent(registry, 'Button', {
  component: ButtonComponent,
  schema: z.object({
    label: z.string(),
    variant: z.enum(['primary', 'secondary', 'ghost']).optional(),
    disabled: z.boolean().optional(),
  }),
});
```

## Registering components

### Basic component

```typescript
import type { ComponentDef } from '@yell/core';

registerComponent(registry, 'Text', {
  component: ({ content, size }) => {
    return `<span class="text-${size}">${content}</span>`;
  }
});
```

### With schema validation

```typescript
import { z } from 'zod';

registerComponent(registry, 'Button', {
  component: ButtonComponent,
  schema: z.object({
    label: z.string().min(1),
    variant: z.enum(['primary', 'secondary']).default('primary'),
    disabled: z.boolean().default(false),
    onClick: z.string().optional(), // Event handler reference
  }),
});
```

### With slots

```typescript
registerComponent(registry, 'Modal', {
  component: ({ children, slots }) => {
    const header = slots.header?.map(r => r.html).join('') || '';
    const body = slots.body?.map(r => r.html).join('') || '';
    return `<div class="modal">
      <div class="modal-header">${header}</div>
      <div class="modal-body">${body}</div>
    </div>`;
  },
  slots: ['header', 'body']
});
```

## Built-in primitive components

Yell provides a set of built-in primitives:

### Text

```yaml
- type: Text
  props:
    content: "Hello world"
    size: lg
    color: $tokens.text.primary
```

### Container

```yaml
- type: Container
  props:
    layout: stack
    gap: 24
    padding: 16
```

### Button

```yaml
- type: Button
  props:
    label: "Submit"
    variant: primary
    disabled: false
    onClick: handleSubmit
```

### Input

```yaml
- type: Input
  props:
    placeholder: "Enter text"
    type: text
    bind:
      value: form.name
      onChange: form.name = $event
```

## Creating your own component

### 1. Define the schema

```typescript
import { z } from 'zod';

const FeatureCardSchema = z.object({
  title: z.string(),
  body: z.string(),
  icon: z.string().optional(),
  variant: z.enum(['default', 'highlighted']).default('default'),
});
```

### 2. Create the render function

```typescript
const FeatureCardRenderer = (props: z.infer<typeof FeatureCardSchema>) => {
  const { title, body, icon, variant } = props;
  return `
    <div class="feature-card feature-card-${variant}">
      ${icon ? `<div class="feature-icon">${icon}</div>` : ''}
      <h3>${title}</h3>
      <p>${body}</p>
    </div>
  `;
};
```

### 3. Register

```typescript
registerComponent(registry, 'FeatureCard', {
  component: FeatureCardRenderer,
  schema: FeatureCardSchema,
});
```

### 4. Use in YAML

```yaml
- type: FeatureCard
  props:
    title: "Fast rendering"
    body: "Yell renders your UI at lightning speed"
    icon: "⚡"
    variant: highlighted
```

## Versioning components

Register multiple versions:

```typescript
registerComponent(registry, 'Button@v1', {
  component: ButtonV1,
  schema: ButtonV1Schema,
});

registerComponent(registry, 'Button@v2', {
  component: ButtonV2,
  schema: ButtonV2Schema,
});
```

Use specific version in YAML:

```yaml
- type: Button@v2
  props:
    label: "New button"
```

## Next steps

- [Expressions](/docs/core-concepts/expressions.html)
- [Design tokens](/docs/core-concepts/tokens.html)
- [Schema validation](/docs/reference/schema.html)