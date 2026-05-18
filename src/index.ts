import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(
    `[api-tasks-demo] (${env.NODE_ENV}) listening on http://localhost:${env.PORT}`,
  );
});
