import { TaskStatus, TaskPriority, ActivityAction, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/app-error';
import {
  AuthorizedUser,
  getAuthorizedUser,
  assertTaskAccess,
  assertProjectOwner,
  buildTaskWhereClause,
} from '../utils/authorization.helpers';
import { JwtAccessPayload, UserRole } from '../types';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { broadcastActivity, broadcastTaskUpdate, emitNotificationToUser } from '../socket';

export interface TaskFilterOptions {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  endDate?: string;
}

export class TaskService {
  /**
   * Create task — ADMIN and PROJECT_MANAGER only (scoped to owned projects).
   */
  static async create(
    data: {
      projectId: string;
      title: string;
      description?: string;
      priority?: TaskPriority;
      dueDate?: string;
      assignedDeveloperId?: string;
    },
    jwtPayload: JwtAccessPayload,
  ) {
    const user = await getAuthorizedUser(jwtPayload);
    if (user.role === UserRole.DEVELOPER) {
      throw AppError.forbidden('Developers cannot create tasks.');
    }

    if (!data.title || !data.projectId) {
      throw AppError.badRequest('Task title and projectId are required.');
    }

    // Verify ownership of the parent project
    const project = await assertProjectOwner(data.projectId, user);

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        projectId: data.projectId,
        priority: data.priority || TaskPriority.MEDIUM,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedDeveloperId: data.assignedDeveloperId || null,
      },
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignedDeveloper: { select: { id: true, name: true, email: true } },
      },
    });

    // 1. Record task created activity
    const activity = await ActivityService.record({
      userId: user.id,
      projectId: task.projectId,
      taskId: task.id,
      action: ActivityAction.TASK_CREATED,
      details: `Created task "${task.title}"`,
    });

    broadcastActivity(
      { ...activity, formattedMessage: ActivityService.formatMessage(activity) },
      task.projectId,
      project.createdById,
      task.assignedDeveloperId,
    );
    broadcastTaskUpdate(task);

    // 2. If assigned to developer on creation, notify developer
    if (task.assignedDeveloperId) {
      const notif = await NotificationService.create({
        userId: task.assignedDeveloperId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned',
        message: `You were assigned to "${task.title}" in project "${task.project.name}".`,
        taskId: task.id,
      });
      emitNotificationToUser(task.assignedDeveloperId, notif);
    }

    return task;
  }

  /**
   * List tasks — scoped to authorization with filter support.
   */
  static async list(jwtPayload: JwtAccessPayload, filters: TaskFilterOptions = {}) {
    const user = await getAuthorizedUser(jwtPayload);
    const baseWhere = buildTaskWhereClause(user, filters.projectId);

    const where: any = { ...baseWhere };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.startDate || filters.endDate) {
      where.dueDate = {};
      if (filters.startDate) where.dueDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.dueDate.lte = new Date(filters.endDate);
    }

    return prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignedDeveloper: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single task — with ownership enforcement.
   */
  static async getById(taskId: string, jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    return assertTaskAccess(taskId, user);
  }

  /**
   * Update task status — records status history, activity, and sends notifications.
   */
  static async updateStatus(
    taskId: string,
    newStatus: TaskStatus,
    jwtPayload: JwtAccessPayload,
  ) {
    const user = await getAuthorizedUser(jwtPayload);
    const task = await assertTaskAccess(taskId, user);

    const previousStatus = task.status;

    if (user.role === UserRole.DEVELOPER) {
      const isValidTransition =
        (previousStatus === TaskStatus.TODO && newStatus === TaskStatus.IN_PROGRESS) ||
        (previousStatus === TaskStatus.IN_PROGRESS && newStatus === TaskStatus.IN_REVIEW) ||
        (previousStatus === TaskStatus.IN_REVIEW && newStatus === TaskStatus.DONE);

      if (!isValidTransition) {
        throw AppError.badRequest('Invalid status transition. Developers must follow sequential workflow.');
      }
    }

    // Record status history in DB
    await prisma.taskStatusHistory.create({
      data: {
        taskId,
        changedById: user.id,
        previousStatus,
        newStatus,
      },
    });

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus },
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignedDeveloper: { select: { id: true, name: true, email: true } },
      },
    });

    // Record activity event
    const activity = await ActivityService.record({
      userId: user.id,
      projectId: updatedTask.projectId,
      taskId: updatedTask.id,
      action: ActivityAction.TASK_STATUS_UPDATED,
      previousStatus,
      newStatus,
    });

    // Real-time broadcast
    broadcastActivity(
      { ...activity, formattedMessage: ActivityService.formatMessage(activity) },
      updatedTask.projectId,
      updatedTask.project.createdById,
      updatedTask.assignedDeveloperId,
    );
    broadcastTaskUpdate(updatedTask);

    // If moved to IN_REVIEW, notify the PM who owns the project
    if (newStatus === TaskStatus.IN_REVIEW && updatedTask.project.createdById) {
      const notif = await NotificationService.create({
        userId: updatedTask.project.createdById,
        type: NotificationType.TASK_IN_REVIEW,
        title: 'Task Ready for Review',
        message: `Task "${updatedTask.title}" has been moved to In Review.`,
        taskId: updatedTask.id,
      });
      emitNotificationToUser(updatedTask.project.createdById, notif);
    }

    return updatedTask;
  }

  /**
   * Full task update — only for ADMIN / PM.
   */
  static async update(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dueDate?: string;
      assignedDeveloperId?: string | null;
    },
    jwtPayload: JwtAccessPayload,
  ) {
    const user = await getAuthorizedUser(jwtPayload);

    if (user.role === UserRole.DEVELOPER) {
      throw AppError.forbidden('Developers can only update task status.');
    }

    const task = await assertTaskAccess(taskId, user);

    const safeData: Record<string, unknown> = {};
    if (data.title !== undefined) safeData['title'] = data.title;
    if (data.description !== undefined) safeData['description'] = data.description;
    if (data.status !== undefined) safeData['status'] = data.status;
    if (data.priority !== undefined) safeData['priority'] = data.priority;
    if (data.dueDate !== undefined) safeData['dueDate'] = data.dueDate ? new Date(data.dueDate) : null;
    if (data.assignedDeveloperId !== undefined) safeData['assignedDeveloperId'] = data.assignedDeveloperId;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: safeData,
      include: {
        project: { select: { id: true, name: true, createdById: true } },
        assignedDeveloper: { select: { id: true, name: true, email: true } },
      },
    });

    broadcastTaskUpdate(updatedTask);

    // Notify newly assigned developer if assignment changed
    if (
      data.assignedDeveloperId &&
      data.assignedDeveloperId !== task.assignedDeveloperId
    ) {
      const notif = await NotificationService.create({
        userId: data.assignedDeveloperId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assigned',
        message: `You were assigned to "${updatedTask.title}" in project "${updatedTask.project.name}".`,
        taskId: updatedTask.id,
      });
      emitNotificationToUser(data.assignedDeveloperId, notif);

      const activity = await ActivityService.record({
        userId: user.id,
        projectId: updatedTask.projectId,
        taskId: updatedTask.id,
        action: ActivityAction.TASK_ASSIGNED,
        details: `Assigned task to developer`,
      });
      broadcastActivity(
        { ...activity, formattedMessage: ActivityService.formatMessage(activity) },
        updatedTask.projectId,
        updatedTask.project.createdById,
        updatedTask.assignedDeveloperId,
      );
    }

    return updatedTask;
  }

  /**
   * Delete task — ADMIN and PM only.
   */
  static async delete(taskId: string, jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    if (user.role === UserRole.DEVELOPER) {
      throw AppError.forbidden('Developers cannot delete tasks.');
    }

    const task = await assertTaskAccess(taskId, user);

    await prisma.task.delete({ where: { id: taskId } });

    const activity = await ActivityService.record({
      userId: user.id,
      projectId: task.projectId,
      action: ActivityAction.TASK_DELETED,
      details: `Deleted task "${task.title}"`,
    });

    broadcastActivity(
      { ...activity, formattedMessage: ActivityService.formatMessage(activity) },
      task.projectId,
      task.project.createdById,
      task.assignedDeveloperId,
    );

    return { message: 'Task deleted successfully.' };
  }
}
