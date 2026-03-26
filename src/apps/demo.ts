import { Console, Effect, Option } from "effect";
import { UserService } from "../services/UserService.js";

/**
 * Demo program showcasing Effect error handling patterns.
 *
 * Demonstrates three approaches to "not found":
 * 1. **Fail** (`getById`) - when you expect it to exist
 * 2. **Option** (`findById`) - when it might not exist
 * 3. **Result** (`deleteById`) - when you want info about what happened
 */
export const program = Effect.gen(function* () {
	const users = yield* UserService;

	yield* Console.log("=== Effect Error Handling Demo ===\n");

	// =========================================================================
	// CREATE - always succeeds, returns the created user
	// =========================================================================
	const alice = yield* users.create("Alice");
	const bob = yield* users.create("Bob");
	yield* Console.log(`Created: ${alice.name} (id=${alice.id}), ${bob.name} (id=${bob.id})`);

	// =========================================================================
	// GET BY ID - fails with UserNotFound if missing
	// Use when you EXPECT the user to exist
	// =========================================================================
	yield* Console.log("\n--- getById (expects user to exist) ---");

	const found = yield* users.getById(1);
	yield* Console.log(`Found user 1: ${found.name}`);

	// Handle the error case
	const result = yield* users.getById(999).pipe(
		Effect.catchTag("UserNotFound", (err) => Effect.succeed(`User ${err.id} not found - recovered with default`)),
		Effect.map((u) => (typeof u === "string" ? u : `Found: ${u.name}`)),
	);
	yield* Console.log(`User 999: ${result}`);

	// =========================================================================
	// FIND BY ID - returns Option, never fails
	// Use when the user MIGHT NOT exist
	// =========================================================================
	yield* Console.log("\n--- findById (might not exist) ---");

	const maybeAlice = yield* users.findById(1);
	const maybeGhost = yield* users.findById(999);

	yield* Console.log(`Find user 1: ${Option.match(maybeAlice, { onNone: () => "not found", onSome: (u) => u.name })}`);
	yield* Console.log(
		`Find user 999: ${Option.match(maybeGhost, { onNone: () => "not found", onSome: (u) => u.name })}`,
	);

	// =========================================================================
	// DELETE BY ID - returns DeleteResult, never fails
	// Tells you what happened without failing
	// =========================================================================
	yield* Console.log("\n--- deleteById (returns what happened) ---");

	const deleteAlice = yield* users.deleteById(1);
	const deleteGhost = yield* users.deleteById(999);

	yield* Console.log(
		`Delete user 1: ${deleteAlice._tag === "Deleted" ? `deleted ${deleteAlice.user.name}` : `not found`}`,
	);
	yield* Console.log(
		`Delete user 999: ${deleteGhost._tag === "Deleted" ? `deleted ${deleteGhost.user.name}` : `not found (id=${deleteGhost.id})`}`,
	);

	// =========================================================================
	// LIST - show remaining users
	// =========================================================================
	yield* Console.log("\n--- Final state ---");
	const remaining = yield* users.list();
	yield* Console.log(`Remaining users: ${remaining.map((u) => u.name).join(", ") || "(none)"}`);

	return "Done!";
});
