import '../openapi/registry'; // side-effect: extend Zod with `.openapi()`
import { z } from 'zod';

/**
 * Canonical error envelope returned by the global error handler.
 *
 * Every non-2xx response in this API follows this shape — enforced by
 * `src/middlewares/errorHandler.ts` and required by the project conventions
 * (see `CLAUDE.md`). Centralised here so OpenAPI references one definition
 * instead of inlining the same object on every operation.
 */
export const errorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'task not found' }),
    status: z.number().int().openapi({ example: 404 }),
  })
  .openapi('Error');
