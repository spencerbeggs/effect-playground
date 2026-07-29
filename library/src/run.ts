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
 */
import { NodeRuntime } from "@effect/platform-node";
import type { LogLevel } from "effect";
import { Console, Effect, References } from "effect";

import { UserService, program } from "./index.js";

/**
 * Parse a CLI argument into an Effect {@link LogLevel.LogLevel}.
 *
 * In v4 a log level is a plain string union — there are no `LogLevel.Debug`
 * constants and no `.label` property to read back off one.
 */
const parseLogLevel = (arg: string | undefined): LogLevel.LogLevel => {
	switch (arg?.toLowerCase()) {
		case "all":
			return "All";
		case "debug":
			return "Debug";
		case "info":
			return "Info";
		case "warning":
		case "warn":
			return "Warn";
		case "error":
			return "Error";
		case "none":
		case "silent":
			return "None";
		default:
			return "Info"; // sensible default
	}
};

// Parse CLI argument
const levelArg = process.argv[2];
const logLevel = parseLogLevel(levelArg);

// Build and run.
//
// The minimum log level is a `Context.Reference` in v4, so it is supplied the
// same way any other service is — `Logger.withMinimumLogLevel` is gone.
const runnable = program.pipe(
	Effect.provide(UserService.layerWithLogging),
	Effect.provideService(References.MinimumLogLevel, logLevel),
);

Console.log(`Log level: ${logLevel.toUpperCase()}\n`).pipe(Effect.runSync);
NodeRuntime.runMain(runnable);
