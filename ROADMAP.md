# Yell Roadmap

## Current State

**Playground is live and functional** at:
👉 https://jared-openclawbot.github.io/yell-landing/playground.html

The playground uses an **inline bundle** (`playground.bundle.js`, ~9KB minified) — no CDN dependency, works on GitHub Pages.

---

## Completed ✓

### Core Runtime
- [x] `parseYAML()` — YAML → YellConfig (app.children model)
- [x] `createRegistry()` — component registry
- [x] `registerComponent()` / `getComponent()` — component registration
- [x] `renderToString()` — SSR renderer with hydration map
- [x] `escapeAttr()` / `escapeText()` — XSS protection

### Design System
- [x] Design tokens with alias resolution (`$tokens.primary`)
- [x] `tokensAsCSS()` / `tokensAsMap()` — token export
- [x] `loadDesignSystem()` — load/validate design configs
- [x] CSS variable injection in renderer output

### Security
- [x] CSRF generator (`generateCSRFToken`, `validateCSRFToken`)
- [x] Signed tokens (`generateSignedToken`, `validateSignedToken`)
- [x] `escapeAttr` on all data-* attributes
- [x] Text content escaping in built-in components

### Bundling & Deployment
- [x] `playground.bundle.js` — inline core (~9KB minified, 71% smaller than source)
- [x] `bundle:playground` script — rebuilds bundle with `bun run`
- [x] GitHub Pages deployment (playground.html + playground.bundle.js committed)
- [x] All scripts migrated to bun (`bun run build`, etc.)
- [x] `index.min.html` — minified landing page
- [x] `pre-push` hook — blocks push if `bun run test` fails (local `.git/hooks/pre-push`)

### Playground UX
- [x] LocalStorage persistence (editor content survives reload)
- [x] Share URL (base64 hash, copy-to-clipboard)
- [x] Template examples: Button, Form, Card, Layout, Components, Dashboard, Settings, Pricing, GitHub Repos
- [x] Template dropdown selector
- [x] GitHub repos fetcher (live data from API)
- [x] Validation errors panel
- [x] Status dot (ok/error/warn/loading)
- [x] Mobile layout (stacked, preview/diff toggle)
- [x] href="#" → javascript:void(0) (prevents page navigation)
- [x] Preview wrapper (.page) with gap 32px for vertical spacing

---

## In Progress

### AI Adapter (`@yell/ai-adapter`)
- AST-level YAML validation (not regex)
- Block `${}` and `{{}}` expressions
- Guardrails for prompt → YAML generation

---

## Pending

### High Priority

1. **Real SSR + Hydration Example** — end-to-end proof of concept
   ```
   YAML → SSR HTML → browser hydration → events work
   ```
   Current renderer produces HTML, but hydration map isn't wired to actual DOM event attachment.

2. **Unified DSL** — current playground examples mix patterns
   - `app.children` for page composition ✓
   - But some examples still use `meta/props/template` model
   - Should pick one and be consistent

3. **Schema Validation** — Zod schemas for all built-in component props
   - Currently accepts any props, no type enforcement
   - Would catch `type: typo` → "Unknown type" at parse time

### Medium Priority

4. **Publish to npm** — `@yell/core` not available on registry
   - Currently only usable as local monorepo package
   - jsDelivr import not possible without npm publish

5. **Design Token Editor** — visual tool to create/edit token sets

6. **Diff View Improvements** — color-coded line-by-line YAML→HTML diff

### Low Priority

7. **Dark/light theme toggle** in playground (vs only on index.html)

8. **Prop autocomplete** in CodeMirror (YAML schema hints)

---

## Package Index

| Package | Status | Location |
|---------|--------|----------|
| `@yell/core` | ✓ Stable | `packages/yell-core/` |
| `@yell/schema` | ✓ Built | `packages/yell-schema/` |
| `@yell/ai-adapter` | 🔨 In progress | `packages/yell-ai-adapter/` |
| `@yell/linter` | ✓ Built | `packages/yell-linter/` |

---

## Scripts Reference

```bash
bun run build              # Build all workspaces
bun run build:core         # Build @yell/core
bun run bundle:playground  # Rebuild playground.bundle.js
bun run bundle:all         # index.min.html + playground bundle
bun run test               # Run all tests
```