# YAML Boundaries — Limite Sagrado

> **Core principle:** Yell must remain a YAML-native framework. Everything lives in YAML — nothing escapes.

The thesis: _"Yell não pode virar 'React pior em YAML'. Tem que ser UI estruturada, validável e previsível para agentes e times de platform."_

---

## Why this matters

Every framework that claims to be "declarative" but requires JavaScript, JSON configs, or inline callbacks for basic behavior is lying. The logic leaks out of the declarative layer and you end up with an imperative system wearing a declarative costume.

Yell draws a hard line: **YAML is the only configuration language.** No exceptions.

---

## The boundary

Everything in Yell lives inside YAML:

```
┌─────────────────────────────────────────────┐
│              YELL MANIFEST (YAML)            │
│                                              │
│  app:                    ✅ YAML              │
│  components:             ✅ YAML             │
│  tokens:                 ✅ YAML             │
│  expressions:            ✅ YAML-bounded      │
│  event handlers:         ✅ string refs       │
│  imports/includes:       ✅ YAML              │
└─────────────────────────────────────────────┘
                     ✗ NO ✗
  ┌──────────────────────────────────────────┐
  │  inline JS in templates    ✗             │
  │  separate JSON config       ✗             │
  │  raw CSS files              ✗             │
  │  imperative bindings        ✗             │
  │  callback functions         ✗             │
  └──────────────────────────────────────────┘
```

---

## What stays in YAML

### Component registry

```yaml
components:
  Button:
    props:
      label:
        type: string
        default: "Click me"
      variant:
        type: enum
        enum: [primary, secondary, ghost, danger]
```

No separate `.json` or `.ts` registry files. Pure YAML.

### Design tokens

```yaml
tokens:
  colors:
    primary: "#3b82f6"
    secondary: "#64748b"
  spacing:
    sm: 8
    md: 16
    lg: 24
```

No external `tokens.json` or CSS custom properties file required. Tokens live in the manifest.

### Event handlers

```yaml
- type: Button
  props:
    label: "Submit"
  onClick: handleSubmit    # ✅ string reference
```

```yaml
# ✅ VALID — handler is a string reference
onClick: handleSubmit

# ❌ BLOCKED — inline function
onClick: "() => alert('bad')"

# ❌ BLOCKED — inline function
onClick: "function() { send(); }"
```

Event handlers are **names** — never executable code inside YAML.

### Conditional rendering

```yaml
- type: Modal
  showWhen: isOpen == true    # ✅ expression in YAML
```

```yaml
# ✅ VALID — bounded expression
showWhen: user.role == "admin"

# ❌ BLOCKED — inline function
showWhen: "getRole(user) === 'admin'"

# ❌ BLOCKED — complex logic
showWhen: "users.filter(u => u.active).length > 0"
```

Expressions are YAML strings evaluated by the runtime — not JavaScript injected into the template.

### Imports and includes

```yaml
import:
  - $components/Button
  - $components/Modal

include:
  path: ./shared/header.yell
  with:
    title: Page Title
```

No dynamic `require()` or `import()`. All imports are static, resolved at parse time.

---

## The linter enforces this

The `@yell/linter` blocks escape attempts automatically:

```yaml
# This will be flagged by the linter:
- type: Button
  onClick: "() => alert('oops')"    # ❌ no-inline-functions
  style: "{ padding: 10 }"           # ❌ no-ternary
  onChange: "count = count + 1"      # ❌ no-function-calls
```

```
$ yell lint my-form.yell

✗ Rule: no-inline-functions
  Line 5: onClick contains an arrow or function expression
  Found: "() => alert('oops')"

✗ Rule: no-function-calls
  Line 7: onChange contains a function call
  Found: "count = count + 1"
```

---

## Why not JavaScript/JSON?

| Approach | Problem |
|----------|---------|
| Inline JS in templates | XSS surface, untestable, unparseable by agents |
| Separate `.json` configs | Two sources of truth, sync drift, harder to validate |
| Callback functions in YAML | Logic leakage — the "declarative" layer is a lie |
| CSS files for tokens | Tokens get out of sync with schema, no validation |

Yell's approach: **one language, one layer, full predictability.**

---

## What this enables

Because nothing escapes YAML:

- **AI agents can generate valid Yell** without understanding a second language
- **The schema validates everything** — no runtime surprises from leaked logic
- **The linter enforces boundaries automatically** — no manual code review for "did you escape YAML?"
- **Portability** — a Yell manifest is a plain text file, no build step required
- **Testability** — the YAML is the contract, everything else is implementation

---

## The rule

> **If it can't be expressed in YAML, it doesn't belong in Yell.**

If you need behavior that YAML can't express, extend the YAML schema (via custom components, new expression operators, or plugin points) — don't escape the boundary.

---

## Related

- [Expressions](/yell-landing/docs/core-concepts/expressions.html)
- [Components](/yell-landing/docs/core-concepts/components.html)
- [Linter](/yell-landing/docs/guides/linter.html)
