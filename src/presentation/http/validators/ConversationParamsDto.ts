import { IsUUID } from 'class-validator';

export class ConversationParamsDto {
  @IsUUID()
  userId!: string;
}
