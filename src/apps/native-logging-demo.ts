/**
 * Demo: Effect's Native Logging System
 *
 * Shows how to use Effect.log* directly and control output with the
 * `References.MinimumLogLevel` reference.
 *
 * Run with:
 *   pnpm tsx src/apps/native-logging-demo.ts [mode]
 *
 * Modes:
 *   all     - Show all logs (debug, info, etc.)
 *   info    - Show info and above (default)
 *   warn    - Show warnings and errors only
 *   silent  - No log output
 */
import { NodeRuntime } from "@effect/platform-node";
import type { LogLevel } from "effect";
import { Console, Effect, References } from "effect";
import { UserServiceNative } from "../services/UserServiceNative.js";

const program = Effect.gen(function* () {
	const users = yield* UserServiceNative;

	yield* Console.log("=== Native Logging Demo ===\n");

	// These use Effect.log internally
	const alice = yield* users.create("Alice");
	yield* Console.log(`Created: ${alice.name}`);

	// This uses Effect.logDebug - may be hidden depending on log level
	const found = yield* users.findById(1);
	yield* Console.log(`Found: ${found._tag}`);

	// This uses both Effect.log and Effect.logDebug
	const result = yield* users.deleteById(999);
	yield* Console.log(`Delete 999: ${result._tag}`);

	return "Done!";
});

// ============================================================================
// Run with different log levels
// ============================================================================

const mode = process.argv[2] ?? "info";

const minimumLogLevel: LogLevel.LogLevel =
	mode === "all" ? "Debug" : mode === "warn" ? "Warn" : mode === "silent" ? "None" : "Info";

// Build the program with the appropriate log level.
// `MinimumLogLevel` is a Context.Reference in v4, so it is provided as a
// service rather than applied as a `Logger.withMinimumLogLevel` wrapper.
const runnable = program.pipe(
	Effect.provide(UserServiceNative.layer),
	Effect.provideService(References.MinimumLogLevel, minimumLogLevel),
);

Console.log(`Running with log level: ${minimumLogLevel.toUpperCase()}\n`).pipe(Effect.runSync);
NodeRuntime.runMain(runnable);
