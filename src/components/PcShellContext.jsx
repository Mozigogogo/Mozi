'use client';

import { createContext, useContext } from 'react';

/** 已挂在 PCLayout 壳内时为 true；软导航复用壳层，子页首帧即可判 PC，避免 false→true 闪布局 */
export const PcShellContext = createContext(false);

export function usePcShell() {
  return useContext(PcShellContext);
}
