'use client';

import { useState } from 'react';
import { SearchOutline } from 'antd-mobile-icons';
import styles from './index.module.less';

export const SearchInput = ({ placeholder = '搜索', onSearch, onChange, value, loading }) => {
  const [inputValue, setInputValue] = useState(value || '');

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange && onChange(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch && onSearch(inputValue);
    }
  };

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchIcon}>
        <SearchOutline />
      </div>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button
        className={styles.searchButton}
        onClick={() => onSearch && onSearch(inputValue)}
      >
        搜索
      </button>
      {loading && (
        <div className={styles.loadingIcon}>
          <div className={styles.spinner}></div>
        </div>
      )}
    </div>
  );
};