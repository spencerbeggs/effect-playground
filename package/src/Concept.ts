import { Schema } from "effect";

/**
 * The Concept class is a schema-based representation of a concept.
 * It extends the Schema.Class to provide validation and type safety.
 * @public
 */
export class Concept extends Schema.Class<Concept>("Concept")(
	Schema.Struct({
		/** The name of the concept */
		name: Schema.String,
		/** The description of the concept */
		description: Schema.String,
	}),
) {
	fromString: Schema.Method<[string], Concept> = Schema.method((s) => {
		const [name, description] = s.split(":").map((part) => part.trim());
		return new Concept({ name, description });
	});
}
