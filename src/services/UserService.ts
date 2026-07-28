import { Context, Data, Effect, Layer, Option, Ref } from "effect";
import { User } from "../schemas/UserSchema.js";
import { Logger } from "./LoggerService.js";

// ============================================================================
// Error Types (for fatal/recoverable errors)
// ============================================================================

/**
 * Error thrown when attempting to retrieve a user that doesn't exist.
 * This is a "hard" error - the caller expected a user but none was found.
 *
 * @example
 * ```ts
 * yield* users.getById(999).pipe(
 *   Effect.catchTag("UserNotFound", (err) =>
 *     Effect.succeed(null) // recover with a default
 *   )
 * );
 * ```
 *
 * @public
 */
export class UserNotFound extends Data.TaggedError("UserNotFound")<{
	/** The ID that was not found */
	readonly id: number;
}> {}

// ============================================================================
// Result Types (for informational outcomes)
// ============================================================================

/**
 * Result of a delete operation.
 * Not an error - just information about what happened.
 *
 * Use `_tag` for pattern matching:
 * ```ts
 * if (result._tag === "Deleted") { ... }
 * if (result._tag === "NotFound") { ... }
 * ```
 *
 * @public
 */
export type DeleteResult =
	| { readonly _tag: "Deleted"; readonly user: User }
	| { readonly _tag: "NotFound"; readonly id: number };

/**
 * Constructors for {@link (DeleteResult:type)}.
 *
 * @public
 */
export const DeleteResult = {
	/** User was found and deleted */
	deleted: (user: User): DeleteResult => ({ _tag: "Deleted", user }),
	/** User was not found (nothing to delete) */
	notFound: (id: number): DeleteResult => ({ _tag: "NotFound", id }),
};

// ============================================================================
// Service Interface
// ============================================================================

/**
 * The shape of the {@link UserService} service.
 *
 * @public
 */
export interface UserServiceShape {
	/**
	 * Create a new user with the given name.
	 * @param name - The display name for the user
	 * @returns The created user with auto-generated ID
	 */
	readonly create: (name: string) => Effect.Effect<User>;

	/**
	 * Retrieve a user by their ID. Fails if not found.
	 * Use this when you **expect** the user to exist.
	 *
	 * @param id - The user's unique identifier
	 * @returns The user, or a {@link UserNotFound} failure
	 */
	readonly getById: (id: number) => Effect.Effect<User, UserNotFound>;

	/**
	 * Find a user by their ID. Returns `Option.none` if not found.
	 * Use this when the user **might not** exist.
	 *
	 * @param id - The user's unique identifier
	 * @returns Some(user) if found, None if not
	 */
	readonly findById: (id: number) => Effect.Effect<Option.Option<User>>;

	/**
	 * Delete a user by their ID.
	 * Returns information about what happened rather than failing.
	 *
	 * @param id - The user's unique identifier
	 * @returns {@link (DeleteResult:type)} indicating whether user was deleted or not found
	 */
	readonly deleteById: (id: number) => Effect.Effect<DeleteResult>;

	/**
	 * List all users in the cache.
	 *
	 * A bare `Effect`, not a thunk — an `Effect` is already a lazy
	 * description, so wrapping it in a zero-argument function would add
	 * indirection for nothing.
	 *
	 * @returns Array of all users, may be empty
	 */
	readonly list: Effect.Effect<ReadonlyArray<User>>;
}

/**
 * Constructor for the in-memory {@link UserService} implementation.
 *
 * Uses Effect's `Ref` for safe mutable state and requires {@link Logger}
 * for observability, so the resulting effect carries `Logger` in `R`.
 */
const make = Effect.gen(function* () {
	const cache = yield* Ref.make(new Map<number, User>());
	const nextId = yield* Ref.make(1);
	const logger = yield* Logger;

	return UserService.of({
		create: (name) =>
			Effect.gen(function* () {
				yield* logger.info(`Creating user: name=${name}`);
				const id = yield* Ref.getAndUpdate(nextId, (n) => n + 1);
				const user = new User({ id, name });
				yield* Ref.update(cache, (map) => new Map(map).set(id, user));
				yield* logger.info(`Created user: ${user.name} (id=${user.id})`);
				return user;
			}),

		getById: (id) =>
			Effect.gen(function* () {
				yield* logger.debug(`Looking up user: id=${id}`);
				const map = yield* Ref.get(cache);
				const user = map.get(id);
				if (user === undefined) {
					yield* logger.debug(`User not found: id=${id}`);
					return yield* new UserNotFound({ id });
				}
				return user;
			}),

		findById: (id) =>
			Effect.gen(function* () {
				yield* logger.debug(`Finding user: id=${id}`);
				const map = yield* Ref.get(cache);
				return Option.fromUndefinedOr(map.get(id));
			}),

		deleteById: (id) =>
			Effect.gen(function* () {
				yield* logger.info(`Attempting to delete user: id=${id}`);
				const map = yield* Ref.get(cache);
				const user = map.get(id);

				if (user === undefined) {
					yield* logger.debug(`Delete skipped - user not found: id=${id}`);
					return DeleteResult.notFound(id);
				}

				yield* Ref.update(cache, (m) => {
					const next = new Map(m);
					next.delete(id);
					return next;
				});
				yield* logger.info(`Deleted user: ${user.name} (id=${user.id})`);
				return DeleteResult.deleted(user);
			}),

		list: Effect.gen(function* () {
			yield* logger.debug("Listing all users");
			const map = yield* Ref.get(cache);
			return Array.from(map.values());
		}),
	});
});

/**
 * Service for managing users in an in-memory cache.
 *
 * Error handling philosophy:
 * - `getById` **fails** with {@link UserNotFound} - caller expected a user
 * - `deleteById` **returns** {@link (DeleteResult:type)} - caller may not care if missing
 * - `findById` **returns** `Option<User>` - caller expects maybe-missing
 *
 * @example
 * ```ts
 * const program = Effect.gen(function* () {
 *   const users = yield* UserService;
 *
 *   // Create returns the user
 *   const alice = yield* users.create("Alice");
 *
 *   // getById fails if not found (use when you expect it to exist)
 *   const found = yield* users.getById(alice.id);
 *
 *   // findById returns Option (use when it might not exist)
 *   const maybe = yield* users.findById(999);
 *   if (Option.isSome(maybe)) { ... }
 *
 *   // deleteById returns info about what happened
 *   const result = yield* users.deleteById(alice.id);
 *   if (result._tag === "NotFound") {
 *     yield* logger.warn(`Tried to delete non-existent user ${result.id}`);
 *   }
 * });
 * ```
 *
 * @public
 */
export class UserService extends Context.Service<UserService, UserServiceShape>()("UserService") {
	/**
	 * In-memory implementation. Still requires {@link Logger} — provide one
	 * with `Layer.provide`, or use {@link UserService.layerWithLogging} /
	 * {@link UserService.layerSilent}.
	 */
	static readonly layer: Layer.Layer<UserService, never, Logger> = Layer.effect(UserService, make);

	/** {@link UserService.layer} with console logging */
	static readonly layerWithLogging: Layer.Layer<UserService> = Layer.provide(UserService.layer, Logger.layer);

	/** {@link UserService.layer} with silent logging (for tests) */
	static readonly layerSilent: Layer.Layer<UserService> = Layer.provide(UserService.layer, Logger.layerSilent);
}
