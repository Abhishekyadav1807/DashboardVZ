import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { DashboardController } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);
dashboardRouter.get('/', DashboardController.getDashboard);
