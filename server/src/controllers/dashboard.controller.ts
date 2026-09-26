import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

export class DashboardController {
  static getDashboard = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const data = await DashboardService.getDashboard(req.user);
    res.json({ success: true, data });
  });
}
