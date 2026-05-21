import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/auth.service';
import { HttpError } from './errorHandler';

/**
 * Module augmentation: any handler that runs after {@link jwtMiddleware} can
 * read `req.user` with full type information. Declared globally so callers
 * don't need to import a custom Request type.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

/**
 * Express middleware that protects routes with a bearer token.
 *
 * Expects `Authorization: Bearer <token>` where `<token>` was minted by
 * {@link signToken}. On success, attaches the decoded user to `req.user` and
 * calls `next()`. On any failure throws an {@link HttpError} — the global
 * {@link errorHandler} converts it into the canonical `{ error, status }`
 * response.
 *
 * - 401 `missing or malformed Authorization header` — header absent or not
 *   in `Bearer <token>` form.
 * - 401 `invalid or expired token` — token failed signature/payload checks.
 */
export function jwtMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new HttpError(401, 'missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) {
    throw new HttpError(401, 'invalid or expired token');
  }
  req.user = { id: payload.sub, email: payload.email };
  next();
}
