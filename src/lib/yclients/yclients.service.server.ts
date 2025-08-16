'use server';

/**
 * @fileoverview Этот файл содержит конкретную реализацию (адаптер)
 * для взаимодействия с API YCLIENTS. Он инкапсулирует всю логику
 * HTTP-запросов, аутентификации и обработки ответов.
 *
 * Придерживается принципов гексагональной архитектуры, реализуя
 * интерфейс IYclientsService.
 */

import type {
  CreateRecordParams,
  GetServicesParams,
  IYclientsService,
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
}
