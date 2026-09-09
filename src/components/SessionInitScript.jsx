/**
 * 阻塞式会话初始化：首帧绘制前从 localStorage 写入登录标记与头像/昵称 CSS，
 * 侧栏用 CSS 切换访客/已登录槽，避免 SSR 水合闪「未登录」或灰占位。
 */
export default function SessionInitScript() {
  const script = `
(function () {
  try {
    var token = null;
    var userInfo = null;
    try { token = localStorage.getItem('token'); } catch (e) {}
    try {
      var raw = localStorage.getItem('userInfo');
      if (raw) userInfo = JSON.parse(raw);
    } catch (e2) {
      try {
        var dataRaw = localStorage.getItem('userDataInfo');
        if (dataRaw) {
          var data = JSON.parse(dataRaw);
          userInfo = (data && data.userInfo) || null;
          if (!userInfo && data) {
            userInfo = {
              nickName: data.nickName || data.nickname || '',
              nickname: data.nickname || data.nickName || '',
              avatar: data.avatar || '',
              userId: data.userId || data.id || null
            };
          }
        }
      } catch (e3) {}
    }
    var loggedIn = !!(token && String(token).length > 0);
    window.__MOZI_SESSION__ = {
      loggedIn: loggedIn,
      userInfo: loggedIn ? userInfo : null,
      ready: true
    };
    var root = document.documentElement;
    var oldStyle = document.getElementById('mozi-session-style');
    if (oldStyle && oldStyle.parentNode) oldStyle.parentNode.removeChild(oldStyle);

    var css = '';
    // 可见性规则一并注入 head，不依赖 CSS Module 加载时机
    css += 'html:not([data-mozi-logged-in]) [data-pc-user-member]{display:none!important;}';
    css += 'html[data-mozi-logged-in] [data-pc-user-guest]{display:none!important;}';
    css += 'html[data-mozi-logged-in] [data-pc-user-member]{display:flex!important;align-items:center;width:100%;min-width:0;}';

    if (loggedIn) {
      root.setAttribute('data-mozi-logged-in', '1');
      var nick = '';
      var avatar = '';
      if (userInfo && typeof userInfo === 'object') {
        nick = String(userInfo.nickName || userInfo.nickname || '').trim();
        avatar = String(userInfo.avatar || '').trim();
      }
      if (!nick) nick = '用户';
      css += 'html[data-mozi-logged-in] [data-pc-user-boot-name]::before{content:' + JSON.stringify(nick) + ';}';
      if (avatar && /^https?:\\/\\//i.test(avatar)) {
        var safeAvatar = avatar.replace(/[\\\\"\\n\\r<>]/g, '');
        css += 'html[data-mozi-logged-in] [data-pc-user-boot-avatar]{background-image:url(\"' + safeAvatar + '\")!important;background-size:cover;background-position:center;}';
      }
    } else {
      root.removeAttribute('data-mozi-logged-in');
    }

    var style = document.createElement('style');
    style.id = 'mozi-session-style';
    style.textContent = css;
    document.head.appendChild(style);
  } catch (e4) {}
})();
`;

  return (
    <script
      id="mozi-session-init"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
