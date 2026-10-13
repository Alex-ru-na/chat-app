import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import type { Server as IOServer } from 'socket.io';
import { createApp } from '../../src/app.js';
import {
  buildContainer,
  type Container,
} from '../../src/infrastructure/container.js';
import { createSocketServer } from '../../src/infrastructure/sockets/createSocketServer.js';
import { ChatSocketHandler } from '../../src/presentation/sockets/ChatSocketHandler.js';

export interface TestServer {
  container: Container;
  app: Express;
  httpServer: HttpServer;
  io: IOServer;
  baseUrl: string;
  close: () => Promise<void>;
}

/** Boots the real app + Socket.IO on an ephemeral port for integration tests. */
export async function startTestServer(): Promise<TestServer> {
  const container = buildContainer();
  const app = createApp(container);
  const httpServer = createServer(app);

  const handler = new ChatSocketHandler({
    sendMessage: container.useCases.sendMessage,
  });
  const io = createSocketServer(
    httpServer,
    container.services.tokenService,
    handler,
  );

  await new Promise<void>((resolve) => {
    httpServer.listen(0, resolve);
  });

  const { port } = httpServer.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    container,
    app,
    httpServer,
    io,
    baseUrl,
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => resolve());
      }),
  };
}
