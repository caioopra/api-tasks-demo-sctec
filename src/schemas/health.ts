import '../openapi/registry'; // side-effect: extend Zod with `.openapi()`
import { z } from 'zod';

/**
 * Response shape of `GET /` (liveness probe).
 *
 * Intentionally minimal — uptime monitors only need to confirm the process
 * answers. The literal `'ok'` lets OpenAPI document the exact value clients
 * can expect, rather than a generic string.
 */
export const healthResponseSchema = z
  .object({
    status: z.literal('ok').openapi({ example: 'ok' }),
  })
  .openapi('HealthResponse');
