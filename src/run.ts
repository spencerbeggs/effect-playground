/**
 * Application entry point.
 *
 * @example
 * ```bash
 * pnpm start          # default: info level
 * pnpm start debug    # show all logs including debug
 * pnpm start info     # show info, warning, error
 * pnpm start warning  # show warning and error only
 * pnpm start error    # show errors only
 * pnpm start none     # silent (no logs)
 * ```
 *
 * @module
 */
import { NodeRuntime } from "@effect/platform-node";
import { Console, Effect, LogLevel, Logger } from "effect";

import { UserServiceWithLogging, program } from "./index.js";

/**
 * Parse CLI argument to Effect LogLevel.
 */
const parseLogLevel = (arg: string | undefined): LogLevel.LogLevel => {
	switch (arg?.toLowerCase()) {
		case "debug":
		case "all":
			return LogLevel.Debug;
		case "info":
			return LogLevel.Info;
		case "warning":
		case "warn":
			return LogLevel.Warning;
		case "error":
			return LogLevel.Error;
		case "none":
		case "silent":
			return LogLevel.None;
		default:
			return LogLevel.Info; // sensible default
	}
};

// Parse CLI argument
const levelArg = process.argv[2];
const logLevel = parseLogLevel(levelArg);

// Build and run
const runnable = program.pipe(Effect.provide(UserServiceWithLogging), Logger.withMinimumLogLevel(logLevel));

Console.log(`Log level: ${logLevel.label.toUpperCase()}\n`).pipe(Effect.runSync);
NodeRuntime.runMain(runnable);
