import { TaskStatus, TaskPriority, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { getAuthorizedUser } from '../utils/authorization.helpers';
import { JwtAccessPayload } from '../types';
import { presenceTracker } from '../socket/presence';

export class DashboardService {
  /**
   * Get role-tailored dashboard metrics:
   * - ADMIN: total projects, tasks by status, overdue count, active online users
   * - PROJECT_MANAGER: project summary, tasks by priority, upcoming due dates this week
   * - DEVELOPER: assigned tasks sorted by priority & due date
   */
  static async getDashboard(jwtPayload: JwtAccessPayload) {
    const user = await getAuthorizedUser(jwtPayload);
    const now = new Date();

    if (user.role === UserRole.ADMIN) {
      const [totalProjects, tasksByStatusRaw, overdueCount, totalUsers] = await Promise.all([
        prisma.project.count(),
        prisma.task.groupBy({
          by: ['status'],
          _count: { status: true },
        }),
        prisma.task.count({
          where: {
            dueDate: { lt: now },
            status: { not: TaskStatus.DONE },
          },
        }),
        prisma.user.count(),
      ]);

      const tasksByStatus: Record<string, number> = {
        [TaskStatus.TODO]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.IN_REVIEW]: 0,
        [TaskStatus.DONE]: 0,
      };
      tasksByStatusRaw.forEach((item) => {
        tasksByStatus[item.status] = item._count.status;
      });

      return {
        role: UserRole.ADMIN,
        metrics: {
          totalProjects,
          tasksByStatus,
          overdueCount,
          activeUsersOnline: presenceTracker.getOnlineUserCount(),
          totalUsers,
        },
      };
    }

    if (user.role === UserRole.PROJECT_MANAGER) {
      const inOneWeek = new Date();
      inOneWeek.setDate(now.getDate() + 7);

      const [projects, tasksByPriorityRaw, upcomingTasks] = await Promise.all([
        prisma.project.findMany({
          where: { createdById: user.id },
          include: {
            client: { select: { id: true, name: true } },
            tasks: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.task.groupBy({
          by: ['priority'],
          where: {
            project: { createdById: user.id },
          },
          _count: { priority: true },
        }),
        prisma.task.findMany({
          where: {
            project: { createdById: user.id },
            dueDate: {
              gte: now,
              lte: inOneWeek,
            },
            status: { not: TaskStatus.DONE },
          },
          include: {
            project: { select: { id: true, name: true } },
            assignedDeveloper: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: 'asc' },
        }),
      ]);

      const tasksByPriority: Record<string, number> = {
        [TaskPriority.LOW]: 0,
        [TaskPriority.MEDIUM]: 0,
        [TaskPriority.HIGH]: 0,
        [TaskPriority.CRITICAL]: 0,
      };
      tasksByPriorityRaw.forEach((item) => {
        tasksByPriority[item.priority] = item._count.priority;
      });

      const projectsSummary = projects.map((p) => {
        const totalTasks = p.tasks.length;
        const doneTasks = p.tasks.filter((t) => t.status === TaskStatus.DONE).length;
        return {
          id: p.id,
          name: p.name,
          clientName: p.client.name,
          totalTasks,
          doneTasks,
          progressPercent: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        };
      });

      return {
        role: UserRole.PROJECT_MANAGER,
        metrics: {
          projectsSummary,
          tasksByPriority,
          upcomingTasks,
        },
      };
    }

    // DEVELOPER
    const assignedTasks = await prisma.task.findMany({
      where: { assignedDeveloperId: user.id },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: [
        { dueDate: 'asc' },
      ],
    });

    // Custom priority ordering: CRITICAL -> HIGH -> MEDIUM -> LOW
    const priorityWeight: Record<TaskPriority, number> = {
      [TaskPriority.CRITICAL]: 4,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.LOW]: 1,
    };

    assignedTasks.sort((a, b) => {
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (pDiff !== 0) return pDiff;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    const overdueCount = assignedTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
    ).length;

    return {
      role: UserRole.DEVELOPER,
      metrics: {
        assignedTasks,
        totalAssigned: assignedTasks.length,
        inProgress: assignedTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
        inReview: assignedTasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length,
        completed: assignedTasks.filter((t) => t.status === TaskStatus.DONE).length,
        overdueCount,
      },
    };
  }
}
