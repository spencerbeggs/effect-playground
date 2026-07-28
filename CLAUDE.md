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
├── index.ts          # Library exports (barrel)
├── run.ts            # Entry point (wires layers, runs program)
├── apps/             # Runnable programs (decoupled from implementations)
├── schemas/          # Effect Schema definitions (data shapes)
└── services/         # Service interfaces + layer implementations
```

Services are self-contained: interface, errors, and all layer implementations
live in the same file (e.g., `UserService.ts` contains the tag, error types,
`UserServiceLive`, and pre-composed convenience layers).

## Commands

```bash
pnpm start             # Run src/run.ts with tsx
pnpm start debug       # Run with debug log level
pnpm start info        # Run with info log level (default)
pnpm start none        # Run with no logging
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
| `effect` | Core Effect library (v4 — platform, HTTP, CLI, SQL etc. now live in core, under `effect/unstable/*` where still unstable) |
| `@effect/platform-node` | Node.js implementations of platform services |
| `@effect/vitest` | Effect-aware test runner (`it.effect`); re-exports Vitest |
| `@effect/tsgo` | Fast type-checker + Effect language-service diagnostics |

Versions come from the `effect` catalog supplied by the
`@effected/pnpm-plugin-effect` config dependency in `pnpm-workspace.yaml` — to
move Effect versions, bump that plugin rather than pinning packages here.

> `@effect/platform` is **not** a dependency on the v4 line; its contracts moved
> into `effect` itself.

## Conventions

### Imports

- Use `.js` extensions for relative imports (ESM requirement)
- Use `node:` protocol for Node.js built-ins
- Separate type imports: `import type { Foo } from './bar.js'`

### Effect Style

- Prefer `Effect.gen` with generators for readability
- Use `yield*` to unwrap effects (like `await` for promises)
- Define services with `Context.Service` and implement with `Layer`
- Use `Schema` for runtime validation and type inference
- Use `TaggedError` for typed, recoverable errors

This repo is on **Effect v4** (`4.0.0-beta.101`). Do not write v3 APIs from
memory — several renames are not guessable, and a wrong guess often type-checks.
The ones that bite here:

| v3 | v4 |
| --- | --- |
| `Context.Tag(id)<Self, Shape>()` | `Context.Service<Self, Shape>()(id)` — types first, id second |
| `Option.fromNullable` | `Option.fromUndefinedOr` / `fromNullishOr` |
| `Effect.Effect.Success<T>` | `Effect.Success<T>` |
| `Logger.withMinimumLogLevel(l)` | `Effect.provideService(References.MinimumLogLevel, l)` |
| `LogLevel.Debug` (object, has `.label`) | `"Debug"` — `LogLevel` is a plain string union; `"Warning"` is now `"Warn"` |
| `Layer.scoped` | `Layer.effect` |
| `Service["Type"]` | `Service["Service"]` |

Verify anything not listed against `node_modules/effect/dist/*.d.ts` rather than
recall.

### Naming Patterns

Services follow the **v4 layer-naming convention** — `layer` for the primary
layer, descriptive suffixes for variants. (v3's `Live`/`Default` names are
retired.)

| Entity | Pattern | Example |
| ------ | ------- | ------- |
| Service key/class | `ServiceName` | `UserService`, `Logger` |
| Primary layer | `ServiceName.layer` | `UserService.layer` |
| Pre-composed layers | `ServiceName.layerWith*` | `UserService.layerWithLogging` |
| Silent variant | `ServiceName.layerSilent` | `UserService.layerSilent` |
| Test-double builder | `ServiceName.makeTest` | `Logger.makeTest` |
| Service shape interface | `ServiceNameShape` | `UserServiceShape` |

Layers are attached to the service class as statics rather than exported as
loose `const`s, so a barrel re-export can't collide on the name `layer`:

```typescript
class Logger extends Context.Service<Logger, LoggerShape>()("Logger") {
  static readonly layer = Layer.succeed(Logger, {...});
  static readonly layerSilent = Layer.succeed(Logger, {...});
  static readonly makeTest = Effect.gen(function* () { ... }); // { layer, getLogs, ... }
}
```

A zero-argument member is a bare `Effect`, not a thunk — `Effect` is already a
lazy description, so `users.list` rather than `users.list()`.

### Error Handling Patterns

Use different patterns based on caller expectations:

| Pattern | Return Type | When to Use |
| ------- | ----------- | ----------- |
| `Effect.fail` | `Effect<A, E>` | Caller **expects** success |
| `Option` | `Effect<Option<A>>` | Caller knows it **might not** exist |
| Result type | `Effect<Result>` | Caller wants **info** about what happened |
| `Effect.die` | crashes | Programming error, should never happen |

Example: `getById` fails (expects user), `findById` returns Option (might not exist),
`deleteById` returns `DeleteResult` (info about what happened).

## Testing

- **Framework**: `@effect/vitest` (re-exports Vitest) with v8 coverage
- **Location**: `__test__/` directory mirrors `src/` structure
- **Run single test**: `pnpm vitest run __test__/path/to/file.test.ts`
- Effect-returning tests use `it.effect` — never
  `it("...", () => Effect.runPromise(...))`
- Assert on typed failures with `Effect.flip`, which swaps the channels so the
  error becomes the success value

### Test Pattern with Logger.makeTest

Use `Logger.makeTest` to capture logs for assertions:

```typescript
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { Logger } from "../../src/services/LoggerService.js";
import { UserService } from "../../src/services/UserService.js";

it.effect("creates a user", () =>
  Effect.gen(function* () {
    // 1. Create capturing logger
    const testLogger = yield* Logger.makeTest;

    // 2. Compose layer with test logger
    const layer = Layer.provide(UserService.layer, testLogger.layer);

    // 3. Run effect with layer
    const result = yield* Effect.gen(function* () {
      const users = yield* UserService;
      return yield* users.create("Alice");
    }).pipe(Effect.provide(layer));

    // 4. Assert on result
    expect(result.name).toBe("Alice");

    // 5. Assert on captured logs
    const logs = yield* testLogger.getMessages;
    expect(logs).toContain("Created user: Alice (id=1)");
  }));
```

Key points:

- `Logger.makeTest` creates a fresh capturing logger per evaluation
- Use `Layer.provide(UserService.layer, testLogger.layer)` to compose
- `testLogger.getMessages` returns an Effect with captured log strings
- `testLogger.getLogsByLevel("debug")` filters by level

**Provide layers per test, not with a suite-level `layer(...)` block.**
`layer(...)` memoizes and builds once per `describe` group, which would share
`UserService`'s in-memory cache and auto-increment counter across tests — the
ID assertions depend on a fresh service each time.
