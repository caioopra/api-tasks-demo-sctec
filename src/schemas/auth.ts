import '../openapi/registry'; // side-effect: extend Zod with `.openapi()`
import { z } from 'zod';

/**
 * Credentials supplied by the client to `POST /auth/register` and
 * `POST /auth/login`. Same shape for both — registration mints a new user,
 * login verifies an existing one.
 *
 * Bounds are deliberately loose for an educational stub but still close to
 * what a real auth system enforces (email format + minimum password length).
 */
export const credentialsSchema = z
  .object({
    email: z
      .string({ required_error: 'email is required' })
      .email('email must be a valid address')
      .openapi({ example: 'ada@example.com' }),
    password: z
      .string({ required_error: 'password is required' })
      .min(8, 'password must have at least 8 characters')
      .max(72, 'password must have at most 72 characters')
      .openapi({ example: 'correct-horse-battery' }),
  })
  .openapi('Credentials');

/** Inferred type of validated credentials. */
export type Credentials = z.infer<typeof credentialsSchema>;

/**
 * Public projection of a user — never includes the password hash. This is
 * what auth responses embed and what {@link jwtMiddleware} attaches to
 * `req.user`.
 */
export const publicUserSchema = z
  .object({
    id: z
      .string()
      .uuid()
      .openapi({ example: 'b3b0c4f8-9b6f-4a7e-9d6e-1b5b3c4d5e6f' }),
    email: z.string().email().openapi({ example: 'ada@example.com' }),
  })
  .openapi('PublicUser');

/**
 * Response of `POST /auth/register` and `POST /auth/login`. The token is a
 * fake-JWT (see {@link signToken}) — same wire format as a real JWT but
 * signed with a hardcoded HMAC secret, suitable only for this demo.
 */
export const authResponseSchema = z
  .object({
    user: publicUserSchema,
    token: z
      .string()
      .openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIuLi4ifQ.signature' }),
  })
  .openapi('AuthResponse');
