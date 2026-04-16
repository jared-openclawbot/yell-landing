# YAML Syntax

Yell's YAML format is designed to be readable, writable, and validatable by both humans and AI agents.

## Basic structure

Every Yell file has this structure:

```yaml
app:
  route: /path        # Optional route
  shell:             # Layout shell (optional)
    layout: stack
    gap: 24
  children: []        # Array of component nodes
```

## Component nodes

A component node looks like:

```yaml
- type: ComponentName
  props:              # Optional
    prop1: value
    prop2: value
  children: []        # Optional child components
  slots:              # Optional named slots
    header: []
```

## Fields

### `type` (required)

The component type. Must be registered in the component registry.

```yaml
- type: Button
- type: Text
- type: Modal
```

### `props` (optional)

Key-value pairs passed to the component. Props must match the component's schema.

```yaml
- type: Button
  props:
    label: "Submit"
    variant: primary
    disabled: false
```

### `children` (optional)

Nested component nodes. Used for composition.

```yaml
- type: Container
  props:
    layout: stack
  children:
    - type: Text
      props:
        content: "I'm nested"
    - type: Button
      props:
        label: "Nested button"
```

### `slots` (optional)

Named content zones for layout components.

```yaml
- type: Modal
  slots:
    header:
      - type: Text
        props:
          content: "Modal title"
    body:
      - type: Form
```

## Expressions

Expressions are bounded logic for conditional rendering and data binding.

### showWhen

Show a component only when a condition is true:

```yaml
- type: Modal
  showWhen: isOpen == true
```

### bind

One-way data binding:

```yaml
- type: Input
  bind:
    value: form.name
    onChange: form.name = $event
```

### if/then/else

Conditional rendering:

```yaml
- type: Badge
  if: user.role == 'admin'
  then:
    - type: AdminBadge
  else:
    - type: UserBadge
```

## Valid expressions

```yaml
# Comparisons
showWhen: isOpen == true
showWhen: count > 0
showWhen: user.role != 'guest'

# Logical
showWhen: isVisible && isEnabled
showWhen: isAdmin || isModerator
showWhen: !isDisabled
```

## Invalid expressions (don't use these)

```yaml
# BLOCKED — no inline functions
onClick: () => alert('bad')

# BLOCKED — no complex logic
showWhen: users.filter(u => u.active).length > 0

# BLOCKED — no mutations
onChange: count = count + 1

# BLOCKED — no function calls
showWhen: getRole(user) == 'admin'
```

See [Expressions](core-concepts/expressions.html) for full reference.

## Design tokens

Reference design tokens in props:

```yaml
- type: Button
  props:
    backgroundColor: $tokens.primary
    padding: $tokens.spacing.md
```

See [Design Tokens](core-concepts/tokens.html) for full reference.

## Import and include

Import external components:

```yaml
import:
  - $components/Button
  - $components/Modal

children:
  - type: Button
    props:
      label: "Imported"
```

Include external YAML:

```yaml
include:
  path: ./shared/header.yell
  with:
    title: Page Title
```

## Next steps

- [Components and registry](core-concepts/components.html)
- [Expressions](core-concepts/expressions.html)
- [Design tokens](core-concepts/tokens.html)