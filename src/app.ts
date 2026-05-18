import express, { Application } from 'express';
import { healthRouter } from './routes/health';
import { tasksRouter } from './routes/tasks';
import { errorHandler } from './middlewares/errorHandler';

/**
 * Build a fresh Express {@link Application} with all middleware and routes
 * wired up.
 *
 * Kept as a factory (instead of a module-level singleton) so the test suite
 * can mount the app under `supertest` without binding to a real port. The
 * order below matters:
 *
 * 1. `express.json()` first, so handlers receive a parsed body.
 * 2. Feature routers next (`/`, `/tasks`).
 * 3. {@link errorHandler} last, so it catches errors thrown by any route.
 *
 * @returns a new, ready-to-listen Express app.
 */
export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.use('/', healthRouter);
  app.use('/tasks', tasksRouter);

  app.use(errorHandler);

  return app;
}
