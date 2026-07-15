/**
 * 在 React 水合前同步执行：TG Mini App 打开 `/` 时立即 replace 到 `/home`（或告警深链），
 * 避免先闪营销落地页再跳 `/home`。
 *
 * 仅内联到 layout <head>，勿 import 到客户端组件。
 */
export const TG_ROOT_REDIRECT_SCRIPT = `(function(){
  try {
    var path = window.location.pathname || '/';
    if (path !== '/' && path !== '') return;

    var hash = window.location.hash || '';
    var search = window.location.search || '';
    var ua = String(navigator.userAgent || '');

    var isTg = false;
    try { if (window.localStorage && localStorage.getItem('appChannel') === 'tg') isTg = true; } catch (e) {}
    if (/tgWebAppData=|tgWebAppPlatform=/.test(hash)) isTg = true;
    if (/Telegram/i.test(ua)) isTg = true;

    if (!isTg) return;

    var startParam = '';
    var spMatch = hash.match(/tgWebAppStartParam=([^&]+)/);
    if (spMatch) {
      try { startParam = decodeURIComponent(spMatch[1]); } catch (e) { startParam = spMatch[1]; }
    }

    var target = '/home' + search + hash;
    var alertMatch = startParam && startParam.match(/^alert_([A-Za-z0-9_-]+)$/);
    if (alertMatch) {
      var sym = alertMatch[1].toUpperCase();
      var qs = 'symbol=' + encodeURIComponent(sym) + '&from=tg_alert';
      target = (window.innerWidth >= 1024 ? '/pc/alarm?' : '/detail?') + qs + hash;
    }

    window.location.replace(target);
  } catch (e) {}
})();`;
