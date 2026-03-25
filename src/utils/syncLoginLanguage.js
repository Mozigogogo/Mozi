/**
 * 从登录接口返回中同步 i18nextLng 缓存。
 *
 * 后端 /user/login 返回的 language 字段在不同实现里可能叫 language/lang 或挂在 userInfo/user 上，
 * 因此这里做了较宽松的兜底提取与归一化（zh / en）。
 */
export const syncI18nextLngFromLoginResponse = (loginRes, i18nInstance) => {
  if (typeof window === 'undefined') return;

  const candidates = [
    loginRes?.data?.language,
    loginRes?.data?.lang,
    loginRes?.data?.Language,
    loginRes?.data?.userInfo?.language,
    loginRes?.data?.userInfo?.language_code,
    loginRes?.data?.userInfo?.languageCode,
    loginRes?.data?.user?.language,
    loginRes?.data?.user?.language_code,
    loginRes?.data?.user?.languageCode,
    loginRes?.data?.userLanguage,
    loginRes?.language,
    loginRes?.lang,
  ];

  const raw = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  if (!raw) return;

  const s = String(raw).toLowerCase();
  const nextLng = s.startsWith('en') ? 'en' : (s.startsWith('zh') ? 'zh' : null);
  if (!nextLng) return;

  try {
    localStorage.setItem('i18nextLng', nextLng);
  } catch (e) {
    // ignore
  }

  if (i18nInstance?.changeLanguage) {
    try {
      i18nInstance.changeLanguage(nextLng);
    } catch (e) {
      // ignore
    }
  }
};

