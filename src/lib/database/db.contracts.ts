/**
 * @fileoverview Этот файл определяет контракты (интерфейсы и типы данных)
 * для взаимодействия с нашей внутренней базой данных.
 */

// --- IAM Domain ---

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
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
  attempts: number;
  usedAt?: string | null; // Помечаем, когда код был использован
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
  revokedAt?: string | null; // ISO 8601, если сессия отозвана
};

export type AuditEvent = {
  id: string;
  ts: string; // ISO 8601
  userId?: string | null; // Может быть null для событий до аутентификации
  event: 'login_code_requested' | 'login_code_verified' | 'login_code_failed' | 'new_user_registered' | 'session_created' | 'logout' | 'rate_limit_triggered';
  ip?: string;
  ua?: string;
  meta?: Record<string, unknown>;
};

// --- Club Members (separate from User for now) ---
export type ClubMemberStatus = 'Bronze' | 'Silver' | 'Gold' | 'VIP';

export interface ClubMember {
  id: string;
  yclientsClientId: number;
  phone: string;
  name: string;
  email?: string;
  status: ClubMemberStatus;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Content & Blog ---
export interface ContentPage {
    id: string;
    slug: string;
    title: string;
    shortDescription?: string;
    mainImageUrl?: string;
    gallery?: string[];
    fullDescriptionHtml?: string;
    characteristics?: { label: string; value: string }[];
    routeDescriptionHtml?: string;
    conditionsHtml?: string;
    yclientsServiceId: number; 
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Article {
    id: string;
    slug: string;
    title: string;
    authorId?: string;
    publishedAt: Date;
    mainImageUrl?: string;
    contentHtml: string;
    seoDescription?: string;
    tags?: string[];
    commentCount: number;
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Comment {
    id: string;
    articleId: string;
    authorName: string;
    text: string;
    createdAt: Date;
    isApproved: boolean;
}


// --- Service Interface & Params ---

// IAM
export type CreateUserParams = Pick<User, 'phoneE164'> & Partial<Pick<User, 'preferredLanguage'>>;
export type CreateLoginCodeParams = Pick<LoginCode, 'phoneE164' | 'codeHash' | 'expiresAt' | 'issuedAt'>;
export type CreateSessionParams = Pick<Session, 'userId' | 'issuedAt' | 'expiresAt'> & Partial<Pick<Session, 'ip' | 'ua'>>;
export type CreateAuditParams = Pick<AuditEvent, 'event'> & Partial<Omit<AuditEvent, 'id' | 'ts'>>;

// Club Members
export type CreateMemberParams = Omit<ClubMember, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMemberParams = Partial<Omit<ClubMember, 'id' | 'createdAt'>>;

// Content Pages
export type CreateContentPageParams = Omit<ContentPage, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateContentPageParams = Partial<CreateContentPageParams>;

// Articles
export type CreateArticleParams = Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'commentCount'>;
export type UpdateArticleParams = Partial<CreateArticleParams>;

// Comments
export type CreateCommentParams = Omit<Comment, 'id' | 'createdAt' | 'isApproved'>;

export interface IDatabaseService {
  // --- IAM ---
  findUserByPhone(phone: string): Promise<User | null>;
  createUser(params: CreateUserParams): Promise<User>;
  updateUserLastLogin(userId: string): Promise<void>;

  createLoginCode(params: CreateLoginCodeParams): Promise<LoginCode>;
  findActiveLoginCode(phoneE164: string): Promise<LoginCode | null>;
  incrementLoginCodeAttempts(id: string): Promise<void>;
  invalidateLoginCode(id: string): Promise<void>;

  findSessionById(id: string): Promise<Session | null>;
  createSession(params: CreateSessionParams): Promise<Session>;
  revokeSession(id: string): Promise<void>;
  
  createAuditEvent(params: CreateAuditParams): Promise<void>;
  
  // --- Club Members ---
  findMemberByPhone(phone: string): Promise<ClubMember | null>;
  findMemberByYclientsId(yclientsId: number): Promise<ClubMember | null>;
  createMember(params: CreateMemberParams): Promise<ClubMember>;
  updateMember(id: string, params: UpdateMemberParams): Promise<ClubMember>;
  
  // --- Content (CMS) ---
  findContentPageBySlug(slug: string): Promise<ContentPage | null>;
  findContentPageById(id: string): Promise<ContentPage | null>;
  getAllContentPages(): Promise<ContentPage[]>;
  createContentPage(params: CreateContentPageParams): Promise<ContentPage>;
  updateContentPage(id: string, params: UpdateContentPageParams): Promise<ContentPage>;
  deleteContentPage(id: string): Promise<void>;

  // --- Articles (Blog) ---
  findArticleBySlug(slug: string): Promise<Article | null>;
  getAllArticles(): Promise<Article[]>;
  createArticle(params: CreateArticleParams): Promise<Article>;
  updateArticle(id: string, params: UpdateArticleParams): Promise<Article>;
  deleteArticle(id: string): Promise<void>;

  // --- Comments ---
  getCommentsByArticleId(articleId: string, onlyApproved?: boolean): Promise<Comment[]>;
  createComment(params: CreateCommentParams): Promise<Comment>;
  approveComment(id: string): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
}