'use server';

/**
 * @fileoverview Этот файл определяет контракты для нашего внутреннего
 * сервиса аналитики.
 */

export type AnalyticsEventName = 
  | 'booking_request_created'
  | 'new_club_member_registered'
  | 'article_comment_submitted'
  | 'account_details_viewed'
  // IAM Events
  | 'login_code_requested'
  | 'login_code_verified'
  | 'login_code_failed'
  | 'new_user_registered';


export interface IAnalyticsService {
  /**
   * Отправляет событие в систему аналитики.
   * @param eventName - Название события.
   * @param properties - Объект с дополнительными данными о событии.
   */
  track(eventName: AnalyticsEventName, properties: Record<string, any>): void;
}
