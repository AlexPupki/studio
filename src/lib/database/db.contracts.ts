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
 * Интерфейс сервиса для работы с базой данных.
 * Определяет все доступные операции, не раскрывая детали их реализации (Firestore, SQL и т.д.).
 */
export interface IDatabaseService {
  /**
   * Находит члена клуба по номеру телефона.
   * @param phone - Номер телефона.
   * @returns Промис с объектом ClubMember или null, если не найден.
   */
  findMemberByPhone(phone: string): Promise<ClubMember | null>;
  
  /**
   * Находит члена клуба по его ID в YCLIENTS.
   * @param yclientsId - ID клиента в YCLIENTS.
   * @returns Промис с объектом ClubMember или null, если не найден.
   */
  findMemberByYclientsId(yclientsId: number): Promise<ClubMember | null>;

  /**
   * Создает нового члена клуба.
   * @param params - Данные для создания.
   * @returns Промис с созданным объектом ClubMember.
   */
  createMember(params: CreateMemberParams): Promise<ClubMember>;

  /**
   * Обновляет данные существующего члена клуба.
   * @param id - Внутренний ID члена клуба.
   * @param params - Поля для обновления.
   * @returns Промис с обновленным объектом ClubMember.
   */
  updateMember(id: string, params: UpdateMemberParams): Promise<ClubMember>;
}
