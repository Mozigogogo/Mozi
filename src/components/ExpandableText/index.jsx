'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/**
 * 可展开文本：超出最大行数时显示「更多」，点击后展示全文
 */
export default function ExpandableText({
  text,
  maxLines = 5,
  className = '',
  wrapClassName = '',
  enabled = true,
}) {
  const { t } = useTranslation();
  const textRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useEffect(() => {
    if (!enabled) return undefined;

    const el = textRef.current;
    if (!el) return undefined;

    const checkOverflow = () => {
      if (expanded) {
        setIsOverflowing(false);
        return;
      }
      setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);

    return () => observer.disconnect();
  }, [text, expanded, maxLines, enabled]);

  if (!text) return null;

  if (!enabled) {
    return <p className={className}>{text}</p>;
  }

  const handleExpand = (e) => {
    e.stopPropagation();
    setExpanded(true);
  };

  return (
    <div className={`${styles.expandableTextWrap} ${wrapClassName}`.trim()}>
      <p
        ref={textRef}
        className={`${className} ${!expanded ? styles.clamped : ''}`}
        style={!expanded ? { '--max-lines': maxLines } : undefined}
      >
        {text}
      </p>
      {!expanded && isOverflowing ? (
        <button type="button" className={styles.moreBtn} onClick={handleExpand}>
          {t('common.more')}
        </button>
      ) : null}
    </div>
  );
}
