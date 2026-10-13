import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { TokenService } from '../../application/ports/TokenService.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import type { ChatSocketHandler } from '../../presentation/sockets/ChatSocketHandler.js';
import { corsOrigins } from '../config/env.js';

const BEARER_PREFIX = 'Bearer ';

function extractToken(socket: Socket): string {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.length > 0) {
    return authToken;
  }

  const header = socket.handshake.headers.authorization;
  if (header && header.startsWith(BEARER_PREFIX)) {
    const token = header.slice(BEARER_PREFIX.length).trim();
    if (token.length > 0) {
      return token;
    }
  }

  throw new UnauthorizedError('Missing socket authentication credentials');
}

/**
 * Creates the Socket.IO server attached to the HTTP server and enforces
 * authentication on the handshake. Only after verifying the JWT is the
 * principal stored on `socket.data`, where handlers derive the sender id.
 */
export function createSocketServer(
  httpServer: HttpServer,
  tokenService: TokenService,
  handler: ChatSocketHandler,
): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    try {
      const token = extractToken(socket);
      const payload = tokenService.verify(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  handler.register(io);

  return io;
}
