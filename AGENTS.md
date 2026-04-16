# AGENTS.md — Guide for AI Agents

> If you're an AI assistant working with this codebase, read this first.

## What is Yell?

Yell is a declarative, schema-driven UI framework where interfaces are defined in **YAML** instead of JSX. Instead of writing React components, you write YAML that describes the structure, props, and behavior of a UI — and Yell's runtime renders it.

```yaml
app:
  children:
    - type: Button
      props:
        label: "Submit"
        variant: primary
      onClick: handleSubmit
```

## Why Yell?

- **For AI generation**: YAML is far easier for LLMs to produce correctly than JSX — no syntax drift, no forgotten closing tags, structure is guaranteed
- **For governance**: All components are typed, versioned, and validated. You can't generate arbitrary HTML
- **For platform teams**: A single source of truth for the design system that both humans and AI respect

## Project Structure

```
yell-landing/
├── packages/
│   ├── yell-core/         # Runtime: YAML parser, registry, SSR renderer
│   ├── yell-schema/       # Schema registry, prop validators, component manifests
│   ├── yell-ai-adapter/  # AI integration: guardrails, YAML extraction, generation
│   └── yell-linter/       # Anti-pattern linter for YAML
├── docs/                  # Mintlify documentation site
└── index.html            # Demo landing page
```

## Key Concepts

### Components

Components are registered in the Yell registry with a name, optional props schema, and a render function. When Yell parses a YAML node with `type: Button`, it looks up `Button` in the registry and calls its render function.

### Props

Props flow from the YAML node into the component's render function. Props are validated against the schema if one is registered.

### Event Handlers

Event handlers (onClick, onChange, etc.) are **references** — string names that the client hydration layer maps to real functions. **Never inline a function in YAML.**

```yaml
# ✅ Correct
- type: Button
  onClick: handleSubmit

# ❌ Wrong — inline functions are blocked by the linter
- type: Button
  onClick: () => setCount(count + 1)
```

### Design Tokens

Design tokens are defined in the `tokens` section and referenced with `$tokens.path.to.value`.

```yaml
tokens:
  colors:
    brand: '#ff8a3d'
app:
  children:
    - type: Button
      style: 'color: $tokens.colors.brand'
```

### Conditional Visibility

Use `showWhen` to conditionally render a node. The expression is evaluated against the runtime context.

```yaml
- type: Modal
  showWhen: isOpen == true
- type: AdminPanel
  showWhen: user.role == 'admin'
```

### Children

Components that act as containers can have nested `children`:

```yaml
- type: Container
  layout: stack
  gap: 16
  children:
    - type: Text
      props:
        content: "Hello"
    - type: Button
      props:
        label: "Click"
```

## Working with Yell as an AI

### Generating YAML

When asked to generate a Yell interface:
1. Start from the app node, define your top-level structure
2. Add components with their types and props
3. Use `showWhen` for conditionals, `children` for nesting
4. Reference design tokens instead of hardcoded values
5. Use event handler references, never inline functions
6. Validate your output against the component schema

### Using the AI Adapter

```typescript
import { YellAIAdapter } from '@yell/ai-adapter';

const adapter = new YellAIAdapter(schemaRegistry);
const yaml = await adapter.generateYAML(
  'Create a login form with email and password fields'
);
```

### Using the Linter

```typescript
import { lint } from '@yell/linter';

const result = lint(yamlString);
if (!result.ok) {
  console.error(result.errors);
}
```

### Using the Schema Validator

```typescript
import { validateProps } from '@yell/schema';

const errors = validateProps('Button', { label: 'Click' }, schemaRegistry);
if (errors.length > 0) {
  console.error(errors);
}
```

## Rules

1. **No inline functions** — Event handlers must be named references
2. **No ternary expressions** — Use `showWhen` conditionals instead
3. **No function calls in expressions** — Precompute values in handlers
4. **Max nesting depth: 5** — Warn if exceeded
5. **Max expression length: 100 chars** — Warn if exceeded

## Supported Component Types

See the component manifest in `@yell/schema` for the full list of registered components and their allowed props.

## Common Patterns

### Layouts (Stack, Grid, Row)

```yaml
- type: Container
  layout: stack
  gap: 24
  children:
    - type: Text
      props:
        content: "Section title"
    - type: Card
      props:
        title: "Card title"
```

### Forms

```yaml
- type: Form
  onSubmit: handleSubmit
  children:
    - type: Input
      props:
        name: email
        placeholder: "email@example.com"
    - type: Input
      props:
        name: password
        type: password
    - type: Button
      props:
        label: "Submit"
```

### Conditional Rendering

```yaml
- type: Modal
  showWhen: isOpen == true
- type: ErrorMessage
  showWhen: hasError == true
- type: LoadingSpinner
  showWhen: isLoading
```