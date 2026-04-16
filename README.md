# Yell — Declarative UI for the Serializable Web

**Yell** is a declarative UI framework built on YAML. It's designed for design systems, server rendering, hydration, and AI-native interfaces.

## Why Yell?

- **Serializable by default** — UI definitions you can store, diff, cache, and generate
- **SSR-first** — Optimized for streaming, resumable hydration
- **AI-friendly** — Generate, validate, diff, and patch interfaces as structured content
- **Design-system aware** — Map schema-safe components to tokens, themes, slots, and constraints

## Packages

Yell is organized as a monorepo. Each package is independent but they compose together:

| Package | Description |
|---------|-------------|
| [`@yell/core`](packages/yell-core) | Runtime: YAML parser, component registry, SSR renderer |
| [`@yell/schema`](packages/yell-schema) | Validation: component contracts, prop schemas, AI manifests |
| [`@yell/ai-adapter`](packages/yell-ai-adapter) | AI generation: prompt → valid YAML with guardrails |

## Quick Start

```bash
npm install @yell/core
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

## Architecture

```
@yell/core (required)
    ↓
@yell/schema (optional, needs core)
    ↓
@yell/ai-adapter (optional, needs core + schema)
```

- **`@yell/core`** is the foundation. All other packages depend on it.
- **`@yell/schema`** adds validation on top of core. Use when you need strict prop contracts.
- **`@yell/ai-adapter`** adds AI generation on top of core + schema. Use when building AI-powered UIs.

## When to Use Each Package

### Use only `@yell/core` when:
- You want a lightweight YAML runtime
- Your components are well-known and don't need validation
- You're building server-rendered pages with simple hydration

### Add `@yell/schema` when:
- You need to validate props at runtime
- You want AI agents to understand your component contracts
- You're building a design system consumed by multiple teams

### Add `@yell/ai-adapter` when:
- You want AI to generate YAML from natural language
- You need guardrails to prevent AI from generating invalid YAML
- You're building AI-first interfaces

## Development

```bash
# Install all dependencies
npm ci

# Build all packages
npm run build

# Build a specific package
npm run build -w @yell/core
npm run build -w @yell/schema
npm run build -w @yell/ai-adapter

# Run tests
npm test
```

## Resources

- [Documentation](docs/)
- [Playground](docs/guides/playground.md)
- [Contributing](.github/CONTRIBUTING.md)
