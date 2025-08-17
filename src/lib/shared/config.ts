// This file is safe to import on the client and server.
// It should not contain any server-side dependencies.

export type FeatureFlag = 
  | 'FEATURE_ACCOUNT'
  | 'FEATURE_REAL_SMS'
  | 'FEATURE_CAPTCHA'
  | 'FEATURE_JWT_ISSUING'
  | 'FEATURE_I18N'
  | 'FEATURE_PAYMENTS_ONLINE'
  | 'FEATURE_SEAT_SHARING'
  | 'FEATURE_PARTNER_PORTAL';
