import { Console, Effect } from "effect";

// A simple Effect program that demonstrates basic patterns
const program = Effect.gen(function* () {
	yield* Console.log("Hello from Effect!");

	const result = yield* Effect.succeed(42);
	yield* Console.log(`The answer is: ${result}`);

	return result;
});

// Run the program
Effect.runPromise(program).then((result) => {
	console.log(`Program completed with: ${result}`);
});
