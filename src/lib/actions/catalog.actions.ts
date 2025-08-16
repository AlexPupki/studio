'use server';

/**
 * @fileoverview Этот файл содержит серверные экшены (Server Actions)
 * для работы с каталогом услуг. Эти функции вызываются клиентскими
 * компонентами для получения данных или выполнения операций на сервере.
 */

import { createYclientsService } from '../yclients/yclients.service.server';
import { z } from 'zod';
import { YcClient } from '../yclients/yclients.contracts';
import { createDbService } from '../database/db.service.server';
import { CreateCommentParams } from '../database/db.contracts';
import { createAnalyticsService } from '../analytics/analytics.service.server';

const actionError = { _server: ['Произошла внутренняя ошибка. Попробуйте позже.'] };

// --- Get Services from YCLIENTS ---

const GetServicesSchema = z.object({
  branchId: z.number().int().positive('Branch ID должен быть положительным числом'),
});

export async function getServicesAction(params: z.infer<typeof GetServicesSchema>) {
  try {
    const validation = GetServicesSchema.safeParse(params);
    if (!validation.success) {
      return { data: null, error: validation.error.flatten().fieldErrors };
    }

    const yclientsService = await createYclientsService();
    const services = await yclientsService.getServices({ branchId: validation.data.branchId });

    return { data: services, error: null };
  } catch (err) {
    console.error('Ошибка в getServicesAction:', err);
    return { data: null, error: actionError };
  }
}

// --- Get Available Slots from YCLIENTS ---

const GetAvailableSlotsSchema = z.object({
    branchId: z.number().int(),
    staffId: z.number().int(),
    serviceId: z.number().int(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
});

export async function getAvailableSlotsAction(params: z.infer<typeof GetAvailableSlotsSchema>) {
    try {
        const validation = GetAvailableSlotsSchema.safeParse(params);
        if (!validation.success) {
            return { data: null, error: validation.error.flatten().fieldErrors };
        }

        const yclientsService = await createYclientsService();
        const slots = await yclientsService.getAvailableSlots(validation.data);

        return { data: slots, error: null };
    } catch (err) {
        console.error('Ошибка в getAvailableSlotsAction:', err);
        return { data: null, error: actionError };
    }
}


// --- Create Booking Request (Orchestrator) ---

const CreateBookingRequestSchema = z.object({
    branchId: z.number().int(),
    staffId: z.number().int(),
    serviceId: z.number().int(),
    serviceTitle: z.string(),
    datetime: z.string().datetime('Дата и время должны быть в формате ISO 8601'),
    client: z.object({
        name: z.string().min(2, 'Имя обязательно'),
        phone: z.string().min(10, 'Телефон обязателен'),
        email: z.string().email('Неверный формат email').optional(),
    }),
});

export async function createBookingRequestAction(params: z.infer<typeof CreateBookingRequestSchema>) {
    try {
        const validation = CreateBookingRequestSchema.safeParse(params);
        if (!validation.success) {
            return { data: null, error: validation.error.flatten().fieldErrors };
        }
        
        const { client: clientData, serviceTitle, datetime, serviceId, branchId } = validation.data;
        
        // 1. Получаем все сервисы через фабрики
        const yclientsService = await createYclientsService();
        const dbService = await createDbService();
        const analytics = await createAnalyticsService();

        // 2. Найти или создать клиента в YCLIENTS
        let ycClient: YcClient | null = await yclientsService.findClientByPhone(clientData.phone);
        if (!ycClient) {
            ycClient = await yclientsService.createClient(clientData);
        }
        if (!ycClient) {
            throw new Error('Failed to find or create a client in YCLIENTS');
        }

        // 3. Сформировать комментарий для заявки в YCLIENTS
        const requestDate = new Date(datetime).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const comment = `[GTS-APP] Новая заявка от ${clientData.name} (${clientData.phone}). Услуга: "${serviceTitle}". Желаемое время: ${requestDate}.`;
        
        await yclientsService.updateClientComment(ycClient.id, comment);

        // 4. Синхронизировать с нашей базой данных
        let clubMember = await dbService.findMemberByYclientsId(ycClient.id);
        if (!clubMember) {
            clubMember = await dbService.createMember({
                yclientsClientId: ycClient.id,
                name: ycClient.name,
                phone: ycClient.phone,
                email: ycClient.email,
                status: 'Bronze', // Статус по умолчанию для новых
                points: 0,
            });
            // Отслеживаем только первую регистрацию
            analytics.track('new_club_member_registered', { clubMemberId: clubMember.id, source: 'booking_form' });
        }

        // 5. Отправляем событие аналитики о новой заявке
        analytics.track('booking_request_created', {
            yclientsClientId: ycClient.id,
            clubMemberId: clubMember.id,
            serviceId: serviceId,
            branchId: branchId,
        });

        return { data: { success: true, yclientsClientId: ycClient.id, clubMemberId: clubMember.id }, error: null };

    } catch (err) {
        console.error('Ошибка в createBookingRequestAction:', err);
        return { data: null, error: actionError };
    }
}


// --- Get Content Pages from Database ---

export async function getAllContentPagesAction() {
    try {
        const dbService = await createDbService();
        const pages = await dbService.getAllContentPages();
        return { data: pages, error: null };
    } catch (err) {
        console.error('Ошибка в getAllContentPagesAction:', err);
        return { data: null, error: actionError };
    }
}

export async function getContentPageBySlugAction(slug: string) {
    if (!slug) {
        return { data: null, error: { _server: ['Slug is required.'] } };
    }
    try {
        const dbService = await createDbService();
        const page = await dbService.findContentPageBySlug(slug);
        if (!page) {
             return { data: null, error: { _server: ['Page not found.'] } };
        }
        return { data: page, error: null };
    } catch (err) {
        console.error(`Ошибка в getContentPageBySlugAction (slug: ${slug}):`, err);
        return { data: null, error: actionError };
    }
}

// --- Blog / Articles Actions ---

export async function getAllArticlesAction() {
    try {
        const dbService = await createDbService();
        const articles = await dbService.getAllArticles();
        return { data: articles, error: null };
    } catch (err) {
        console.error('Ошибка в getAllArticlesAction:', err);
        return { data: null, error: actionError };
    }
}

export async function getArticleBySlugAction(slug: string) {
    if (!slug) {
        return { data: null, error: { _server: ['Slug is required.'] } };
    }
    try {
        const dbService = await createDbService();
        const article = await dbService.findArticleBySlug(slug);
        if (!article) {
             return { data: null, error: { _server: ['Article not found.'] } };
        }
        return { data: article, error: null };
    } catch (err) {
        console.error(`Ошибка в getArticleBySlugAction (slug: ${slug}):`, err);
        return { data: null, error: actionError };
    }
}

// --- Comments Actions ---

export async function getCommentsByArticleIdAction(articleId: string) {
    if (!articleId) {
        return { data: null, error: { _server: ['Article ID is required.'] } };
    }
    try {
        const dbService = await createDbService();
        // Получаем только одобренные комментарии для публичной части
        const comments = await dbService.getCommentsByArticleId(articleId, true);
        return { data: comments, error: null };
    } catch (err)
 {
        console.error(`Ошибка в getCommentsByArticleIdAction (articleId: ${articleId}):`, err);
        return { data: null, error: actionError };
    }
}

const CreateCommentSchema = z.object({
    articleId: z.string().min(1, 'Article ID is required'),
    authorName: z.string().min(2, 'Имя обязательно для заполнения'),
    text: z.string().min(10, 'Текст комментария должен быть не менее 10 символов'),
});


export async function createCommentAction(params: CreateCommentParams) {
    try {
        const validation = CreateCommentSchema.safeParse(params);
        if (!validation.success) {
            return { data: null, error: validation.error.flatten().fieldErrors };
        }

        const dbService = await createDbService();
        const newComment = await dbService.createComment(validation.data);
        
        // Отправляем событие аналитики
        const analytics = await createAnalyticsService();
        analytics.track('article_comment_submitted', { 
            articleId: newComment.articleId,
            commentId: newComment.id,
            authorName: newComment.authorName
        });


        // Возвращаем успешный результат, но сам комментарий появится после модерации
        return { data: { success: true, commentId: newComment.id }, error: null };

    } catch (err) {
        console.error('Ошибка в createCommentAction:', err);
        return { data: null, error: actionError };
    }
}
