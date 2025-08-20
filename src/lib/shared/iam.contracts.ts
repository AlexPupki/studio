// This file is safe to import on the client and server.
// It should not contain any server-side dependencies.

export type UserRole = "customer" | "staff" | "editor" | "ops.viewer" | "ops.editor" | "admin";

export interface User {
  id: string;
  phoneE164: string;
  createdAt: string;
  lastLoginAt: string;
  status: 'active' | 'blocked';
  preferredLanguage: 'ru' | 'en';
  roles: UserRole[]; // e.g., ['customer', 'ops']
}

export interface LoginCode {
  id: string;
  phoneE164: string;
  codeHash: string;
  issuedAt: string;
  expiresAt: string;
  attempts: number;
  usedAt?: string;
  createdIp?: string;
  createdUa?: string;
}

export interface Session {
  id: string;
  userId: string;
  issuedAt: string;
  expiresAt: string;
  ip?: string;
  ua?: string;
  revokedAt?: string;
}

export interface VerifyResult {
  success: boolean;
  user?: User;
}

export interface IamService {
  findUserByPhone(phoneE164: string): Promise<User | null>;
  createLoginCode(
    phoneE164: string
  ): Promise<{ user: User; code: string }>;
  verifyLoginCode(input: {
    phoneE164: string;
    code: string;
  }): Promise<VerifyResult>;
  findUserById(userId: string): Promise<User | null>;
}
