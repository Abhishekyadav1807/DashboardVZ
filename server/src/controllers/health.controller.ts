import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/api-response.js';

/**
 * GET /api/health
 *
 * Lightweight liveness check — confirms the process is running and accepting
 * HTTP connections. No DB check here; a dedicated readiness probe will be
 * added in a later phase when the Prisma client exists.
 */
export function healthCheck(_req: Request, res: Response): void {
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'velozity-api',
  });
}
