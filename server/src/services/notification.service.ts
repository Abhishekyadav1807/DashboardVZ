import { NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { getAuthorizedUser } from '../utils/authorization.helpers';
import { JwtAccessPayload } from '../types';
import { AppError } from '../utils/app-error';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
}

export class NotificationService {
  /**
   * Create a notification in the database and return it.
   */
  static async create(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        taskId: input.taskId,
      },
    });
  }

  /**
   * List notifications for the authenticated user, along with unread count.
   */
  static async list(jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  /**
   * Mark a single notification as read, ensuring ownership.
   */
  static async markAsRead(id: string, jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== user.id) {
      throw AppError.notFound('Notification');
    }

    return prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for the authenticated user.
   */
  static async markAllAsRead(jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);

    return prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
  }
}
