import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';
import { JwtAccessPayload } from '../types';
import { LoginDto } from '../validators/auth.validator';

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static generateTokens(user: { id: string; role: string }) {
    const accessPayload: JwtAccessPayload = { sub: user.id, role: user.role as any };
    const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as any,
    });
    const refreshPayload = { sub: user.id, jti: crypto.randomUUID() };
    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any,
    });
    return { accessToken, refreshToken };
  }

  private static parseExpiresIn(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([dh])$/);
    const date = new Date();
    if (match) {
      const amount = parseInt(match[1] as string, 10);
      const unit = match[2];
      if (unit === 'd') date.setDate(date.getDate() + amount);
      if (unit === 'h') date.setHours(date.getHours() + amount);
    } else {
      date.setDate(date.getDate() + 7);
    }
    return date;
  }

  static async login(data: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials.');

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) throw new AppError(401, 'UNAUTHORIZED', 'Invalid credentials.');

    const { accessToken, refreshToken } = this.generateTokens(user);
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = this.parseExpiresIn(env.REFRESH_TOKEN_EXPIRES_IN);

    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const { passwordHash, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  static async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string };
      const tokenHash = this.hashToken(refreshToken);
      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!storedToken || storedToken.userId !== payload.sub || storedToken.revokedAt) {
        throw new Error('Invalid refresh token state');
      }

      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      const newTokens = this.generateTokens(storedToken.user);
      const newTokenHash = this.hashToken(newTokens.refreshToken);
      const expiresAt = this.parseExpiresIn(env.REFRESH_TOKEN_EXPIRES_IN);

      await prisma.refreshToken.create({
        data: { userId: storedToken.user.id, tokenHash: newTokenHash, expiresAt },
      });

      return newTokens;
    } catch (error) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token.');
    }
  }

  static async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
