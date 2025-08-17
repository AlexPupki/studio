/**
 * @fileoverview Этот файл определяет контракты (TypeScript типы и интерфейсы)
 * для домена Identity & Access Management (IAM).
 */

export type User = {
  id: string;
  phoneE164: string;
  preferredLanguage?: 'ru' | 'en';
  status: 'active' | 'blocked';
  createdAt: string; // ISO 8601
  lastLoginAt?: string; // ISO 8601
};

export type LoginCode = {
  id: string;
  phoneE164: string;
  codeHash: string; // Хэш кода, а не сам код
  expiresAt: string; // ISO 8601
  attempts: number;
  createdIp?: string;
  createdUa?: string;
};

export type Session = {
  id: string;
  userId: string;
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  ip?: string;
  ua?: string;
  revokedAt?: string; // ISO 8601, если сессия отозвана
};

export type AuditEventName =
  | 'login_code_requested'
  | 'login_code_verified'
  | 'login_code_failed'
  | 'session_created'
  | 'logout'
  | 'rate_limit_triggered';

export type AuditEvent = {
  id: string;
  ts: string; // ISO 8601
  userId?: string | null; // Может быть null для событий до аутентификации
  event: AuditEventName;
  ip?: string;
  ua?: string;
  meta?: Record<string, unknown>;
};
