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
   * Создает новую запись (бронирование).
   * @param params - Данные для создания бронирования.
   * @returns Промис с созданным объектом записи.
   */
  createRecord(params: CreateRecordParams): Promise<YcRecord>;

  // В будущем здесь можно будет добавить другие методы:
  // getAvailableSlots(params: ...): Promise<...>;
  // updateRecord(params: ...): Promise<YcRecord>;
  // cancelRecord(params: ...): Promise<void>;
}
