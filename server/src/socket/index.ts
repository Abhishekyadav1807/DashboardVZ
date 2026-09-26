import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtAccessPayload, UserRole } from '../types';
import { presenceTracker } from './presence';
import { prisma } from '../config/database';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authentication middleware for WebSockets
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.['token'] ||
        socket.handshake.headers?.['authorization']?.replace(/^Bearer\s+/, '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
      
      // Database Role Must Be Authoritative. Verify user is not deleted.
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.sub }
      });

      if (!dbUser) {
        return next(new Error('User not found'));
      }

      // Populate socket data with fresh DB user
      socket.data['user'] = { ...decoded, role: dbUser.role as UserRole };
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data['user'] as JwtAccessPayload;
    const userId = user.sub;

    // Track user presence
    presenceTracker.addConnection(userId, socket.id);

    // Join personal user room for direct notifications
    socket.join(`user:${userId}`);

    // Admins join global activity feed room
    if (user.role === UserRole.ADMIN) {
      socket.join('admin:feed');
    }

    // Broadcast updated online count to all admins
    io?.to('admin:feed').emit('presence:update', {
      onlineCount: presenceTracker.getOnlineUserCount(),
    });

    // Handle joining and leaving specific project rooms
    socket.on('join:project', async (projectId: string) => {
      try {
        if (!projectId || typeof projectId !== 'string') {
          return socket.emit('error', { message: 'Invalid project ID' });
        }

        const project = await prisma.project.findUnique({
          where: { id: projectId },
          include: {
            tasks: {
              where: { assignedDeveloperId: userId },
              select: { id: true },
              take: 1
            }
          }
        });

        if (!project) {
          return socket.emit('error', { message: 'Project not found' });
        }

        let isAuthorized = false;

        if (user.role === UserRole.ADMIN) {
          isAuthorized = true;
        } else if (user.role === UserRole.PROJECT_MANAGER) {
          if (project.createdById === userId) {
            isAuthorized = true;
          }
        } else if (user.role === UserRole.DEVELOPER) {
          if (project.tasks.length > 0) {
            isAuthorized = true;
          }
        }

        if (isAuthorized) {
          socket.join(`project:${projectId}`);
        } else {
          socket.emit('error', { message: 'Unauthorized to join project room' });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to join project room' });
      }
    });

    socket.on('leave:project', (projectId: string) => {
      if (typeof projectId === 'string') {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on('disconnect', () => {
      presenceTracker.removeConnection(userId, socket.id);
      io?.to('admin:feed').emit('presence:update', {
        onlineCount: presenceTracker.getOnlineUserCount(),
      });
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastActivity(activity: any, projectId?: string | null, pmUserId?: string | null, assignedDevId?: string | null) {
  if (!io) return;

  if (projectId) {
    io.to(`project:${projectId}`).emit('activity:new', activity);
  }

  io.to('admin:feed').emit('activity:new', activity);

  if (pmUserId) {
    io.to(`user:${pmUserId}`).emit('activity:new', activity);
  }

  if (assignedDevId) {
    io.to(`user:${assignedDevId}`).emit('activity:new', activity);
  }
}

export function broadcastTaskUpdate(task: any) {
  if (!io || !task?.projectId) return;
  io.to(`project:${task.projectId}`).emit('task:updated', task);
}

export function emitNotificationToUser(userId: string, notification: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit('notification:new', notification);
}
