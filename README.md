# Yell — Declarative UI for the Serializable Web

**Yell** is a declarative UI framework built on YAML. It's designed for design systems, server rendering, hydration, and AI-native interfaces.

## Why Yell?

- **Serializable by default** — UI definitions you can store, diff, cache, and generate
- **SSR-first** — Optimized for streaming, resumable hydration
- **AI-friendly** — Generate, validate, diff, and patch interfaces as structured content
- **Design-system aware** — Map schema-safe components to tokens, themes, slots, and constraints

## Live Playground

👉 **[Playground](https://jared-openclawbot.github.io/yell-landing/playground.html)**

Write YAML, see the rendered HTML instantly. Try the built-in component examples:
Button, Form, Card, Layout, Dashboard, Pricing, GitHub Repos, and more.

## Packages

Yell is organized as a monorepo. Each package is independent but they compose together:

| Package | Description |
|---------|-------------|
| [`@yell/core`](packages/yell-core) | Runtime: YAML parser, component registry, SSR renderer |
| [`@yell/schema`](packages/yell-schema) | Validation: component contracts, prop schemas, AI manifests |
| [`@yell/ai-adapter`](packages/yell-ai-adapter) | AI generation: prompt → valid YAML with guardrails |

## Quick Start

```bash
# Clone and install
git clone https://github.com/jared-openclawbot/yell-landing.git
cd yell-landing
bun install

# Build all packages
bun run build
```

```typescript
import { parseYAML, createRegistry, registerComponent, renderToString } from '@yell/core';

const registry = createRegistry();

registerComponent(registry, 'Button', {
  component: ({ label }) => `<button>${label}</button>`,
});

const yaml = `
app:
  children:
    - type: Button
      props:
        label: Click me
`;

const config = parseYAML(yaml);
const { html } = renderToString(config, registry);
```

## Built-in Components

The playground ships with these ready-to-use components:

| Component | Description |
|-----------|-------------|
| `Text` | Text content with variants: `h1`, `h2`, `h3`, `p` |
| `Button` | Button with variants: `primary`, `secondary`, `ghost` |
| `Container` | Layout container with `layout`: `stack`, `grid`, `row` |
| `Input` | Text input with `name`, `type`, `placeholder` |
| `Card` | Card with `title`, `description`, `badge`, `price` |
| `Form` | Form wrapper (supports CSRF) |
| `Field` | Form field with `label`, `name`, `type`, `default` |
| `Header` | Header with `logo` text |
| `Sidebar` | Sidebar with `items` (JSON array) |
| `Modal` | Modal dialog with `label`, `body` |
| `StatCard` | Stats display with `label`, `value` |
| `PricingCard` | Pricing tier with `tier`, `price`, `features` (JSON array) |
| `RepoCard` | GitHub repo card with `name`, `description`, `url`, `stars`, `language` |

## Architecture

```
@yell/core (foundation)
    ↓
@yell/schema (optional)
    ↓
@yell/ai-adapter (optional)
```

- **`@yell/core`** is the foundation. All other packages depend on it.
- **`@yell/schema`** adds validation on top of core. Use when you need strict prop contracts.
- **`@yell/ai-adapter`** adds AI generation on top of core + schema. Use when building AI-powered UIs.

## Development

```bash
# Build all packages
bun run build

# Build specific package
bun run build:core
bun run build:schema
bun run build:ai-adapter

# Bundle playground (inline core, no CDN needed)
bun run bundle:playground

# Run tests
bun run test

# Full bundle (index.min.html + playground.bundle.js)
bun run bundle:all
```

## Resources

- [Documentation](docs/) — full docs (Mintlify)
- [Playground](https://jared-openclawbot.github.io/yell-landing/playground.html) — interactive demo
- [GitHub](https://github.com/jared-openclawbot/yell-landing) — source code