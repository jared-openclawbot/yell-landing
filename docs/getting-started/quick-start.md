# Quick Start

Build a complete Yell page in 5 minutes.

## 1. Create a YAML file

Create `app.yell.yaml`:

```yaml
app:
  route: /hello
  shell:
    layout: stack
    gap: 16
  children:
    - type: Text
      props:
        content: "Hello, Yell!"
        size: lg
    - type: Button
      props:
        label: "Click me"
        variant: primary
```

## 2. Create a registry

```typescript
import { createRegistry, registerComponent } from '@yell/core';

// Create registry
const registry = createRegistry();

// Register primitives
registerComponent(registry, 'Text', {
  component: ({ content, size }) => `<span class="text-${size}">${content}</span>`
});

registerComponent(registry, 'Button', {
  component: ({ label, variant }) => `<button class="btn-${variant}">${label}</button>`
});

export { registry };
```

## 3. Parse and render

```typescript
import { parseYAML, renderToString } from '@yell/core';
import { registry } from './registry';

const yaml = `
app:
  route: /hello
  children:
    - type: Text
      props:
        content: "Hello, Yell!"
`;

const config = parseYAML(yaml);
const { html, hydrationMap } = renderToString(config, registry);

console.log(html);
// <div id="yell-0"><span class="text-lg">Hello, Yell!</span></div>
```

## 4. Add interactivity (optional)

```yaml
- type: Button
  props:
    label: "Click me"
    onClick: handleClick  # Reference, not inline function
```

On the client, hydrate and attach the handler:

```typescript
import { hydrate } from '@yell/core';

hydrate({
  registry,
  hydrationMap,
  events: {
    handleClick: () => alert('clicked!')
  }
});
```

## 5. Run the example

```bash
node --loader ts-node/esm app.ts
```

## Next steps

- [Understand YAML syntax](/core-concepts/yaml-syntax.html)
- [Learn about components](/core-concepts/components.html)
- [Add expressions](/core-concepts/expressions.html)