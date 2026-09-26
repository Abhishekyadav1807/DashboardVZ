import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

export class ProjectController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const project = await ProjectService.create(req.body, req.user);
    res.status(201).json({ success: true, data: project });
  });

  static list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const projects = await ProjectService.list(req.user);
    res.json({ success: true, data: projects });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const project = await ProjectService.getById(req.params['id'] as string, req.user);
    res.json({ success: true, data: project });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const project = await ProjectService.update(
      req.params['id'] as string,
      req.body,
      req.user,
    );
    res.json({ success: true, data: project });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await ProjectService.delete(req.params['id'] as string, req.user);
    res.json({ success: true, data: { message: 'Project deleted.' } });
  });
}
