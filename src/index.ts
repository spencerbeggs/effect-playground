/**
 * Effect Playground - Library Exports
 *
 * This module re-exports all public APIs from the library:
 *
 * **Schemas** (data definitions)
 * - {@link User} - User entity schema
 *
 * **Services** (interfaces)
 * - {@link Logger} - Logging service with Live, Silent, and Test implementations
 * - {@link UserService} - User management service
 *
 * **Layers** (implementations)
 * - {@link UserServiceLive} - Requires Logger dependency
 * - {@link UserServiceWithLogging} - Pre-composed with Logger.Live
 * - {@link UserServiceSilent} - Pre-composed with Logger.Silent
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
 * myProgram.pipe(Effect.provide(UserServiceWithLogging));
 * ```
 *
 * @packageDocumentation
 */

// Programs
export { program } from "./apps/demo.js";

// Schemas
export { User } from "./schemas/UserSchema.js";

// Services + Layers
export type { LogEntry, LoggerTestInstance } from "./services/LoggerService.js";
export { Logger } from "./services/LoggerService.js";
export type { DeleteResult } from "./services/UserService.js";
export {
	DeleteResult as DeleteResultConstructors,
	UserNotFound,
	UserService,
	UserServiceLive,
	UserServiceSilent,
	UserServiceWithLogging,
} from "./services/UserService.js";
