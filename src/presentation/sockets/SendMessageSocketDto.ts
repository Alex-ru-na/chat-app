import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { MESSAGE_CONTENT_MAX_LENGTH } from '../../domain/value-objects/MessageContent.js';

export class SendMessageSocketDto {
  @IsUUID()
  recipientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(MESSAGE_CONTENT_MAX_LENGTH, {
    message: `content must be at most ${MESSAGE_CONTENT_MAX_LENGTH} characters`,
  })
  content!: string;
}
