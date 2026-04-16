# @yell/core

Declarative UI runtime for YAML-defined interfaces.

## Install

```bash
npm install @yell/core
```

## Usage

```typescript
import { 
  parseYAML, 
  createRegistry, 
  registerComponent, 
  renderToString 
} from '@yell/core';

// Define your design system components
const registry = createRegistry();

registerComponent(registry, 'Button', {
  component: MyButton,
  schema: z.object({
    label: z.string(),
    variant: z.enum(['primary', 'secondary']).optional(),
  }),
});

// Parse YAML from any source
const yaml = `
app:
  route: /dashboard
  children:
    - type: Button
      props:
        label: Click me
        variant: primary
`;

const config = parseYAML(yaml);

// Server-side render to HTML with hydration map
const { html, hydrationMap } = renderToString(config, registry);

// On client: hydrate using hydrationMap
```

## API

### `parseYAML(yaml: string): YellConfig`
Parse a YAML string into a YellConfig object.

### `createRegistry(): ComponentRegistry`
Create an empty component registry.

### `registerComponent(registry, type, definition)`
Register a component type in the registry.

### `renderToString(config, registry, options): SSRRenderResult`
Render a YellConfig to HTML string with hydration map.

## YAML Syntax

```yaml
app:
  route: /path
  shell:
    layout: stack
    gap: 24
  children:
    - type: Hero
      props:
        title: Hello World
        actions:
          - type: Button
            props:
              label: Get Started
              variant: primary
```

## Roadmap

- [x] YAML parser
- [x] Component registry
- [x] SSR renderer
- [ ] Zod schema validation
- [ ] Client-side hydration runtime
- [ ] Design system adapter

See [issues](https://github.com/jared-openclawbot/yell-landing/issues) for details.