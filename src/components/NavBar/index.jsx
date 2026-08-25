'use client';

import { useRouter } from 'next/navigation';
import { safeBack } from '@/utils/navigation';
import { useTheme } from '@/context/ThemeProvider';
import styles from './index.less';

function isDefaultLightBg(color) {
  if (color == null || color === '') return true;
  const c = String(color).trim().toLowerCase();
  return c === '#ffffff' || c === '#fff' || c === 'white' || c === 'rgb(255, 255, 255)';
}

/**
 * 导航栏组件
 * @param {Object} props
 * @param {string} props.title - 标题文字
 * @param {Function} props.onBack - 返回按钮点击事件，不传则使用默认路由返回
 * @param {boolean} props.showBack - 是否显示返回按钮，默认true
 * @param {React.ReactNode} props.leftExtra - 左侧返回按钮旁的附加内容（如汉堡菜单）
 * @param {React.ReactNode} props.rightContent - 右侧自定义内容
 * @param {Function} props.onRightClick - 右侧按钮点击事件
 * @param {boolean} props.showMenu - 是否显示右侧菜单按钮
 * @param {boolean} props.showSearch - 是否显示右侧搜索按钮
 * @param {boolean} props.showBorder - 是否显示底部边框，默认true
 * @param {string} props.backgroundColor - 背景色，默认跟随主题（亮白/暗黑）
 * @param {string} props.className - 自定义类名
 */
export default function NavBar({
  title = '',
  onBack,
  showBack = true,
  leftExtra,
  rightContent,
  onRightClick,
  showMenu = false,
  showSearch = false,
  showBorder = true,
  fixed = true,
  backgroundColor = '#ffffff',
  color,
  className = '',
  style,
}) {
  const router = useRouter();
  const { isDark } = useTheme();

  const textStyle = color ? { color } : {};
  const resolvedBg =
    isDefaultLightBg(backgroundColor) && isDark ? '#1a1a1a' : backgroundColor;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      safeBack(router, { fallback: '/' });
    }
  };

  const handleMenuClick = () => {
    if (onRightClick) {
      onRightClick('menu');
    }
  };

  const handleSearchClick = () => {
    if (onRightClick) {
      onRightClick('search');
    }
  };

  return (
    <div 
      className={`${styles.navBar} ${!showBorder ? styles.noBorder : ''} ${!fixed ? styles.asStatic : ''} ${className}`}
      style={{ backgroundColor: resolvedBg, ...style }}
    >
      {/* 左侧返回按钮 */}
      <div className={styles.left}>
        {showBack && (
          <div className={styles.backBtn} onClick={handleBack} style={textStyle}>
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {leftExtra}
      </div>

      {/* 中间标题 */}
      <div className={styles.center}>
        <div className={styles.title} style={textStyle} suppressHydrationWarning>
          {title}
        </div>
      </div>

      {/* 右侧操作按钮 */}
      <div className={styles.right}>
        {rightContent ? (
          rightContent
        ) : (
          <>
            {showMenu && (
              <div className={styles.iconBtn} onClick={handleMenuClick} style={textStyle}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="6" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="18" r="1.5" fill="currentColor" />
                </svg>
              </div>
            )}
            {showSearch && (
              <div className={styles.iconBtn} onClick={handleSearchClick} style={textStyle}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M15.5 15.5L19 19"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
