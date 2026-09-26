import type { Response } from 'express';
import type { ApiSuccess, ApiError } from '../types/index.js';

/**
 * Send a structured success response.
 * Controllers should use this instead of calling res.json() directly so that
 * the envelope shape stays consistent across the whole API.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(statusCode).json(body);
}

/**
 * Build a structured error payload.
 * Used internally by the error middleware; controllers should throw/pass errors
 * rather than calling this directly.
 */
export function buildError(code: string, message: string): ApiError {
  return { success: false, error: { code, message } };
}
