/**
 * UserService using Effect's NATIVE logging.
 * No custom Logger service needed - just use Effect.log directly.
 *
 * Control logging at the edge with:
 * - Logger.minimumLogLevel(LogLevel.Debug) - show all logs
 * - Logger.minimumLogLevel(LogLevel.Info) - hide debug logs
 * - Logger.none - silent (no output)
 */
import { Context, Data, Effect, Layer, LogLevel, Logger, Option, Ref } from "effect";
import { User } from "../schemas/UserSchema.js";

// ============================================================================
// Errors & Results (same as before)
// ============================================================================

export class UserNotFound extends Data.TaggedError("UserNotFound")<{
	readonly id: number;
}> {}

export type DeleteResult =
	| { readonly _tag: "Deleted"; readonly user: User }
	| { readonly _tag: "NotFound"; readonly id: number };

export const DeleteResult = {
	deleted: (user: User): DeleteResult => ({ _tag: "Deleted", user }),
	notFound: (id: number): DeleteResult => ({ _tag: "NotFound", id }),
};

// ============================================================================
// Service Interface (same as before)
// ============================================================================

export class UserServiceNative extends Context.Tag("UserServiceNative")<
	UserServiceNative,
	{
		readonly create: (name: string) => Effect.Effect<User>;
		readonly getById: (id: number) => Effect.Effect<User, UserNotFound>;
		readonly findById: (id: number) => Effect.Effect<Option.Option<User>>;
		readonly deleteById: (id: number) => Effect.Effect<DeleteResult>;
		readonly list: () => Effect.Effect<ReadonlyArray<User>>;
	}
>() {}

// ============================================================================
// Implementation - uses Effect.log* directly
// ============================================================================

/**
 * In-memory implementation using Effect's native logging.
 * NO dependencies - logging is built into Effect.
 */
export const UserServiceNativeLive = Layer.effect(
	UserServiceNative,
	Effect.gen(function* () {
		const cache = yield* Ref.make(new Map<number, User>());
		const nextId = yield* Ref.make(1);

		return {
			create: (name) =>
				Effect.gen(function* () {
					// Use Effect's native logging - no service needed
					yield* Effect.log(`Creating user: name=${name}`);
					const id = yield* Ref.getAndUpdate(nextId, (n) => n + 1);
					const user = new User({ id, name });
					yield* Ref.update(cache, (map) => new Map(map).set(id, user));
					yield* Effect.log(`Created user: ${user.name} (id=${user.id})`);
					return user;
				}),

			getById: (id) =>
				Effect.gen(function* () {
					yield* Effect.logDebug(`Looking up user: id=${id}`);
					const map = yield* Ref.get(cache);
					const user = map.get(id);
					if (user === undefined) {
						yield* Effect.logDebug(`User not found: id=${id}`);
						return yield* new UserNotFound({ id });
					}
					return user;
				}),

			findById: (id) =>
				Effect.gen(function* () {
					yield* Effect.logDebug(`Finding user: id=${id}`);
					const map = yield* Ref.get(cache);
					return Option.fromNullable(map.get(id));
				}),

			deleteById: (id) =>
				Effect.gen(function* () {
					yield* Effect.log(`Attempting to delete user: id=${id}`);
					const map = yield* Ref.get(cache);
					const user = map.get(id);

					if (user === undefined) {
						yield* Effect.logDebug(`Delete skipped - user not found: id=${id}`);
						return DeleteResult.notFound(id);
					}

					yield* Ref.update(cache, (m) => {
						const next = new Map(m);
						next.delete(id);
						return next;
					});
					yield* Effect.log(`Deleted user: ${user.name} (id=${user.id})`);
					return DeleteResult.deleted(user);
				}),

			list: () =>
				Effect.gen(function* () {
					yield* Effect.logDebug("Listing all users");
					const map = yield* Ref.get(cache);
					return Array.from(map.values());
				}),
		};
	}),
);

// ============================================================================
// Log Level Configurations (the standard Effect pattern)
// ============================================================================

/**
 * Show all logs (debug, info, warning, error)
 */
export const LogAll = Logger.minimumLogLevel(LogLevel.Debug);

/**
 * Show info and above (hide debug)
 */
export const LogInfo = Logger.minimumLogLevel(LogLevel.Info);

/**
 * Show warnings and errors only
 */
export const LogWarn = Logger.minimumLogLevel(LogLevel.Warning);

/**
 * Silent - no log output
 */
export const LogNone = Logger.none;
