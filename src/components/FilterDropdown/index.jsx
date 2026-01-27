'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './index.module.less';

export default function FilterDropdown({ options, value, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={styles.filterDropdown} ref={dropdownRef}>
      <div 
        className={styles.trigger} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label || label}</span>
        <div className={styles.arrows}>
          <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
            <path d="M3.5 0L6.33013 4H0.669873L3.5 0Z" fill="#029650"/>
          </svg>
          <svg width="7" height="4" viewBox="0 0 7 4" fill="none">
            <path d="M3.5 4L0.669873 0H6.33013L3.5 4Z" fill="#BFBFBF"/>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.map(option => (
            <div
              key={option.value}
              className={`${styles.option} ${value === option.value ? styles.active : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
