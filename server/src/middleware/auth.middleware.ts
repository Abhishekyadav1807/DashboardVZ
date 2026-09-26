import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';
import { JwtAccessPayload } from '../types';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header.');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing access token.');
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
      // Attach to request
      req.user = payload;
      next();
    } catch (err) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token.');
    }
  } catch (error) {
    next(error);
  }
};
