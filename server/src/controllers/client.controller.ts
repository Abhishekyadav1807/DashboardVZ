import { Request, Response } from 'express';
import { ClientService } from '../services/client.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

export class ClientController {
  static list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const clients = await ClientService.list(req.user);
    res.json({ success: true, data: clients });
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const client = await ClientService.create(req.body, req.user);
    res.status(201).json({ success: true, data: client });
  });
}
