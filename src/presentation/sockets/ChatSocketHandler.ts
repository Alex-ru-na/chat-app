import type { Server, Socket } from 'socket.io';
import { DomainError } from '../../domain/errors/DomainError.js';
import type { SendMessage } from '../../application/use-cases/SendMessage.js';
import { AppError, type ErrorDetail } from '../../shared/errors/AppError.js';
import {
  toMessageResponse,
  type MessageResponse,
} from '../http/mappers/responseMappers.js';
import { SendMessageSocketDto } from './SendMessageSocketDto.js';
import { SOCKET_EVENTS, userRoom } from './socketEvents.js';
import { validateSocketPayload } from './validateSocketPayload.js';

interface SocketErrorPayload {
  code: string;
  message: string;
  details: ErrorDetail[];
}

type AckResponse =
  | { success: true; data: MessageResponse }
  | { success: false; error: SocketErrorPayload };

type Ack = ((response: AckResponse) => void) | undefined;

export interface ChatSocketHandlerDependencies {
  sendMessage: SendMessage;
}

function mapSocketError(error: unknown): SocketErrorPayload {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, details: error.details };
  }
  if (error instanceof DomainError) {
    return { code: error.code, message: error.message, details: [] };
  }
  console.error('[socket:error]', error);
  return {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    details: [],
  };
}

/**
 * Thin real-time adapter. It reuses the same `SendMessage` use case as REST,
 * so persistence rules are identical. A message is persisted by the use case
 * *before* any `message:new` is emitted, guaranteeing recipients are never
 * notified of a message that failed to save.
 */
export class ChatSocketHandler {
  constructor(private readonly deps: ChatSocketHandlerDependencies) {}

  register(io: Server): void {
    io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId as string;

      // Each authenticated user only ever joins their own private room.
      void socket.join(userRoom(userId));

      socket.on(SOCKET_EVENTS.MESSAGE_SEND, (payload: unknown, ack?: Ack) => {
        void this.handleSend(io, socket, payload, ack);
      });

      socket.on('disconnect', () => {
        // Socket.IO removes the socket from its rooms automatically; nothing
        // to clean up here beyond optional observability.
      });
    });
  }

  private async handleSend(
    io: Server,
    socket: Socket,
    payload: unknown,
    ack: Ack,
  ): Promise<void> {
    try {
      const dto = await validateSocketPayload(SendMessageSocketDto, payload);
      const senderId = socket.data.userId as string;

      const { message } = await this.deps.sendMessage.execute({
        senderId,
        recipientId: dto.recipientId,
        content: dto.content,
      });

      const response = toMessageResponse(message);

      // Persisted → now broadcast to the recipient's private room.
      io.to(userRoom(dto.recipientId)).emit(
        SOCKET_EVENTS.MESSAGE_NEW,
        response,
      );

      // Echo to the sender's *other* devices (the origin socket gets the ack).
      socket.to(userRoom(senderId)).emit(SOCKET_EVENTS.MESSAGE_NEW, response);

      ack?.({ success: true, data: response });
    } catch (error) {
      const mapped = mapSocketError(error);
      socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, mapped);
      ack?.({ success: false, error: mapped });
    }
  }
}
