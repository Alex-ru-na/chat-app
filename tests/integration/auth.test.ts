import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from '../helpers/db.js';
import { startTestServer, type TestServer } from '../helpers/testServer.js';

describe('Auth API (integration)', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  const signupPayload = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'secret123',
  };

  it('registers a new user (201) without leaking the password hash', async () => {
    const res = await request(server.app)
      .post('/api/v1/auth/signup')
      .send(signupPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('ada@example.com');
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('secret123');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(server.app).post('/api/v1/auth/signup').send(signupPayload);

    const res = await request(server.app)
      .post('/api/v1/auth/signup')
      .send({ ...signupPayload, email: 'ADA@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_IN_USE');
  });

  it('returns structured 400 errors for invalid payloads', async () => {
    const res = await request(server.app).post('/api/v1/auth/signup').send({
      name: 'Ada',
      email: 'not-an-email',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects unknown fields', async () => {
    const res = await request(server.app)
      .post('/api/v1/auth/signup')
      .send({ ...signupPayload, isAdmin: true });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in an existing user (200)', async () => {
    await request(server.app).post('/api/v1/auth/signup').send(signupPayload);

    const res = await request(server.app)
      .post('/api/v1/auth/login')
      .send({ email: 'ada@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
  });

  it('rejects bad credentials with 401', async () => {
    await request(server.app).post('/api/v1/auth/signup').send(signupPayload);

    const res = await request(server.app)
      .post('/api/v1/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('protects message endpoints (401 without a token)', async () => {
    const res = await request(server.app).post('/api/v1/messages').send({
      recipientId: '00000000-0000-0000-0000-000000000000',
      content: 'hi',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid token (401)', async () => {
    const res = await request(server.app)
      .post('/api/v1/messages')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({
        recipientId: '00000000-0000-0000-0000-000000000000',
        content: 'hi',
      });

    expect(res.status).toBe(401);
  });
});
