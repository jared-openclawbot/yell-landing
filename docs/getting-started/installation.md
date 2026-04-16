# Installation

## Package manager

Install `@yell/core` via npm, yarn, or pnpm:

```bash
npm install @yell/core
```

```bash
yarn add @yell/core
```

```bash
pnpm add @yell/core
```

## Requirements

- Node.js 18+ (ESM support required)
- A component registry (create your own or use presets)

## CDN (quick prototype)

For quick prototypes, you can use the CDN build:

```html
<script type="module">
  import { parseYAML, createRegistry } from 'https://esm.sh/@yell/core';
</script>
```

## Verify installation

```bash
node --version  # Should be 18 or higher
npx yell --version  # Should output 0.1.0 or higher
```

## TypeScript

Yell is written in TypeScript. Add it to your project:

```bash
npm install --save-dev typescript @types/node
```

```typescript
import { parseYAML, createRegistry } from '@yell/core';
import type { YellConfig, ComponentRegistry } from '@yell/core';
```

## Next steps

- [Quick start](getting-started/quick-start.html) — render your first YAML
- [Create a component registry](core-concepts/components.html)