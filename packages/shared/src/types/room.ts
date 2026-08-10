export type RoomRole = "OWNER" | "ADMIN" | "MEMBER";

export interface Room {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  maxMembers: number;
  isPublic: boolean;
  isLocked: boolean;
  requireReady: boolean;
  hasPassword?: boolean;
  password?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  isReady: boolean;
  isMuted: boolean;
  joinedAt: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  maxMembers: number;
  isPublic: boolean;
  requireReady: boolean;
  password?: string;
  tags?: string[];
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string | null;
  maxMembers?: number;
  isPublic?: boolean;
  requireReady?: boolean;
  password?: string | null;
  tags?: string[];
}

export interface JoinRoomRequest {
  password?: string;
}

export interface RoomListQuery {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
}