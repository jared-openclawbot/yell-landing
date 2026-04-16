# @yell/core

The runtime foundation for Yell — parses YAML, manages components, and renders HTML.

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
  renderToString,
} from '@yell/core';

// 1. Create a registry
const registry = createRegistry();

// 2. Register components
registerComponent(registry, 'Button', {
  component: ({ label, variant = 'primary' }) =>
    `<button class="btn btn-${variant}">${label}</button>`,
});

registerComponent(registry, 'Text', {
  component: ({ content, size = 'md' }) =>
    `<span class="text-${size}">${content}</span>`,
});

// 3. Parse YAML
const yaml = `
app:
  children:
    - type: Text
      props:
        content: Hello World
    - type: Button
      props:
        label: Click me
`;

const config = parseYAML(yaml);

// 4. Render to HTML
const { html, hydrationMap } = renderToString(config, registry);
console.log(html);
```

## Design Tokens

Reference design tokens in props:

```typescript
const config = parseYAML(`
tokens:
  colors:
    primary: '#ff8a3d'
app:
  children:
    - type: Button
      props:
        backgroundColor: $tokens.colors.primary
`);

const { html } = renderToString(config, registry);
```

## Hydration

The hydration map tells the client which nodes need JavaScript:

```typescript
const { html, hydrationMap } = renderToString(config, registry);

// Send to client
// <script>window.__HYDRATION_MAP__ = ${JSON.stringify(hydrationMap)}</script>
```

## API

### `parseYAML(yaml: string): YellConfig`

Parse YAML string into a YellConfig object.

### `createRegistry(): ComponentRegistry`

Create an empty component registry.

### `registerComponent(registry, type, definition)`

Register a component type.

### `renderToString(config, registry, options): SSRRenderResult`

Render to HTML string with hydration map.

## Types

```typescript
interface YellConfig {
  tokens?: TokenMap;
  app?: {
    route?: string;
    shell?: YellNode;
    children?: YellNode[];
  };
}

interface YellNode {
  type: string;
  props?: Record<string, unknown>;
  children?: YellNode[];
  slots?: Record<string, YellNode[]>;
}
```

See [docs](docs/) for full reference.
