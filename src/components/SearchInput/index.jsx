'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseCircleFill } from 'antd-mobile-icons';
import styles from './index.module.less';

const searchIcon = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/assets/icon/community/search.png';

export const SearchInput = ({ 
  placeholder,
  reloadFun, 
  value = '' 
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value);
  const [closeColor, setCloseColor] = useState('#b2b2b2');
  const inputValueRef = useRef(value);

  useEffect(() => {
    setInputValue(value);
    inputValueRef.current = value;
  }, [value]);

  const jump2Search = (e) => {
    const raw = e?.target?.value ?? inputValueRef.current;
    const searchValue = (raw || '').trim();
    
    if (searchValue && reloadFun) {
      reloadFun(searchValue);
    }
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (newValue) setCloseColor('#b2b2b2');
    setInputValue(newValue);
    inputValueRef.current = newValue;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      jump2Search(e);
    }
  };

  const clear = () => {
    setInputValue('');
    setCloseColor('#b2b2b2');
    inputValueRef.current = '';
  };

  return (
    <div className={styles.searchBox}>
      <input
        type="text"
        className={styles.searchInput}
        placeholder={placeholder || t('home.searchPlaceholder')}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.searchCancel} onClick={clear}>
        <CloseCircleFill color={closeColor} fontSize={15} />
      </div>
      <div className={styles.searchButton} onClick={() => jump2Search()}>
        <img src={searchIcon} className={styles.searchIconImg} alt="search" />
        <span className={styles.searchText}>{t('common.search')}</span>
      </div>
    </div>
  );
};