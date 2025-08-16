'use server';

/**
 * @fileoverview Этот файл определяет контракты (интерфейсы и типы данных)
 * для взаимодействия с нашей внутренней базой данных.
 */

// --- Data Transfer Objects (DTOs) ---

/**
 * Описывает статус членства в клубе.
 */
export type ClubMemberStatus = 'Bronze' | 'Silver' | 'Gold' | 'VIP';

/**
 * Описывает члена клуба в нашей базе данных.
 */
export interface ClubMember {
  id: string; // Наш внутренний ID
  yclientsClientId: number; // ID из YCLIENTS для связи
  phone: string; // Телефон для поиска
  name: string;
  email?: string;
  status: ClubMemberStatus;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Описывает контентную страницу для услуги или техники.
 */
export interface ContentPage {
    id: string; // Внутренний ID документа
    slug: string; // Уникальный идентификатор для URL
    title: string;
    shortDescription?: string;
    mainImageUrl?: string;
    gallery?: string[];
    fullDescriptionHtml?: string;
    characteristics?: { label: string; value: string }[];
    routeDescriptionHtml?: string;
    conditionsHtml?: string;
    // Связь с операционной сущностью в YCLIENTS
    yclientsServiceId: number; 
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Описывает новостную статью/пост в блоге.
 */
export interface Article {
    id: string;
    slug: string; // Уникальный идентификатор для URL
    title: string;
    authorId?: string; // Связь с пользователем-автором
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

/**
 * Описывает комментарий к статье.
 */
export interface Comment {
    id: string;
    articleId: string; // Связь со статьей
    authorName: string;
    text: string;
    createdAt: Date;
    isApproved: boolean; // Флаг для модерации
}


// --- Service Interface ---

// --- Club Members ---
export type CreateMemberParams = Omit<ClubMember, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateMemberParams = Partial<Omit<ClubMember, 'id' | 'createdAt'>>;

// --- Content Pages ---
export type CreateContentPageParams = Omit<ContentPage, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateContentPageParams = Partial<CreateContentPageParams>;

// --- Articles ---
export type CreateArticleParams = Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'commentCount'>;
export type UpdateArticleParams = Partial<CreateArticleParams>;

// --- Comments ---
export type CreateCommentParams = Omit<Comment, 'id' | 'createdAt' | 'isApproved'>;


/**
 * Интерфейс сервиса для работы с базой данных.
 * Определяет все доступные операции, не раскрывая детали их реализации (Firestore, SQL и т.д.).
 */
export interface IDatabaseService {
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
