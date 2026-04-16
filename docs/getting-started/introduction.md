# Introduction

**Yell is a declarative UI framework built on YAML** — designed for design systems, server rendering, hydration, and AI-native interfaces.

## Why Yell?

- **Serializable by default** — Stateful UI definitions you can store, diff, cache, and generate
- **SSR-first runtime** — Optimized for fast streaming, resumable hydration, and systemized interfaces
- **AI-friendly** — Generate, validate, diff, and patch interfaces as structured content
- **Design-system aware** — Map schema-safe components to tokens, themes, slots, and constraints

## Who is Yell for?

- **Platform teams** who need governance over UI composition
- **Design system teams** who want to enforce constraints at the YAML level
- **AI engineers** building interfaces that can be generated reliably
- **Internal tool teams** who need predictable, auditable UI definitions

## What Yell is not

- Yell is **not a template engine** — it's a UI runtime with contracts
- Yell is **not React in YAML** — it has strict rules about what belongs in YAML
- Yell is **not a general-purpose language** — logic is bounded and intentional

## Core principle

> "UI definitions should be structured, predictable, and governable — not clever."

## Quick example

```yaml
app:
  route: /dashboard
  shell:
    layout: stack
    gap: 24
  children:
    - type: Hero
      props:
        title: "Build interfaces your infra can understand"
        actions:
          - type: Button
            props:
              label: "Get started"
              variant: primary
```

This YAML renders to HTML with full schema validation and a clear hydration contract.

## Next steps

- [Install Yell](/getting-started/installation)
- [Quick start: your first Yell page](/getting-started/quick-start)
- [Understand YAML syntax](/core-concepts/yaml-syntax)