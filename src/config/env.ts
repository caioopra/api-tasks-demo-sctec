import 'dotenv/config';
import { z } from 'zod';

/**
 * Schema for the environment variables this app understands.
 *
 * - `PORT`: HTTP port the server binds to. Coerced from string (since
 *   `process.env` values are always strings), required to be a positive
 *   integer, defaults to `3000`.
 * - `NODE_ENV`: execution mode. Restricted to `development | test | production`
 *   so other modules can branch on it safely. Defaults to `development`.
 *
 * @see env  - the parsed, validated singleton consumers should import.
 */
const envSchema = z.object({
  PORT: z.coerce
    .number({ invalid_type_error: 'PORT must be a number' })
    .int()
    .positive()
    .default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Secret used to sign the fake-JWT tokens minted by `auth.service`. The
  // default is intentionally a placeholder — fine for the demo, override in
  // any real environment via `.env`.
  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('insecure-dev-secret-please-override'),
});

/**
 * Parsed and validated environment configuration.
 *
 * Importing this module triggers `dotenv/config`, which loads variables from
 * a local `.env` file (if present) into `process.env`. The schema then parses
 * `process.env` once at startup so the rest of the codebase can rely on typed,
 * validated values instead of touching `process.env` directly.
 *
 * Throws a `ZodError` at startup if any value fails validation — fail fast
 * is preferred over surfacing config bugs from deep inside a request handler.
 */
export const env = envSchema.parse(process.env);

/** Typed shape of {@link env}, derived from {@link envSchema}. */
export type Env = z.infer<typeof envSchema>;
