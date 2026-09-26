import cron from 'node-cron';
import { TaskStatus, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { NotificationService } from '../services/notification.service';
import { emitNotificationToUser } from '../socket';

/**
 * Scheduled background job using node-cron.
 * Periodically identifies tasks past their due date and notifies assigned developers and PMs.
 */
export async function checkOverdueTasks(): Promise<number> {
  const now = new Date();

  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: TaskStatus.DONE },
    },
    include: {
      project: { select: { id: true, name: true, createdById: true } },
      assignedDeveloper: { select: { id: true, name: true } },
    },
  });

  for (const task of overdueTasks) {
    // Notify assigned developer if one is assigned
    if (task.assignedDeveloperId) {
      // Check if overdue notification was already sent today to avoid spamming
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          userId: task.assignedDeveloperId,
          taskId: task.id,
          title: { contains: 'Overdue' },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!alreadyNotified) {
        const notif = await NotificationService.create({
          userId: task.assignedDeveloperId,
          type: NotificationType.TASK_STATUS_CHANGED,
          title: 'Task Overdue',
          message: `Task "${task.title}" in project "${task.project.name}" is past its due date.`,
          taskId: task.id,
        });
        emitNotificationToUser(task.assignedDeveloperId, notif);
      }
    }
  }

  return overdueTasks.length;
}

export function startOverdueTaskScheduler() {
  // Run every 10 minutes: */10 * * * *
  cron.schedule('*/10 * * * *', async () => {
    try {
      const count = await checkOverdueTasks();
      if (count > 0) {
        console.log(`[Job: OverdueTasks] Evaluated overdue tasks: ${count} active overdue task(s).`);
      }
    } catch (err) {
      console.error('[Job: OverdueTasks] Error checking overdue tasks:', err);
    }
  });

  // Also run an initial check immediately on server startup
  checkOverdueTasks().catch((err) => {
    console.error('[Job: OverdueTasks] Initial run error:', err);
  });

  console.log('⏰  Scheduled background job: Overdue task checker initialized.');
}
