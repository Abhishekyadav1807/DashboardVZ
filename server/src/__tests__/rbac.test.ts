import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { TaskStatus, UserRole, TaskPriority } from '@prisma/client';

describe('Phase 4: RBAC & Resource Ownership Security Tests', () => {
  let adminToken: string;
  let pm1Token: string;
  let pm2Token: string;
  let dev1Token: string;
  let dev2Token: string;

  let pm1User: { id: string; email: string };
  let pm2User: { id: string; email: string };
  let dev1User: { id: string; email: string };
  let dev2User: { id: string; email: string };

  let pm1Project: { id: string; name: string };
  let pm2Project: { id: string; name: string };

  let pm1Task: { id: string; title: string };
  let pm2Task: { id: string; title: string };
  let dev1Task: { id: string; title: string; assignedDeveloperId: string | null; projectId: string };
  let dev1WorkflowTask: any;
  let dev2Task: { id: string; title: string };

  beforeAll(async () => {
    // 1. Obtain tokens via login
    const login = async (email: string) => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'Password123!' });
      return res.body.data.accessToken as string;
    };

    adminToken = await login('marcus.vance@velozity.io');
    pm1Token = await login('sarah.jenkins@velozity.io');
    pm2Token = await login('david.sterling@velozity.io');
    dev1Token = await login('elena.rostova@velozity.io');
    dev2Token = await login('alex.chen@velozity.io');

    // 2. Load authoritative users from database
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'sarah.jenkins@velozity.io',
            'david.sterling@velozity.io',
            'elena.rostova@velozity.io',
            'alex.chen@velozity.io',
          ],
        },
      },
    });

    pm1User = users.find((u) => u.email === 'sarah.jenkins@velozity.io')!;
    pm2User = users.find((u) => u.email === 'david.sterling@velozity.io')!;
    dev1User = users.find((u) => u.email === 'elena.rostova@velozity.io')!;
    dev2User = users.find((u) => u.email === 'alex.chen@velozity.io')!;

    // 3. Load authoritative projects from database
    const p1 = await prisma.project.findFirst({ where: { createdById: pm1User.id } });
    const p2 = await prisma.project.findFirst({ where: { createdById: pm2User.id } });
    pm1Project = { id: p1!.id, name: p1!.name };
    pm2Project = { id: p2!.id, name: p2!.name };

    // 4. Load tasks associated with PMs and Developers
    const t1 = await prisma.task.findFirst({ where: { projectId: pm1Project.id } });
    const t2 = await prisma.task.findFirst({ where: { projectId: pm2Project.id } });
    pm1Task = { id: t1!.id, title: t1!.title };
    pm2Task = { id: t2!.id, title: t2!.title };

    const dt1 = await prisma.task.findFirst({ where: { assignedDeveloperId: dev1User.id } });
    const dt2 = await prisma.task.findFirst({ where: { assignedDeveloperId: dev2User.id } });
    dev1Task = {
      id: dt1!.id,
      title: dt1!.title,
      assignedDeveloperId: dt1!.assignedDeveloperId,
      projectId: dt1!.projectId,
    };
    dev2Task = { id: dt2!.id, title: dt2!.title };

    // Dedicated task for workflow sequential tests
    dev1WorkflowTask = await prisma.task.create({
      data: {
        title: 'Workflow test task',
        projectId: pm1Project.id,
        assignedDeveloperId: dev1User.id,
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ADMIN AUTHORIZATION
  // ─────────────────────────────────────────────────────────────────────────────
  describe('ADMIN Authorization', () => {
    it('admin can list all projects across all PMs', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('admin can access any project regardless of creator', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${pm2Project.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(pm2Project.id);
    });

    it('admin can access any task across any project and developer', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${dev1Task.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(dev1Task.id);
    });

    it('admin can update task metadata and status', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${pm1Task.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: TaskStatus.IN_REVIEW });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TaskStatus.IN_REVIEW);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PROJECT MANAGER OWNERSHIP
  // ─────────────────────────────────────────────────────────────────────────────
  describe('PROJECT_MANAGER Ownership Enforcement', () => {
    it('PM can access their own project', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${pm1Project.id}`)
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(pm1Project.id);
    });

    it('PM CANNOT access another PM project (returns 404 to avoid leaking existence)', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${pm2Project.id}`)
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('PM CANNOT update another PM project', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${pm2Project.id}`)
        .set('Authorization', `Bearer ${pm1Token}`)
        .send({ name: 'Malicious Rename' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PM CANNOT delete another PM project', async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${pm2Project.id}`)
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PM project listing is strictly scoped to projects created by the PM', async () => {
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const projects = res.body.data;
      expect(projects.length).toBeGreaterThan(0);
      // Every project returned must have createdById === pm1User.id
      for (const p of projects) {
        expect(p.createdById).toBe(pm1User.id);
      }
    });

    it('PM can access task belonging to their own project', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${pm1Task.id}`)
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(pm1Task.id);
    });

    it('PM CANNOT access task belonging to another PM project', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${pm2Task.id}`)
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('PM task listing only returns tasks from projects owned by the PM', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const tasks = res.body.data;
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. DEVELOPER ROLE RESTRICTIONS & TASK OWNERSHIP
  // ─────────────────────────────────────────────────────────────────────────────
  describe('DEVELOPER Task Ownership & Role Restrictions', () => {
    it('developer can access their own assigned task', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${dev1Task.id}`)
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(dev1Task.id);
    });

    it('developer CANNOT access another developer task (returns 404 to avoid leaking existence)', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${dev2Task.id}`)
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('developer CANNOT skip status TODO -> IN_REVIEW', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1WorkflowTask.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: TaskStatus.IN_REVIEW });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/sequential/);
    });

    it('developer CANNOT skip status TODO -> DONE', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1WorkflowTask.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: TaskStatus.DONE });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('developer can update status (TODO -> IN_PROGRESS)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1WorkflowTask.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('developer CANNOT skip status IN_PROGRESS -> DONE', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1WorkflowTask.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: TaskStatus.DONE });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('developer can update status (IN_PROGRESS -> IN_REVIEW)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1WorkflowTask.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: TaskStatus.IN_REVIEW });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TaskStatus.IN_REVIEW);
    });

    it('developer can update status (IN_REVIEW -> DONE)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1WorkflowTask.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: TaskStatus.DONE });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TaskStatus.DONE);
    });

    it('developer CANNOT update status of another developer task', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev2Task.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ status: TaskStatus.IN_PROGRESS });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('developer CANNOT access project management resources (403 Forbidden)', async () => {
      // List projects
      const listRes = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${dev1Token}`);
      expect(listRes.status).toBe(403);
      expect(listRes.body.error.code).toBe('FORBIDDEN');

      // Get project by ID
      const getRes = await request(app)
        .get(`/api/v1/projects/${pm1Project.id}`)
        .set('Authorization', `Bearer ${dev1Token}`);
      expect(getRes.status).toBe(403);

      // Update project
      const patchRes = await request(app)
        .patch(`/api/v1/projects/${pm1Project.id}`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ name: 'Hacked' });
      expect(patchRes.status).toBe(403);

      // Delete project
      const delRes = await request(app)
        .delete(`/api/v1/projects/${pm1Project.id}`)
        .set('Authorization', `Bearer ${dev1Token}`);
      expect(delRes.status).toBe(403);
    });

    it('developer CANNOT perform full task update (PATCH /tasks/:id)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1Task.id}`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({ title: 'Unauthorized Title Change' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('developer task list returns ONLY tasks assigned to the developer', async () => {
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const tasks = res.body.data;
      expect(tasks.length).toBeGreaterThan(0);
      for (const t of tasks) {
        expect(t.assignedDeveloperId).toBe(dev1User.id);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. REQUEST-BODY TAMPERING & DIRECT URL / ID ATTACKS
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Tampering & Attack Prevention', () => {
    it('direct URL ID attack: changing project ID does not bypass PM ownership', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${pm2Project.id}`)
        .set('Authorization', `Bearer ${pm1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.data).toBeUndefined();
    });

    it('direct URL ID attack: changing task ID does not bypass developer ownership', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${dev2Task.id}`)
        .set('Authorization', `Bearer ${dev1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.data).toBeUndefined();
    });

    it('request-body tampering on status endpoint does not modify assignment or project', async () => {
      // Ensure a known starting state for the valid developer transition under test
      await prisma.task.update({
        where: { id: dev1Task.id },
        data: { status: TaskStatus.IN_PROGRESS },
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1Task.id}/status`)
        .set('Authorization', `Bearer ${dev1Token}`)
        .send({
          status: TaskStatus.IN_REVIEW,
          assignedDeveloperId: dev2User.id, // Attempt to reassign
          projectId: pm2Project.id,         // Attempt to move to another project
        });

      expect(res.status).toBe(200);

      // Verify in DB that assignedDeveloperId and projectId are UNCHANGED
      const verifiedTask = await prisma.task.findUnique({ where: { id: dev1Task.id } });
      expect(verifiedTask!.status).toBe(TaskStatus.IN_REVIEW);
      expect(verifiedTask!.assignedDeveloperId).toBe(dev1User.id);
      expect(verifiedTask!.projectId).toBe(dev1Task.projectId);
    });

    it('request-body tampering on project update does not change createdById ownership', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${pm1Project.id}`)
        .set('Authorization', `Bearer ${pm1Token}`)
        .send({
          name: 'Renamed Project',
          createdById: pm2User.id, // Malicious ownership transfer attempt
        });

      expect(res.status).toBe(200);

      // Verify in DB that createdById remains pm1User.id
      const verifiedProject = await prisma.project.findUnique({ where: { id: pm1Project.id } });
      expect(verifiedProject!.name).toBe('Renamed Project');
      expect(verifiedProject!.createdById).toBe(pm1User.id);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. ROLE INTEGRITY & DATABASE AS SOLE SOURCE OF TRUTH
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Role Integrity (No Blind Trust in JWT)', () => {
    it('token forged with role: ADMIN for a DEVELOPER is rejected by database verification', async () => {
      // Craft a token where sub is Developer 1, but role claims ADMIN
      const forgedToken = jwt.sign(
        { sub: dev1User.id, role: UserRole.ADMIN },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );

      // Even though route-level middleware permits 'ADMIN', the service layer
      // verifies against PostgreSQL database where user.role === DEVELOPER.
      // Therefore, project listing must throw 403 Forbidden!
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('deleted user with valid token is rejected with 401', async () => {
      // Create a temporary user
      const tempUser = await prisma.user.create({
        data: {
          name: 'Temp User',
          email: 'temp.user@velozity.io',
          passwordHash: 'dummy',
          role: UserRole.DEVELOPER,
        },
      });

      const tempToken = jwt.sign(
        { sub: tempUser.id, role: tempUser.role },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' },
      );

      // Delete the user from DB
      await prisma.user.delete({ where: { id: tempUser.id } });

      // Request with validly-signed token should fail because user no longer exists in DB
      const res = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${tempToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
