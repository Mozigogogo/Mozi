'use client';

import { Button } from 'antd-mobile';
import styles from './index.module.less';

/**
 * 热榜搜索栏组件
 * @param {Function} onSearchClick - 点击搜索框回调
 * @param {Function} onCreateClick - 点击创建话题按钮回调
 * @param {string} searchPlaceholder - 搜索框占位文本
 * @param {string} createButtonText - 创建按钮文本
 * @param {boolean} isPC - 是否为PC端，默认false
 */
export default function HotTopicSearchBar({ 
  onSearchClick,
  onCreateClick,
  searchPlaceholder = '搜索话题',
  createButtonText = '创建话题',
  isPC = false
}) {
  return (
    <div className={`${styles.hotSearchBar} ${isPC ? styles.pcMode : ''}`}>
      <div className={styles.searchBox}>
        <span className={styles.searchText} onClick={onSearchClick}>{searchPlaceholder}</span>
        <Button 
          className={styles.createTopicBtn} 
          onClick={onCreateClick}
        >
          {createButtonText}
        </Button>
      </div>
    </div>
  );
}
