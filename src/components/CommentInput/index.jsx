'use client';

import { useState } from 'react';
import styles from './index.module.less';

/**
 * 评论输入框组件
 * @param {string} placeholder - 输入框占位文本，默认"发表您的意见"
 * @param {Function} onSubmit - 提交回调函数，接收输入内容作为参数
 * @param {boolean} disabled - 是否禁用，默认false
 * @param {number} maxLength - 最大输入长度，默认500
 * @param {boolean} isPC - 是否为PC端，默认false
 */
export default function CommentInput({
  placeholder = '发表您的意见',
  onSubmit,
  disabled = false,
  maxLength = 500,
  isPC = false
}) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit?.(value.trim());
    setValue(''); // 提交后清空输入框
  };

  const handleKeyPress = (e) => {
    // PC端支持Ctrl+Enter提交
    if (isPC && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={`${styles.commentInput} ${isPC ? styles.pcMode : ''}`}>
      <input
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        maxLength={maxLength}
      />
      <button
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
      >
        <img 
          src="/icons/pc/post_icon@2x.png" 
          alt="发送" 
          className={styles.submitIcon}
        />
        <span className={styles.submitText}>发表</span>
      </button>
    </div>
  );
}
