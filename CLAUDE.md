# CLAUDE.md

This file provides guidance to Claude Code when working with code in this
repository.

## Project Purpose

This is a **learning playground** for exploring the [Effect](https://effect.website/)
TypeScript library. The goal is to understand Effect patterns, test ideas, and
build proficiency with the Effect ecosystem.

This is NOT a publishable module — ignore build/publish workflows.

## What to Help With

When assisting in this repo, prioritize:

1. **Teaching Effect patterns** — Explain concepts clearly, show idiomatic usage
2. **Writing example code** — Create runnable examples in `src/`
3. **Testing patterns** — Help write tests that demonstrate Effect behaviors
4. **Debugging** — Help understand Effect stack traces and error handling

Use the Effect-related skills when relevant:

- `/effect-service` — Services, Context.Tag, Layers
- `/effect-schema` — Schema definitions, validation, transformations
- `/effect-error` — TaggedError, typed error handling
- `/effect-cli` — CLI apps with @effect/cli
- `/effect-resource` — Resource management, fibers, concurrency
- `/effect-state` — Ref, mutable state patterns
- `/effect-logging` — Logging, metrics, observability
- `/effect-testing` — Testing Effect code

## Project Structure

```text
src/
├── index.ts          # Main entry point / current experiment
├── apps/             # CLI applications and runnable programs
├── errors/           # Custom TaggedError definitions
├── layers/           # Service Layer implementations
├── schemas/          # Effect Schema definitions
└── utils/            # Helper functions and utilities
```

## Commands

```bash
pnpm start             # Run src/index.ts with tsx
pnpm test              # Run tests
pnpm test:watch        # Run tests in watch mode
pnpm typecheck         # Type-check with tsgo
pnpm lint:fix          # Auto-fix lint issues
```

### Debugging

Press `F5` in VS Code to debug. Two configurations available:

- **Debug Current File** — Runs the open file
- **Debug index.ts** — Runs the main entry point

## Effect Dependencies

| Package | Purpose |
| ------- | ------- |
| `effect` | Core Effect library |
| `@effect/platform` | Cross-platform abstractions (HTTP, FileSystem, etc.) |
| `@effect/platform-node` | Node.js implementations of platform services |
| `@effect/language-service` | IDE support (completions, refactors) |

## Conventions

### Imports

- Use `.js` extensions for relative imports (ESM requirement)
- Use `node:` protocol for Node.js built-ins
- Separate type imports: `import type { Foo } from './bar.js'`

### Effect Style

- Prefer `Effect.gen` with generators for readability
- Use `yield*` to unwrap effects (like `await` for promises)
- Define services with `Context.Tag` and implement with `Layer`
- Use `Schema` for runtime validation and type inference
- Use `TaggedError` for typed, recoverable errors

## Testing

- **Framework**: Vitest with v8 coverage
- **Run single test**: `pnpm vitest run src/path/to/file.test.ts`
- Effect tests typically use `Effect.runPromise` or `@effect/vitest`
