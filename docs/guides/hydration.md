# Hydration Islands

Yell supports selective hydration — only interactive regions load JavaScript, everything else stays static.

## The problem with full hydration

React hydrates the entire page on the client. Even if 90% of your page is static content, the client must download and execute all the JS for all components.

```
┌─────────────────────────────────────┐
│ Hero (static text, images)          │ ← No JS needed
├─────────────────────────────────────┤
│ Feature Cards (static)             │ ← No JS needed
├─────────────────────────────────────┤
│ Interactive Form (buttons, inputs) │ ← JS REQUIRED
└─────────────────────────────────────┘
```

Full hydration = downloading JS for content that never changes.

## Yell's solution: explicit islands

Mark interactive regions with `hydrate: true`:

```yaml
app:
  children:
    - type: Hero              # Static — rendered as plain HTML
      props:
        title: "Welcome"
        subtitle: "Get started"

    - type: Form              # Interactive — will be hydrated
      hydrate: true
      children:
        - type: Input
          bind:
            value: form.email
            onChange: form.email = $event
        - type: Button
          onClick: handleSubmit
```

## How it works

### Server-side

SSR marks islands in the HTML:

```html
<!-- Static region -->
<div class="hero">
  <h1>Welcome</h1>
</div>

<!-- Island -->
<yell-component id="yell-1" data-yell-hydrate="true" data-yell-type="Form">
  <input />
  <button>Submit</button>
</yell-component>
```

### Client-side

The Yell runtime only hydrates nodes marked with `data-yell-hydrate="true"`:

```typescript
import { hydrateIslands } from '@yell/core';

hydrateIslands({
  registry,
  hydrationMap,
  events: {
    handleSubmit: () => console.log('submitted!')
  }
});
```

Static regions remain as plain HTML — no JS executed, no event listeners attached.

## Benefits

1. **Faster TTI** — Less JS to download and parse
2. **Lower memory** — No virtual DOM for static content
3. **Better caching** — Static HTML can be cached forever
4. **Graceful degradation** — Static regions work without JS

## Island composition

Islands can contain other components:

```yaml
- type: Modal
  hydrate: true
  slots:
    header:
      - type: Text
        props:
          content: "Confirm"
    body:
      - type: Button
        onClick: handleConfirm
```

Only the root island is hydrated — its children inherit the hydration context.

## Nested islands

For nested interactivity, mark each interactive boundary:

```yaml
- type: Dashboard
  hydrate: true        # Dashboard island
  children:
    - type: Chart       # Static within island — no extra JS
      props:
        data: $state.chartData
    - type: FilterPanel
      hydrate: true     # Nested island — has its own interactivity
      children:
        - type: Select
          onChange: handleFilterChange
```

## Guidelines

### Mark islands sparingly

Not every interactive element needs to be an island. Use islands for:
- Forms with multiple inputs
- Modal dialogs
- Complex stateful components
- Real-time data displays

Don't mark as islands:
- Single buttons (click handler)
- Simple toggles
- Static content with one event

### Keep islands small

Large islands = more JS to hydrate. Split large interactive regions at natural boundaries (tabs, modals, panels).

## Next steps

- [SSR guide](/guides/ssr)
- [Linter rules](/guides/linter)
- [Schema validation](/reference/schema)