'use server';

/**
 * @fileoverview Этот файл содержит конкретную реализацию (адаптер)
 * для взаимодействия с API YCLIENTS и фабрику для его создания. 
 * Он инкапсулирует всю логику HTTP-запросов, аутентификации и 
 * обработки ответов, следуя принципам гексагональной архитектуры.
 */

import type {
  CreateClientParams,
  CreateRecordParams,
  GetAvailableSlotsParams,
  GetServicesParams,
  IYclientsService,
  YcClient,
  YcRecord,
  YcService,
} from './yclients.contracts';

/**
 * Конфигурация для сервиса YCLIENTS.
 */
export interface YclientsServiceConfig {
  userToken: string;
  companyId: number;
  // Базовый URL можно вынести для гибкости (тест/прод)
  baseUrl?: string;
}

/**
 * Реализация сервиса для работы с YCLIENTS API.
 */
export class YclientsService implements IYclientsService {
  private readonly baseUrl: string;
  private readonly userToken: string;
  private readonly companyId: number;

  constructor(config: YclientsServiceConfig) {
    if (!config.userToken || !config.companyId) {
      throw new Error('YCLIENTS Service: userToken and companyId are required.');
    }
    this.baseUrl = config.baseUrl || 'https://api.yclients.com/api/v1';
    this.userToken = config.userToken;
    this.companyId = config.companyId;
  }

  /**
   * Выполняет HTTP-запрос к API YCLIENTS.
   * @param endpoint - Путь к эндпоинту (e.g., `/services/123/456`).
   * @param options - Опции для fetch-запроса.
   * @private
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.userToken}`,
      'Accept': 'application/vnd.yclients.v2+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });

      if (!response.ok) {
        // Попытаемся прочитать тело ошибки для более детального лога
        const errorBody = await response.text();
        console.error(`YCLIENTS API error on ${endpoint}: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch from YCLIENTS API: ${response.statusText}`);
      }
      
      // YCLIENTS может вернуть 204 No Content на некоторые запросы
      if (response.status === 204) {
        return null as T;
      }

      const data = await response.json();
      // Ответ YCLIENTS часто обернут в { success: true, data: [...] }
      return data.data || data;

    } catch (error) {
      console.error(`YCLIENTS request failed: ${error}`);
      throw error; // Перебрасываем ошибку выше
    }
  }

  /**
   * @inheritdoc
   */
  async getServices(params: GetServicesParams): Promise<YcService[]> {
    const endpoint = `/services/${this.companyId}/${params.branchId}`;
    return this.request<YcService[]>(endpoint, { method: 'GET' });
  }

  /**
   * @inheritdoc
   */
  async getAvailableSlots(params: GetAvailableSlotsParams): Promise<string[]> {
    const { branchId, staffId, serviceId, date } = params;
    // YCLIENTS API для расписания требует массив ID услуг
    const serviceIds = [serviceId];
    const endpoint = `/schedule/${this.companyId}/${branchId}/${staffId}/${date}?service_ids[]=${serviceIds.join(',')}`;
    // Ответ API может содержать много информации, нам нужны только доступные времена
    const scheduleResponse = await this.request<{ booking_times: string[] }>(endpoint, { method: 'GET' });
    return scheduleResponse.booking_times || [];
  }

  /**
   * @inheritdoc
   */
  async findClientByPhone(phone: string): Promise<YcClient | null> {
    const endpoint = `/clients/${this.companyId}?phone=${encodeURIComponent(phone)}`;
    const clients = await this.request<YcClient[]>(endpoint, { method: 'GET' });
    return clients.length > 0 ? clients[0] : null;
  }

  /**
   * @inheritdoc
   */
  async createClient(clientData: CreateClientParams): Promise<YcClient> {
    const endpoint = `/clients/${this.companyId}`;
    return this.request<YcClient>(endpoint, {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  /**
   * @inheritdoc
   */
  async updateClientComment(clientId: number, comment: string): Promise<void> {
    const endpoint = `/clients/${this.companyId}/${clientId}`;
    // В YCLIENTS комментарий — это часть общего объекта клиента. 
    // Мы отправляем только поле comment, чтобы обновить только его.
    await this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ comment }),
    });
  }

  /**
   * @inheritdoc
   */
  async createRecord(params: CreateRecordParams): Promise<YcRecord> {
    const { branchId, staffId, serviceIds, client, datetime, comment } = params;
    const endpoint = `/records/${this.companyId}/${branchId}`;
    
    const body = {
      staff_id: staffId,
      services_ids: serviceIds,
      client: {
        name: client.name,
        phone: client.phone,
        email: client.email,
      },
      datetime,
      comment: comment || '',
      // Дополнительные параметры, которые может требовать YCLIENTS
      save_if_busy: true, 
      send_sms: false,
    };

    return this.request<YcRecord>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * @inheritdoc
   */
  async getClientRecords(clientId: number): Promise<YcRecord[]> {
    const endpoint = `/records/${this.companyId}?client_id=${clientId}`;
    return this.request<YcRecord[]>(endpoint, { method: 'GET' });
  }
}


// --- Service Factory ---

let yclientsServiceInstance: IYclientsService | null = null;

/**
 * Фабричная функция для создания или получения единственного экземпляра сервиса YCLIENTS.
 * Гарантирует, что сервис инициализируется только один раз (Singleton).
 * @returns {Promise<IYclientsService>} Экземпляр сервиса для работы с YCLIENTS.
 * @throws {Error} Если переменные окружения YCLIENTS_USER_TOKEN или YCLIENTS_COMPANY_ID не установлены.
 */
export async function createYclientsService(): Promise<IYclientsService> {
  if (yclientsServiceInstance) {
    return yclientsServiceInstance;
  }

  const userToken = process.env.YCLIENTS_USER_TOKEN;
  const companyId = process.env.YCLIENTS_COMPANY_ID;

  if (!userToken) {
    throw new Error('YCLIENTS_USER_TOKEN is not set in environment variables.');
  }
  if (!companyId) {
    throw new Error('YCLIENTS_COMPANY_ID is not set in environment variables.');
  }

  const config: YclientsServiceConfig = {
    userToken,
    companyId: parseInt(companyId, 10),
  };
  
  if (isNaN(config.companyId)) {
      throw new Error('YCLIENTS_COMPANY_ID is not a valid number.');
  }

  yclientsServiceInstance = new YclientsService(config);
  return yclientsServiceInstance;
}
