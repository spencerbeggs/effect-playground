import { Context, Effect, Layer, Ref } from "effect";

/**
 * A captured log entry from {@link Logger.Test}.
 */
export interface LogEntry {
	/** The severity level of the log */
	level: "info" | "debug" | "error";
	/** The log message content */
	message: string;
}

/**
 * Logger service for structured logging throughout the application.
 *
 * Provides three log levels: `info`, `debug`, and `error`.
 * Use dependency injection to swap implementations:
 *
 * - {@link Logger.Live} - Console output with timestamps (production)
 * - {@link Logger.Silent} - No-op, suppresses all output (quiet tests)
 * - {@link Logger.Test} - Captures logs for assertions (test verification)
 *
 * @example
 * ```ts
 * // In your service implementation
 * const logger = yield* Logger;
 * yield* logger.info("User created");
 * yield* logger.debug("Cache miss");
 * yield* logger.error("Connection failed");
 *
 * // Provide implementation at the edge
 * program.pipe(Effect.provide(Logger.Live));
 * ```
 */
export class Logger extends Context.Tag("Logger")<
	Logger,
	{
		/** Log an informational message */
		readonly info: (message: string) => Effect.Effect<void>;
		/** Log a debug message (verbose, typically hidden in production) */
		readonly debug: (message: string) => Effect.Effect<void>;
		/** Log an error message */
		readonly error: (message: string) => Effect.Effect<void>;
	}
>() {
	/**
	 * Production logger that outputs to console with timestamps.
	 *
	 * Uses Effect's built-in logging which provides:
	 * - Timestamps
	 * - Log level prefixes
	 * - Fiber context information
	 *
	 * @example
	 * ```ts
	 * program.pipe(Effect.provide(Logger.Live));
	 * // Output: [12:34:56.789] INFO: User created
	 * ```
	 */
	static Live = Layer.succeed(Logger, {
		info: (message) => Effect.log(message),
		debug: (message) => Effect.logDebug(message),
		error: (message) => Effect.logError(message),
	});

	/**
	 * Silent logger that discards all log messages.
	 *
	 * Use in tests where you don't need to verify logging behavior
	 * and just want quiet output.
	 *
	 * @example
	 * ```ts
	 * const layer = Layer.provide(UserServiceLive, Logger.Silent);
	 * ```
	 */
	static Silent = Layer.succeed(Logger, {
		info: () => Effect.void,
		debug: () => Effect.void,
		error: () => Effect.void,
	});

	/**
	 * Test logger that captures all log messages for verification.
	 *
	 * Returns an object with:
	 * - `layer` - The Logger layer to provide to your effect
	 * - `getLogs` - Effect that retrieves all captured {@link LogEntry} items
	 * - `getMessages` - Effect that retrieves just the message strings
	 * - `getLogsByLevel` - Effect that filters logs by level
	 * - `clear` - Effect that clears all captured logs
	 *
	 * @example
	 * ```ts
	 * const test = Effect.gen(function* () {
	 *   const testLogger = yield* Logger.Test;
	 *   const layer = Layer.provide(UserServiceLive, testLogger.layer);
	 *
	 *   yield* myProgram.pipe(Effect.provide(layer));
	 *
	 *   const logs = yield* testLogger.getMessages;
	 *   expect(logs).toContain("User created");
	 * });
	 * ```
	 */
	static Test = Effect.gen(function* () {
		const logs = yield* Ref.make<LogEntry[]>([]);

		const append = (level: LogEntry["level"], message: string) =>
			Ref.update(logs, (arr) => [...arr, { level, message }]);

		const service: Logger["Type"] = {
			info: (message) => append("info", message),
			debug: (message) => append("debug", message),
			error: (message) => append("error", message),
		};

		return {
			/** Layer that provides this capturing logger */
			layer: Layer.succeed(Logger, service),

			/** Get all captured log entries */
			getLogs: Ref.get(logs),

			/** Get logs filtered by level */
			getLogsByLevel: (level: LogEntry["level"]) =>
				Effect.map(Ref.get(logs), (entries) => entries.filter((e) => e.level === level)),

			/** Get just the messages (no levels) */
			getMessages: Effect.map(Ref.get(logs), (entries) => entries.map((e) => e.message)),

			/** Clear all captured logs */
			clear: Ref.set(logs, []),
		};
	});
}

/**
 * The resolved type of {@link Logger.Test}.
 * Useful for typing variables that hold the test logger instance.
 */
export type LoggerTestInstance = Effect.Effect.Success<typeof Logger.Test>;
