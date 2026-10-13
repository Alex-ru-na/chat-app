import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from '../helpers/db.js';
import { startTestServer, type TestServer } from '../helpers/testServer.js';

interface TestUser {
  id: string;
  token: string;
}

async function registerUser(
  app: Express,
  name: string,
  email: string,
): Promise<TestUser> {
  const res = await request(app)
    .post('/api/v1/auth/signup')
    .send({ name, email, password: 'secret123' });

  if (res.status !== 201) {
    throw new Error(`Failed to register ${email}: ${res.status}`);
  }

  return { id: res.body.data.user.id, token: res.body.data.accessToken };
}

describe('Messages API (integration)', () => {
  let server: TestServer;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    await resetDatabase();
    alice = await registerUser(server.app, 'Alice', 'alice@example.com');
    bob = await registerUser(server.app, 'Bob', 'bob@example.com');
    carol = await registerUser(server.app, 'Carol', 'carol@example.com');
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('sends a message and derives the sender from the token', async () => {
    const res = await request(server.app)
      .post('/api/v1/messages')
      .set(auth(alice.token))
      .send({ recipientId: bob.id, content: '  Hello Bob  ' });

    expect(res.status).toBe(201);
    expect(res.body.data.message.senderId).toBe(alice.id);
    expect(res.body.data.message.recipientId).toBe(bob.id);
    expect(res.body.data.message.content).toBe('Hello Bob');
  });

  it('ignores/rejects an attempt to spoof the sender', async () => {
    const res = await request(server.app)
      .post('/api/v1/messages')
      .set(auth(alice.token))
      .send({ recipientId: bob.id, content: 'hi', senderId: carol.id });

    // senderId is not part of the whitelisted DTO → rejected.
    expect(res.status).toBe(400);
  });

  it('returns 404 when the recipient does not exist', async () => {
    const res = await request(server.app)
      .post('/api/v1/messages')
      .set(auth(alice.token))
      .send({
        recipientId: '00000000-0000-0000-0000-000000000000',
        content: 'hi',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RECIPIENT_NOT_FOUND');
  });

  it('returns 400 when messaging yourself', async () => {
    const res = await request(server.app)
      .post('/api/v1/messages')
      .set(auth(alice.token))
      .send({ recipientId: alice.id, content: 'hi me' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_MESSAGE');
  });

  it('rejects a non-UUID recipientId with 400', async () => {
    const res = await request(server.app)
      .post('/api/v1/messages')
      .set(auth(alice.token))
      .send({ recipientId: 'not-a-uuid', content: 'hi' });

    expect(res.status).toBe(400);
  });

  it('retrieves the conversation in chronological order', async () => {
    await request(server.app)
      .post('/api/v1/messages')
      .set(auth(alice.token))
      .send({ recipientId: bob.id, content: 'first' });
    await request(server.app)
      .post('/api/v1/messages')
      .set(auth(bob.token))
      .send({ recipientId: alice.id, content: 'second' });

    const res = await request(server.app)
      .get(`/api/v1/chats/${bob.id}/messages`)
      .set(auth(alice.token));

    expect(res.status).toBe(200);
    expect(
      res.body.data.items.map((m: { content: string }) => m.content),
    ).toEqual(['first', 'second']);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('paginates with an opaque cursor', async () => {
    for (const content of ['m1', 'm2', 'm3']) {
      await request(server.app)
        .post('/api/v1/messages')
        .set(auth(alice.token))
        .send({ recipientId: bob.id, content });
    }

    const first = await request(server.app)
      .get(`/api/v1/chats/${bob.id}/messages?limit=2`)
      .set(auth(alice.token));

    expect(
      first.body.data.items.map((m: { content: string }) => m.content),
    ).toEqual(['m2', 'm3']);
    expect(first.body.data.nextCursor).toBeTypeOf('string');

    const second = await request(server.app)
      .get(
        `/api/v1/chats/${bob.id}/messages?limit=2&cursor=${encodeURIComponent(
          first.body.data.nextCursor,
        )}`,
      )
      .set(auth(alice.token));

    expect(
      second.body.data.items.map((m: { content: string }) => m.content),
    ).toEqual(['m1']);
    expect(second.body.data.nextCursor).toBeNull();
  });

  it("does not expose another pair's conversation", async () => {
    await request(server.app)
      .post('/api/v1/messages')
      .set(auth(alice.token))
      .send({ recipientId: bob.id, content: 'alice-bob secret' });

    const res = await request(server.app)
      .get(`/api/v1/chats/${bob.id}/messages`)
      .set(auth(carol.token));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it('forbids opening a conversation with yourself (403)', async () => {
    const res = await request(server.app)
      .get(`/api/v1/chats/${alice.id}/messages`)
      .set(auth(alice.token));

    expect(res.status).toBe(403);
  });

  it('returns 404 for a conversation with an unknown user', async () => {
    const res = await request(server.app)
      .get('/api/v1/chats/00000000-0000-0000-0000-000000000000/messages')
      .set(auth(alice.token));

    expect(res.status).toBe(404);
  });

  it('rejects an invalid cursor with 400', async () => {
    const res = await request(server.app)
      .get(`/api/v1/chats/${bob.id}/messages?cursor=definitely-not-valid`)
      .set(auth(alice.token));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
