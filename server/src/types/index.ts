/**
 * Shared backend type definitions and Express augmentations.
 *
 * Avoid adding types here that belong to a specific feature module — keep
 * those co-located with the feature. This file is for cross-cutting concerns
 * like request augmentation and common response shapes.
 */

// ─── User roles (mirrors Prisma enum — defined here for use before Phase 2) ──

import { UserRole } from '@prisma/client';

export { UserRole };

// ─── JWT payload shape ────────────────────────────────────────────────────────

export interface JwtAccessPayload {
  sub: string;   // user id
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Express request augmentation ────────────────────────────────────────────
// Re-exported here; the authenticate middleware will populate req.user in Phase 3.

declare global {
  namespace Express {
    interface Request {
      user?: JwtAccessPayload;
    }
  }
}

// ─── Standard API response shapes ─────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
