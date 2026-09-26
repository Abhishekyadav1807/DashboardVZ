import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

describe('Auth Endpoints', () => {
  let adminToken: string;
  let refreshTokenCookie: string;

  // We assume the DB is seeded before running tests
  
  describe('POST /api/v1/auth/login', () => {
    it('valid admin login succeeds', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'marcus.vance@velozity.io',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Should never return hash
      
      // Check cookies
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c: string) => c.includes('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');

      adminToken = res.body.data.accessToken;
      const rawCookie = refreshCookie as string;
      refreshTokenCookie = rawCookie.split(';')[0] as string;
    });

    it('invalid email rejected', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@velozity.io', password: 'Password123!' });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('invalid password rejected', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'marcus.vance@velozity.io', password: 'WrongPassword!' });
      
      expect(res.status).toBe(401);
    });

    it('validation errors handled', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'short' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('valid refresh succeeds', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie); // send the cookie from login

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      // Check that a new cookie was set (rotation)
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      
      // Update cookie for logout test
      const rawRotated = cookies.find((c: string) => c.includes('refreshToken=')) as string;
      refreshTokenCookie = rawRotated.split(';')[0] as string;
    });

    it('missing cookie rejected', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns user profile with valid JWT', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('marcus.vance@velozity.io');
    });

    it('missing Authorization rejected', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('malformed Authorization rejected', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `BearerMalformed`);
      expect(res.status).toBe(401);
    });

    it('invalid JWT rejected', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer not.a.real.jwt`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('logout succeeds and revokes token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshTokenCookie);

      expect(res.status).toBe(200);
      
      // Cookie should be cleared
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken=;');
      
      // Trying to refresh with the revoked cookie should now fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshTokenCookie);
      
      expect(refreshRes.status).toBe(401);
    });
  });
});
