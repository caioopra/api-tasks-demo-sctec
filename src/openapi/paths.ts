import { z } from 'zod';
import { registry } from './registry';
import {
  taskInputSchema,
  taskSchema,
  taskSearchQuerySchema,
  taskShareSchema,
  taskStatsSchema,
} from '../schemas/task';
import { healthResponseSchema } from '../schemas/health';
import { errorResponseSchema } from '../schemas/error';
import {
  authResponseSchema,
  credentialsSchema,
  publicUserSchema,
} from '../schemas/auth';

/**
 * Path and component registrations for the OpenAPI spec.
 *
 * Imported for its side-effects: every `registry.register*` call below
 * mutates the singleton from {@link ./registry}, so that by the time
 * {@link ./generate.ts} reads `registry.definitions` the components and
 * paths are present.
 *
 * Conventions used here:
 *
 * - `tags` group operations in the Swagger UI sidebar.
 * - Every non-2xx response references {@link errorResponseSchema} because
 *   the global error handler enforces `{ error, status }` for the whole API.
 * - `500` is documented on every route as the catch-all path through that
 *   handler (e.g. `express.json()` SyntaxError on a malformed body, or any
 *   unexpected throw). Concrete code paths to `400` and `404` come from
 *   `errorHandler.ts`: `ZodError → 400`, `HttpError → its status`.
 */

// --- Component registrations -----------------------------------------------

registry.register('TaskInput', taskInputSchema);
registry.register('Task', taskSchema);
registry.register('TaskSearchQuery', taskSearchQuerySchema);
registry.register('TaskShare', taskShareSchema);
registry.register('TaskStats', taskStatsSchema);
registry.register('HealthResponse', healthResponseSchema);
registry.register('Error', errorResponseSchema);
registry.register('Credentials', credentialsSchema);
registry.register('PublicUser', publicUserSchema);
registry.register('AuthResponse', authResponseSchema);

// Bearer-token scheme used by every `/tasks` operation. The token format is
// the fake-JWT minted by `auth.service.signToken` — same wire shape as a
// real JWT, see Auth → POST /auth/login.
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// --- Helpers ---------------------------------------------------------------

const jsonContent = (schema: z.ZodTypeAny) => ({
  'application/json': { schema },
});

const errorResponse = (description: string) => ({
  description,
  content: jsonContent(errorResponseSchema),
});

const internalServerError = errorResponse(
  'Internal server error — catch-all branch of the global error handler.',
);

const unauthorizedResponse = errorResponse(
  'Authorization header is missing, malformed, or carries an invalid token.',
);

const tasksSecurity = [{ bearerAuth: [] }];

const idParam = z.object({
  id: z
    .string()
    .openapi({ example: 'b3b0c4f8-9b6f-4a7e-9d6e-1b5b3c4d5e6f' }),
});

// --- Paths -----------------------------------------------------------------

registry.registerPath({
  method: 'get',
  path: '/',
  tags: ['Health'],
  summary: 'Liveness probe',
  description:
    'Cheap, dependency-free check used by uptime monitors and smoke tests. Returns as soon as the process can answer; touches no external dependencies.',
  responses: {
    200: {
      description: 'Process is alive.',
      content: jsonContent(healthResponseSchema),
    },
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'get',
  path: '/tasks',
  tags: ['Tasks'],
  summary: 'List all tasks',
  description:
    'Returns every task currently in the in-memory store, in insertion order. Returns an empty array when no tasks exist.',
  security: tasksSecurity,
  responses: {
    200: {
      description: 'Array of tasks (possibly empty).',
      content: jsonContent(z.array(taskSchema)),
    },
    401: unauthorizedResponse,
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'get',
  path: '/tasks/search',
  tags: ['Tasks'],
  summary: 'Search tasks',
  description:
    'Filter tasks by priority and/or a case-insensitive substring of the title. Both query params are optional; with neither, the route behaves like GET /tasks. Filters compose with AND semantics.',
  security: tasksSecurity,
  request: {
    query: taskSearchQuerySchema,
  },
  responses: {
    200: {
      description: 'Matching tasks (possibly empty).',
      content: jsonContent(z.array(taskSchema)),
    },
    400: errorResponse(
      'A query value failed validation (e.g. unknown priority, or `q` outside 1–100 chars).',
    ),
    401: unauthorizedResponse,
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'get',
  path: '/tasks/stats',
  tags: ['Tasks'],
  summary: 'Task counts by priority',
  description:
    'Aggregate counters over the task store: total count plus a breakdown by priority. All keys under `byPriority` are present even when there are no tasks (counters at 0), so consumers can read the shape unconditionally.',
  security: tasksSecurity,
  responses: {
    200: {
      description: 'Aggregate counters.',
      content: jsonContent(taskStatsSchema),
    },
    401: unauthorizedResponse,
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'get',
  path: '/tasks/{id}',
  tags: ['Tasks'],
  summary: 'Get a single task',
  description:
    'Fetch one task by its id. The id is whatever was returned on create; in this demo it is always a UUID v4 produced by the server. Reads are served through the cache stub with a 60-second TTL.',
  security: tasksSecurity,
  request: {
    params: idParam,
  },
  responses: {
    200: {
      description: 'Task found.',
      content: jsonContent(taskSchema),
    },
    401: unauthorizedResponse,
    404: errorResponse('No task exists with the given id.'),
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'post',
  path: '/tasks',
  tags: ['Tasks'],
  summary: 'Create a task',
  description:
    'Create a new task. The server owns `id` (UUID v4) and `created_at` (ISO-8601, UTC); the client only supplies `title` and `priority`. On success the task is also published to the queue stub under the routing key `task.created`.',
  security: tasksSecurity,
  request: {
    body: {
      required: true,
      content: jsonContent(taskInputSchema),
    },
  },
  responses: {
    201: {
      description: 'Task created.',
      content: jsonContent(taskSchema),
    },
    400: errorResponse(
      'Body failed validation (missing/empty `title`, title over 100 chars, unknown `priority`, ...).',
    ),
    401: unauthorizedResponse,
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'put',
  path: '/tasks/{id}',
  tags: ['Tasks'],
  summary: 'Replace a task',
  description:
    "Replace the user-supplied fields of an existing task. Server-owned fields (`id`, `created_at`) are preserved and cannot be overwritten by the client. The cached entry for this id is invalidated.",
  security: tasksSecurity,
  request: {
    params: idParam,
    body: {
      required: true,
      content: jsonContent(taskInputSchema),
    },
  },
  responses: {
    200: {
      description: 'Task updated.',
      content: jsonContent(taskSchema),
    },
    400: errorResponse('Body failed validation.'),
    401: unauthorizedResponse,
    404: errorResponse('No task exists with the given id.'),
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'post',
  path: '/tasks/{id}/share',
  tags: ['Tasks'],
  summary: 'Share a task',
  description:
    'Produce a stateless snapshot of a task suitable for forwarding to a third party. The response embeds the task, the caller (`shared_by.email`, read from the JWT) and a server-generated `shared_at` timestamp. Nothing is persisted and the cache is neither read nor written — each call yields a fresh snapshot.',
  security: tasksSecurity,
  request: {
    params: idParam,
  },
  responses: {
    200: {
      description: 'Snapshot of the task plus sharing provenance.',
      content: jsonContent(taskShareSchema),
    },
    401: unauthorizedResponse,
    404: errorResponse('No task exists with the given id.'),
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'delete',
  path: '/tasks/{id}',
  tags: ['Tasks'],
  summary: 'Delete a task',
  description:
    'Remove a task by id. Returns 204 with no body on success. The cached entry for this id is evicted.',
  security: tasksSecurity,
  request: {
    params: idParam,
  },
  responses: {
    204: {
      description: 'Task deleted.',
    },
    401: unauthorizedResponse,
    404: errorResponse('No task exists with the given id.'),
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Auth'],
  summary: 'Register a new user',
  description:
    'Create an account and return a fake-JWT. Emails are stored lowercase; subsequent logins are case-insensitive. The token shape matches a real JWT but is signed with a hardcoded HMAC secret — for demo purposes only.',
  request: {
    body: {
      required: true,
      content: jsonContent(credentialsSchema),
    },
  },
  responses: {
    201: {
      description: 'Account created.',
      content: jsonContent(authResponseSchema),
    },
    400: errorResponse('Body failed validation (bad email, short password, ...).'),
    409: errorResponse('Email already registered.'),
    500: internalServerError,
  },
});

registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Exchange credentials for a token',
  description:
    'Verify credentials and return a fake-JWT to use as `Authorization: Bearer <token>` against `/tasks`. The 401 message is the same whether the email is unknown or the password is wrong.',
  request: {
    body: {
      required: true,
      content: jsonContent(credentialsSchema),
    },
  },
  responses: {
    200: {
      description: 'Authentication succeeded.',
      content: jsonContent(authResponseSchema),
    },
    400: errorResponse('Body failed validation.'),
    401: errorResponse('Email unknown or password did not match.'),
    500: internalServerError,
  },
});
