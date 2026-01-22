'use client';

import React, { useMemo, useState, useEffect } from 'react';
import styles from './index.module.less';

const exchangeIcons = [
  '/icons/new_detail/Ellipse%203832.png',
  '/icons/new_detail/Ellipse%203834.png',
  '/icons/new_detail/Ellipse%203835.png',
  '/icons/new_detail/Ellipse%203836.png',
  '/icons/new_detail/Ellipse%203837.png',
  '/icons/new_detail/Ellipse%203838.png',
  '/icons/new_detail/Ellipse%203839.png',
  '/icons/new_detail/Ellipse%203840.png',
  '/icons/new_detail/Frame%202087326500.png',
];

const pickExchangeIcon = (seed) => {
  if (!exchangeIcons.length) return null;
  const idx = Math.abs((seed * 9301 + 49297) % 233280) % exchangeIcons.length;
  return exchangeIcons[idx];
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

export default function OrderBook({
  bids = [],
  asks = [],
  maxRows = 10,
  formatValue = defaultFormatValue,
  title = '大单侦测',
  tag = '限时体验',
  endTime = null,
  showHeader = true,
  dropdownOptions = ['今日榜单前五', '今日榜单前十'],
  showMask = false, // 是否显示遮罩
  onSubscribe, // 订阅回调
}) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedOption, setSelectedOption] = useState(dropdownOptions[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const visibleRowsCount = useMemo(() => {
    const trimmed = String(selectedOption ?? '').trim();
    const limit = trimmed.includes('前五') ? 5 : 10;
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

  if (!rows.length) {
    return <div className={styles.empty}>暂无订单薄数据</div>;
  }

  return (
    <div className={styles.container}>
      {showHeader && (
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{title}</h2>
            {tag && <span className={styles.badge}>{tag}</span>}
          </div>
          {endTime && (
            <div className={styles.countdown}>
              <span className={styles.countdownLabel}>距结束</span>
              <div className={styles.countdownNumbers}>
                <span className={styles.countdownCircle}>
                  <span className={styles.countdownValue}>{String(countdown.days).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText}>天</span>
                <span className={styles.countdownCircle}>
                  <span className={styles.countdownValue}>{String(countdown.hours).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText}>时</span>
                <span className={styles.countdownCircle}>
                  <span className={styles.countdownValue}>{String(countdown.minutes).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText}>分</span>
                <span className={styles.countdownCircle}>
                  <span className={styles.countdownValue}>{String(countdown.seconds).padStart(2, '0')}</span>
                </span>
                <span className={styles.countdownText}>秒</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className={styles.legend}>
        <div className={styles.legendLeft}>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.bidDot}`} />
            <span className={styles.legendText}>买入</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.askDot}`} />
            <span className={styles.legendText}>卖出</span>
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
                {dropdownOptions.map((option, idx) => (
                  <div
                    key={idx}
                    className={`${styles.dropdownOption} ${option === selectedOption ? styles.dropdownOptionActive : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
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

      <div className={`${styles.list} ${selectedOption.includes('前五') ? styles.listTop5 : ''} ${selectedOption.includes('前十') ? styles.listTop10 : ''}`}>
        {rows.map((row, idx) => {
          const bidValue = row.bid ? Number(row.bid.value ?? 0) : 0;
          const askValue = row.ask ? Number(row.ask.value ?? 0) : 0;
          const bidPct = Math.max(0, Math.min(100, (bidValue / maxBid) * 100));
          const askPct = Math.max(0, Math.min(100, (askValue / maxAsk) * 100));

          const bidOpacity = Math.min(1, Math.max(0.6, 0.6 + (bidPct / 100) * 0.4));
          const askOpacity = Math.min(1, Math.max(0.6, 0.6 + (askPct / 100) * 0.4));

          return (
            <div key={idx} className={styles.row}>
              <div className={styles.iconCell}>
                {pickExchangeIcon(idx * 2) ? (
                  <img className={styles.icon} src={pickExchangeIcon(idx * 2)} alt="exchange" />
                ) : (
                  <span className={styles.iconPlaceholder} />
                )}
              </div>

              <div className={styles.barCell}>
                <div className={styles.barBg}>
                  <div className={`${styles.value} ${styles.bidValue} ${styles.bidPrice}`}>{formatValue(row.bid?.value)}</div>
                  <div className={`${styles.value} ${styles.askValue} ${styles.askPrice}`}>{formatValue(row.ask?.value)}</div>

                  <div className={styles.barTrack}>
                    <div className={styles.midLine} />
                    <div className={styles.bidBar} style={{ width: `${bidPct}%`, opacity: bidOpacity }} />
                    <div className={styles.askBar} style={{ width: `${askPct}%`, opacity: askOpacity }} />
                  </div>
                </div>
              </div>

              <div className={styles.iconCell}>
                {pickExchangeIcon(idx * 2 + 1) ? (
                  <img className={styles.icon} src={pickExchangeIcon(idx * 2 + 1)} alt="exchange" />
                ) : (
                  <span className={styles.iconPlaceholder} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 遮罩层 */}
      {showMask && (
        <div className={styles.maskOverlay}>
          <div className={styles.maskCard}>
            <div className={styles.maskHeader}>
              <div className={styles.maskTitleSection}>
                <h2 className={styles.maskHeaderTitle}>{title}</h2>
              </div>
              <div className={styles.maskLegend}>
                <div className={styles.maskLegendItem}>
                  <span className={`${styles.maskDot} ${styles.maskBidDot}`} />
                  <span className={styles.maskLegendText}>买入</span>
                </div>
                <div className={styles.maskLegendItem}>
                  <span className={`${styles.maskDot} ${styles.maskAskDot}`} />
                  <span className={styles.maskLegendText}>卖出</span>
                </div>
              </div>
            </div>
            <div className={styles.maskHeaderBadge} />

            <div className={styles.maskContent}>
              <h2 className={styles.maskTitle}>限时福利已结束</h2>
              
              <div className={styles.maskSubtitleWrapper}>
                <span className={styles.maskBullet}>•</span>
                <span className={styles.maskSubtitle}>会员专享查看权限</span>
              </div>

              <p className={styles.maskDescription}>
                本部分内容属会员创测期限制查看，会员可支持国服最新资讯
              </p>

              <button 
                className={styles.maskButton}
                onClick={() => {
                  if (onSubscribe) {
                    onSubscribe();
                  }
                }}
              >
                点击订阅解锁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
