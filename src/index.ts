/**
 * Process entrypoint.
 *
 * Imports the validated {@link env} (which also triggers `dotenv/config`),
 * builds the app via {@link createApp}, and starts listening on `env.PORT`.
 * Kept intentionally thin so the app itself stays testable in isolation.
 */
import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(
    `[api-tasks-demo] (${env.NODE_ENV}) listening on http://localhost:${env.PORT}`,
  );
});
