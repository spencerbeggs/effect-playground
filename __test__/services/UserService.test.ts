import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import type { LogEntry } from "../../src/services/LoggerService.js";
import { Logger } from "../../src/services/LoggerService.js";
import { UserService, UserServiceLive } from "../../src/services/UserService.js";

describe("UserService", () => {
	it("creates a user with auto-incremented ID", async () => {
		const test = Effect.gen(function* () {
			const testLogger = yield* Logger.Test;
			const layer = Layer.provide(UserServiceLive, testLogger.layer);

			const result = yield* Effect.gen(function* () {
				const users = yield* UserService;
				return yield* users.create("Alice");
			}).pipe(Effect.provide(layer));

			expect(result.id).toBe(1);
			expect(result.name).toBe("Alice");

			const logs = yield* testLogger.getMessages;
			expect(logs).toContain("Creating user: name=Alice");
			expect(logs).toContain("Created user: Alice (id=1)");
		});

		await Effect.runPromise(test);
	});

	it("auto-increments IDs for multiple users", async () => {
		const test = Effect.gen(function* () {
			const testLogger = yield* Logger.Test;
			const layer = Layer.provide(UserServiceLive, testLogger.layer);

			const result = yield* Effect.gen(function* () {
				const users = yield* UserService;
				const alice = yield* users.create("Alice");
				const bob = yield* users.create("Bob");
				const charlie = yield* users.create("Charlie");
				return [alice, bob, charlie];
			}).pipe(Effect.provide(layer));

			expect(result.map((u) => u.id)).toEqual([1, 2, 3]);
			expect(result.map((u) => u.name)).toEqual(["Alice", "Bob", "Charlie"]);
		});

		await Effect.runPromise(test);
	});

	describe("getById", () => {
		it("retrieves a user by ID", async () => {
			const test = Effect.gen(function* () {
				const testLogger = yield* Logger.Test;
				const layer = Layer.provide(UserServiceLive, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					yield* users.create("Alice");
					return yield* users.getById(1);
				}).pipe(Effect.provide(layer));

				expect(result.name).toBe("Alice");

				const logs = yield* testLogger.getLogsByLevel("debug");
				expect(logs.some((l: LogEntry) => l.message.includes("Looking up user: id=1"))).toBe(true);
			});

			await Effect.runPromise(test);
		});

		it("fails with UserNotFound for missing user", async () => {
			const test = Effect.gen(function* () {
				const testLogger = yield* Logger.Test;
				const layer = Layer.provide(UserServiceLive, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					return yield* users.getById(999).pipe(Effect.flip);
				}).pipe(Effect.provide(layer));

				expect(result._tag).toBe("UserNotFound");
				expect(result.id).toBe(999);

				const logs = yield* testLogger.getMessages;
				expect(logs).toContain("User not found: id=999");
			});

			await Effect.runPromise(test);
		});
	});

	describe("findById", () => {
		it("returns Some when user exists", async () => {
			const test = Effect.gen(function* () {
				const testLogger = yield* Logger.Test;
				const layer = Layer.provide(UserServiceLive, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					yield* users.create("Alice");
					return yield* users.findById(1);
				}).pipe(Effect.provide(layer));

				expect(Option.isSome(result)).toBe(true);
				expect(Option.getOrThrow(result).name).toBe("Alice");
			});

			await Effect.runPromise(test);
		});

		it("returns None when user does not exist", async () => {
			const test = Effect.gen(function* () {
				const testLogger = yield* Logger.Test;
				const layer = Layer.provide(UserServiceLive, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					return yield* users.findById(999);
				}).pipe(Effect.provide(layer));

				expect(Option.isNone(result)).toBe(true);
			});

			await Effect.runPromise(test);
		});
	});

	describe("deleteById", () => {
		it("returns Deleted with user when user exists", async () => {
			const test = Effect.gen(function* () {
				const testLogger = yield* Logger.Test;
				const layer = Layer.provide(UserServiceLive, testLogger.layer);

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
			});

			await Effect.runPromise(test);
		});

		it("returns NotFound when user does not exist", async () => {
			const test = Effect.gen(function* () {
				const testLogger = yield* Logger.Test;
				const layer = Layer.provide(UserServiceLive, testLogger.layer);

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
			});

			await Effect.runPromise(test);
		});

		it("removes user from cache", async () => {
			const test = Effect.gen(function* () {
				const testLogger = yield* Logger.Test;
				const layer = Layer.provide(UserServiceLive, testLogger.layer);

				const result = yield* Effect.gen(function* () {
					const users = yield* UserService;
					yield* users.create("Alice");
					yield* users.create("Bob");
					yield* users.deleteById(1);
					return yield* users.list();
				}).pipe(Effect.provide(layer));

				expect(result).toHaveLength(1);
				expect(result[0].name).toBe("Bob");
			});

			await Effect.runPromise(test);
		});
	});

	it("lists all users", async () => {
		const test = Effect.gen(function* () {
			const testLogger = yield* Logger.Test;
			const layer = Layer.provide(UserServiceLive, testLogger.layer);

			const result = yield* Effect.gen(function* () {
				const users = yield* UserService;
				yield* users.create("Alice");
				yield* users.create("Bob");
				return yield* users.list();
			}).pipe(Effect.provide(layer));

			expect(result).toHaveLength(2);
			expect(result.map((u) => u.name)).toEqual(["Alice", "Bob"]);
		});

		await Effect.runPromise(test);
	});
});
