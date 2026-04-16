# @yell/ai-adapter

Generate valid Yell YAML from natural language prompts — with guardrails to prevent invalid output.

## Install

```bash
npm install @yell/ai-adapter
```

Note: `@yell/ai-adapter` depends on `@yell/core` and `@yell/schema`.

## Usage

### Basic Generation

```typescript
import { YellAIAdapter } from '@yell/ai-adapter';

const adapter = new YellAIAdapter({
  model: 'llama3.2',
  baseURL: 'http://localhost:11434/v1',  // Ollama
});

const result = await adapter.generateYAML({
  prompt: 'Create a login form with email and password',
});

if (result.ok) {
  console.log(result.yaml);
  console.log(result.metadata);
  // { componentsUsed: ['Container', 'Text', 'Input', 'Button'], tokenRefs: [], nestingDepth: 4 }
} else {
  console.log(result.errors);
  console.log(result.suggestion);
}
```

### With Schema Validation

```typescript
import { createSchemaRegistry, registerComponentSchema, getComponentManifest, buildSystemPromptSection } from '@yell/schema';
import { YellAIAdapter } from '@yell/ai-adapter';

const registry = createSchemaRegistry();

registerComponentSchema(registry, {
  name: 'Button',
  props: [
    { name: 'label', type: 'string', required: true },
    { name: 'variant', type: 'enum', enum: ['primary', 'secondary'] },
  ],
});

// Add component manifest to system prompt
const manifest = getComponentManifest(registry);
const adapter = new YellAIAdapter();

adapter.appendToSystemPrompt(buildSystemPromptSection(manifest));

const result = await adapter.generateYAML({
  prompt: 'Create a button',
});
```

### Streaming

```typescript
for await (const chunk of adapter.generateYAMLStream({ prompt: 'Create a dashboard' })) {
  process.stdout.write(chunk);
}
```

### Guardrails

The adapter blocks:
- **Inline functions** — `onClick: () => alert()` → rejected
- **Ternary expressions** — `showWhen: x ? a : b` → rejected
- **Function calls in expressions** — `showWhen: getValue()` → rejected
- **Complex expressions** — `filter`, `map`, `reduce` → rejected

Allowed expressions:
- Comparisons: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `&&`, `||`, `!`
- Token refs: `$tokens.colors.primary`

### Configuration

```typescript
const adapter = new YellAIAdapter({
  model: 'llama3.2',           // Model name
  baseURL: 'http://localhost:11434/v1',  // API base URL
  apiKey: process.env.OPENAI_API_KEY,     // Optional API key
  maxTokens: 2048,             // Max response tokens
  temperature: 0.3,            // Lower = more deterministic
});

// Custom system prompt
adapter.setSystemPrompt('You are a Yell UI generator...');
adapter.appendToSystemPrompt('Additional rules for this session...');
```

### Supported Providers

```typescript
// Ollama (local)
const adapter = new YellAIAdapter({ baseURL: 'http://localhost:11434/v1' });

// OpenAI
const adapter = new YellAIAdapter({
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

// DeepSeek
const adapter = new YellAIAdapter({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
});
```

## API

### `new YellAIAdapter(config?)`

Create a new adapter instance.

### `adapter.generateYAML(options): Promise<GenerateResult>`

Generate YAML from a prompt.

### `adapter.generateYAMLStream(options): AsyncGenerator<string>`

Stream YAML as it's generated.

### `adapter.setSystemPrompt(prompt)`

Replace the system prompt.

### `adapter.appendToSystemPrompt(text)`

Add to the system prompt.

## GenerateResult

```typescript
interface GenerateResult {
  ok: boolean;
  yaml?: string;
  errors?: AIError[];
  suggestion?: string;
  metadata?: {
    componentsUsed: string[];
    tokenRefs: string[];
    nestingDepth: number;
  };
}
```

## AIError

```typescript
interface AIError {
  path: string;
  type: 'unknown_component' | 'inline_function' | 'invalid_expression' | 'missing_prop';
  message: string;
  suggestion?: string;
}
```
