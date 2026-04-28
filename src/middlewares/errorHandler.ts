import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues.map((i) => i.message).join('; '), status: 400 });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, status: err.status });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({ error: message, status: 500 });
}
