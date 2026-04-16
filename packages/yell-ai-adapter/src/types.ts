/**
 * Yell AI Adapter Types
 */

export interface AIError {
  path: string;
  type: 'unknown_component' | 'inline_function' | 'invalid_expression' | 'missing_prop' | 'invalid_enum' | 'nesting_depth';
  message: string;
  suggestion?: string;
}

export interface GenerateResult {
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

export interface GenerateOptions {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface AIAdapterConfig {
  model?: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface TokenMap {
  [category: string]: {
    [key: string]: string | number | TokenMap;
  };
}