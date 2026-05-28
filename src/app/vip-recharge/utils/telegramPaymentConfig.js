export const TG_PAYMENT_METHODS = {
  STARS: 'STARS',
  TON: 'TON',
  ARBITRUM: 'ARBITRUM',
};

const TG_PAYMENT_METHOD_ENV_KEY = 'NEXT_PUBLIC_TG_PAYMENT_METHOD';

/** TG 默认支付方式：未配置 env 时为 TON；可通过 NEXT_PUBLIC_TG_PAYMENT_METHOD 覆盖 */
export function resolveTelegramDefaultMethod() {
  const fromEnv = String(process.env[TG_PAYMENT_METHOD_ENV_KEY] || '')
    .trim()
    .toUpperCase();
  if (fromEnv === TG_PAYMENT_METHODS.STARS || fromEnv === TG_PAYMENT_METHODS.TON) {
    return fromEnv;
  }
  return TG_PAYMENT_METHODS.TON;
}

export const TELEGRAM_PAYMENT_CONFIG = {
  defaultMethod: resolveTelegramDefaultMethod(),
  hiddenMethods: [TG_PAYMENT_METHODS.STARS, TG_PAYMENT_METHODS.ARBITRUM],
};

export function isTelegramStarsPaymentEnabled() {
  return resolveTelegramDefaultMethod() === TG_PAYMENT_METHODS.STARS;
}
