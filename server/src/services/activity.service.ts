import { ActivityAction, TaskStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AuthorizedUser, getAuthorizedUser } from '../utils/authorization.helpers';
import { JwtAccessPayload, UserRole } from '../types';

export interface CreateActivityInput {
  userId: string;
  projectId?: string;
  taskId?: string;
  action: ActivityAction;
  previousStatus?: TaskStatus;
  newStatus?: TaskStatus;
  details?: string;
}

export class ActivityService {
  /**
   * Log an activity record directly to the database.
   */
  static async record(input: CreateActivityInput) {
    return prisma.activity.create({
      data: {
        userId: input.userId,
        projectId: input.projectId,
        taskId: input.taskId,
        action: input.action,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        details: input.details,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  /**
   * List activities scoped strictly by user role & resource ownership:
   * - ADMIN: sees all activities across the platform
   * - PROJECT_MANAGER: sees activities belonging only to projects they created
   * - DEVELOPER: sees activities belonging only to tasks assigned to them
   *
   * By default returns the last 20 events (missed events catchup).
   */
  static async list(jwtPayload: JwtAccessPayload, limit = 20) {
    const user = await getAuthorizedUser(jwtPayload);
    const where = this.buildActivityWhereClause(user);

    const activities = await prisma.activity.findMany({
      where,
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return activities.map((act) => ({
      ...act,
      formattedMessage: this.formatMessage(act),
    }));
  }

  /**
   * Format activity into human-friendly event sentence, e.g.:
   * "Ravi moved Task #12 from In Progress → In Review"
   */
  static formatMessage(activity: {
    user: { name: string };
    project?: { name: string } | null;
    task?: { title: string } | null;
    action: ActivityAction;
    previousStatus?: TaskStatus | null;
    newStatus?: TaskStatus | null;
    details?: string | null;
  }): string {
    const userName = activity.user?.name || 'Someone';
    const taskTitle = activity.task?.title ? `"${activity.task.title}"` : 'a task';
    const projectName = activity.project?.name ? `"${activity.project.name}"` : 'a project';

    const formatStatus = (s?: TaskStatus | null) => {
      if (!s) return '';
      switch (s) {
        case TaskStatus.TODO: return 'To Do';
        case TaskStatus.IN_PROGRESS: return 'In Progress';
        case TaskStatus.IN_REVIEW: return 'In Review';
        case TaskStatus.DONE: return 'Done';
      }
    };

    switch (activity.action) {
      case ActivityAction.TASK_STATUS_UPDATED:
        return `${userName} moved ${taskTitle} from ${formatStatus(activity.previousStatus)} → ${formatStatus(activity.newStatus)}`;
      case ActivityAction.TASK_CREATED:
        return `${userName} created task ${taskTitle}`;
      case ActivityAction.TASK_ASSIGNED:
        return `${userName} updated assignment for ${taskTitle}`;
      case ActivityAction.PROJECT_CREATED:
        return `${userName} created project ${projectName}`;
      case ActivityAction.TASK_DELETED:
        return `${userName} deleted task ${taskTitle}`;
      default:
        return activity.details || `${userName} performed an action`;
    }
  }

  /**
   * Server-side database filtering for activity feed according to role.
   */
  private static buildActivityWhereClause(user: AuthorizedUser) {
    if (user.role === UserRole.ADMIN) {
      return {};
    }

    if (user.role === UserRole.PROJECT_MANAGER) {
      return {
        project: {
          createdById: user.id,
        },
      };
    }

    if (user.role === UserRole.DEVELOPER) {
      return {
        task: {
          assignedDeveloperId: user.id,
        },
      };
    }

    return { id: 'impossible-match' };
  }
}
