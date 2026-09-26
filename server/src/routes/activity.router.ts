import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ActivityController } from '../controllers/activity.controller';

export const activityRouter = Router();

activityRouter.use(authenticate);
activityRouter.get('/', ActivityController.list);
