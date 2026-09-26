import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/authorize.middleware';
import { ProjectController } from '../controllers/project.controller';

export const projectRouter = Router();

// All project routes require authentication
projectRouter.use(authenticate);

// Create project — ADMIN and PM
projectRouter.post(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  ProjectController.create,
);

// ADMIN + PM can list / view / update / delete projects
// Resource ownership is enforced in the service layer
projectRouter.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  ProjectController.list,
);

projectRouter.get(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  ProjectController.getById,
);

projectRouter.patch(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  ProjectController.update,
);

projectRouter.delete(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.PROJECT_MANAGER),
  ProjectController.delete,
);
