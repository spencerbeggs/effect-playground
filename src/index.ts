/**
 * Effect Playground - Library Exports
 *
 * This module re-exports all public APIs from the library:
 *
 * **Schemas** (data definitions)
 * - {@link User} - User entity schema
 *
 * **Services** (interfaces)
 * - {@link Logger} - Logging service with `layer`, `layerSilent`, and `makeTest`
 * - {@link UserService} - User management service
 *
 * **Layers** (attached to the service classes, per the v4 convention)
 * - `UserService.layer` - Requires Logger dependency
 * - `UserService.layerWithLogging` - Pre-composed with `Logger.layer`
 * - `UserService.layerSilent` - Pre-composed with `Logger.layerSilent`
 *
 * **Programs**
 * - {@link program} - Demo program showcasing the patterns
 *
 * @example
 * ```ts
 * import { Effect } from "effect";
 * import { UserService, UserServiceWithLogging } from "./index.js";
 *
 * const myProgram = Effect.gen(function* () {
 *   const users = yield* UserService;
 *   return yield* users.create("Alice");
 * });
 *
 * myProgram.pipe(Effect.provide(UserService.layerWithLogging));
 * ```
 *
 * @packageDocumentation
 */

// Programs
export { program } from "./apps/demo.js";

// Schemas
export { User } from "./schemas/UserSchema.js";

// Services + Layers
export type { LogEntry, LoggerShape, LoggerTestInstance } from "./services/LoggerService.js";
export { Logger } from "./services/LoggerService.js";
export type { DeleteResult, UserServiceShape } from "./services/UserService.js";
export { DeleteResult as DeleteResultConstructors, UserNotFound, UserService } from "./services/UserService.js";
