import express, { Application } from 'express';
import { healthRouter } from './routes/health';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): Application {
  const app = express();

  app.use(express.json());

  app.use('/', healthRouter);

  app.use(errorHandler);

  return app;
}
