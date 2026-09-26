import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import { JwtAccessPayload } from '../types';

// ─── Types used by authorization helpers ──────────────────────────────────────

/** Minimal shape of a verified user — always fetched from the database. */
export interface AuthorizedUser {
  id: string;
  role: UserRole;
}

// ─── Database-verified user loader ────────────────────────────────────────────

/**
 * Load the current user from the database using the JWT payload.
 * This is the single authoritative source for identity and role.
 * It MUST be called before any ownership check so that:
 *   1. The user still exists (not deleted between token issuance and now).
 *   2. The role in the database is authoritative, not the JWT claim.
 */
export async function getAuthorizedUser(jwtPayload: JwtAccessPayload): Promise<AuthorizedUser> {
  const user = await prisma.user.findUnique({
    where: { id: jwtPayload.sub },
    select: { id: true, role: true },
  });

  if (!user) {
    throw AppError.unauthorized('User no longer exists.');
  }

  return user;
}

// ─── Role assertion helpers ───────────────────────────────────────────────────

export function assertAdmin(user: AuthorizedUser): void {
  if (user.role !== UserRole.ADMIN) {
    throw AppError.forbidden('Admin access required.');
  }
}

export function assertProjectManager(user: AuthorizedUser): void {
  if (user.role !== UserRole.PROJECT_MANAGER) {
    throw AppError.forbidden('Project manager access required.');
  }
}

// ─── Project ownership ───────────────────────────────────────────────────────

/**
 * Fetch a project with an ownership constraint baked into the query.
 *
 * For ADMIN  → returns the project unconditionally.
 * For PM     → returns the project only if createdById matches.
 * For DEV    → always 404 (developers don't access projects directly).
 *
 * Returns null if not found or unauthorized (404 strategy: don't leak existence).
 */
export async function getProjectWithOwnership(
  projectId: string,
  user: AuthorizedUser,
) {
  if (user.role === UserRole.ADMIN) {
    return prisma.project.findUnique({ where: { id: projectId } });
  }

  if (user.role === UserRole.PROJECT_MANAGER) {
    // WHERE id = projectId AND createdById = userId — single atomic query
    return prisma.project.findFirst({
      where: {
        id: projectId,
        createdById: user.id,
      },
    });
  }

  // DEVELOPER or unknown role → no project access
  return null;
}

/**
 * Assert that a project exists and the user owns it.
 * Throws 404 if not found or not owned (no existence leaking).
 */
export async function assertProjectOwner(
  projectId: string,
  user: AuthorizedUser,
) {
  const project = await getProjectWithOwnership(projectId, user);
  if (!project) {
    throw AppError.notFound('Project');
  }
  return project;
}

// ─── Task ownership ──────────────────────────────────────────────────────────

/**
 * Fetch a task with authorization constraints baked into the query.
 *
 * For ADMIN  → returns the task unconditionally.
 * For PM     → returns the task only if the parent project is owned by the PM.
 * For DEV    → returns the task only if assigned to the developer.
 *
 * Returns null if not found or unauthorized (404 strategy).
 */
export async function getTaskWithOwnership(
  taskId: string,
  user: AuthorizedUser,
) {
  if (user.role === UserRole.ADMIN) {
    return prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
  }

  if (user.role === UserRole.PROJECT_MANAGER) {
    // Task must belong to a project created by this PM
    return prisma.task.findFirst({
      where: {
        id: taskId,
        project: { createdById: user.id },
      },
      include: { project: true },
    });
  }

  if (user.role === UserRole.DEVELOPER) {
    // Task must be assigned to this developer
    return prisma.task.findFirst({
      where: {
        id: taskId,
        assignedDeveloperId: user.id,
      },
      include: { project: true },
    });
  }

  return null;
}

/**
 * Assert that a task exists and the user is authorized to access it.
 * Throws 404 if not found or not authorized (no existence leaking).
 */
export async function assertTaskAccess(
  taskId: string,
  user: AuthorizedUser,
) {
  const task = await getTaskWithOwnership(taskId, user);
  if (!task) {
    throw AppError.notFound('Task');
  }
  return task;
}

// ─── Server-side filtered lists ──────────────────────────────────────────────

/**
 * Build a Prisma `where` clause for listing projects, scoped to the user's
 * authorization level.  Used by the project list endpoint.
 */
export function buildProjectWhereClause(user: AuthorizedUser) {
  if (user.role === UserRole.ADMIN) {
    return {};
  }
  if (user.role === UserRole.PROJECT_MANAGER) {
    return { createdById: user.id };
  }
  // Developers don't list projects directly.
  // If a developer endpoint needs project data, it goes through tasks.
  throw AppError.forbidden('You do not have permission to list projects.');
}

/**
 * Build a Prisma `where` clause for listing tasks, scoped to the user's
 * authorization level.  Used by the task list endpoint.
 */
export function buildTaskWhereClause(user: AuthorizedUser, projectId?: string) {
  if (user.role === UserRole.ADMIN) {
    return projectId ? { projectId } : {};
  }

  if (user.role === UserRole.PROJECT_MANAGER) {
    // Only tasks belonging to projects this PM created
    const clause: Record<string, unknown> = {
      project: { createdById: user.id },
    };
    if (projectId) clause['projectId'] = projectId;
    return clause;
  }

  if (user.role === UserRole.DEVELOPER) {
    // Only tasks assigned to this developer
    const clause: Record<string, unknown> = {
      assignedDeveloperId: user.id,
    };
    if (projectId) clause['projectId'] = projectId;
    return clause;
  }

  throw AppError.forbidden('You do not have permission to list tasks.');
}
