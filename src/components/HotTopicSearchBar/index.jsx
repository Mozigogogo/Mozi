'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from 'antd-mobile';
import styles from './index.module.less';

/**
 * 热榜搜索栏组件
 * @param {Function} onSearchClick - 点击搜索框回调（移动端）
 * @param {Function} onSearch - 搜索回调（PC端），接收搜索关键词
 * @param {Function} onCreateClick - 点击创建话题按钮回调
 * @param {string} searchPlaceholder - 搜索框占位文本
 * @param {string} createButtonText - 创建按钮文本
 * @param {boolean} isPC - 是否为PC端，默认false
 * @param {number} debounceDelay - 防抖延迟时间（毫秒），默认500ms
 */
export default function HotTopicSearchBar({ 
  onSearchClick,
  onSearch,
  onCreateClick,
  searchPlaceholder = '搜索话题',
  createButtonText = '创建话题',
  isPC = false,
  debounceDelay = 500
}) {
  const [searchValue, setSearchValue] = useState('');
  const debounceTimerRef = useRef(null);

  // 防抖搜索
  const debouncedSearch = useCallback((value) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(value.trim());
      }
    }, debounceDelay);
  }, [onSearch, debounceDelay]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    
    // PC模式下自动防抖搜索
    if (isPC) {
      debouncedSearch(value);
    }
  };

  const handleSearch = () => {
    // 清除防抖定时器，立即执行搜索
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (onSearch) {
      onSearch(searchValue.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`${styles.hotSearchBar} ${isPC ? styles.pcMode : ''}`}>
      <div className={styles.searchBox}>
        {isPC ? (
          <input
            type="text"
            className={styles.searchInput}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span className={styles.searchText} onClick={onSearchClick}>{searchPlaceholder}</span>
        )}
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
