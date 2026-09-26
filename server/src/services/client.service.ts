import { prisma } from '../config/database';
import { AuthorizedUser, getAuthorizedUser } from '../utils/authorization.helpers';
import { JwtAccessPayload, UserRole } from '../types';
import { AppError } from '../utils/app-error';

export class ClientService {
  /**
   * List clients — Admin and PM have access.
   */
  static async list(jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    if (user.role === UserRole.DEVELOPER) {
      throw AppError.forbidden('Developers cannot access client directory.');
    }

    return prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        contactInfo: true,
        createdAt: true,
      },
    });
  }

  /**
   * Create client — Admin only.
   */
  static async create(data: { name: string; email?: string; contactInfo?: string }, jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    if (user.role !== UserRole.ADMIN) {
      throw AppError.forbidden('Admin role required to create clients.');
    }

    return prisma.client.create({ data });
  }
}
