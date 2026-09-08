/**
 * 阻塞式主题初始化：在首帧绘制前写入 data-theme，避免顶栏/背景亮暗闪烁。
 */
export default function ThemeInitScript() {
  const script = `
(function () {
  try {
    var appTheme = localStorage.getItem('app_theme');
    var stored = localStorage.getItem('mozi-theme');
    var theme = appTheme === 'black' ? 'dark' : (stored === 'dark' ? 'dark' : 'light');
    var root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

  return (
    <script
      id="mozi-theme-init"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
