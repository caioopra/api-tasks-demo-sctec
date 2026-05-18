import { Router, Request, Response } from 'express';

/**
 * Router for liveness/health endpoints. Mounted at `/` in {@link createApp}
 * so probes can hit `GET /` without going through the `/tasks` namespace.
 */
export const healthRouter = Router();

/**
 * `GET /` — liveness probe.
 *
 * Cheap, dependency-free check used by uptime monitors and smoke tests.
 *
 * @returns 200 with `{ status: 'ok' }` whenever the process can answer.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});
