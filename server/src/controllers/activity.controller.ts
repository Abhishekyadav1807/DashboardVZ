import { Request, Response } from 'express';
import { ActivityService } from '../services/activity.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

export class ActivityController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;
    const activities = await ActivityService.list(req.user, limit);
    res.json({ success: true, data: activities });
  });
}
