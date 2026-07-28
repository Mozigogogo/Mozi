/** Routes that always render inside PCLayout (PC-oriented pages). */
export const ALWAYS_PC_LAYOUT_PREFIXES = ['/pc/', '/subscribe', '/achievement'];

/** Routes that render inside PCLayout when viewport width >= 1024px. */
export const CONDITIONAL_PC_LAYOUT_PREFIXES = [
  '/home',
  '/ai',
  '/detail',
  '/post',
  '/theme',
  '/tradevol',
  '/fundingrate',
  '/arbitrage',
  '/putcallratio',
  '/positionsize',
  '/pointshistory',
  '/withdrawhistory',
  '/user/',
  '/rankdiscuss',
  '/report/comment',
  '/wechat-alert',
];

export const PC_LAYOUT_EXCLUDED_PREFIXES = ['/admin', '/auth'];

export function shouldUsePcLayout(pathname, isPC) {
  if (!pathname) return false;
  if (PC_LAYOUT_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  if (ALWAYS_PC_LAYOUT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return true;
  }
  if (!isPC) return false;
  return CONDITIONAL_PC_LAYOUT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  );
}
