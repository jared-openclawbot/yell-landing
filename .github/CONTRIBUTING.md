# Contributing to Yell

## Setup

```bash
# Clone and install
npm ci

# Build all packages
npm run build

# Build a specific package
npm run build -w @yell/core
npm run build -w @yell/schema
npm run build -w @yell/ai-adapter
```

## Project Structure

```
yell/
├── package.json           # Workspace root
├── packages/
│   ├── yell-core/        # Runtime: parser, registry, renderer
│   ├── yell-schema/      # Validation: component contracts
│   └── yell-ai-adapter/  # AI: prompt → YAML generation
├── docs/                  # Documentation
└── .github/
    ├── workflows/ci.yml   # CI pipeline
    ├── ISSUE_TEMPLATE.md  # Issue template
    └── pull_request_template.md  # PR template
```

## Dependency Graph

```
@yell/core (required base)
    ↓
@yell/schema (depends on core)
    ↓
@yell/ai-adapter (depends on core + schema)
```

## Opening Issues

Use the [issue template](./ISSUE_TEMPLATE.md). Every issue must have:
- **Context** — why is this needed?
- **Acceptance Criteria** — clear, testable criteria (checked boxes)
- **Labels** — type, priority

## Submitting PRs

Use the [PR template](./pull_request_template.md). Every PR must include:
- **Evidence** — copy each acceptance criterion and link to proof (code, test output, screenshot)
- **Test commands** — reproducible commands to verify the fix
- **Breaking changes** — note if any

## CI Pipeline

Every PR runs:
1. **Install** — `npm ci`
2. **Build** — `npm run build`
3. **Test** — `npm test`

PRs must pass CI before merging.

## Package Development

### Adding a new package

1. Create `packages/yell-<name>/`
2. Add `"@yell/core"` as dependency if needed
3. Update root `package.json` scripts if needed
4. Add tests

### Adding exports

If adding new public functions to `@yell/core`:
1. Export from `src/index.ts`
2. Export type from `src/types.ts`
3. Update `package.json` exports field if adding subpaths
4. Add tests

## Code Style

- TypeScript strict mode
- ESM modules (`type: "module"`)
- JSDoc for public APIs
- Meaningful variable names
