/**
 * @fileoverview Этот файл определяет контракты для нашего внутреннего
 * сервиса аналитики.
 */

export type AnalyticsEventName = 
  | 'booking_request_created'
  | 'new_club_member_registered'
  | 'article_comment_submitted'
  | 'account_login_success'
  | 'account_login_failed'
  | 'account_details_viewed';


export interface IAnalyticsService {
  /**
   * Отправляет событие в систему аналитики.
   * @param eventName - Название события.
   * @param properties - Объект с дополнительными данными о событии.
   */
  track(eventName: AnalyticsEventName, properties: Record<string, any>): void;
}
