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

### Naming Patterns

Services follow this naming convention:

| Entity | Pattern | Example |
| ------ | ------- | ------- |
| Service interface | `ServiceName` | `UserService`, `Logger` |
| Live implementation | `ServiceNameLive` | `UserServiceLive` |
| Pre-composed layers | `ServiceNameWith*` | `UserServiceWithLogging` |
| Silent/test variant | `ServiceNameSilent` | `UserServiceSilent` |
| Static implementations | `ServiceName.Live`, `.Silent`, `.Test` | `Logger.Live` |

For simple services like Logger, attach implementations as static properties:

```typescript
class Logger extends Context.Tag("Logger")<Logger, {...}>() {
  static Live = Layer.succeed(Logger, {...});
  static Silent = Layer.succeed(Logger, {...});
  static Test = Effect.gen(function* () { ... }); // returns { layer, getLogs, ... }
}
```

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

- **Framework**: Vitest with v8 coverage
- **Location**: `__test__/` directory mirrors `src/` structure
- **Run single test**: `pnpm vitest run __test__/path/to/file.test.ts`

### Test Pattern with Logger.Test

Use `Logger.Test` to capture logs for assertions:

```typescript
import { Effect, Layer } from "effect";
import { Logger } from "../../src/services/LoggerService.js";
import { UserService, UserServiceLive } from "../../src/services/UserService.js";

it("creates a user", async () => {
  const test = Effect.gen(function* () {
    // 1. Create capturing logger
    const testLogger = yield* Logger.Test;

    // 2. Compose layer with test logger
    const layer = Layer.provide(UserServiceLive, testLogger.layer);

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
  });

  await Effect.runPromise(test);
});
```

Key points:

- `Logger.Test` creates a fresh capturing logger per test
- Use `Layer.provide(ServiceLive, testLogger.layer)` to compose
- `testLogger.getMessages` returns an Effect with captured log strings
- `testLogger.getLogsByLevel("debug")` filters by level
