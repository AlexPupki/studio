'use server';

import { 
    ClubMember, 
    ContentPage, 
    CreateContentPageParams, 
    CreateMemberParams, 
    IDatabaseService, 
    UpdateContentPageParams, 
    UpdateMemberParams 
} from "./db.contracts";

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
    // --- Club Members ---

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
            id: `mock_user_${Date.now()}`,
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
        } as ClubMember;
    }

    // --- Content (CMS) ---

    async findContentPageBySlug(slug: string): Promise<ContentPage | null> {
        console.log(`[MockDB] Поиск страницы по slug: ${slug}`);
        return null;
    }

    async findContentPageById(id: string): Promise<ContentPage | null> {
        console.log(`[MockDB] Поиск страницы по ID: ${id}`);
        return null;
    }

    async getAllContentPages(): Promise<ContentPage[]> {
        console.log(`[MockDB] Получение всех страниц`);
        return [];
    }

    async createContentPage(params: CreateContentPageParams): Promise<ContentPage> {
        console.log(`[MockDB] Создание страницы:`, params);
        const newPage: ContentPage = {
            id: `mock_page_${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...params,
        };
        return newPage;
    }

    async updateContentPage(id: string, params: UpdateContentPageParams): Promise<ContentPage> {
        console.log(`[MockDB] Обновление страницы ${id}:`, params);
        return {
            id,
            slug: 'mock-slug',
            title: 'Mock Title',
            yclientsServiceId: 0,
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...params,
        } as ContentPage;
    }

    async deleteContentPage(id: string): Promise<void> {
        console.log(`[MockDB] Удаление страницы ${id}`);
        return Promise.resolve();
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
