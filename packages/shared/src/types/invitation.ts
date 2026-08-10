export interface Invitation {
  id: string;
  roomId: string;
  inviterId: string;
  code: string;
  expiresAt: string;
  maxUses?: number | null;
  useCount: number;
  createdAt: string;
}

export interface CreateInvitationRequest {
  expiresAt?: string;
  maxUses?: number;
}

export interface JoinByInviteRequest {
  code: string;
}