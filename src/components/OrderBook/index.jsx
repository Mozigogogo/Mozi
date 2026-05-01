'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import BarChart from '@/components/BarChart';
import styles from './index.module.less';

const CDN_PUBLIC_PREFIX = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public';

const exchangeIcons = [
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203832.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203834.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203835.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203836.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203837.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203838.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203839.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Ellipse%203840.png`,
  `${CDN_PUBLIC_PREFIX}/icons/new_detail/Frame%202087326500.png`,
];

const pickExchangeIcon = (seed) => {
  if (!exchangeIcons.length) return null;
  const idx = Math.abs((seed * 9301 + 49297) % 233280) % exchangeIcons.length;
  return exchangeIcons[idx];
};

const pickRowLogo = (rowItem, fallbackSeed) => {
  const logo =
    rowItem?.logo ||
    rowItem?.icon ||
    rowItem?.url ||
    null;
  return logo || pickExchangeIcon(fallbackSeed);
};

const defaultFormatValue = (val) => {
  if (val === null || val === undefined || val === '') return '--';
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  if (Math.abs(num) >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
};

const FadingValue = ({ value, formatValue }) => {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 180);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [value]);

  return (
    <span className={flash ? styles.valueFlash : undefined}>
      {formatValue(value)}
    </span>
  );
};

export default function OrderBook({
  bids = [],
  asks = [],
  maxRows = 10,
  formatValue = defaultFormatValue,
  title,
  tag,
  endTime = null,
  showHeader = true,
  dropdownOptions,
  showMask = false, // 是否显示遮罩
  onSubscribe, // 订阅回调
  maskTitle, // 遮罩标题
  maskDescription, // 遮罩描述
  maskButtonText, // 遮罩按钮文字
  showVipElements = true, // 是否显示VIP相关元素
  onBuyMembership, // 会员购买回调
  membershipButtonText, // 会员按钮文字
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedOption, setSelectedOption] = useState(dropdownOptions?.[0] || t('orderBook.top5'));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPcLayout, setIsPcLayout] = useState(false);
  const userSelectedRef = useRef(false);
  const prevOptionsKeyRef = useRef('');
  const pcCountdownStyles = isPcLayout
    ? {
        wrapper: {
          gap: 6,
          flexWrap: 'nowrap',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          overflow: 'visible',
        },
        label: {
          fontSize: 12,
          lineHeight: 1.15,
          letterSpacing: '0.02em',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          flex: '0 0 auto',
        },
        numbers: {
          gap: 4,
          alignItems: 'center',
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap',
        },
        circle: {
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
          fontSize: 20,
          lineHeight: 1,
          flex: '0 0 auto',
        },
        value: {
          transform: 'translate(-0.5px, 0.5px)',
          display: 'inline-block',
          whiteSpace: 'nowrap',
        },
        text: {
          fontSize: 12,
          lineHeight: 1.15,
          letterSpacing: '0.02em',
          margin: '0 4px 0 1px',
          whiteSpace: 'nowrap',
          flex: '0 0 auto',
        },
      }
    : null;

  // 使用国际化配置作为默认值
  const displayTitle = title || t('orderBook.title');
  const displayTag = tag !== undefined ? tag : t('orderBook.limitedExperience');
  const displayDropdownOptions = dropdownOptions || [t('orderBook.top5'), t('orderBook.top10')];

  // 当父组件异步更新 dropdownOptions（例如订阅信息回来）时，刷新默认选项
  useEffect(() => {
    const opts = displayDropdownOptions || [];
    if (!opts.length) return;
    const optionsKey = opts.join('|');
    const prevKey = prevOptionsKeyRef.current;
    prevOptionsKeyRef.current = optionsKey;

    // 用户未手动选择时：只要 options 发生变化，默认选中第一个（用于 LITE/PRO 自动 Top20/Top40）
    if (!userSelectedRef.current && prevKey && prevKey !== optionsKey) {
      setSelectedOption(opts[0]);
      return;
    }

    // 常规兜底：当前选项不在新列表里时，重置到第一个
    if (!selectedOption || !opts.includes(selectedOption)) {
      setSelectedOption(opts[0]);
    }
  }, [displayDropdownOptions, selectedOption]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const applyMatch = (matches) => setIsPcLayout(matches);

    applyMatch(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      const handler = (event) => applyMatch(event.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }

    mediaQuery.addListener(applyMatch);
    return () => mediaQuery.removeListener(applyMatch);
  }, []);

  const visibleRowsCount = useMemo(() => {
    const trimmed = String(selectedOption ?? '').trim();
    // 尽量从文案中提取数字（Top 20 / 前二十 等），提取失败再回退
    const match = trimmed.match(/(\d+)/);
    const parsed = match ? Number(match[1]) : NaN;
    const fallback = (trimmed.includes('前五') || trimmed.includes('Top 5')) ? 5 : 10;
    const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    return Math.min(maxRows, limit);
  }, [maxRows, selectedOption]);

  useEffect(() => {
    if (!endTime) return;

    const calcCountdown = () => {
      const now = Date.now();
      const end = new Date(endTime).getTime();
      const diff = Math.max(0, end - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    calcCountdown();
    const timer = setInterval(calcCountdown, 1000);
    return () => clearInterval(timer);
  }, [endTime]);
  const rows = useMemo(() => {
    const maxLen = Math.min(Math.max(bids.length, asks.length), visibleRowsCount);
    return Array.from({ length: maxLen }).map((_, idx) => ({
      bid: bids[idx] || null,
      ask: asks[idx] || null,
    }));
  }, [asks, bids, visibleRowsCount]);

  const { maxBid, maxAsk } = useMemo(() => {
    const visibleBids = bids.slice(0, visibleRowsCount);
    const visibleAsks = asks.slice(0, visibleRowsCount);
    const maxBidVal = Math.max(
      1,
      ...visibleBids.map((x) => Number(x?.value ?? 0)).filter((n) => Number.isFinite(n))
    );
    const maxAskVal = Math.max(
      1,
      ...visibleAsks.map((x) => Number(x?.value ?? 0)).filter((n) => Number.isFinite(n))
    );
    return { maxBid: maxBidVal, maxAsk: maxAskVal };
  }, [asks, bids, visibleRowsCount]);

  return (
    <div className={`${styles.container} ${showMask ? styles.containerMasked : ''}`}>
      {showHeader && (
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{displayTitle}</h2>
            {displayTag && <span className={styles.badge}>{displayTag}</span>}
          </div>
          {endTime && (
            <div className={styles.countdown} style={pcCountdownStyles?.wrapper}>
              <span className={styles.countdownLabel} style={pcCountdownStyles?.label}>{t('orderBook.endIn')}</span>
              <div className={styles.countdownNumbers} style={pcCountdownStyles?.numbers}>
                <span className={styles.countdownCircle} style={pcCountdownStyles?.circle}>
                  <span className={styles.countdownValue} style={pcCountdownStyles?.value}>{String(countdown.days).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText} style={pcCountdownStyles?.text}>{t('orderBook.days')}</span>
                <span className={styles.countdownCircle} style={pcCountdownStyles?.circle}>
                  <span className={styles.countdownValue} style={pcCountdownStyles?.value}>{String(countdown.hours).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText} style={pcCountdownStyles?.text}>{t('orderBook.hours')}</span>
                <span className={styles.countdownCircle} style={pcCountdownStyles?.circle}>
                  <span className={styles.countdownValue} style={pcCountdownStyles?.value}>{String(countdown.minutes).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText} style={pcCountdownStyles?.text}>{t('orderBook.minutes')}</span>
                <span className={styles.countdownCircle} style={pcCountdownStyles?.circle}>
                  <span className={styles.countdownValue} style={pcCountdownStyles?.value}>{String(countdown.seconds).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText} style={pcCountdownStyles?.text}>{t('orderBook.seconds')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendLeft}>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.bidDot}`} />
            <span className={styles.legendText}>{t('orderBook.buy')}</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.askDot}`} />
            <span className={styles.legendText}>{t('orderBook.sell')}</span>
          </div>
        </div>
        <div className={styles.legendRight}>
          <div className={styles.dropdown} onClick={() => setDropdownOpen(!dropdownOpen)}>
            <span className={styles.dropdownText}>{selectedOption}</span>
            <svg className={`${styles.dropdownArrow} ${dropdownOpen ? styles.dropdownArrowOpen : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {dropdownOpen && (
              <div className={styles.dropdownMenu}>
                {displayDropdownOptions.map((option, idx) => (
                  <div
                    key={idx}
                    className={`${styles.dropdownOption} ${option === selectedOption ? styles.dropdownOptionActive : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      userSelectedRef.current = true;
                      setSelectedOption(option);
                      setDropdownOpen(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${styles.list} ${
          (selectedOption.includes('前五') || selectedOption.includes('Top 5')) ? styles.listTop5 : ''
        } ${(
          selectedOption.includes('前十') || selectedOption.includes('Top 10')
        ) ? styles.listTop10 : ''} ${!rows.length ? styles.listEmpty : ''}`}
      >
        {rows.length ? (
          rows.map((row, idx) => {
          const bidValue = row.bid ? Number(row.bid.value ?? 0) : 0;
          const askValue = row.ask ? Number(row.ask.value ?? 0) : 0;
          const bidPct = Math.max(0, Math.min(100, (bidValue / maxBid) * 100));
          const askPct = Math.max(0, Math.min(100, (askValue / maxAsk) * 100));

          const bidOpacity = Math.min(1, Math.max(0.6, 0.6 + (bidPct / 100) * 0.4));
          const askOpacity = Math.min(1, Math.max(0.6, 0.6 + (askPct / 100) * 0.4));

          const leftLogo = pickRowLogo(row.bid, idx * 2);
          const rightLogo = pickRowLogo(row.ask, idx * 2 + 1);

          return (
            <div key={idx} className={styles.row}>
              <div className={styles.iconCell}>
                {leftLogo ? (
                  <img className={styles.icon} src={leftLogo} alt="exchange" />
                ) : (
                  <span className={styles.iconPlaceholder} />
                )}
              </div>

              <div className={styles.barCell}>
                <div className={styles.barBg}>
                  <div className={`${styles.value} ${styles.bidValue} ${styles.bidPrice}`}>
                    <FadingValue value={row.bid?.value} formatValue={formatValue} />
                  </div>
                  <div className={`${styles.value} ${styles.askValue} ${styles.askPrice}`}>
                    <FadingValue value={row.ask?.value} formatValue={formatValue} />
                  </div>

                  <div className={styles.barTrack}>
                    <div className={styles.midLine} />
                    <motion.div
                      className={styles.bidBar}
                      animate={{ width: `${bidPct}%`, opacity: bidOpacity }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                    <motion.div
                      className={styles.askBar}
                      animate={{ width: `${askPct}%`, opacity: askOpacity }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.iconCell}>
                {rightLogo ? (
                  <img className={styles.icon} src={rightLogo} alt="exchange" />
                ) : (
                  <span className={styles.iconPlaceholder} />
                )}
              </div>
            </div>
          );
        })
        ) : (
          <div className={styles.empty}>{t('orderBook.noData')}</div>
        )}
      </div>

      {/* 遮罩层 */}
      {showMask && (
        <div className={styles.maskOverlay}>
          <div className={styles.maskCard}>
            <div className={styles.maskHeader}>
              <div className={styles.maskTitleSection}>
                <h2 className={styles.maskHeaderTitle}>{displayTitle}</h2>
              </div>
              <div className={styles.maskLegend}>
                <div className={styles.maskLegendItem}>
                  <span className={`${styles.maskDot} ${styles.maskBidDot}`} />
                  <span className={styles.maskLegendText}>{t('orderBook.buy')}</span>
                </div>
                <div className={styles.maskLegendItem}>
                  <span className={`${styles.maskDot} ${styles.maskAskDot}`} />
                  <span className={styles.maskLegendText}>{t('orderBook.sell')}</span>
                </div>
              </div>
            </div>
            
            {showVipElements && (
              <div 
                className={styles.maskHeaderBadge}
                style={{
                  backgroundImage: `url('${CDN_PUBLIC_PREFIX}/images/new_detail/experience_end_badge${i18n.language === 'en' ? '_en' : ''}.svg')`
                }}
              />
            )}

            <div className={styles.maskContent}>
              <h2 className={styles.maskTitle}>{maskTitle || t('orderBook.benefitEnded')}</h2>
              
              {showVipElements && (
                <div className={styles.maskSubtitleWrapper}>
                  <span className={styles.maskBullet}>•</span>
                  <span className={styles.maskSubtitle}>{t('orderBook.memberExclusive')}</span>
                </div>
              )}

              <p className={styles.maskDescription}>
                {maskDescription || t('orderBook.memberDescription')}
              </p>

              <button 
                className={styles.maskButton}
                onClick={() => {
                  if (onSubscribe) {
                    onSubscribe();
                  }
                }}
              >
                {maskButtonText || t('orderBook.subscribeUnlock')}
              </button>

              {onBuyMembership && (
                <button 
                  className={styles.membershipButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onBuyMembership) {
                      onBuyMembership();
                    }
                  }}
                >
                  {membershipButtonText || t('orderBook.membershipButtonText')}
                </button>
              )}

              {showVipElements && (
                <img src={`${CDN_PUBLIC_PREFIX}/images/new_detail/vip_right_mask.svg`} alt="VIP" className={styles.maskVipIcon} />
              )}
            </div>

            {/* 红绿柱状图 - 绝对定位覆盖在下方 */}
            <div className={styles.chartOverlay}>
              <BarChart 
                data={[
                  { leftValue: 12.3, rightValue: 12.3 },
                  { leftValue: 11.4, rightValue: 10 },
                  { leftValue: 10, rightValue: 10 },
                  { leftValue: 9, rightValue: 10 },
                ]} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
