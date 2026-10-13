import { createServer } from 'node:http';
import { createApp } from './app.js';
import { buildContainer } from './infrastructure/container.js';
import { env } from './infrastructure/config/env.js';
import { prisma } from './infrastructure/database/prisma.js';
import { createSocketServer } from './infrastructure/sockets/createSocketServer.js';
import { ChatSocketHandler } from './presentation/sockets/ChatSocketHandler.js';

async function bootstrap(): Promise<void> {
  const container = buildContainer();
  const app = createApp(container);

  const httpServer = createServer(app);

  const chatSocketHandler = new ChatSocketHandler({
    sendMessage: container.useCases.sendMessage,
  });

  const io = createSocketServer(
    httpServer,
    container.services.tokenService,
    chatSocketHandler,
  );

  httpServer.listen(env.PORT, () => {
    console.log(`HTTP server listening on http://localhost:${env.PORT}`);
    console.log(`API docs available at http://localhost:${env.PORT}/docs`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received — shutting down gracefully...`);

    const forceExit = setTimeout(() => {
      console.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    try {
      await new Promise<void>((resolve) => {
        io.close(() => resolve());
      });
      await prisma.$disconnect();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap', error);
  process.exit(1);
});
