import { ActivityAction } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import {
  AuthorizedUser,
  getAuthorizedUser,
  assertProjectOwner,
  buildProjectWhereClause,
} from '../utils/authorization.helpers';
import { JwtAccessPayload, UserRole } from '../types';
import { ActivityService } from './activity.service';
import { broadcastActivity } from '../socket';

export class ProjectService {
  /**
   * Create a project — ADMIN and PROJECT_MANAGER only.
   */
  static async create(
    data: { name: string; description?: string; clientId: string },
    jwtPayload: JwtAccessPayload,
  ) {
    const user = await getAuthorizedUser(jwtPayload);
    if (user.role === UserRole.DEVELOPER) {
      throw AppError.forbidden('Developers cannot create projects.');
    }

    if (!data.name || !data.clientId) {
      throw AppError.badRequest('Project name and clientId are required.');
    }

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        clientId: data.clientId,
        createdById: user.id,
      },
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    const activity = await ActivityService.record({
      userId: user.id,
      projectId: project.id,
      action: ActivityAction.PROJECT_CREATED,
      details: `Created project "${project.name}"`,
    });

    broadcastActivity(
      { ...activity, formattedMessage: ActivityService.formatMessage(activity) },
      project.id,
      user.id,
    );

    return project;
  }

  /**
   * List projects — scoped to authorization.
   * ADMIN sees all, PM sees only their own.
   */
  static async list(jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    const where = buildProjectWhereClause(user);

    return prisma.project.findMany({
      where,
      include: {
        client: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single project — with ownership enforcement.
   */
  static async getById(projectId: string, jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    return assertProjectOwner(projectId, user);
  }

  /**
   * Update a project — with ownership enforcement.
   * Only ADMIN or the PM who created it may update.
   * The `createdById` field is NEVER updatable from client input.
   */
  static async update(
    projectId: string,
    data: { name?: string; description?: string },
    jwtPayload: JwtAccessPayload,
  ) {
    const user = await getAuthorizedUser(jwtPayload);
    await assertProjectOwner(projectId, user);

    const safeData = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    };

    return prisma.project.update({
      where: { id: projectId },
      data: safeData,
    });
  }

  /**
   * Delete a project — with ownership enforcement.
   */
  static async delete(projectId: string, jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    await assertProjectOwner(projectId, user);

    return prisma.project.delete({ where: { id: projectId } });
  }
}
