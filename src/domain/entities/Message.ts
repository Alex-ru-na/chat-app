import { SelfMessageError } from '../errors/DomainError.js';

export interface MessageProps {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: Date;
}

/**
 * A single persisted text message exchanged between two participants.
 * A conversation is the set of messages between two users regardless of
 * direction; that grouping is expressed by the repository query, not here.
 */
export class Message {
  private constructor(private readonly props: MessageProps) {}

  static reconstitute(props: MessageProps): Message {
    return new Message(props);
  }

  /** Domain invariant: the two participants of a message must differ. */
  static assertDistinctParticipants(
    senderId: string,
    recipientId: string,
  ): void {
    if (senderId === recipientId) {
      throw new SelfMessageError();
    }
  }

  get id(): string {
    return this.props.id;
  }

  get senderId(): string {
    return this.props.senderId;
  }

  get recipientId(): string {
    return this.props.recipientId;
  }

  get content(): string {
    return this.props.content;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
