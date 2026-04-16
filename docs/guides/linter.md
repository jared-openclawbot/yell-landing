# Linter

> The Yell linter enforces structural rules and blocks anti-patterns in YAML.

## Overview

The `@yell/linter` package validates Yell YAML documents against a set of rules designed to keep generated UI safe, predictable, and maintainable.

## Installation

```bash
npm install @yell/linter
```

## Usage

```typescript
import { lint } from '@yell/linter';

const result = lint(yamlString);
if (!result.ok) {
  console.error(result.errors);
}
```

## Rules

### no-inline-functions

**Severity:** error

Event handlers (`onClick`, `onChange`, etc.) must be named references — never inline functions.

```yaml
# ✅ Valid
- type: Button
  onClick: handleSubmit

# ❌ Invalid
- type: Button
  onClick: () => setCount(count + 1)
```

### no-ternary

**Severity:** error

Ternary expressions are not allowed in YAML. Use `showWhen` conditionals or separate nodes instead.

```yaml
# ❌ Invalid
- type: Badge
  showWhen: isAdmin ? true : false

# ✅ Valid
- type: Modal
  showWhen: isOpen == true
```

### no-function-calls

**Severity:** error

Function calls are not allowed in expressions. Precompute values in event handlers.

```yaml
# ❌ Invalid
- type: Text
  showWhen: getStatus(user) == 'active'

# ✅ Valid
- type: Text
  showWhen: user.isActive == true
```

### max-nesting-depth

**Severity:** warn

Warns when nesting depth exceeds 5 levels.

### max-expression-length

**Severity:** warn

Warns when any expression exceeds 100 characters.

## Configuration

```typescript
import { lint } from '@yell/linter';

const result = lint(yamlString, {
  maxNestingDepth: 8,
  maxExpressionLength: 150,
  rules: {
    'no-inline-functions': { severity: 'error' },
    'max-nesting-depth': { severity: 'warn' },
  },
});
```

## See also

- [Expressions](/docs/core-concepts/expressions.html)
- [Components](/docs/core-concepts/components.html)
- [Hydration](/docs/guides/hydration.html)