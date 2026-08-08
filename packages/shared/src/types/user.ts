export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
  type: "REGISTER" | "RESET_PASSWORD";
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatarUrl?: string | null;
  bio?: string | null;
}