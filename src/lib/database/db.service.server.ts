'use server';

import { 
    Article,
    ClubMember, 
    Comment,
    ContentPage, 
    CreateArticleParams,
    CreateCommentParams,
    CreateContentPageParams, 
    CreateMemberParams, 
    IDatabaseService, 
    UpdateArticleParams,
    UpdateContentPageParams, 
    UpdateMemberParams,
    User,
    LoginCode,
    Session,
    AuditEvent,
    CreateUserParams,
    CreateLoginCodeParams,
    CreateSessionParams,
    CreateAuditParams
} from "./db.contracts";

/**
 * @fileoverview Этот файл содержит фабрику для создания сервиса базы данных.
 * В данный момент он возвращает "фейковый" сервис-заглушку для разработки.
 */


class MockDatabaseService implements IDatabaseService {
    // --- Mock Data Store ---
    private users: Map<string, User> = new Map();
    private loginCodes: Map<string, LoginCode> = new Map();
    private sessions: Map<string, Session> = new Map();
    private auditEvents: AuditEvent[] = [];
    private clubMembers: Map<string, ClubMember> = new Map();

    // --- IAM ---
    async findUserByPhone(phone: string): Promise<User | null> {
        for (const user of this.users.values()) {
            if (user.phoneE164 === phone) {
                console.log(`[MockDB] Found user by phone: ${phone}`);
                return user;
            }
        }
        console.log(`[MockDB] User not found by phone: ${phone}`);
        return null;
    }

    async createUser(params: CreateUserParams): Promise<User> {
        const id = `user_${Date.now()}`;
        const newUser: User = {
            id,
            status: 'active',
            createdAt: new Date().toISOString(),
            ...params,
        };
        this.users.set(id, newUser);
        console.log(`[MockDB] Created user:`, newUser);
        return newUser;
    }
    
    async updateUserLastLogin(userId: string): Promise<void> {
        const user = this.users.get(userId);
        if (user) {
            user.lastLoginAt = new Date().toISOString();
            console.log(`[MockDB] Updated last login for user ${userId}`);
        }
    }

    async createLoginCode(params: CreateLoginCodeParams): Promise<LoginCode> {
        const id = `code_${Date.now()}`;
        const newCode: LoginCode = {
            id,
            attempts: 0,
            ...params,
        };
        this.loginCodes.set(id, newCode);
        console.log(`[MockDB] Created login code for ${params.phoneE164}`);
        return newCode;
    }

    async findActiveLoginCode(phoneE164: string): Promise<LoginCode | null> {
        for (const code of this.loginCodes.values()) {
            if (
                code.phoneE164 === phoneE164 &&
                !code.usedAt &&
                new Date(code.expiresAt) > new Date()
            ) {
                console.log(`[MockDB] Found active login code for ${phoneE164}`);
                return code;
            }
        }
        console.log(`[MockDB] No active login code found for ${phoneE164}`);
        return null;
    }
    
    async incrementLoginCodeAttempts(id: string): Promise<void> {
        const code = this.loginCodes.get(id);
        if (code) {
            code.attempts += 1;
            console.log(`[MockDB] Incremented attempts for code ${id} to ${code.attempts}`);
        }
    }

    async invalidateLoginCode(id: string): Promise<void> {
        const code = this.loginCodes.get(id);
        if (code) {
            code.usedAt = new Date().toISOString();
            console.log(`[MockDB] Invalidated login code ${id}`);
        }
    }
    
    async findSessionById(id: string): Promise<Session | null> {
        const session = this.sessions.get(id) || null;
        console.log(`[MockDB] Finding session by ID ${id}, found: ${!!session}`);
        return session;
    }

    async createSession(params: CreateSessionParams): Promise<Session> {
        const id = `session_${Date.now()}`;
        const newSession: Session = {
            id,
            ...params,
        };
        this.sessions.set(id, newSession);
        console.log(`[MockDB] Created session ${id} for user ${params.userId}`);
        return newSession;
    }

    async revokeSession(id: string): Promise<void> {
        const session = this.sessions.get(id);
        if (session) {
            session.revokedAt = new Date().toISOString();
            console.log(`[MockDB] Revoked session ${id}`);
        }
    }

    async createAuditEvent(params: CreateAuditParams): Promise<void> {
        const id = `event_${Date.now()}`;
        const newEvent: AuditEvent = {
            id,
            ts: new Date().toISOString(),
            ...params,
        };
        this.auditEvents.push(newEvent);
        console.log(`[MockDB] Created audit event:`, newEvent.event);
    }
    
    // --- Club Members ---
    async findMemberByPhone(phone: string): Promise<ClubMember | null> {
        console.log(`[MockDB] Поиск пользователя по телефону: ${phone}`);
        return null;
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

    // --- Articles (Blog) ---
    async findArticleBySlug(slug: string): Promise<Article | null> {
        console.log(`[MockDB] Поиск статьи по slug: ${slug}`);
        return null;
    }

    async getAllArticles(): Promise<Article[]> {
        console.log(`[MockDB] Получение всех статей`);
        return [];
    }

    async createArticle(params: CreateArticleParams): Promise<Article> {
        console.log('[MockDB] Создание статьи:', params);
        const newArticle: Article = {
            id: `mock_article_${Date.now()}`,
            commentCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...params,
        };
        return newArticle;
    }

    async updateArticle(id: string, params: UpdateArticleParams): Promise<Article> {
        console.log(`[MockDB] Обновление статьи ${id}:`, params);
        return {
            id,
            slug: 'mock-slug',
            title: 'Mock Title',
            contentHtml: '<p>mock</p>',
            published: true,
            commentCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...params,
        } as Article;
    }

    async deleteArticle(id: string): Promise<void> {
        console.log(`[MockDB] Удаление статьи ${id}`);
        return Promise.resolve();
    }

    // --- Comments ---
    async getCommentsByArticleId(articleId: string, onlyApproved = true): Promise<Comment[]> {
        console.log(`[MockDB] Получение комментариев для статьи ${articleId} (только одобренные: ${onlyApproved})`);
        return [];
    }

    async createComment(params: CreateCommentParams): Promise<Comment> {
        console.log('[MockDB] Создание комментария:', params);
        const newComment: Comment = {
            id: `mock_comment_${Date.now()}`,
            isApproved: false,
            createdAt: new Date(),
            ...params,
        };
        return newComment;
    }

    async approveComment(id: string): Promise<Comment> {
        console.log(`[MockDB] Одобрение комментария ${id}`);
        return {
            id,
            articleId: 'mock_article_1',
            authorName: 'Mock User',
            text: 'Mock comment',
            isApproved: true,
            createdAt: new Date(),
        };
    }

    async deleteComment(id: string): Promise<void> {
        console.log(`[MockDB] Удаление комментария ${id}`);
        return Promise.resolve();
    }
}


// --- Service Factory ---

let dbServiceInstance: IDatabaseService | null = null;

export async function createDbService(): Promise<IDatabaseService> {
  if (dbServiceInstance) {
    return dbServiceInstance;
  }

  console.warn('ВНИМАНИЕ: Используется MockDatabaseService. Данные не сохраняются между запросами.');
  
  dbServiceInstance = new MockDatabaseService();
  return dbServiceInstance;
}
