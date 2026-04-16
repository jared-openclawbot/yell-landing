# Expressions

Expressions are Yell's way to add minimal logic to YAML without turning it into a general-purpose programming language.

## Why bounded expressions?

Yell is designed for **structured, predictable UI**. If YAML allowed arbitrary logic:
- AI couldn't generate it reliably
- Linting would be impossible
- Teams would write unmaintainable "YAML programs"

So Yell supports only the expressions that genuinely need to be in the declarative layer.

## Expression types

### showWhen

Conditional visibility. Component renders only when condition is true.

```yaml
- type: Modal
  showWhen: isOpen == true
```

```yaml
- type: AdminPanel
  showWhen: user.role == 'admin'
```

```yaml
- type: DisabledMessage
  showWhen: isDisabled && count > 0
```

### bind

One-way data binding. Connects a prop to application state.

```yaml
- type: Input
  bind:
    value: form.name
    onChange: form.name = $event
```

```yaml
- type: Checkbox
  bind:
    checked: form.acceptTerms
    onChange: form.acceptTerms = $event
```

### if/then/else

Conditional rendering with two branches.

```yaml
- type: Badge
  if: user.role == 'admin'
  then:
    - type: AdminBadge
  else:
    - type: UserBadge
```

```yaml
- type: StatusIndicator
  if: isOnline
  then:
    - type: OnlineDot
  else:
    - type: OfflineDot
```

## Allowed operators

### Comparisons
```yaml
showWhen: value == other
showWhen: count != 0
showWhen: age > 18
showWhen: score < 100
```

### Logical
```yaml
showWhen: isVisible && isEnabled
showWhen: isAdmin || isModerator
showWhen: !isDisabled
```

### Combination
```yaml
showWhen: isVisible && !isDisabled && count > 0
showWhen: isAdmin || (isModerator && isActive)
```

## Forbidden patterns

These will be blocked by the linter:

```yaml
# ❌ BLOCKED — inline functions
onClick: () => alert('bad')

# ❌ BLOCKED — function calls
showWhen: getStatus(user) == 'active'

# ❌ BLOCKED — complex operations
showWhen: users.filter(u => u.active).length > 5

# ❌ BLOCKED — mutations
onChange: count = count + 1

# ❌ BLOCKED — ternary (use if/then/else instead)
showWhen: isAdmin ? true : false

# ❌ BLOCKED — string operations
showWhen: name.includes('admin')
```

## $event special value

`$event` represents the current event value in `onChange` handlers:

```yaml
bind:
  value: form.email
  onChange: form.email = $event
```

In `onClick`, `$event` is typically `null`:

```yaml
- type: Button
  props:
    label: "Submit"
    onClick: handleSubmit
```

## Best practices

### Do: use simple conditions

```yaml
# ✅ Good — simple and clear
showWhen: isModalOpen
showWhen: user.role == 'admin'
```

### Don't: nest complex conditions

```yaml
# ❌ Avoid — hard to read
showWhen: a && b || c && (d || e)

# ✅ Better — extract to state
showWhen: canShowPanel
```

### Do: use functional updates for counters

```yaml
# ✅ Correct for state updates
bind:
  onChange: form.count = $event

# Then in your handler:
setForm(f => ({ ...f, count: f.count + 1 }));
```

## Expression evaluation

Yell evaluates expressions in this order:

1. **State lookup** — resolve identifiers to current state values
2. **Operator evaluation** — apply comparisons and logical operators
3. **Result** — return truthy/falsy for showWhen, value for bind

Expressions are evaluated client-side during hydration. SSR output does not include expression results — they're computed at runtime.

## Next steps

- [Design tokens](/docs/core-concepts/tokens.html)
- [Linter rules](/docs/guides/linter.html)
- [Hydration](/docs/guides/hydration.html)