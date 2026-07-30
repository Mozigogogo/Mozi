'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  const logo = rowItem?.logo || rowItem?.icon || rowItem?.url || null;
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

const formatPrice = (val) => {
  if (val === null || val === undefined || val === '') return '--';
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val);
  const abs = Math.abs(num);
  if (abs >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (abs >= 1) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (abs >= 0.01) return num.toFixed(4);
  return num.toPrecision(4);
};

const formatQty = (val) => {
  if (val === null || val === undefined || val === '') return '--';
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val);
  const abs = Math.abs(num);
  if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  if (abs >= 1) return num.toFixed(4).replace(/\.?0+$/, '');
  return num.toPrecision(4);
};

const FadingText = ({ text, className }) => {
  const prevRef = useRef(text);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== text) {
      prevRef.current = text;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 180);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [text]);

  return (
    <span className={`${className || ''} ${flash ? styles.valueFlash : ''}`.trim()}>
      {text}
    </span>
  );
};

const buildLevels = (sideItems, limit) => {
  const sorted = [...(sideItems || [])]
    .map((item) => ({
      price: Number(item?.price) || 0,
      quantity: Number(item?.quantity) || 0,
      value: Number(item?.value) || 0,
      logo: item?.logo || null,
    }))
    .filter((item) => item.price > 0 || item.quantity > 0 || item.value > 0)
    .slice(0, limit);

  let cumulative = 0;
  return sorted.map((item) => {
    const qty = item.quantity > 0 ? item.quantity : item.value;
    cumulative += qty;
    return {
      ...item,
      quantity: qty,
      total: cumulative,
    };
  });
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
  showMask = false,
  onSubscribe,
  maskTitle,
  maskDescription,
  maskButtonText,
  showVipElements = true,
  onBuyMembership,
  membershipButtonText,
  midPrice: midPriceProp,
  priceTrend, // 'up' | 'down' | undefined
}) {
  const { t, i18n } = useTranslation();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [selectedOption, setSelectedOption] = useState(dropdownOptions?.[0] || t('orderBook.top5'));
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPcLayout, setIsPcLayout] = useState(false);
  const userSelectedRef = useRef(false);
  const prevOptionsKeyRef = useRef('');
  const pcCountdownStyles = isPcLayout
    ? {
        wrapper: {
          gap: 4,
          flexWrap: 'nowrap',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          overflow: 'visible',
        },
        label: {
          fontSize: 11,
          lineHeight: 1.15,
          letterSpacing: '0.02em',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          flex: '0 0 auto',
        },
        numbers: {
          gap: 2,
          alignItems: 'center',
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap',
        },
        circle: {
          width: 22,
          height: 22,
          minWidth: 22,
          minHeight: 22,
          fontSize: 11,
          lineHeight: 1,
          flex: '0 0 auto',
        },
        value: {
          transform: 'translate(-0.5px, 0.5px)',
          display: 'inline-block',
          whiteSpace: 'nowrap',
        },
        text: {
          fontSize: 11,
          lineHeight: 1.15,
          letterSpacing: '0.02em',
          margin: '0 2px 0 1px',
          whiteSpace: 'nowrap',
          flex: '0 0 auto',
        },
      }
    : null;

  const displayTitle = title || t('orderBook.title');
  const displayTag = tag !== undefined ? tag : t('orderBook.limitedExperience');
  const displayDropdownOptions = dropdownOptions || [t('orderBook.top5'), t('orderBook.top10')];

  useEffect(() => {
    const opts = displayDropdownOptions || [];
    if (!opts.length) return;
    const optionsKey = opts.join('|');
    const prevKey = prevOptionsKeyRef.current;
    prevOptionsKeyRef.current = optionsKey;

    if (!userSelectedRef.current && prevKey && prevKey !== optionsKey) {
      setSelectedOption(opts[0]);
      return;
    }

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

  // 两侧均按「与当前价距离」排序：越靠近中间的行，价格越接近现价
  const sortMid = useMemo(() => {
    if (midPriceProp === undefined || midPriceProp === null || midPriceProp === '') return null;
    const n = Number(String(midPriceProp).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [midPriceProp]);

  const bidLevels = useMemo(() => {
    const items = [...(bids || [])];
    if (sortMid != null) {
      items.sort(
        (a, b) =>
          Math.abs((Number(a?.price) || 0) - sortMid) - Math.abs((Number(b?.price) || 0) - sortMid),
      );
    } else {
      items.sort((a, b) => (Number(b?.price) || 0) - (Number(a?.price) || 0));
    }
    return buildLevels(items, visibleRowsCount);
  }, [bids, visibleRowsCount, sortMid]);

  const askLevels = useMemo(() => {
    const items = [...(asks || [])];
    if (sortMid != null) {
      items.sort(
        (a, b) =>
          Math.abs((Number(a?.price) || 0) - sortMid) - Math.abs((Number(b?.price) || 0) - sortMid),
      );
    } else {
      items.sort((a, b) => (Number(a?.price) || 0) - (Number(b?.price) || 0));
    }
    const levels = buildLevels(items, visibleRowsCount);
    // 卖盘在上：距离远的在顶部，最接近现价的在底部贴中间
    return [...levels].reverse();
  }, [asks, visibleRowsCount, sortMid]);

  const maxDepth = useMemo(() => {
    const askMax = askLevels.length ? askLevels[0]?.total || 0 : 0;
    const bidMax = bidLevels.length ? bidLevels[bidLevels.length - 1]?.total || 0 : 0;
    return Math.max(askMax, bidMax, 1);
  }, [askLevels, bidLevels]);

  const midPrice = useMemo(() => {
    const parseMid = (v) => {
      if (v === undefined || v === null || v === '') return null;
      const n = Number(String(v).replace(/[$,\s]/g, ''));
      return Number.isFinite(n) ? n : null;
    };
    const fromProp = parseMid(midPriceProp);
    if (fromProp !== null) return fromProp;
    const bestAsk = askLevels.length ? askLevels[askLevels.length - 1]?.price : null;
    const bestBid = bidLevels.length ? bidLevels[0]?.price : null;
    if (Number.isFinite(bestAsk) && Number.isFinite(bestBid) && bestAsk > 0 && bestBid > 0) {
      return (bestAsk + bestBid) / 2;
    }
    return bestAsk || bestBid || null;
  }, [askLevels, bidLevels, midPriceProp]);

  const midTrendDown = useMemo(() => {
    if (priceTrend === 'down') return true;
    if (priceTrend === 'up') return false;
    const bestAsk = askLevels.length ? askLevels[askLevels.length - 1]?.price : null;
    const bestBid = bidLevels.length ? bidLevels[0]?.price : null;
    if (!Number.isFinite(bestAsk) || !Number.isFinite(bestBid) || !Number.isFinite(midPrice)) return false;
    return Math.abs(midPrice - bestAsk) < Math.abs(midPrice - bestBid);
  }, [askLevels, bidLevels, midPrice, priceTrend]);

  const hasData = askLevels.length > 0 || bidLevels.length > 0;

  const renderLevelRow = (level, side, key, seed) => {
    const depthPct = Math.max(0, Math.min(100, (Number(level.total) / maxDepth) * 100));
    const logo = pickRowLogo(level, seed);
    return (
      <div key={key} className={`${styles.bookRow} ${side === 'ask' ? styles.askRow : styles.bidRow}`}>
        <div
          className={`${styles.depthBar} ${side === 'ask' ? styles.askDepth : styles.bidDepth}`}
          style={{ width: `${depthPct}%` }}
        />
        <FadingText
          className={`${styles.colPrice} ${side === 'ask' ? styles.askPriceText : styles.bidPriceText}`}
          text={formatPrice(level.price)}
        />
        <FadingText className={styles.colAmount} text={formatQty(level.quantity)} />
        <div className={styles.colExchange}>
          {logo ? (
            <img className={styles.exchangeIcon} src={logo} alt="" />
          ) : (
            <span className={styles.exchangeIconPlaceholder} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${showMask ? styles.containerMasked : ''}`}>
      {showHeader && (
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h2 className={styles.title}>{displayTitle}</h2>
            {displayTag && <span className={styles.badge}>{displayTag}</span>}
          </div>
        </div>
      )}

      <div className={styles.metaRow}>
        {endTime ? (
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
        ) : (
          <span className={styles.metaRowSpacer} />
        )}
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

      <div className={`${styles.book} ${!hasData ? styles.bookEmpty : ''}`}>
        <div className={styles.bookHead}>
          <span className={styles.colPrice}>{t('orderBook.price')}</span>
          <span className={styles.colAmount}>{t('orderBook.amount')}</span>
          <span className={styles.colExchange} aria-hidden />
        </div>

        {hasData ? (
          <div className={styles.bookBody}>
            <div className={styles.asksScroll}>
              <div className={styles.asks}>
                {askLevels.map((level, idx) =>
                  renderLevelRow(level, 'ask', `ask-${idx}-${level.price}`, idx * 2 + 1)
                )}
              </div>
            </div>

            <div className={styles.midRow}>
              <span className={`${styles.midPrice} ${midTrendDown ? styles.midDown : styles.midUp}`}>
                {formatPrice(midPrice)}
                <span className={styles.midArrow} aria-hidden>
                  {midTrendDown ? '▼' : '▲'}
                </span>
              </span>
              {Number.isFinite(Number(midPrice)) && Number(midPrice) > 0 ? (
                <span className={styles.midSub}>{formatValue(Number(midPrice))}</span>
              ) : null}
            </div>

            <div className={styles.bidsScroll}>
              <div className={styles.bids}>
                {bidLevels.map((level, idx) =>
                  renderLevelRow(level, 'bid', `bid-${idx}-${level.price}`, idx * 2 + 2)
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>{t('orderBook.noData')}</div>
        )}
      </div>

      {showMask && (
        <div className={styles.maskOverlay}>
          <div className={styles.maskCard}>
            <div className={styles.maskHeader}>
              <div className={styles.maskTitleSection}>
                <h2 className={styles.maskHeaderTitle}>{displayTitle}</h2>
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
