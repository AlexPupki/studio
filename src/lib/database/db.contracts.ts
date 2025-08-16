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


// --- Service Interface ---

/**
 * Параметры для создания нового члена клуба.
 */
export type CreateMemberParams = Omit<ClubMember, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Параметры для обновления данных члена клуба.
 * Все поля опциональны.
 */
export type UpdateMemberParams = Partial<Omit<ClubMember, 'id' | 'createdAt'>>;

/**
 * Параметры для создания новой контентной страницы.
 */
export type CreateContentPageParams = Omit<ContentPage, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Параметры для обновления контентной страницы.
 */
export type UpdateContentPageParams = Partial<CreateContentPageParams>;


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
}
