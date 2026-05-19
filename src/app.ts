import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import { healthRouter } from './routes/health';
import { tasksRouter } from './routes/tasks';
import { errorHandler } from './middlewares/errorHandler';

/**
 * Load the generated OpenAPI document from disk.
 *
 * The file is produced by `npm run docs:gen` (see `src/openapi/generate.ts`)
 * and is intentionally not part of the TS build — it lives at the project
 * root so the script and the runtime agree on a single location.
 *
 * Returns `null` (and logs a warning) when the file is missing, so a fresh
 * checkout can still boot via `npm run dev` before docs are generated.
 */
function loadOpenApiDoc(): Record<string, unknown> | null {
  const docPath = resolve(process.cwd(), 'openapi.json');
  if (!existsSync(docPath)) {
    console.warn(
      '[openapi] openapi.json not found — /docs disabled. Run `npm run docs:gen` to generate it.',
    );
    return null;
  }
  return JSON.parse(readFileSync(docPath, 'utf8')) as Record<string, unknown>;
}

/**
 * Build a fresh Express {@link Application} with all middleware and routes
 * wired up.
 *
 * Kept as a factory (instead of a module-level singleton) so the test suite
 * can mount the app under `supertest` without binding to a real port. The
 * order below matters:
 *
 * 1. `express.json()` first, so handlers receive a parsed body.
 * 2. Swagger UI at `/docs` (only if `openapi.json` is present).
 * 3. Feature routers next (`/`, `/tasks`).
 * 4. {@link errorHandler} last, so it catches errors thrown by any route.
 *
 * @returns a new, ready-to-listen Express app.
 */
export function createApp(): Application {
  const app = express();

  app.use(express.json());

  const openApiDoc = loadOpenApiDoc();
  if (openApiDoc) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
  }

  app.use('/', healthRouter);
  app.use('/tasks', tasksRouter);

  app.use(errorHandler);

  return app;
}
