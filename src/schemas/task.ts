import { z } from 'zod';

/**
 * Zod schema for the user-supplied portion of a task.
 *
 * Used by `POST /tasks` and `PUT /tasks/:id` to validate the request body.
 * Server-controlled fields (`id`, `created_at`) live on {@link Task} instead.
 *
 * - `title`: 1–100 chars, required.
 * - `priority`: one of `low | med | high`.
 *
 * Error messages are written in a user-facing tone because they flow straight
 * through the global error handler into the `{ error, status }` response.
 */
export const taskInputSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .min(1, 'title must have at least 1 character')
    .max(100, 'title must have at most 100 characters'),
  priority: z.enum(['low', 'med', 'high'], {
    errorMap: () => ({ message: "priority must be one of: 'low', 'med', 'high'" }),
  }),
});

/** Inferred type of the validated input — use this instead of hand-typing it. */
export type TaskInput = z.infer<typeof taskInputSchema>;

/**
 * A persisted task, i.e. {@link TaskInput} plus the fields the server owns.
 *
 * - `id`: UUID assigned by the route handler on create.
 * - `created_at`: ISO-8601 timestamp set on create, never updated.
 */
export interface Task extends TaskInput {
  id: string;
  created_at: string;
}
