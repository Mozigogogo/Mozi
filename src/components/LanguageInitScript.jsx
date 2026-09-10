/**
 * 阻塞式语言初始化：
 * 1) URL ?lng=zh|en 优先（给搜索引擎中英文可抓取版本）
 * 2) 否则 localStorage / cookie
 * 刷新后 SSR 与客户端使用同一语言。
 */
export default function LanguageInitScript() {
  const script = `
(function () {
  try {
    var KEY = 'i18nextLng';
    var lng = null;
    try {
      var sp = new URLSearchParams(window.location.search || '');
      var q = sp.get('lng') || sp.get('lang');
      if (q) {
        var qs = String(q).toLowerCase();
        if (qs.indexOf('zh') === 0) lng = 'zh';
        else if (qs.indexOf('en') === 0) lng = 'en';
      }
    } catch (e0) {}
    if (!lng) {
      var stored = null;
      try { stored = localStorage.getItem(KEY); } catch (e) {}
      if (!stored) {
        try {
          var m = document.cookie.match(/(?:^|;\\s*)i18nextLng=([^;]+)/);
          if (m) stored = decodeURIComponent(m[1]);
        } catch (e2) {}
      }
      if (!stored) return;
      var s = String(stored).toLowerCase();
      if (s.indexOf('zh') === 0) lng = 'zh';
      else if (s.indexOf('en') === 0) lng = 'en';
    }
    if (!lng) return;
    window.__MOZI_I18N_LNG__ = lng;
    try { localStorage.setItem(KEY, lng); } catch (e3) {}
    try {
      document.cookie = KEY + '=' + encodeURIComponent(lng) + ';path=/;max-age=31536000;samesite=lax';
    } catch (e4) {}
    document.documentElement.lang = lng === 'zh' ? 'zh-CN' : 'en';
  } catch (e5) {}
})();
`;

  return (
    <script
      id="mozi-i18n-init"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
