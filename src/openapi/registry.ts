import { z } from 'zod';
import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

// Patch Zod with `.openapi()` exactly once at module load. The call is
// idempotent, but doing it here means any file that imports this module
// (directly, or via a side-effect import like `import '../openapi/registry'`)
// is guaranteed to have the extension applied before its own schemas evaluate.
extendZodWithOpenApi(z);

/**
 * Singleton OpenAPI registry shared across the app.
 *
 * Schemas, paths and security schemes register themselves against this
 * instance (typically via `registry.register(...)` and `registry.registerPath(...)`
 * at module load time). The {@link ./generate.ts} script then reads the
 * registry and emits the `openapi.json` document consumed by Swagger UI.
 *
 * Keep a single registry per process — the generator walks its `definitions`
 * to produce the document, so anything not registered here is invisible to
 * the spec.
 */
export const registry = new OpenAPIRegistry();
