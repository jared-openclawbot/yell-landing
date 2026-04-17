# AI-Generated YAML

Yell's structured format makes it ideal for AI generation. This guide covers how to prompt AI to generate valid Yell YAML and how to integrate an AI adapter into your workflow.

## Why AI + Yell?

AI can generate UI from natural language, but JSX is ad-hoc and unpredictable:

```
Prompt: "Create a login form"
AI returns: JSX blob (may have syntax errors, unknown components, inline logic)
```

Yell makes AI generation reliable:

```
Prompt: "Create a login form"
AI returns: Valid YAML with known components, bounded expressions, no inline functions
```

## The Yell AI Adapter

The adapter is a pipeline that:
1. Takes a natural language prompt
2. Generates YAML using the component registry as constraints
3. Validates the YAML against schemas
4. Returns valid YAML or structured errors

```typescript
import { YellAIAdapter } from '@yell/ai-adapter';

const adapter = new YellAIAdapter({
  registry,
  tokens,
  model: 'claude-3-5-sonnet',
});

const result = await adapter.generateYAML({
  prompt: 'Create a login page with email and password fields',
});

if (result.errors) {
  // Handle validation errors
  console.log('Fix these issues:', result.errors);
} else {
  // Use the valid YAML
  console.log(result.yaml);
}
```

## Designing prompts for Yell

### Good prompt structure

```
"Create a [component type] with [properties]. 
The component should use these design tokens: [tokens].
Do not use: inline functions, complex expressions, mutations."
```

### Example prompts

```
✅ Good: "Create a dashboard with a header, 3 feature cards, and a CTA button. Use $tokens.primary for buttons. No inline onClick handlers."

❌ Bad: "Make a cool dashboard with buttons that do stuff"
```

## Validation rules for AI output

The adapter enforces these rules on generated YAML:

1. **Only registered components** — AI can only use types in the registry
2. **Schema-valid props** — props must match component schemas
3. **No inline functions** — `onClick` must be a reference, not `() => ...`
4. **Bounded expressions** — `showWhen` can only use `==, !=, &&, ||, !, >, <`
5. **Max nesting depth** — 5 levels max (prevents deeply nested YAML)

## Integration example

```typescript
import { YellAIAdapter } from '@yell/ai-adapter';
import { parseYAML, renderToString, createRegistry } from '@yell/core';

const registry = createRegistry();
// ... register components

const adapter = new YellAIAdapter({
  registry,
  tokens: loadTokens('prod'),
  model: 'claude-3-5-sonnet',
});

async function handleUserRequest(prompt: string) {
  const result = await adapter.generateYAML({ prompt });

  if (result.errors) {
    return {
      ok: false,
      errors: result.errors,
      suggestion: result.suggestion,
    };
  }

  const config = parseYAML(result.yaml);
  const { html, hydrationMap } = renderToString(config, registry);

  return {
    ok: true,
    html,
    hydrationMap,
    metadata: result.metadata,
  };
}
```

## Building AI guardrails

The adapter uses these guardrails to ensure valid output:

### 1. Component whitelist

Only types in the registry can be generated:

```typescript
function generateWithWhitelist(prompt, registry) {
  const allowedTypes = getRegisteredTypes(registry);
  const componentList = allowedTypes.join(', ');
  
  return `Generate YAML using only these components: ${componentList}.
Do not invent or assume components that don't exist.`;
}
```

### 2. Expression constraints

```typescript
const EXPRESSION_GUARDRAILS = `
Expressions must use only these operators: ==, !=, &&, ||, !, >, <.
Do not use: function calls, ternary operators, method calls, array operations.
Example VALID: showWhen: isOpen == true
Example INVALID: showWhen: users.filter(u => u.active)
`;
```

### 3. Schema-guided generation

```typescript
function generateWithSchemaGuidance(prompt, component, schema) {
  const propDescriptions = Object.entries(schema.shape)
    .map(([key, value]) => `${key}: ${value.description}`)
    .join('\n');

  return `${prompt}

Component "${component}" has these props:
${propDescriptions}`;
}
```

## Error handling

When AI generates invalid YAML, the adapter returns structured errors:

```typescript
{
  ok: false,
  errors: [
    {
      path: 'children[0]',
      type: 'unknown_component',
      message: 'Unknown component type "FakeButton". Did you mean "Button"?',
      suggestion: 'Button'
    },
    {
      path: 'children[0].props.onClick',
      type: 'inline_function',
      message: 'onClick cannot be an inline function. Use a reference.',
      suggestion: 'onClick: handleClick'
    }
  ],
  suggestion: 'Try this instead:\n[corrected YAML]'
}
```

## Testing AI generation

Use the CLI to test:

```bash
yell ai "Create a login form" --registry ./components.yaml --model claude-3-5-sonnet
```

This outputs:
- Generated YAML
- Validation errors (if any)
- Rendered HTML (if valid)

## Best practices

1. **Start with component inventory** — tell the AI what components exist
2. **Show examples** — include VALID and INVALID YAML samples
3. **Validate before render** — always run `yell validate` on AI output
4. **Keep prompts focused** — one page/section at a time
5. **Iterate** — refine prompts based on generated output

## Next steps

- [CLI reference](/yell-landing/docs/reference/cli.html)
- [Schema validation](/yell-landing/docs/reference/schema.html)
- [Playground demo](/yell-landing/docs/getting-started/quick-start.html)