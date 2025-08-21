// This file is safe to import on the client and server.
// It should not contain any server-side dependencies.

import type { users } from "../server/db/schema";

export type UserRole = "customer" | "staff" | "editor" | "ops.viewer" | "ops.editor" | "admin";

// We can infer the User type from the database schema to keep them in sync.
export type User = typeof users.$inferSelect;

export interface LoginCode {
  id: number;
  phoneE164: string;
  codeHash: string;
  issuedAt: Date;
  expiresAt: Date;
  used: boolean;
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
