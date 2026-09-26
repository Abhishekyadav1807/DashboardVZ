import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ClientController } from '../controllers/client.controller';

export const clientRouter = Router();

clientRouter.use(authenticate);
clientRouter.get('/', ClientController.list);
clientRouter.post('/', ClientController.create);
