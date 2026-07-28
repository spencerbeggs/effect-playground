import { Context, Effect, Layer, Ref } from "effect";

/**
 * A captured log entry from {@link Logger.makeTest}.
 *
 * @public
 */
export interface LogEntry {
	/** The severity level of the log */
	level: "info" | "debug" | "error";
	/** The log message content */
	message: string;
}

/**
 * The shape of the {@link Logger} service.
 *
 * Kept as a named interface so the service key, the layers, and the test
 * double can all refer to one definition.
 *
 * @public
 */
export interface LoggerShape {
	/** Log an informational message */
	readonly info: (message: string) => Effect.Effect<void>;
	/** Log a debug message (verbose, typically hidden in production) */
	readonly debug: (message: string) => Effect.Effect<void>;
	/** Log an error message */
	readonly error: (message: string) => Effect.Effect<void>;
}

/**
 * Logger service for structured logging throughout the application.
 *
 * Provides three log levels: `info`, `debug`, and `error`.
 * Use dependency injection to swap implementations:
 *
 * - {@link Logger.layer} - Console output with timestamps (production)
 * - {@link Logger.layerSilent} - No-op, suppresses all output (quiet tests)
 * - {@link Logger.makeTest} - Captures logs for assertions (test verification)
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
 * program.pipe(Effect.provide(Logger.layer));
 * ```
 *
 * @public
 */
export class Logger extends Context.Service<Logger, LoggerShape>()("Logger") {
	/**
	 * Production logger that outputs to console with timestamps.
	 *
	 * Delegates to Effect's built-in logging, which provides timestamps, log
	 * level prefixes, and fiber context information.
	 *
	 * @example
	 * ```ts
	 * program.pipe(Effect.provide(Logger.layer));
	 * // Output: [12:34:56.789] INFO (#1): User created
	 * ```
	 */
	static readonly layer: Layer.Layer<Logger> = Layer.succeed(Logger, {
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
	 * const layer = Layer.provide(UserService.layer, Logger.layerSilent);
	 * ```
	 */
	static readonly layerSilent: Layer.Layer<Logger> = Layer.succeed(Logger, {
		info: () => Effect.void,
		debug: () => Effect.void,
		error: () => Effect.void,
	});

	/**
	 * Builds a capturing logger for tests.
	 *
	 * Returns an object with:
	 * - `layer` - The Logger layer to provide to your effect
	 * - `getLogs` - Effect that retrieves all captured {@link LogEntry} items
	 * - `getMessages` - Effect that retrieves just the message strings
	 * - `getLogsByLevel` - Effect that filters logs by level
	 * - `clear` - Effect that clears all captured logs
	 *
	 * Each evaluation produces a fresh, independent recorder, so a test can
	 * build one per case without leaking entries across tests.
	 *
	 * @example
	 * ```ts
	 * it.effect("captures logs", () =>
	 *   Effect.gen(function* () {
	 *     const testLogger = yield* Logger.makeTest;
	 *     const layer = Layer.provide(UserService.layer, testLogger.layer);
	 *
	 *     yield* myProgram.pipe(Effect.provide(layer));
	 *
	 *     const logs = yield* testLogger.getMessages;
	 *     expect(logs).toContain("User created");
	 *   }));
	 * ```
	 */
	static readonly makeTest = Effect.gen(function* () {
		const logs = yield* Ref.make<ReadonlyArray<LogEntry>>([]);

		const append = (level: LogEntry["level"], message: string) =>
			Ref.update(logs, (arr) => [...arr, { level, message }]);

		const service: LoggerShape = {
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
			clear: Ref.set(logs, [] as ReadonlyArray<LogEntry>),
		};
	});
}

/**
 * The resolved type of {@link Logger.makeTest}.
 * Useful for typing variables that hold the test logger instance.
 *
 * @public
 */
export type LoggerTestInstance = Effect.Success<typeof Logger.makeTest>;
