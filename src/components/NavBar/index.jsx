'use client';

import { useRouter } from 'next/navigation';
import styles from './index.less';

/**
 * 导航栏组件
 * @param {Object} props
 * @param {string} props.title - 标题文字
 * @param {Function} props.onBack - 返回按钮点击事件，不传则使用默认路由返回
 * @param {boolean} props.showBack - 是否显示返回按钮，默认true
 * @param {React.ReactNode} props.rightContent - 右侧自定义内容
 * @param {Function} props.onRightClick - 右侧按钮点击事件
 * @param {boolean} props.showMenu - 是否显示右侧菜单按钮
 * @param {boolean} props.showSearch - 是否显示右侧搜索按钮
 * @param {boolean} props.showBorder - 是否显示底部边框，默认true
 * @param {string} props.className - 自定义类名
 */
export default function NavBar({
  title = '',
  onBack,
  showBack = true,
  rightContent,
  onRightClick,
  showMenu = false,
  showSearch = false,
  showBorder = true,
  className = '',
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
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
    <div className={`${styles.navBar} ${!showBorder ? styles.noBorder : ''} ${className}`}>
      {/* 左侧返回按钮 */}
      <div className={styles.left}>
        {showBack && (
          <div className={styles.backBtn} onClick={handleBack}>
            <svg
              width="20"
              height="20"
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
      </div>

      {/* 中间标题 */}
      <div className={styles.center}>
        <div className={styles.title}>{title}</div>
      </div>

      {/* 右侧操作按钮 */}
      <div className={styles.right}>
        {rightContent ? (
          rightContent
        ) : (
          <>
            {showMenu && (
              <div className={styles.iconBtn} onClick={handleMenuClick}>
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
              <div className={styles.iconBtn} onClick={handleSearchClick}>
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

