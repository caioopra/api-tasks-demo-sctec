import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

// Side-effect import: loads every `registry.register*` call for the current
// API surface. Must come BEFORE the `OpenApiGeneratorV31` constructor reads
// `registry.definitions`. Add more side-effect imports here as new feature
// areas adopt the registry.
import './paths';

/**
 * Build-time script: emits `openapi.json` at the project root from whatever
 * is currently registered in the global {@link registry}.
 *
 * Run via `npm run docs:gen`. Re-run whenever schemas or routes change so
 * the served Swagger UI (`/docs`) stays in sync with the code.
 */

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'api-tasks-demo',
    version: '0.1.0',
    description:
      'API de tarefas (demo) — Node.js + Express + TypeScript + Zod',
  },
});

const outPath = resolve(process.cwd(), 'openapi.json');
writeFileSync(outPath, JSON.stringify(document, null, 2) + '\n', 'utf8');

console.log(`[openapi] wrote ${outPath}`);
