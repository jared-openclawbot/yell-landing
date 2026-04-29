# Yell Roadmap — Implementation Guide

## Architecture Decision: Two DSL Models

The project currently has **two different DSL models** that should NOT be mixed in the same file:

### Model A — Page Composition (`app.children`)
Used in `index.html`. Defines a page as a tree of component instances.

```yaml
app:
  children:
    - type: Button
      props:
        label: Click me
        variant: primary
```

**Use for:** Pages, layouts, compositions of existing components.

### Model B — Component Definition (`meta/props/template`)
Used in `playground.html` examples. Defines a reusable component schema.

```yaml
meta:
  version: "1.0"
  description: A configurable button

props:
  label:
    type: string
    default: "Click me"
  variant:
    type: enum
    default: primary
    enum: [primary, secondary, ghost]

template: |
  <button class="yell-btn yell-btn--$props.variant">
    $props.label
  </button>
```

**Use for:** Authoring reusable components (design system components, etc.)

### Rule
**Do not mix Model A and Model B in the same file.** The playground uses Model B for examples (component authoring). The `index.html` uses Model A (page composition). Keep them separate.

---

## Pending Work

### 1. Unify DSL Model
**Priority:** HIGH — prevents confusion and bad DX

Pick one composition model and be consistent. Recommendation:
- Keep `app.children` as the page/instance format
- Migrate playground examples to `app.children` for page-level demos
- Keep `meta/props/template` only for component *authoring* (design system)

### 2. HTML Escape / Security
**Priority:** HIGH — XSS vulnerability

- [x] `escapeAttr()` added to renderer — escapes `& " < >` in data-* attributes
- [ ] Escape text content (not just attributes)
- [ ] Unsafe HTML API — explicit opt-in for `innerHTML`-style rendering with `__html: string` marker
- [ ] Audit all `innerHTML` / `srcdoc` usage in playground and renderer

### 3. Dogfood @yell/core in Playground
**Priority:** MEDIUM — demonstrates the package works

The playground currently has a parallel implementation of rendering. It should:
- Import and use `@yell/core` (or its dist) as the actual renderer
- The playground HTML rendering becomes the "integration test" of the core package
- Requires: `yell-core` builds to a usable UMD/ESM bundle consumable via `<script>` tag

### 4. Real SSR + Hydration + Events Example
**Priority:** MEDIUM — the core thesis of the project

A complete end-to-end example that demonstrates:
```
Prompt → YAML (validated) → SSR HTML → Hydration → Event handler
```

This is the "thing" the project sells. Without it, the thesis is unproven.

### 5. AI Adapter Guardrails
**Priority:** MEDIUM

Current linter blocks are regex-based and easily bypassed. Real guardrails need:
- AST-level validation of YAML (not string matching)
- Block evaluation of expressions (`${}`, `{{}}`, function calls)
- Explicit safe/unsafe API surface

### 6. Schema Validation
**Priority:** LOW — nice to have

Strong Zod schemas for all component props. Currently accepts any prop.

---

## Completed Items

- [x] Design tokens parser (`tokens.ts`) with alias resolution
- [x] HTML minification (`minify.ts`)
- [x] CSRF generator (`security/csrf.ts`)
- [x] JS/CSS bundling (`scripts/bundle.mjs`, `index.min.html`)
- [x] Default design system shipped with package
- [x] Theme toggle (dark/light) with localStorage
- [x] Playground localStorage persistence
- [x] 3 new templates (dashboard, settings-form, pricing-table)
- [x] Template dropdown in playground
- [x] js-yaml parser in index.html (removed fragile parseSimple)
- [x] XSS fix in renderer (escapeAttr)
