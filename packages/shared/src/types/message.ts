export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "SYSTEM";

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface SendMessageRequest {
  roomId: string;
  content: string;
  type?: MessageType;
  metadata?: Record<string, unknown> | null;
}

export interface MessageReaction {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface MessageListQuery {
  roomId: string;
  cursor?: string;
  limit?: number;
}