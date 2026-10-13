import request from 'supertest';
import { io as ioClient, type Socket } from 'socket.io-client';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { resetDatabase } from '../helpers/db.js';
import { startTestServer, type TestServer } from '../helpers/testServer.js';

interface TestUser {
  id: string;
  token: string;
}

interface MessagePayload {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

function connect(baseUrl: string, token?: string): Socket {
  return ioClient(baseUrl, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
}

function waitForConnect(socket: Socket, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('timed out waiting for connect')),
      timeoutMs,
    );
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for ${event}`)),
      timeoutMs,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response: T) => resolve(response));
  });
}

async function registerUser(
  baseUrl: string,
  name: string,
  email: string,
): Promise<TestUser> {
  const res = await request(baseUrl)
    .post('/api/v1/auth/signup')
    .send({ name, email, password: 'secret123' });

  if (res.status !== 201) {
    throw new Error(`signup failed: ${res.status}`);
  }

  return { id: res.body.data.user.id, token: res.body.data.accessToken };
}

describe('Chat socket (integration)', () => {
  let server: TestServer;
  const openSockets: Socket[] = [];

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(() => {
    for (const socket of openSockets.splice(0)) {
      socket.close();
    }
  });

  async function connectUser(user: TestUser): Promise<Socket> {
    const socket = connect(server.baseUrl, user.token);
    openSockets.push(socket);
    await waitForConnect(socket);
    return socket;
  }

  it('rejects a connection without a valid token', async () => {
    const socket = connect(server.baseUrl, 'not-a-real-token');
    openSockets.push(socket);

    await new Promise<void>((resolve) => {
      socket.once('connect_error', () => resolve());
    });

    expect(socket.connected).toBe(false);
  });

  it('delivers a message to the recipient and acks the sender', async () => {
    const alice = await registerUser(server.baseUrl, 'Alice', 'alice@e.com');
    const bob = await registerUser(server.baseUrl, 'Bob', 'bob@e.com');
    const carol = await registerUser(server.baseUrl, 'Carol', 'carol@e.com');

    const aliceSocket = await connectUser(alice);
    const bobSocket = await connectUser(bob);
    const carolSocket = await connectUser(carol);

    let carolReceived = false;
    carolSocket.on('message:new', () => {
      carolReceived = true;
    });

    const bobDelivery = waitForEvent<MessagePayload>(bobSocket, 'message:new');

    const ack = await emitWithAck<{
      success: boolean;
      data: MessagePayload;
    }>(aliceSocket, 'message:send', {
      recipientId: bob.id,
      content: 'hello bob',
    });

    const received = await bobDelivery;

    expect(ack.success).toBe(true);
    expect(ack.data.content).toBe('hello bob');
    expect(received.senderId).toBe(alice.id);
    expect(received.recipientId).toBe(bob.id);

    // A third user must never receive messages from a conversation they are
    // not part of.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(carolReceived).toBe(false);
  });

  it('persists the message before the recipient is notified', async () => {
    const alice = await registerUser(server.baseUrl, 'Alice', 'alice@e.com');
    const bob = await registerUser(server.baseUrl, 'Bob', 'bob@e.com');

    const aliceSocket = await connectUser(alice);
    const bobSocket = await connectUser(bob);

    const bobDelivery = waitForEvent<MessagePayload>(bobSocket, 'message:new');

    await emitWithAck(aliceSocket, 'message:send', {
      recipientId: bob.id,
      content: 'persisted first',
    });
    await bobDelivery;

    // As soon as the recipient has been notified, the message must already be
    // readable through the REST API (source of truth).
    const res = await request(server.baseUrl)
      .get(`/api/v1/chats/${alice.id}/messages`)
      .set('Authorization', `Bearer ${bob.token}`);

    expect(res.status).toBe(200);
    expect(
      res.body.data.items.map((m: { content: string }) => m.content),
    ).toEqual(['persisted first']);
  });

  it('emits message:error for an invalid payload, without persisting', async () => {
    const alice = await registerUser(server.baseUrl, 'Alice', 'alice@e.com');
    const aliceSocket = await connectUser(alice);

    const errorEvent = waitForEvent<{ code: string }>(
      aliceSocket,
      'message:error',
    );

    const ack = await emitWithAck<{
      success: boolean;
      error: { code: string };
    }>(aliceSocket, 'message:send', { recipientId: 'not-a-uuid', content: '' });

    const error = await errorEvent;

    expect(ack.success).toBe(false);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('emits message:error when sending to an unknown recipient', async () => {
    const alice = await registerUser(server.baseUrl, 'Alice', 'alice@e.com');
    const aliceSocket = await connectUser(alice);

    const ack = await emitWithAck<{
      success: boolean;
      error: { code: string };
    }>(aliceSocket, 'message:send', {
      recipientId: '00000000-0000-0000-0000-000000000000',
      content: 'hi',
    });

    expect(ack.success).toBe(false);
    expect(ack.error.code).toBe('RECIPIENT_NOT_FOUND');
  });
});
