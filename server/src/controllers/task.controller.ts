import { Request, Response } from 'express';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { TaskService, TaskFilterOptions } from '../services/task.service';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';

export class TaskController {
  static create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const task = await TaskService.create(req.body, req.user);
    res.status(201).json({ success: true, data: task });
  });

  static list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();

    const filters: TaskFilterOptions = {
      projectId: req.query['projectId'] as string | undefined,
      status: req.query['status'] as TaskStatus | undefined,
      priority: req.query['priority'] as TaskPriority | undefined,
      startDate: req.query['startDate'] as string | undefined,
      endDate: req.query['endDate'] as string | undefined,
    };

    const tasks = await TaskService.list(req.user, filters);
    res.json({ success: true, data: tasks });
  });

  static getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const task = await TaskService.getById(req.params['id'] as string, req.user);
    res.json({ success: true, data: task });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const task = await TaskService.update(
      req.params['id'] as string,
      req.body,
      req.user,
    );
    res.json({ success: true, data: task });
  });

  static updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();

    const { status } = req.body;
    if (!status || !Object.values(TaskStatus).includes(status)) {
      throw AppError.badRequest('A valid status is required.', 'VALIDATION_ERROR');
    }

    const task = await TaskService.updateStatus(
      req.params['id'] as string,
      status as TaskStatus,
      req.user,
    );
    res.json({ success: true, data: task });
  });

  static delete = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await TaskService.delete(req.params['id'] as string, req.user);
    res.json({ success: true, data: result });
  });
}
