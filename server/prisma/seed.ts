import { PrismaClient, UserRole, TaskStatus, TaskPriority, NotificationType, ActivityAction } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clear existing data (order matters due to foreign keys)
  await prisma.activity.deleteMany({});
  await prisma.taskStatusHistory.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Marcus Vance',
      email: 'marcus.vance@velozity.io',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@velozity.io',
      passwordHash,
      role: UserRole.PROJECT_MANAGER,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      name: 'David Sterling',
      email: 'david.sterling@velozity.io',
      passwordHash,
      role: UserRole.PROJECT_MANAGER,
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena.rostova@velozity.io',
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      name: 'Alex Chen',
      email: 'alex.chen@velozity.io',
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya.patel@velozity.io',
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      name: "Liam O'Connor",
      email: 'liam.oconnor@velozity.io',
      passwordHash,
      role: UserRole.DEVELOPER,
    },
  });

  // 2. Create Clients
  const client1 = await prisma.client.create({
    data: {
      name: 'Apex Fintech Solutions',
      email: 'contact@apexfintech.com',
      contactInfo: 'Tier-1 Financial Services Client',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Horizon Health Systems',
      email: 'procurement@horizonhealth.org',
      contactInfo: 'Enterprise Healthcare Provider',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: 'Lumina E-Commerce',
      email: 'partnerships@lumina-retail.com',
      contactInfo: 'Omnichannel Retail Platform',
    },
  });

  // 3. Create Projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Apex Core Banking Portal',
      description: 'Modernization of legacy core banking web applications',
      clientId: client1.id,
      createdById: pm1.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Horizon Telehealth Mobile App',
      description: 'Cross-platform telehealth consultation application',
      clientId: client2.id,
      createdById: pm2.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Lumina Realtime Inventory Engine',
      description: 'High-throughput inventory tracking and sync engine',
      clientId: client3.id,
      createdById: pm1.id,
    },
  });

  // 4. Create Tasks
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const tasksData = [
    // Project 1 (Apex)
    {
      projectId: project1.id,
      title: 'Implement Multi-Factor Biometric Authentication',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project1.id,
      title: 'Migrate Legacy Transaction Ledger to Kafka',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project1.id,
      title: 'PCI-DSS Compliance Audit and Tokenization',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project1.id,
      title: 'Automated Wire Transfer Settlement Pipeline',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: threeDaysAgo, // OVERDUE
    },
    {
      projectId: project1.id,
      title: 'Customer Account Summary PDF Generator',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: fiveDaysFromNow,
    },
    
    // Project 2 (Horizon)
    {
      projectId: project2.id,
      title: 'WebRTC Video Consultation Room Integration',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project2.id,
      title: 'HIPAA-Compliant Patient Chart Export',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project2.id,
      title: 'Push Notification Service for Prescription Refills',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project2.id,
      title: 'Doctor Availability Calendar Sync',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project2.id,
      title: 'Emergency Triage Routing Workflow',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      dueDate: threeDaysAgo, // OVERDUE
    },

    // Project 3 (Lumina)
    {
      projectId: project3.id,
      title: 'Distributed Stock Reservation Mutex via Redis',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.CRITICAL,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project3.id,
      title: 'Algolia Search Indexer for Product Catalog',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project3.id,
      title: 'Stripe Connect Marketplace Payout Gateway',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project3.id,
      title: 'Cart Abandonment Recovery Webhook',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      dueDate: fiveDaysFromNow,
    },
    {
      projectId: project3.id,
      title: 'Black Friday High-Concurrency Load Simulation',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.CRITICAL,
      dueDate: fiveDaysFromNow,
    },
  ];

  for (const task of tasksData) {
    const createdTask = await prisma.task.create({ data: task });
    
    // Simulate Activity - Task Created
    await prisma.activity.create({
      data: {
        projectId: task.projectId,
        taskId: createdTask.id,
        userId: pm1.id, // simplified creator
        action: ActivityAction.TASK_CREATED,
        newStatus: TaskStatus.TODO,
      },
    });

    // If assigned, log activity and notification
    if (task.assignedDeveloperId) {
      await prisma.activity.create({
        data: {
          projectId: task.projectId,
          taskId: createdTask.id,
          userId: pm1.id,
          action: ActivityAction.TASK_ASSIGNED,
        },
      });

      await prisma.notification.create({
        data: {
          userId: task.assignedDeveloperId,
          type: NotificationType.TASK_ASSIGNED,
          title: 'New Task Assigned',
          message: `You have been assigned: ${task.title}`,
          taskId: createdTask.id,
          read: task.status === TaskStatus.DONE,
        },
      });
    }

    // Simulate status changes if beyond TODO
    if (task.status !== TaskStatus.TODO) {
      // It moved to IN_PROGRESS at least
      await prisma.taskStatusHistory.create({
        data: {
          taskId: createdTask.id,
          changedById: task.assignedDeveloperId!,
          previousStatus: TaskStatus.TODO,
          newStatus: TaskStatus.IN_PROGRESS,
        },
      });
      await prisma.activity.create({
        data: {
          projectId: task.projectId,
          taskId: createdTask.id,
          userId: task.assignedDeveloperId!,
          action: ActivityAction.TASK_STATUS_UPDATED,
          previousStatus: TaskStatus.TODO,
          newStatus: TaskStatus.IN_PROGRESS,
        },
      });
    }

    if (task.status === TaskStatus.IN_REVIEW || task.status === TaskStatus.DONE) {
      await prisma.taskStatusHistory.create({
        data: {
          taskId: createdTask.id,
          changedById: task.assignedDeveloperId!,
          previousStatus: TaskStatus.IN_PROGRESS,
          newStatus: TaskStatus.IN_REVIEW,
        },
      });
      await prisma.activity.create({
        data: {
          projectId: task.projectId,
          taskId: createdTask.id,
          userId: task.assignedDeveloperId!,
          action: ActivityAction.TASK_STATUS_UPDATED,
          previousStatus: TaskStatus.IN_PROGRESS,
          newStatus: TaskStatus.IN_REVIEW,
        },
      });
      
      // Notify PM
      await prisma.notification.create({
        data: {
          userId: pm1.id, // simplify, PM1
          type: NotificationType.TASK_IN_REVIEW,
          title: 'Task Ready for Review',
          message: `${task.title} is ready for review.`,
          taskId: createdTask.id,
          read: false,
        }
      });
    }

    if (task.status === TaskStatus.DONE) {
      await prisma.taskStatusHistory.create({
        data: {
          taskId: createdTask.id,
          changedById: pm1.id,
          previousStatus: TaskStatus.IN_REVIEW,
          newStatus: TaskStatus.DONE,
        },
      });
      await prisma.activity.create({
        data: {
          projectId: task.projectId,
          taskId: createdTask.id,
          userId: pm1.id,
          action: ActivityAction.TASK_STATUS_UPDATED,
          previousStatus: TaskStatus.IN_REVIEW,
          newStatus: TaskStatus.DONE,
        },
      });
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
