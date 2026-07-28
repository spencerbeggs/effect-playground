import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import type { LogEntry } from "../../src/services/LoggerService.js";
import { Logger } from "../../src/services/LoggerService.js";
import { UserService } from "../../src/services/UserService.js";

// Note: each test builds its own layer via `Effect.provide` rather than a
// suite-level `layer(...)` block. `layer(...)` memoizes and builds ONCE per
// describe group, which would share UserService's in-memory cache and its
// auto-increment counter across tests — the ID assertions below expect a
// fresh service per test.

describe("UserService", () => {
	it.effect("creates a user with auto-incremented ID", () =>
		Effect.gen(function* () {
			const testLogger = yield* Logger.makeTest;
			const layer = Layer.provide(UserService.layer, testLogger.layer);

			const result = yield* Effect.gen(function* () {
				const users = yield* UserService;
				return yield* users.create("Alice");
			}).pipe(Effect.provide(layer));

			expect(result.id).toBe(1);
			expect(result.name).toBe("Alice");

			const logs = yield* testLogger.getMessages;
			expect(logs).toContain("Creating user: name=Alice");
			expect(logs).toContain("Created user: Alice (id=1)");
		}),
	);

	it.effect("auto-increments IDs for multiple users", () =>
		Effect.gen(function* () {
			const testLogger = yield* Logger.makeTest;
			const layer = Layer.provide(UserService.layer, testLogger.layer);

			const result = yield* Effect.gen(function* () {
				const users = yield* UserService;
				const alice = yield* users.create("Alice");
				const bob = yield* users.create("Bob");
				const charlie = yield* users.create("Charlie");
				return [alice, bob, charlie];
			}).pipe(Effect.provide(layer));

			expect(result.map((u) => u.id)).toEqual([1, 2, 3]);
			expect(result.map((u) => u.name)).toEqual(["Alice", "Bob", "Charlie"]);
		}),
	);

	describe("getById", () => {
		it.effect("retrieves a user by ID", () =>
			Effect.gen(function* () {
				const testLogger = yield* Logger.makeTest;
				const layer = Layer.provide(UserService.layer, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					yield* users.create("Alice");
					return yield* users.getById(1);
				}).pipe(Effect.provide(layer));

				expect(result.name).toBe("Alice");

				const logs = yield* testLogger.getLogsByLevel("debug");
				expect(logs.some((l: LogEntry) => l.message.includes("Looking up user: id=1"))).toBe(true);
			}),
		);

		it.effect("fails with UserNotFound for missing user", () =>
			Effect.gen(function* () {
				const testLogger = yield* Logger.makeTest;
				const layer = Layer.provide(UserService.layer, testLogger.layer);

				// Effect.flip swaps the channels, so the typed error becomes the
				// success value — the v4 house pattern for asserting on failures.
				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					return yield* Effect.flip(users.getById(999));
				}).pipe(Effect.provide(layer));

				expect(result._tag).toBe("UserNotFound");
				expect(result.id).toBe(999);

				const logs = yield* testLogger.getMessages;
				expect(logs).toContain("User not found: id=999");
			}),
		);
	});

	describe("findById", () => {
		it.effect("returns Some when user exists", () =>
			Effect.gen(function* () {
				const testLogger = yield* Logger.makeTest;
				const layer = Layer.provide(UserService.layer, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					yield* users.create("Alice");
					return yield* users.findById(1);
				}).pipe(Effect.provide(layer));

				expect(Option.isSome(result)).toBe(true);
				expect(Option.getOrThrow(result).name).toBe("Alice");
			}),
		);

		it.effect("returns None when user does not exist", () =>
			Effect.gen(function* () {
				const testLogger = yield* Logger.makeTest;
				const layer = Layer.provide(UserService.layer, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					return yield* users.findById(999);
				}).pipe(Effect.provide(layer));

				expect(Option.isNone(result)).toBe(true);
			}),
		);
	});

	describe("deleteById", () => {
		it.effect("returns Deleted with user when user exists", () =>
			Effect.gen(function* () {
				const testLogger = yield* Logger.makeTest;
				const layer = Layer.provide(UserService.layer, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					yield* users.create("Alice");
					return yield* users.deleteById(1);
				}).pipe(Effect.provide(layer));

				expect(result._tag).toBe("Deleted");
				if (result._tag === "Deleted") {
					expect(result.user.name).toBe("Alice");
				}

				const logs = yield* testLogger.getMessages;
				expect(logs).toContain("Deleted user: Alice (id=1)");
			}),
		);

		it.effect("returns NotFound when user does not exist", () =>
			Effect.gen(function* () {
				const testLogger = yield* Logger.makeTest;
				const layer = Layer.provide(UserService.layer, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					return yield* users.deleteById(999);
				}).pipe(Effect.provide(layer));

				expect(result._tag).toBe("NotFound");
				if (result._tag === "NotFound") {
					expect(result.id).toBe(999);
				}

				const logs = yield* testLogger.getMessages;
				expect(logs).toContain("Delete skipped - user not found: id=999");
			}),
		);

		it.effect("removes user from cache", () =>
			Effect.gen(function* () {
				const testLogger = yield* Logger.makeTest;
				const layer = Layer.provide(UserService.layer, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					yield* users.create("Alice");
					yield* users.create("Bob");
					yield* users.deleteById(1);
					return yield* users.list;
				}).pipe(Effect.provide(layer));

				expect(result).toHaveLength(1);
				expect(result[0]?.name).toBe("Bob");
			}),
		);
	});

	it.effect("lists all users", () =>
		Effect.gen(function* () {
			const testLogger = yield* Logger.makeTest;
			const layer = Layer.provide(UserService.layer, testLogger.layer);

			const result = yield* Effect.gen(function* () {
				const users = yield* UserService;
				yield* users.create("Alice");
				yield* users.create("Bob");
				return yield* users.list;
			}).pipe(Effect.provide(layer));

			expect(result).toHaveLength(2);
			expect(result.map((u) => u.name)).toEqual(["Alice", "Bob"]);
		}),
	);
});
