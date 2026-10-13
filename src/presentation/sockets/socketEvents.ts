export const SOCKET_EVENTS = {
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_ERROR: 'message:error',
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Private room per user; only that user's sockets can join it. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
