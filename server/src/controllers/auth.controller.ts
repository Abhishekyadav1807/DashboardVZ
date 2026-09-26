import { Request, Response } from 'express';
import { loginSchema } from '../validators/auth.validator';
import { AuthService } from '../services/auth.service';
import { refreshCookieOptions } from '../config/env';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { prisma } from '../config/database';

const setRefreshCookie = (res: Response, token: string) =>
  res.cookie('refreshToken', token, { ...refreshCookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

const clearRefreshCookie = (res: Response) =>
  res.clearCookie('refreshToken', refreshCookieOptions);

export class AuthController {
  static login = asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request: ' + parsed.error.issues.map(i => i.message).join(', '));
    }
    const { accessToken, refreshToken, user } = await AuthService.login(parsed.data);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ success: true, data: { accessToken, user } });
  });

  static refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new AppError(401, 'UNAUTHORIZED', 'No refresh token provided.');
    try {
      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(refreshToken);
      setRefreshCookie(res, newRefreshToken);
      res.status(200).json({ success: true, data: { accessToken } });
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  });

  static logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) await AuthService.logout(refreshToken);
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  });

  static me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User not found.');
    const { passwordHash, ...safeUser } = user;
    res.status(200).json({ success: true, data: { user: safeUser } });
  });
}
