import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { UserController } from '../controllers/user.controller';

export const userRouter = Router();

userRouter.use(authenticate);
userRouter.get('/developers', UserController.listDevelopers);
userRouter.get('/', UserController.listAll);
