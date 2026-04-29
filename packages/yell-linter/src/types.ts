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
  /** @internal — set by linter, consumed by schema-validator rule */
  lintConfig?: LintConfig;
}

export interface LintConfig {
  rules?: Partial<Record<string, { severity?: 'error' | 'warn'; options?: unknown }>>;
  maxNestingDepth?: number;
  maxExpressionLength?: number;
  allowedShowWhenOps?: string[];
  /**
   * Schema registry for component prop validation.
   * When provided, linter validates props against Zod schemas.
   */
  schemaRegistry?: unknown; // import would create circular dep — cast at usage site
}

export interface LintResult {
  ok: boolean;
  errors: LintError[];
  summary: { errors: number; warnings: number };
}
