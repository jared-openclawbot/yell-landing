/**
 * Yell Linter
 * 
 * Lints YAML for anti-patterns and enforces Yell's structural rules.
 */

import { parse as parseYAML } from 'yaml';
import type { LintRule, LintError, LintNode, LintContext, LintConfig, LintResult } from './types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Flattens node.props + top-level node props into one object for iteration */
function allProps(node: LintNode): Record<string, unknown> {
  return { ...node.props, ...node };
}

// ─── Rules ───────────────────────────────────────────────────────────────────

const inlineFunctionRule: LintRule = {
  name: 'no-inline-functions',
  severity: 'error',
  description: 'Event handlers must be references, not inline functions',
  check(node: LintNode, ctx: LintContext) {
    const errors: LintError[] = [];
    const props = allProps(node);

    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'string') {
        if (value.includes('=>') || value.includes('function')) {
          errors.push({
            rule: 'no-inline-functions',
            severity: 'error',
            path: ctx.parentPath ? `${ctx.parentPath}.${key}` : key,
            message: `"${key}" cannot be an inline function. Use a reference like "${key}: handleEvent"`,
            suggestion: `Replace inline function with a named handler reference`,
          });
        }
      }
    }
    return errors;
  },
};

const ternaryRule: LintRule = {
  name: 'no-ternary',
  severity: 'error',
  description: 'Ternary expressions are not allowed — use if/then/else nodes instead',
  check(node: LintNode, ctx: LintContext) {
    const errors: LintError[] = [];
    const props = allProps(node);

    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string' && /\?\s*[^:\s]/.test(value)) {
        errors.push({
          rule: 'no-ternary',
          severity: 'error',
          path: ctx.parentPath ? `${ctx.parentPath}.${key}` : key,
          message: `Ternary expressions are not allowed. Use if/then/else nodes instead.`,
        });
      }
    }
    return errors;
  },
};

const functionCallRule: LintRule = {
  name: 'no-function-calls',
  severity: 'error',
  description: 'Function calls in expressions are not allowed',
  check(node: LintNode, ctx: LintContext) {
    const errors: LintError[] = [];
    const props = allProps(node);

    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        const funcCallRegex = /\b\w+\s*\([^)]*\)/;
        if (funcCallRegex.test(value) && !value.startsWith('$')) {
          errors.push({
            rule: 'no-function-calls',
            severity: 'error',
            path: ctx.parentPath ? `${ctx.parentPath}.${key}` : key,
            message: `Function calls in expressions are not allowed. Precompute values in event handlers.`,
          });
        }
      }
    }
    return errors;
  },
};

const nestingDepthRule: LintRule = {
  name: 'max-nesting-depth',
  severity: 'warn',
  description: 'Warns when nesting exceeds max depth',
  check(_node: LintNode, ctx: LintContext, config?: LintConfig) {
    const errors: LintError[] = [];
    const maxDepth = config?.maxNestingDepth ?? 5;
    if (ctx.depth > maxDepth) {
      errors.push({
        rule: 'max-nesting-depth',
        severity: 'warn',
        path: ctx.parentPath,
        message: `Nesting depth ${ctx.depth} exceeds max ${maxDepth}`,
      });
    }
    return errors;
  },
};

const expressionLengthRule: LintRule = {
  name: 'max-expression-length',
  severity: 'warn',
  description: 'Warns when expressions are too long',
  check(node: LintNode, ctx: LintContext) {
    const errors: LintError[] = [];
    const props = allProps(node);
    const maxLength = 100;

    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string' && value.length > maxLength) {
        errors.push({
          rule: 'max-expression-length',
          severity: 'warn',
          path: ctx.parentPath ? `${ctx.parentPath}.${key}` : key,
          message: `Expression length ${value.length} exceeds max ${maxLength}. Consider extracting to a computed value.`,
        });
      }
    }
    return errors;
  },
};

const allRules: LintRule[] = [
  inlineFunctionRule,
  ternaryRule,
  functionCallRule,
  nestingDepthRule,
  expressionLengthRule,
];

// ─── Core Linter ─────────────────────────────────────────────────────────────

export function lint(yaml: string, config: LintConfig = {}): LintResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = parseYAML(yaml) as Record<string, unknown>;
  } catch {
    return {
      ok: false,
      errors: [{
        rule: 'parse-error',
        severity: 'error',
        path: '',
        message: 'Invalid YAML syntax',
      }],
      summary: { errors: 1, warnings: 0 },
    };
  }

  const lines = yaml.split('\n');
  const errors: LintError[] = [];
  const enabledRules = allRules;

  function walk(node: LintNode, depth: number, path: string) {
    for (const rule of enabledRules) {
      const ruleConfig = config.rules?.[rule.name];
      const severity = ruleConfig?.severity ?? rule.severity;

      const ctx: LintContext = { depth, parentPath: path, yamlLines: lines };
      const ruleErrors = rule.check(node, ctx, config);

      for (const err of ruleErrors) {
        errors.push({ ...err, severity });
      }
    }

    if (node.children) {
      node.children.forEach((child, i) => {
        walk(child, depth + 1, `${path}/children[${i}]`);
      });
    }
  }

  const app = parsed.app as Record<string, unknown> | undefined;
  if (app) {
    if (app.shell) walk(app.shell as LintNode, 0, 'shell');
    if (app.children) {
      (app.children as unknown as LintNode[]).forEach((child, i) => {
        walk(child, 0, `children[${i}]`);
      });
    }
  }

  const summary = {
    errors: errors.filter(e => e.severity === 'error').length,
    warnings: errors.filter(e => e.severity === 'warn').length,
  };

  return { ok: summary.errors === 0, errors, summary };
}

export type { LintResult, LintError, LintConfig, LintRule } from './types.js';