/**
 * Yell Linter Types
 */

export interface LintRule {
  name: string;
  severity: 'error' | 'warn';
  description: string;
  check(node: LintNode, context: LintContext, config?: LintConfig): LintError[];
}

export interface LintError {
  rule: string;
  severity: 'error' | 'warn';
  path: string;        // e.g., "children[0].props.onClick"
  message: string;
  line?: number;
  suggestion?: string;
}

export interface LintNode {
  type: string;
  props?: Record<string, unknown>;
  children?: LintNode[];
  [key: string]: unknown;
}

export interface LintContext {
  depth: number;
  parentPath: string;
  yamlLines: string[];
}

export interface LintConfig {
  rules?: Partial<Record<string, { severity?: 'error' | 'warn'; options?: unknown }>>;
  maxNestingDepth?: number;
  maxExpressionLength?: number;
  allowedShowWhenOps?: string[];
}

export interface LintResult {
  ok: boolean;
  errors: LintError[];
  summary: { errors: number; warnings: number };
}
