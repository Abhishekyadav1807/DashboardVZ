import { Router } from 'express';
import healthRouter from './health.router';
import { authRouter } from './auth.router';
import { projectRouter } from './project.router';
import { taskRouter } from './task.router';
import { clientRouter } from './client.router';
import { userRouter } from './user.router';
import { dashboardRouter } from './dashboard.router';
import { activityRouter } from './activity.router';
import { notificationRouter } from './notification.router';

const apiRouter = Router();

// Health check
apiRouter.use('/health', healthRouter);

// Versioned API v1 endpoints
apiRouter.use('/v1/auth', authRouter);
apiRouter.use('/v1/projects', projectRouter);
apiRouter.use('/v1/tasks', taskRouter);
apiRouter.use('/v1/clients', clientRouter);
apiRouter.use('/v1/users', userRouter);
apiRouter.use('/v1/dashboard', dashboardRouter);
apiRouter.use('/v1/activity', activityRouter);
apiRouter.use('/v1/notifications', notificationRouter);

export default apiRouter;
