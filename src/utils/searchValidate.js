import { request } from '@/utils/request';
import { Interface } from '@/utils/constants';

/**
 * 校验搜索标的类型
 * @returns {'crypto' | 'stock' | 'invalid'}
 */
export async function validateSearchSymbol(symbol) {
  const value = String(symbol || '').trim();
  if (!value) return 'invalid';

  try {
    const res = await request({
      url: Interface.SEARCH_VALIDATE,
      data: { symbol: value },
    });

    // request 拦截器已解包为业务 body：{ code, data, success, errorMsg }
    if (res?.code !== 0 && res?.success === false) return 'invalid';

    const payload = res?.data;
    const type = payload?.type;
    if (type === 'crypto' || type === 'stock') return type;
    if (payload?.valid === true && (type === 'crypto' || type === 'stock')) return type;
    return 'invalid';
  } catch (error) {
    console.error('标的校验失败:', error);
    return 'invalid';
  }
}

export function getPcSearchRoute(type, keyword) {
  const q = encodeURIComponent(String(keyword || '').trim());
  if (type === 'stock') {
    return `/pc/us-stock-search?keyword=${q}`;
  }
  return `/pc/search?keyword=${q}`;
}
