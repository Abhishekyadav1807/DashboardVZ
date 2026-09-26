import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { initSocket, getIO, broadcastActivity } from '../socket';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../types';
import app from '../app';

let io: SocketIOServer;
let serverSocket: any;
let port: number;
let httpServer: any;

const generateToken = (payload: any) => jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

const connectClient = (token: string): Promise<ClientSocket> => {
  return new Promise((resolve, reject) => {
    const socket = Client(`http://localhost:${port}`, {
      auth: { token },
      reconnectionDelay: 0,
      forceNew: true,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
};

beforeAll((done) => {
  httpServer = createServer(app);
  io = initSocket(httpServer);
  httpServer.listen(() => {
    port = (httpServer.address() as any).port;
    done();
  });
});

afterAll((done) => {
  io.close();
  httpServer.close();
  done();
});

describe('Socket.io Room Authorization', () => {
  let admin: any;
  let pm1: any;
  let pm2: any;
  let dev1: any;
  let dev2: any;
  let deletedUser: any;
  let project1: { id: string };
  let project2: { id: string };

  beforeAll(async () => {
    const timestamp = Date.now();
    admin = await prisma.user.create({ data: { email: `admin_socket_${timestamp}@test.com`, passwordHash: 'hash', role: 'ADMIN', name: 'Admin' } });
    pm1 = await prisma.user.create({ data: { email: `pm1_socket_${timestamp}@test.com`, passwordHash: 'hash', role: 'PROJECT_MANAGER', name: 'PM1' } });
    pm2 = await prisma.user.create({ data: { email: `pm2_socket_${timestamp}@test.com`, passwordHash: 'hash', role: 'PROJECT_MANAGER', name: 'PM2' } });
    dev1 = await prisma.user.create({ data: { email: `dev1_socket_${timestamp}@test.com`, passwordHash: 'hash', role: 'DEVELOPER', name: 'Dev1' } });
    dev2 = await prisma.user.create({ data: { email: `dev2_socket_${timestamp}@test.com`, passwordHash: 'hash', role: 'DEVELOPER', name: 'Dev2' } });
    deletedUser = await prisma.user.create({ data: { email: 'deleted_socket@test.com', passwordHash: 'hash', role: 'DEVELOPER', name: 'Del' } });
    await prisma.user.delete({ where: { id: deletedUser.id } });

    const client = await prisma.client.create({ data: { name: 'Test Client', email: 'c@test.com' } });

    project1 = await prisma.project.create({ data: { name: 'P1', clientId: client.id, createdById: pm1.id } });
    project2 = await prisma.project.create({ data: { name: 'P2', clientId: client.id, createdById: pm2.id } });

    await prisma.task.create({ data: { title: 'T1', projectId: project1.id, assignedDeveloperId: dev1.id, status: 'TODO', priority: 'LOW' } });
    await prisma.task.create({ data: { title: 'T2', projectId: project2.id, assignedDeveloperId: dev2.id, status: 'TODO', priority: 'LOW' } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('1. Admin can join any project', async () => {
    const token = generateToken({ sub: admin.id, role: 'ADMIN' });
    const client = await connectClient(token);

    return new Promise<void>((resolve, reject) => {
      client.emit('join:project', project1.id);
      client.emit('join:project', project2.id);
      
      // We expect no 'error' events for authorization
      client.on('error', (err) => {
        reject(new Error('Admin got error: ' + err.message));
      });

      setTimeout(() => {
        client.disconnect();
        resolve();
      }, 300);
    });
  });

  it('2. PM can join own project', async () => {
    const token = generateToken({ sub: pm1.id, role: 'PROJECT_MANAGER' });
    const client = await connectClient(token);

    return new Promise<void>((resolve, reject) => {
      client.emit('join:project', project1.id);
      client.on('error', (err) => {
        reject(new Error('PM got error: ' + err.message));
      });

      setTimeout(() => {
        client.disconnect();
        resolve();
      }, 300);
    });
  });

  it('3. PM cannot join another PMs project', async () => {
    const token = generateToken({ sub: pm1.id, role: 'PROJECT_MANAGER' });
    const client = await connectClient(token);

    return new Promise<void>((resolve) => {
      client.emit('join:project', project2.id);
      client.on('error', (err) => {
        expect(err.message).toBe('Unauthorized to join project room');
        client.disconnect();
        resolve();
      });
    });
  });

  it('4. Developer can join a project containing their assigned task', async () => {
    const token = generateToken({ sub: dev1.id, role: 'DEVELOPER' });
    const client = await connectClient(token);

    return new Promise<void>((resolve, reject) => {
      client.emit('join:project', project1.id);
      client.on('error', (err) => {
        reject(new Error('Dev got error: ' + err.message));
      });

      setTimeout(() => {
        client.disconnect();
        resolve();
      }, 300);
    });
  });

  it('5. Developer cannot join a project where they have no assigned task', async () => {
    const token = generateToken({ sub: dev1.id, role: 'DEVELOPER' });
    const client = await connectClient(token);

    return new Promise<void>((resolve) => {
      client.emit('join:project', project2.id);
      client.on('error', (err) => {
        expect(err.message).toBe('Unauthorized to join project room');
        client.disconnect();
        resolve();
      });
    });
  });

  it('6. Forged JWT role ADMIN for a developer cannot grant unauthorized project-room access', async () => {
    const token = generateToken({ sub: dev1.id, role: 'ADMIN' });
    const client = await connectClient(token);

    return new Promise<void>((resolve) => {
      client.emit('join:project', project2.id);
      client.on('error', (err) => {
        expect(err.message).toBe('Unauthorized to join project room');
        client.disconnect();
        resolve();
      });
    });
  });

  it('7. Deleted user cannot establish an authorized socket session', async () => {
    const token = generateToken({ sub: deletedUser.id, role: 'DEVELOPER' });
    await expect(connectClient(token)).rejects.toThrow('User not found');
  });

  it('8 & 9. Unauthorized user does not receive activity, authorized user does', async () => {
    const pm1Token = generateToken({ sub: pm1.id, role: 'PROJECT_MANAGER' });
    const dev1Token = generateToken({ sub: dev1.id, role: 'DEVELOPER' });

    const pmClient = await connectClient(pm1Token);
    const devClient = await connectClient(dev1Token);

    return new Promise<void>((resolve) => {
      let pmReceived = false;
      let devReceived = false;

      pmClient.emit('join:project', project1.id); // Authorized
      devClient.emit('join:project', project2.id); // Unauthorized for project2 (should fail but socket is still connected)

      // Wait a moment for joins to process
      setTimeout(() => {
        pmClient.on('activity:new', () => { pmReceived = true; });
        devClient.on('activity:new', () => { devReceived = true; });

        // Broadcast to project1
        broadcastActivity({ type: 'test' }, project1.id);

        setTimeout(() => {
          expect(pmReceived).toBe(true);
          expect(devReceived).toBe(false); // Dev1 shouldn't receive it because they aren't authorized to join project2, and this was emitted to project1 anyway. (Also Dev1 shouldn't be in project1 since they didn't join it).
          pmClient.disconnect();
          devClient.disconnect();
          resolve();
        }, 300);
      }, 300);
    });
  });
});
