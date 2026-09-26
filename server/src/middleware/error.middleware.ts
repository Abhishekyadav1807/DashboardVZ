import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';
import { buildError } from '../utils/api-response.js';
import { env } from '../config/env.js';

/**
 * Centralized error handler — must be the LAST middleware registered in app.ts.
 *
 * Handles three classes of error:
 *  1. ZodError   — validation failure from any route handler; mapped to 400
 *  2. AppError   — intentional application error with a known HTTP status
 *  3. Everything else — treated as an unexpected 500; stack only logged server-side
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const message = err.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    res.status(400).json(buildError('VALIDATION_ERROR', message));
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json(buildError(err.code, err.message));
    return;
  }

  // Unexpected error — log internally, never expose internals to the client
  console.error('[unhandled error]', err);
  const message =
    env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'An unexpected error occurred.';

  res.status(500).json(buildError('INTERNAL_ERROR', message));
}
