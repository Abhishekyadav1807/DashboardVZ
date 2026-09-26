import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/authorize.middleware';
import { TaskController } from '../controllers/task.controller';

export const taskRouter = Router();

// All task routes require authentication
taskRouter.use(authenticate);

// Create task — ADMIN and PM only
taskRouter.post(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  TaskController.create,
);

// List tasks — scoped to role/ownership in service, with query filtering
taskRouter.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER),
  TaskController.list,
);

// Get single task — ownership enforced in service
taskRouter.get(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER),
  TaskController.getById,
);

// Update task metadata — ADMIN and PM only
taskRouter.patch(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  TaskController.update,
);

// Update task status — ADMIN, PM (own project), DEVELOPER (assigned task only)
taskRouter.patch(
  '/:id/status',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.DEVELOPER),
  TaskController.updateStatus,
);

// Delete task — ADMIN and PM only
taskRouter.delete(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  TaskController.delete,
);
