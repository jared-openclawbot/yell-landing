# Design Tokens

Design tokens are named values that represent design decisions. They enable consistent theming and easy updates across your entire UI.

## Why tokens?

Instead of hardcoding values:

```yaml
# ❌ Hardcoded — hard to update
props:
  backgroundColor: "#ff8a3d"
  padding: 16
```

Use tokens:

```yaml
# ✅ Token-based — update in one place
props:
  backgroundColor: $tokens.primary
  padding: $tokens.spacing.md
```

## Token syntax

Tokens are referenced with the `$tokens.` prefix followed by the full path:

```yaml
$tokens.colors.primary       # Color
$tokens.colors.secondary     # Color
$tokens.spacing.md           # Spacing
$tokens.typography.fontSize.lg  # Typography
$tokens.borderRadius.md     # Borders
```

## Token structure

Define tokens in a YAML file:

```yaml
tokens:
  colors:
    primary: "#ff8a3d"
    primaryHover: "#ff9e63"
    secondary: "#b7aea2"
    background: "#0c0c0f"
    surface: "#16161a"
    text: "#f6f2ec"
    muted: "#8a8279"

  spacing:
    xs: 4
    sm: 8
    md: 16
    lg: 24
    xl: 32

  typography:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize:
      sm: 12
      md: 14
      lg: 16
      xl: 20
      xxl: 28

  borderRadius:
    sm: 8
    md: 14
    lg: 20
    xl: 28

  shadows:
    sm: "0 2px 8px rgba(0,0,0,0.2)"
    md: "0 8px 24px rgba(0,0,0,0.3)"
    lg: "0 30px 80px rgba(0,0,0,0.45)"
```

## Using tokens in YAML

```yaml
- type: Button
  props:
    backgroundColor: $tokens.primary
    color: $tokens.background
    padding: $tokens.spacing.md
    borderRadius: $tokens.borderRadius.md

- type: Card
  props:
    background: $tokens.surface
    padding: $tokens.spacing.lg
    borderRadius: $tokens.borderRadius.lg
    shadow: $tokens.shadows.md
```

## Token overrides

Tokens can be overridden per environment:

```yaml
# tokens.prod.yaml
tokens:
  colors:
    primary: "#007bff"  # Different brand color for production

# tokens.dev.yaml
tokens:
  colors:
    primary: "#ff8a3d"  # Orange for development
```

Load the appropriate token file based on environment:

```typescript
import { loadTokens } from '@yell/core';

const tokens = loadTokens(process.env.NODE_ENV || 'dev');
const registry = createRegistry({ tokens });
```

## Token validation

Tokens are validated at parse time:

- References to undefined tokens throw errors
- Token values must match expected types (colors as hex, spacing as numbers)

```yaml
# ❌ ERROR — token doesn't exist
props:
  color: $tokens.doesNotExist

# ✅ Valid — token exists
props:
  color: $tokens.primary
```

## Token migration

When design tokens change, use the migration tool:

```bash
yell migrate --tokens ./old-tokens.yaml ./new-tokens.yaml input.yaml
```

This updates all `$tokens.X` references in your YAML files.

## Best practices

### Do: organize tokens by category

```yaml
tokens:
  colors:
    primary: ...
  spacing:
    ...
  typography:
    ...
```

### Don't: create tokens for everything

Tokens represent **design decisions**, not all values. Use tokens for:
- Colors (brand, background, text)
- Spacing (consistent rhythm)
- Typography (font sizes, weights)
- Border radius, shadows

Don't use tokens for:
- Content (text, labels)
- Data (counts, IDs)
- Calculated values

## Next steps

- [Components](core-concepts/components.html)
- [Hydration](guides/hydration.html)
- [Schema validation](reference/schema.html)