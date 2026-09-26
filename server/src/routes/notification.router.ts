import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { NotificationController } from '../controllers/notification.controller';

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get('/', NotificationController.list);
notificationRouter.patch('/:id/read', NotificationController.markAsRead);
notificationRouter.post('/read-all', NotificationController.markAllAsRead);
