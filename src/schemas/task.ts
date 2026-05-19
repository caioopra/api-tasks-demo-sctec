import '../openapi/registry'; // side-effect: extend Zod with `.openapi()`
import { z } from 'zod';

/**
 * Zod schema for the user-supplied portion of a task.
 *
 * Used by `POST /tasks` and `PUT /tasks/:id` to validate the request body.
 * Server-controlled fields (`id`, `created_at`) live on {@link taskSchema}
 * instead.
 *
 * - `title`: 1–100 chars, required.
 * - `priority`: one of `low | med | high`.
 *
 * Error messages are written in a user-facing tone because they flow straight
 * through the global error handler into the `{ error, status }` response.
 */
export const taskInputSchema = z
  .object({
    title: z
      .string({ required_error: 'title is required' })
      .min(1, 'title must have at least 1 character')
      .max(100, 'title must have at most 100 characters')
      .openapi({ example: 'Write the OpenAPI docs' }),
    priority: z
      .enum(['low', 'med', 'high'], {
        errorMap: () => ({ message: "priority must be one of: 'low', 'med', 'high'" }),
      })
      .openapi({ example: 'high' }),
  })
  .openapi('TaskInput');

/** Inferred type of the validated input — use this instead of hand-typing it. */
export type TaskInput = z.infer<typeof taskInputSchema>;

/**
 * A persisted task: {@link TaskInput} plus the fields the server owns.
 *
 * Defined as a Zod schema (rather than a bare TS interface) so it doubles as
 * the OpenAPI `Task` component. Runtime validators do not parse it today —
 * route handlers build `Task` objects directly — but having a schema keeps
 * the spec and the type in lockstep.
 *
 * - `id`: UUID v4 assigned by the route handler on create.
 * - `created_at`: ISO-8601 timestamp set on create, never updated.
 */
export const taskSchema = taskInputSchema
  .extend({
    id: z
      .string()
      .uuid()
      .openapi({ example: 'b3b0c4f8-9b6f-4a7e-9d6e-1b5b3c4d5e6f' }),
    created_at: z
      .string()
      .datetime()
      .openapi({ example: '2026-05-18T12:00:00.000Z' }),
  })
  .openapi('Task');

/** Inferred type of a persisted task — replaces the legacy `Task` interface. */
export type Task = z.infer<typeof taskSchema>;

/**
 * Query-string schema for `GET /tasks/search`.
 *
 * Lives here (instead of inline in the route file) so the OpenAPI generator
 * can reference it as a component and so the route module stays focused on
 * handlers. Both fields are optional, so the route degrades gracefully:
 * with no params it behaves like `GET /tasks`. An invalid `priority` is
 * rejected with 400 by the global error handler.
 */
export const taskSearchQuerySchema = z
  .object({
    priority: z
      .enum(['low', 'med', 'high'])
      .optional()
      .openapi({ example: 'high' }),
    q: z
      .string()
      .min(1, 'q must have at least 1 character')
      .max(100, 'q must have at most 100 characters')
      .optional()
      .openapi({ example: 'docs' }),
  })
  .openapi('TaskSearchQuery');

/**
 * Response shape of `GET /tasks/stats`.
 *
 * Keys under `byPriority` are stable so consumers can read the shape
 * unconditionally — counters default to 0 when there are no tasks of that
 * priority.
 */
export const taskStatsSchema = z
  .object({
    total: z.number().int().nonnegative().openapi({ example: 3 }),
    byPriority: z.object({
      low: z.number().int().nonnegative(),
      med: z.number().int().nonnegative(),
      high: z.number().int().nonnegative(),
    }),
  })
  .openapi('TaskStats');
