import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

/**
 * Domain error carrying an HTTP status alongside its message.
 *
 * Throw this from a route handler when you want a specific status/message
 * pair to reach the client; {@link errorHandler} will translate it into the
 * canonical `{ error, status }` body.
 *
 * @example
 * if (!task) throw new HttpError(404, 'task not found');
 */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Express error-handling middleware. Must be registered last (see
 * {@link createApp}) so it runs after every route.
 *
 * All responses follow the `{ error: string, status: number }` shape
 * mandated by the project conventions. Dispatch rules:
 *
 * - {@link ZodError} → 400, message is the joined list of issue messages.
 * - {@link HttpError} → uses its own `status` and `message`.
 * - Anything else → 500. The real message leaks through in dev/test for
 *   debuggability, but is replaced with a generic `"Internal Server Error"`
 *   when `NODE_ENV === 'production'` to avoid leaking internals.
 *
 * @param err   - whatever was thrown / passed to `next(err)`.
 * @param _req  - unused; Express signature requires it.
 * @param res   - response used to emit the canonical error body.
 * @param _next - unused; required so Express recognises this as an error
 *                handler (4-arg signature).
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues.map((i) => i.message).join('; '), status: 400 });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, status: err.status });
    return;
  }

  // Hide internal error details in production; surface them in dev/test so the
  // educational examples remain debuggable.
  const message =
    env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err instanceof Error
        ? err.message
        : 'Internal Server Error';
  res.status(500).json({ error: message, status: 500 });
}
