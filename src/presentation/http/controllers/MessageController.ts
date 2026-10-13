import type { Request, Response } from 'express';
import { GetConversationMessages } from '../../../application/use-cases/GetConversationMessages.js';
import { SendMessage } from '../../../application/use-cases/SendMessage.js';
import { env } from '../../../infrastructure/config/env.js';
import type {
  ApiSuccess,
  PaginatedData,
} from '../../../shared/types/ApiResponse.js';
import {
  toMessageResponse,
  type MessageResponse,
} from '../mappers/responseMappers.js';
import { requirePrincipal } from '../middlewares/auth.js';
import type { ConversationParamsDto } from '../validators/ConversationParamsDto.js';
import type { PaginationQueryDto } from '../validators/PaginationQueryDto.js';
import type { SendMessageDto } from '../validators/SendMessageDto.js';

export interface MessageControllerDependencies {
  sendMessage: SendMessage;
  getConversationMessages: GetConversationMessages;
}

/** Thin HTTP adapter for messaging. Delegates all rules to use cases. */
export class MessageController {
  constructor(private readonly deps: MessageControllerDependencies) {}

  send = async (req: Request, res: Response): Promise<void> => {
    const principal = requirePrincipal(req);
    const dto = req.body as SendMessageDto;

    const { message } = await this.deps.sendMessage.execute({
      senderId: principal.userId,
      recipientId: dto.recipientId,
      content: dto.content,
    });

    const body: ApiSuccess<{ message: MessageResponse }> = {
      success: true,
      data: { message: toMessageResponse(message) },
    };

    res.status(201).json(body);
  };

  getConversation = async (req: Request, res: Response): Promise<void> => {
    const principal = requirePrincipal(req);
    const params = req.params as unknown as ConversationParamsDto;
    const query = req.query as unknown as PaginationQueryDto;

    const { messages, nextCursor } =
      await this.deps.getConversationMessages.execute({
        requesterId: principal.userId,
        otherUserId: params.userId,
        limit: query.limit ?? env.DEFAULT_PAGE_SIZE,
        ...(query.cursor !== undefined ? { cursor: query.cursor } : {}),
      });

    const body: ApiSuccess<PaginatedData<MessageResponse>> = {
      success: true,
      data: {
        items: messages.map(toMessageResponse),
        nextCursor,
      },
    };

    res.status(200).json(body);
  };
}
