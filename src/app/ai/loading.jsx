'use client';

import AiChatBootShell from './AiChatBootShell';

/** /ai 路由段加载中的占位，避免首次进入白屏 */
export default function AiLoading() {
  return <AiChatBootShell />;
}
