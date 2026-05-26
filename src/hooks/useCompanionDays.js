'use client';

import { useEffect, useState } from 'react';
import { fetchUserDataInfoOnce } from '@/utils/postLogin';
import {
  calcCompanionDays,
  pickCreateTimeFromDatainfo,
  unwrapDatainfoPayload,
} from '@/utils/companionDays';

/**
 * 「Mozi 已陪伴您 X 天」：基于 /user/datainfo 的 createTime
 * @returns {number | null} null 表示加载中或暂无数据
 */
export function useCompanionDays() {
  const [days, setDays] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const applyFromDatainfo = (data) => {
      const payload = unwrapDatainfoPayload(data) || data;
      const createTime = pickCreateTimeFromDatainfo(payload);
      if (cancelled) return;
      if (!createTime) {
        setDays(null);
        return;
      }
      setDays(calcCompanionDays(createTime));
    };

    (async () => {
      try {
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('userDataInfo');
            if (raw) {
              const cached = JSON.parse(raw);
              if (cached && typeof cached === 'object') {
                applyFromDatainfo(cached);
              }
            }
          } catch {
            // ignore cache parse
          }
        }

        const latest = await fetchUserDataInfoOnce({ caller: 'companion-days' });
        applyFromDatainfo(latest);
      } catch {
        if (!cancelled) setDays(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return days;
}
