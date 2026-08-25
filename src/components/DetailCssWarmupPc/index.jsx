'use client';

import { DETAIL_CSS_WARMUP } from '@/app/detail/detailCssWarmup';

void DETAIL_CSS_WARMUP;

/** PC 宽屏：在 PCLayout 动态 chunk 就绪前先把详情 CSS 挂进文档 */
export default function DetailCssWarmupPc() {
  return null;
}
