'use server';

import { ClubMember, CreateMemberParams, IDatabaseService, UpdateMemberParams } from "./db.contracts";

/**
 * @fileoverview Этот файл содержит фабрику для создания сервиса базы данных.
 * В данный момент он возвращает "фейковый" сервис-заглушку для разработки.
 * В будущем здесь будет инициализация реального клиента БД (например, Firestore).
 */


// --- Mock (Fake) Service ---

/**
 * Это временная реализация-заглушка нашего сервиса БД.
 * Она не хранит данные и предназначена только для того, чтобы
 * остальная часть приложения могла компилироваться и работать
 * во время разработки.
 */
class MockDatabaseService implements IDatabaseService {
    async findMemberByPhone(phone: string): Promise<ClubMember | null> {
        console.log(`[MockDB] Поиск пользователя по телефону: ${phone}`);
        return null; // Всегда возвращаем null, пока нет реальной БД
    }

    async findMemberByYclientsId(yclientsId: number): Promise<ClubMember | null> {
        console.log(`[MockDB] Поиск пользователя по YCLIENTS ID: ${yclientsId}`);
        return null;
    }

    async createMember(params: CreateMemberParams): Promise<ClubMember> {
        console.log(`[MockDB] Создание пользователя:`, params);
        const newMember: ClubMember = {
            id: `mock_${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...params,
        };
        return newMember;
    }

    async updateMember(id: string, params: UpdateMemberParams): Promise<ClubMember> {
        console.log(`[MockDB] Обновление пользователя ${id}:`, params);
        // В "моке" мы не можем вернуть реально обновленные данные,
        // поэтому просто возвращаем то, что пришло.
        return {
            id,
            yclientsClientId: 0,
            phone: '',
            name: '',
            status: 'Bronze',
            points: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...params,
        };
    }
}


// --- Service Factory ---

let dbServiceInstance: IDatabaseService | null = null;

/**
 * Фабричная функция для создания или получения единственного экземпляра сервиса БД.
 * Гарантирует, что сервис инициализируется только один раз (Singleton).
 * @returns {Promise<IDatabaseService>} Экземпляр сервиса для работы с БД.
 */
export async function createDbService(): Promise<IDatabaseService> {
  if (dbServiceInstance) {
    return dbServiceInstance;
  }

  // TODO: В будущем здесь будет инициализация реального клиента БД (например, Firestore)
  // на основе переменных окружения.
  console.warn('ВНИМАНИЕ: Используется MockDatabaseService. Подключите реальную базу данных.');
  
  dbServiceInstance = new MockDatabaseService();
  return dbServiceInstance;
}
