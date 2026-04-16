# Server-Side Rendering

Yell is optimized for SSR. Render your YAML to HTML on the server, ship the HTML to the client, and hydrate only the interactive islands.

## Basic SSR

```typescript
import { parseYAML, renderToString, createRegistry, registerComponent } from '@yell/core';

const registry = createRegistry();
registerComponent(registry, 'Button', { component: ButtonComponent });

const yaml = `
app:
  children:
    - type: Button
      props:
        label: "Submit"
`;

const config = parseYAML(yaml);
const { html, hydrationMap } = renderToString(config, registry);

// Send html to client
// Store hydrationMap for client hydration
```

## Streaming SSR

For large pages, use streaming to send HTML progressively:

```typescript
import { createStreamingRenderer } from '@yell/core';

const renderer = createStreamingRenderer(registry);

const stream = renderer.renderToStream(config);

// Write to response incrementally
for await (const chunk of stream) {
  response.write(chunk);
}
```

## Hydration map

The `hydrationMap` returned by `renderToString` tells the client which nodes need hydration:

```typescript
const { html, hydrationMap } = renderToString(config, registry);

// hydrationMap looks like:
// {
//   "yell-0": { type: "Button", events: ["onClick"] },
//   "yell-1": { type: "Modal", events: ["showWhen"] }
// }
```

## Integration with frameworks

### Express

```typescript
import express from 'express';
import { parseYAML, renderToString } from '@yell/core';
import { registry } from './registry';

const app = express();

app.get('/page', (req, res) => {
  const config = parseYAML(req.body.yaml);
  const { html, hydrationMap } = renderToString(config, registry);

  res.send(`
    <!DOCTYPE html>
    <html>
      <body>
        ${html}
        <script>
          window.__HYDRATION_MAP__ = ${JSON.stringify(hydrationMap)};
        </script>
      </body>
    </html>
  `);
});
```

### Next.js App Router

```typescript
import { parseYAML, renderToString } from '@yell/core';
import { registry } from '@/registry';

export default async function Page({ params }) {
  const config = parseYAML(params.yaml);
  const { html, hydrationMap } = renderToString(config, registry);

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      data-hydration-map={JSON.stringify(hydrationMap)}
    />
  );
}
```

## Performance tips

1. **Render non-interactive regions as static HTML** — no JS needed
2. **Mark interactive islands explicitly** — see [Hydration Islands](guides/hydration.html)
3. **Cache rendered HTML** — YAML config doesn't change often
4. **Stream for large pages** — progressive rendering improves TTI

## Next steps

- [Hydration islands](guides/hydration.html)
- [CLI reference](reference/cli.html)