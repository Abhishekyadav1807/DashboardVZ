import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '../utils/app-error';

/**
 * Role-based authorization middleware factory.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, authorizeRoles('ADMIN'), handler)
 *
 * This enforces "category-level" access: is this *type* of user allowed to
 * call this *category* of endpoint?  It does NOT enforce resource ownership.
 * Ownership checks happen in the service layer using the helpers in
 * `authorization.helpers.ts`.
 *
 * The role is read from `req.user.role`, which was populated by the
 * `authenticate` middleware from the JWT.  For critical mutations the
 * service layer verifies against the database role — this middleware is a
 * fast early-reject only.
 */
export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden('You do not have permission to perform this action.'));
      return;
    }

    next();
  };
}
