/**
 * UserService using Effect's NATIVE logging.
 * No custom Logger service needed - just use Effect.log directly.
 *
 * Control logging at the edge by setting the `References.MinimumLogLevel`
 * reference. In v4 the log level is a {@link Context.Reference}, not a
 * `Logger.minimumLogLevel(...)` layer, so it is set like any other service:
 * with `Effect.provideService`, or via a `Layer.succeed` as the
 * `layerLog*` values below do.
 */
import { Context, Data, Effect, Layer, Option, Ref, References } from "effect";
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

/** The shape of the {@link UserServiceNative} service. */
export interface UserServiceNativeShape {
	readonly create: (name: string) => Effect.Effect<User>;
	readonly getById: (id: number) => Effect.Effect<User, UserNotFound>;
	readonly findById: (id: number) => Effect.Effect<Option.Option<User>>;
	readonly deleteById: (id: number) => Effect.Effect<DeleteResult>;
	readonly list: Effect.Effect<ReadonlyArray<User>>;
}

// ============================================================================
// Implementation - uses Effect.log* directly
// ============================================================================

/**
 * In-memory implementation using Effect's native logging.
 * NO service dependencies - logging is built into Effect.
 */
const make = Effect.gen(function* () {
	const cache = yield* Ref.make(new Map<number, User>());
	const nextId = yield* Ref.make(1);

	return UserServiceNative.of({
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
				return Option.fromUndefinedOr(map.get(id));
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

		list: Effect.gen(function* () {
			yield* Effect.logDebug("Listing all users");
			const map = yield* Ref.get(cache);
			return Array.from(map.values());
		}),
	});
});

/**
 * User management service that logs through Effect's built-in logger
 * rather than a custom {@link Logger} service.
 */
export class UserServiceNative extends Context.Service<UserServiceNative, UserServiceNativeShape>()(
	"UserServiceNative",
) {
	/** In-memory implementation. Has no service dependencies. */
	static readonly layer: Layer.Layer<UserServiceNative> = Layer.effect(UserServiceNative, make);
}

// ============================================================================
// Log Level Configurations
// ============================================================================
//
// In v3 these were `Logger.minimumLogLevel(LogLevel.Debug)` layers. In v4
// `Logger.minimumLogLevel` no longer exists and `LogLevel` is a plain string
// union, so the threshold is the `References.MinimumLogLevel` reference.

/** Show all logs (trace, debug, info, warning, error) */
export const layerLogAll: Layer.Layer<never> = Layer.succeed(References.MinimumLogLevel, "All");

/** Show debug and above */
export const layerLogDebug: Layer.Layer<never> = Layer.succeed(References.MinimumLogLevel, "Debug");

/** Show info and above (hide debug) */
export const layerLogInfo: Layer.Layer<never> = Layer.succeed(References.MinimumLogLevel, "Info");

/** Show warnings and errors only */
export const layerLogWarn: Layer.Layer<never> = Layer.succeed(References.MinimumLogLevel, "Warn");

/** Silent - no log output */
export const layerLogNone: Layer.Layer<never> = Layer.succeed(References.MinimumLogLevel, "None");
