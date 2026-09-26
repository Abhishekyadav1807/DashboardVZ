import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const pmCount = await prisma.user.count({ where: { role: 'PROJECT_MANAGER' } });
  const devCount = await prisma.user.count({ where: { role: 'DEVELOPER' } });
  const clientCount = await prisma.client.count();
  const projectCount = await prisma.project.count();
  
  const projects = await prisma.project.findMany({ include: { tasks: true } });
  let tasksPerProjectValid = true;
  for (const p of projects) {
    if (p.tasks.length < 5) tasksPerProjectValid = false;
  }
  
  const overdueTasksCount = await prisma.task.count({
    where: {
      dueDate: { lt: new Date() },
      status: { in: ['TODO', 'IN_PROGRESS'] }
    }
  });
  
  const historyCount = await prisma.taskStatusHistory.count();
  const activityCount = await prisma.activity.count();
  const notificationCount = await prisma.notification.count();
  
  console.log(JSON.stringify({
    adminCount, pmCount, devCount,
    clientCount, projectCount,
    tasksPerProjectValid,
    overdueTasksCount,
    historyCount, activityCount, notificationCount
  }, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
