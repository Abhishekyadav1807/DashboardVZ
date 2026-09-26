import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

export class UserController {
  static listDevelopers = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const developers = await UserService.listDevelopers(req.user);
    res.json({ success: true, data: developers });
  });

  static listAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const users = await UserService.listAll(req.user);
    res.json({ success: true, data: users });
  });
}
