/**
 * Demo: Effect's Native Logging System
 *
 * Shows how to use Effect.log* directly and control output with Logger layers.
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
import { Console, Effect, Layer, LogLevel, Logger } from "effect";
import {
	LogAll,
	LogInfo,
	LogNone,
	LogWarn,
	UserServiceNative,
	UserServiceNativeLive,
} from "../services/UserServiceNative.js";

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

// Build the program with the appropriate log level layer
const runnable = program.pipe(
	Effect.provide(UserServiceNativeLive),
	// Apply log level configuration AFTER providing the service
	Logger.withMinimumLogLevel(
		mode === "all"
			? LogLevel.Debug
			: mode === "warn"
				? LogLevel.Warning
				: mode === "silent"
					? LogLevel.None
					: LogLevel.Info,
	),
);

Console.log(`Running with log level: ${mode.toUpperCase()}\n`).pipe(Effect.runSync);
NodeRuntime.runMain(runnable);
