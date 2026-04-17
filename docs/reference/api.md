# API Reference

## Core functions

### `parseYAML(yaml: string): YellConfig`

Parse a YAML string into a YellConfig object.

```typescript
import { parseYAML } from '@yell/core';

const config = parseYAML(`
app:
  children:
    - type: Button
      props:
        label: Click me
`);

console.log(config.app.children[0].type); // "Button"
```

### `createRegistry(): ComponentRegistry`

Create an empty component registry.

```typescript
import { createRegistry } from '@yell/core';

const registry = createRegistry();
```

### `registerComponent(registry, type, definition)`

Register a component type.

```typescript
import { createRegistry, registerComponent } from '@yell/core';

const registry = createRegistry();

registerComponent(registry, 'Button', {
  component: ButtonComponent,
  schema: z.object({ label: z.string() }),
});
```

### `renderToString(config, registry, options): SSRRenderResult`

Render a YellConfig to HTML string.

```typescript
import { parseYAML, renderToString } from '@yell/core';

const config = parseYAML(yaml);
const { html, hydrationMap } = renderToString(config, registry, {
  pretty: true,
});
```

Returns:

```typescript
{
  html: string;       // Rendered HTML
  hydrationMap: {     // Map of node IDs to hydration data
    [nodeId: string]: {
      type: string;
      events: string[];
    }
  }
}
```

### `validateConfig(config, registry): ValidationError[]`

Validate a YellConfig against a registry.

```typescript
const errors = validateConfig(config, registry);

if (errors.length > 0) {
  console.log('Validation failed:', errors);
}
```

Returns an array of error objects:

```typescript
{
  path: string;      // Path to the invalid node
  message: string;  // Human-readable error
  type: string;     // Error type (unknown_component, invalid_prop, etc.)
}
```

## Registry functions

### `getComponent(registry, type): ComponentDef | undefined`

Get a component definition by type.

```typescript
const def = getComponent(registry, 'Button');
if (def) {
  console.log(def.schema);
}
```

### `isRegistered(registry, type): boolean`

Check if a type is registered.

```typescript
if (isRegistered(registry, 'Modal')) {
  // safe to use
}
```

### `getRegisteredTypes(registry): string[]`

Get all registered type names.

```typescript
const types = getRegisteredTypes(registry);
console.log(`Registry has ${types.length} components`);
```

### `findUnregisteredTypes(registry, nodes): string[]`

Find types used in nodes that aren't in the registry.

```typescript
const nodes = flattenConfig(config);
const unknown = findUnregisteredTypes(registry, nodes);
if (unknown.length > 0) {
  console.log('Unknown types:', unknown);
}
```

## Hydration functions

### `hydrate(options)`

Hydrate the page from a hydration map.

```typescript
import { hydrate } from '@yell/core';

hydrate({
  registry,
  hydrationMap: window.__HYDRATION_MAP__,
  events: {
    handleClick: () => alert('clicked!'),
  },
});
```

### `hydrateIslands(options)`

Hydrate only islands marked with `hydrate: true`.

```typescript
import { hydrateIslands } from '@yell/core';

hydrateIslands({
  registry,
  hydrationMap: window.__HYDRATION_MAP__,
  events: {
    handleSubmit: handleFormSubmit,
    handleChange: handleInputChange,
  },
});
```

### `createStreamingRenderer(registry)`

Create a streaming SSR renderer.

```typescript
import { createStreamingRenderer } from '@yell/core';

const renderer = createStreamingRenderer(registry);

const stream = renderer.renderToStream(config);

for await (const chunk of stream) {
  res.write(chunk);
}
```

## Token functions

### `loadTokens(pathOrEnv): TokenMap`

Load design tokens from a file or environment.

```typescript
import { loadTokens } from '@yell/core';

const tokens = loadTokens('./tokens.yaml');
const tokens = loadTokens('prod'); // Loads tokens.prod.yaml
```

### `resolveToken(tokens, ref): string | number`

Resolve a token reference to its value.

```typescript
import { resolveToken } from '@yell/core';

const value = resolveToken(tokens, '$tokens.colors.primary');
console.log(value); // "#ff8a3d"
```

## Types

```typescript
interface YellConfig {
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

interface ComponentDef {
  type: string;
  component: unknown;
  schema?: unknown;
}

interface SSRRenderOptions {
  registry: ComponentRegistry;
  pretty?: boolean;
}

interface SSRRenderResult {
  html: string;
  hydrationMap: HydrationMap;
}

interface HydrationMap {
  [nodeId: string]: {
    type: string;
    events: string[];
  };
}
```

## Next steps

- [Quick start](/yell-landing/docs/getting-started/quick-start.html)
- [SSR guide](/yell-landing/docs/guides/ssr.html)
- [Hydration guide](/yell-landing/docs/guides/hydration.html)