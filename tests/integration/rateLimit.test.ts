import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../src/presentation/http/middlewares/rateLimit.js';

describe('rate limiter', () => {
  it('returns 429 with the standard envelope once the limit is exceeded', async () => {
    const app = express();
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });

    app.get('/limited', limiter, (_req, res) => {
      res.status(200).json({ success: true, data: {} });
    });

    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);

    const res = await request(app).get('/limited');
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
