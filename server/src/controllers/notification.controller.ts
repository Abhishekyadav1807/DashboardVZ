import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

export class NotificationController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await NotificationService.list(req.user);
    res.json({ success: true, data: result });
  });

  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const updated = await NotificationService.markAsRead(req.params['id'] as string, req.user);
    res.json({ success: true, data: updated });
  });

  static markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await NotificationService.markAllAsRead(req.user);
    res.json({ success: true, data: { message: 'All notifications marked as read.' } });
  });
}
