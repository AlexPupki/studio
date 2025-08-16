/**
 * @fileoverview Этот файл определяет контракты (интерфейсы и типы данных)
 * для взаимодействия с внешним API YCLIENTS.
 * Он служит абстрактным слоем, изолирующим бизнес-логику от деталей
 * реализации конкретного API.
 */

// --- Data Transfer Objects (DTOs) ---

/**
 * Описывает услугу в системе YCLIENTS.
 */
export interface YcService {
  id: number;
  title: string;
  price_min: number;
  price_max: number;
  duration: number; // Длительность в секундах
  image_url?: string;
}

/**
 * Описывает сотрудника или ресурс (например, пилот, катер).
 */
export interface YcStaff {
  id: number;
  name: string;
  specialization: string;
}

/**
 * Описывает клиента.
 */
export interface YcClient {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

/**
 * Описывает запись/бронирование.
 */
export interface YcRecord {
  id: number;
  date: string; // ISO 8601, e.g., "2024-08-21T10:00:00+03:00"
  comment?: string;
  client: YcClient;
  services: YcService[];
  staff: YcStaff;
}

// --- Service Interface ---

/**
 * Входные данные для получения списка услуг.
 */
export interface GetServicesParams {
  branchId: number;
}

/**
 * Входные данные для получения свободных слотов.
 */
export interface GetAvailableSlotsParams {
    branchId: number;
    staffId: number;
    serviceId: number;
    date: string; // YYYY-MM-DD
}

/**
 * Данные для создания нового клиента.
 */
export interface CreateClientParams {
    name: string;
    phone: string;
    email?: string;
}

/**
 * Входные данные для создания бронирования.
 */
export interface CreateRecordParams {
  branchId: number;
  staffId: number;
  serviceIds: number[];
  client: {
    name: string;
    phone: string;
    email?: string;
  };
  datetime: string; // ISO 8601
  comment?: string;
}

/**
 * Интерфейс сервиса для работы с YCLIENTS API.
 * Определяет все доступные операции, не раскрывая детали их реализации.
 */
export interface IYclientsService {
  /**
   * Получает список услуг для указанного филиала.
   * @param params - Параметры для запроса.
   * @returns Промис с массивом услуг.
   */
  getServices(params: GetServicesParams): Promise<YcService[]>;

  /**
   * Получает список доступных временных слотов для сотрудника и услуги на конкретную дату.
   * @param params - Параметры для запроса.
   * @returns Промис с массивом строк времени (e.g., "10:00", "11:30").
   */
  getAvailableSlots(params: GetAvailableSlotsParams): Promise<string[]>;

  /**
   * Ищет клиента в YCLIENTS по номеру телефона.
   * @param phone - Номер телефона в международном формате.
   * @returns Промис с объектом клиента или null, если клиент не найден.
   */
  findClientByPhone(phone: string): Promise<YcClient | null>;
  
  /**
   * Создает нового клиента в YCLIENTS.
   * @param clientData - Данные нового клиента.
   * @returns Промис с созданным объектом клиента.
   */
  createClient(clientData: CreateClientParams): Promise<YcClient>;

  /**
   * Обновляет комментарий для существующего клиента.
   * @param clientId - ID клиента в YCLIENTS.
   * @param comment - Новый текст комментария для добавления.
   * @returns Промис, который разрешается после успешного обновления.
   */
  updateClientComment(clientId: number, comment: string): Promise<void>;


  /**
   * Создает новую запись (бронирование).
   * @param params - Данные для создания бронирования.
   * @returns Промис с созданным объектом записи.
   * @description В MVP не используется напрямую с фронтенда. Зарезервировано для AI-ассистента.
   */
  createRecord(params: CreateRecordParams): Promise<YcRecord>;

  // В будущем здесь можно будет добавить другие методы:
  // updateClientComment(clientId: number, comment: string): Promise<void>;
}
