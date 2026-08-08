export interface JwtPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    nickname: string;
    avatarUrl?: string | null;
    isEmailVerified: boolean;
  };
  tokens: TokenPair;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}