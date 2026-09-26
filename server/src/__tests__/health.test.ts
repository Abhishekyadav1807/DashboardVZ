import request from 'supertest';
import app from '../app';

/**
 * Phase 1 smoke test — verifies the Express app starts and the health
 * endpoint returns the expected envelope shape.
 *
 * More substantial tests (auth, RBAC, task status) are added in Phase 13.
 */
describe('GET /api/health', () => {
  it('returns 200 with success envelope', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('velozity-api');
    expect(typeof res.body.data.timestamp).toBe('string');
  });

  it('returns a 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
