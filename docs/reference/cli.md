# CLI Reference

## Installation

```bash
npm install -g @yell/cli
```

Or use via npx:

```bash
npx yell --help
```

## Commands

### `yell validate`

Validate a YAML file against the schema:

```bash
yell validate input.yell.yaml
```

```bash
yell validate input.yell.yaml --registry ./components.yaml
```

Exit codes:
- `0` — valid
- `1` — invalid (errors printed to stderr)
- `2` — parse error

### `yell render`

Render YAML to HTML:

```bash
yell render input.yell.yaml --out dist/index.html
```

```bash
yell render input.yell.yaml --registry ./components.yaml --pretty
```

### `yell lint`

Check YAML for anti-patterns:

```bash
yell lint input.yell.yaml
```

```bash
yell lint input.yell.yaml --rules noInlineFunctions,maxDepth:5
```

#### Linter rules

| Rule | Description | Default |
|------|-------------|---------|
| `noInlineFunctions` | Block `onClick: () => ...` | error |
| `maxExpressionLength` | Max chars in an expression | 100 |
| `maxNestingDepth` | Max nesting depth | 5 |
| `noMutations` | Block `x = x + 1` | error |
| `allowedShowWhenOps` | Allowed operators in showWhen | `['==','!=','&&','||','!','>','<']` |

#### Fix mode

Auto-fix safe violations:

```bash
yell lint input.yell.yaml --fix
```

### `yell build`

Build with import/include resolution:

```bash
yell build input.yell.yaml --out dist/
```

```bash
yell build input.yell.yaml --registry ./components.yaml --tokens ./tokens.yaml
```

### `yell tokens`

Migrate token references:

```bash
yell tokens migrate --from old.yaml --to new.yaml input.yell.yaml
```

### `yell ai`

Generate YAML from natural language:

```bash
yell ai "Create a login page with email and password"
```

```bash
yell ai "Create a dashboard" --registry ./components.yaml --model claude-3-5-sonnet
```

## Global options

| Option | Description |
|--------|-------------|
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |
| `--quiet`, `-q` | Suppress output |
| `--verbose` | Extra debug output |

## Configuration

Create a `.yellrc` file in your project root:

```yaml
registry: ./components.yaml
tokens: ./tokens.yaml
rules:
  noInlineFunctions: error
  maxNestingDepth: 5
  maxExpressionLength: 100
```

Yell automatically loads `.yellrc` from the current directory.

## Examples

### Validate and render in CI

```yaml
# .github/workflows/yell.yml
- name: Validate YAML
  run: yell validate . --recursive

- name: Build for production
  run: yell build ./src --out ./dist
```

### Watch mode

```bash
yell build --watch
```

File changes trigger rebuild.

## Next steps

- [Quick start](/yell-landing/docs/getting-started/quick-start.html)
- [Component registry](/yell-landing/docs/core-concepts/components.html)