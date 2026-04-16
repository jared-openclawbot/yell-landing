/**
 * Yell AI Adapter
 * 
 * Generates valid Yell YAML from natural language prompts with guardrails.
 */

import { parse as parseYAML } from 'yaml';
import type {
  AIError,
  GenerateResult,
  GenerateOptions,
  AIAdapterConfig,
} from './types.js';

const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  ollama: 'http://localhost:11434/v1',
};

const DEFAULT_RULES = `
RULES:
1. Only use component types: Button, Text, Input, Container, Modal, Card, Badge, Image, Link
2. Props must use exact names from the component schema
3. Never use inline functions — onClick and onChange must be references like handleClick
4. Never use complex expressions — no filter, map, reduce, ternary, method calls
5. ShowWhen expressions: only use ==, !=, &&, ||, !, >, < operators
6. Max nesting depth: 5 levels
7. Design tokens: use $tokens.category.key format (e.g., $tokens.colors.primary)
8. Props that are event handlers must be string references, not inline code
9. Always specify children explicitly if a component has child content
10. Use proper YAML indentation (2 spaces)
`.trim();

const EXAMPLE_YAML = `
EXAMPLE:
user: Create a button
you:
\`\`\`yaml
app:
  children:
    - type: Button
      props:
        label: Click me
        variant: primary
\`\`\`

user: Create a login form
you:
\`\`\`yaml
app:
  children:
    - type: Container
      layout: stack
      gap: 16
      children:
        - type: Text
          props:
            content: Login
        - type: Input
          props:
            placeholder: Email
            type: text
        - type: Button
          props:
            label: Submit
            variant: primary
\`\`\`
`.trim();

function extractCodeBlocks(text: string): string[] {
  const regex = /```(?:yaml)?\s*([\s\S]*?)```/g;
  const matches: string[] = [];
  let result;
  while ((result = regex.exec(text)) !== null) {
    matches.push(result[1].trim());
  }
  return matches;
}

function extractYAML(text: string): string | null {
  const blocks = extractCodeBlocks(text);
  if (blocks.length === 0) {
    const lines = text.split('\n');
    const yamlLines: string[] = [];
    let inYaml = false;
    for (const line of lines) {
      if (line.trim().startsWith('app:') || line.trim().startsWith('- type:')) {
        inYaml = true;
      }
      if (inYaml) yamlLines.push(line);
    }
    if (yamlLines.length > 0) return yamlLines.join('\n');
    return null;
  }
  return blocks[0];
}

function validateYAML(yaml: string): AIError[] {
  const errors: AIError[] = [];

  const inlineFnRegex = /onClick:\s*\(|onChange:\s*\(|on\w+:\s*\(\s*\)/g;
  let match;
  while ((match = inlineFnRegex.exec(yaml)) !== null) {
    errors.push({
      path: 'inline-function',
      type: 'inline_function',
      message: 'Inline functions are not allowed. Use a reference like onClick: handleClick',
      suggestion: 'Replace inline function with a named event handler reference',
    });
  }

  const complexExprRegex = /\?\s*|:.*\?/;
  if (complexExprRegex.test(yaml)) {
    errors.push({
      path: 'expression',
      type: 'invalid_expression',
      message: 'Ternary expressions are not allowed. Use if/then/else nodes instead',
    });
  }

  const funcCallRegex = /\w+\([^)]*\)/;
  if (funcCallRegex.test(yaml)) {
    errors.push({
      path: 'expression',
      type: 'invalid_expression',
      message: 'Function calls in expressions are not allowed',
    });
  }

  return errors;
}

function analyzeYAML(yaml: string): { componentsUsed: string[]; tokenRefs: string[]; nestingDepth: number } {
  const componentsUsed: string[] = [];
  const tokenRefs: string[] = [];

  const typeRegex = /type:\s*(\w+)/g;
  let match;
  while ((match = typeRegex.exec(yaml)) !== null) {
    if (!componentsUsed.includes(match[1])) {
      componentsUsed.push(match[1]);
    }
  }

  const tokenRegex = /\$tokens\.[\w.]+/g;
  while ((match = tokenRegex.exec(yaml)) !== null) {
    if (!tokenRefs.includes(match[0])) {
      tokenRefs.push(match[0]);
    }
  }

  let maxDepth = 0;
  const lines = yaml.split('\n');
  for (const line of lines) {
    const indent = line.search(/\S/);
    if (indent > 0) {
      maxDepth = Math.max(maxDepth, Math.floor(indent / 2));
    }
  }

  return { componentsUsed, tokenRefs, nestingDepth: maxDepth };
}

export class YellAIAdapter {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private systemPrompt: string;

  constructor(config: AIAdapterConfig = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.baseURL = config.baseURL || DEFAULT_BASE_URLS.ollama;
    this.model = config.model || 'llama3.2';
    this.maxTokens = config.maxTokens || 2048;
    this.temperature = config.temperature ?? 0.3;
    this.systemPrompt = config.systemPrompt || this.buildDefaultSystemPrompt();
  }

  private buildDefaultSystemPrompt(): string {
    return `You are a Yell UI generator. You generate YAML that describes user interfaces.

${DEFAULT_RULES}

${EXAMPLE_YAML}

Generate YAML that matches the user's request. Always wrap your YAML in code blocks with the yaml language tag.`.trim();
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  appendToSystemPrompt(text: string): void {
    this.systemPrompt += '\n\n' + text;
  }

  async generateYAML(options: GenerateOptions): Promise<GenerateResult> {
    const { prompt, context } = options;

    let fullPrompt = prompt;
    if (context) {
      fullPrompt += `\n\nContext: ${JSON.stringify(context)}`;
    }

    try {
      const response = await this.callLLM(fullPrompt);

      const yaml = extractYAML(response);
      if (!yaml) {
        return {
          ok: false,
          errors: [{
            path: 'response',
            type: 'invalid_expression',
            message: 'Could not extract YAML from response',
            suggestion: response.substring(0, 200),
          }],
        };
      }

      const validationErrors = validateYAML(yaml);
      if (validationErrors.length > 0) {
        return { ok: false, yaml, errors: validationErrors };
      }

      try {
        parseYAML(yaml);
      } catch {
        return {
          ok: false,
          yaml,
          errors: [{
            path: 'yaml',
            type: 'invalid_expression',
            message: 'Invalid YAML syntax',
          }],
        };
      }

      const metadata = analyzeYAML(yaml);

      return { ok: true, yaml, metadata };
    } catch (error) {
      return {
        ok: false,
        errors: [{
          path: 'api',
          type: 'invalid_expression',
          message: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }],
      };
    }
  }

  async *generateYAMLStream(options: GenerateOptions): AsyncGenerator<string> {
    const { prompt, context } = options;

    let fullPrompt = prompt;
    if (context) {
      fullPrompt += `\n\nContext: ${JSON.stringify(context)}`;
    }

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: fullPrompt },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip
          }
        }
      }
    }
  }

  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content || '';
  }
}

export { extractYAML, extractCodeBlocks, validateYAML, analyzeYAML };
export type { AIError, GenerateResult, GenerateOptions, AIAdapterConfig } from './types.js';
