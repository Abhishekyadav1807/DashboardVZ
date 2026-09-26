import { prisma } from '../config/database';
import { getAuthorizedUser } from '../utils/authorization.helpers';
import { JwtAccessPayload, UserRole } from '../types';
import { AppError } from '../utils/app-error';

export class UserService {
  /**
   * List all developers — accessible by Admin and PM for task assignment.
   */
  static async listDevelopers(jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    if (user.role === UserRole.DEVELOPER) {
      throw AppError.forbidden('Developers cannot access developer directory.');
    }

    return prisma.user.findMany({
      where: { role: UserRole.DEVELOPER },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * List all users — Admin only.
   */
  static async listAll(jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    if (user.role !== UserRole.ADMIN) {
      throw AppError.forbidden('Admin role required to view all users.');
    }

    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            assignedTasks: true,
            projectsCreated: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
