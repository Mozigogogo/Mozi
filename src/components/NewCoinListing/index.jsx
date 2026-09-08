'use client';

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

const FALLBACK_ICON =
  'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/icons/pc/calendar.svg';

const CEX_LOGO = (name) =>
  `https://coinlogo-1317406749.cos.ap-shanghai.myqcloud.com/cex_logo/cex_logo/${encodeURIComponent(name)}.png`;

function ExternalLinkIcon({ className }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M5.25 2.625H2.625A1.125 1.125 0 0 0 1.5 3.75v7.625A1.125 1.125 0 0 0 2.625 12.5h7.625A1.125 1.125 0 0 0 11.375 11.375V8.75M8.125 1.5h4.375V5.875M6.125 7.875 12.5 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function parseListingTime(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = String(raw).trim();
  if (!text) return null;
  // 北京时间字符串按本地解析（接口约定 yyyy-MM-dd HH:mm:ss）
  const normalized = text.includes('T') ? text : text.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatAnnounceTime(date, language) {
  if (!date) return '--';
  const isZh = String(language || '').toLowerCase().startsWith('zh');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (isZh) return `${month}月${day}日 ${hh}:${mm}`;
  return `${month}/${day} ${hh}:${mm}`;
}

function formatRelativeTime(date, t) {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const mins = Math.floor(abs / 60000);
  if (mins < 1) return t('calendar.event.justNow', { defaultValue: '刚刚' });
  if (mins < 60) {
    return diffMs >= 0
      ? t('calendar.event.minutesAgo', { defaultValue: '{{n}}分钟前', n: mins })
      : t('calendar.event.inMinutes', { defaultValue: '{{n}}分钟后', n: mins });
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return diffMs >= 0
      ? t('calendar.event.hoursAgo', { defaultValue: '{{n}}小时前', n: hours })
      : t('calendar.event.inHours', { defaultValue: '{{n}}小时后', n: hours });
  }
  const days = Math.floor(hours / 24);
  return diffMs >= 0
    ? t('calendar.event.daysAgo', { defaultValue: '{{n}}天前', n: days })
    : t('calendar.event.inDays', { defaultValue: '{{n}}天后', n: days });
}

function formatCountdownFromSec(countdownSec) {
  const sec = Number(countdownSec);
  if (!Number.isFinite(sec) || sec <= 0) return '';
  const totalMins = Math.floor(sec / 60);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `T-${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}`;
  return `T-${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function formatCountdown(targetDate) {
  if (!targetDate) return '';
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return '';
  return formatCountdownFromSec(Math.floor(diff / 1000));
}

function getExchangeLogo(exchange) {
  const name = String(exchange || '').trim();
  if (!name) return FALLBACK_ICON;
  return CEX_LOGO(name);
}

function resolveInstrumentLabel(instrument, t) {
  const key = String(instrument || '').toLowerCase();
  if (key === 'perp' || key === 'swap' || key === 'futures') {
    return t('calendar.event.futures', { defaultValue: '合约' });
  }
  return t('calendar.event.spot', { defaultValue: '现货' });
}

function formatChangePercent(raw) {
  if (raw == null || raw === '') return '';
  const text = String(raw).trim();
  if (!text) return '';
  if (text.includes('%')) return text.startsWith('+') || text.startsWith('-') ? text : `+${text}`;
  const n = parseFloat(text.replace(/,/g, ''));
  if (!Number.isFinite(n)) return text;
  const prefix = n > 0 ? '+' : '';
  return `${prefix}${n.toFixed(1)}%`;
}

function formatPrice(raw) {
  if (raw == null || raw === '') return '';
  const text = String(raw).trim();
  if (!text) return '';
  if (text.startsWith('$')) return text;
  const n = parseFloat(text.replace(/,/g, ''));
  if (!Number.isFinite(n)) return text;
  if (Math.abs(n) >= 1) return `$${n.toFixed(4)}`;
  const fixed = n.toPrecision(4);
  return `$${fixed}`;
}

function pickPremarket(coin) {
  const pm = coin?.premarket;
  if (!pm || typeof pm !== 'object') {
    return {
      exchange: coin.refExchange || coin.preheatExchange || '',
      price: coin.refPrice || coin.preheatPrice || coin.price || '',
      change: coin.refChangePercent || coin.priceChangePercent || coin.changePercent || '',
    };
  }
  return {
    exchange:
      pm.ref_exchange ||
      pm.refExchange ||
      pm.exchange ||
      pm.exchanges ||
      pm.venue ||
      '',
    price:
      pm.last_price ??
      pm.lastPrice ??
      pm.price ??
      pm.last ??
      pm.close ??
      '',
    change:
      pm.price_change_percent ??
      pm.priceChangePercent ??
      pm.change_percent ??
      pm.changePercent ??
      pm.change ??
      '',
  };
}

function pickDelistReason(coin) {
  const raw =
    coin.reason ||
    coin.delist_reason ||
    coin.delistReason ||
    coin.offline_reason ||
    coin.offlineReason ||
    coin.delistReasonText ||
    coin.reason_text ||
    coin.reasonText ||
    '';
  return String(raw || '').trim();
}

function normalizeEventCard(coin, index, t, language, listingTab = 'upcoming') {
  const exchange = coin.exchange || coin.exchanges || coin.name || '--';
  const iconUrl = coin.logoUrl || coin.exchangeIcon || coin.icon || getExchangeLogo(exchange);
  const announceDate =
    parseListingTime(coin.ts) ||
    parseListingTime(coin.ctime || coin.listingTime || coin.time || coin.announceTime);
  const listingAt = parseListingTime(coin.open_time || coin.listingAt || coin.onlineTime || coin.launchTime);
  const symbol = String(coin.symbol || coin.coin || coin.currency || '').trim().toUpperCase() || '--';
  const fullName = String(coin.fullName || coin.projectName || coin.coinName || coin.pair || '').trim();
  const marketType = resolveInstrumentLabel(coin.instrument || coin.marketType || coin.productType, t);
  const titleText = String(coin.title || '').trim();
  const bodyText = String(coin.deteil || coin.details || coin.description || '').trim();
  const details = titleText || bodyText;
  const link = coin.url || coin.link || coin.href || '';
  const premarket = pickPremarket(coin);
  const refExchange = premarket.exchange;
  const refPrice = formatPrice(premarket.price);
  const refChange = formatChangePercent(premarket.change);
  const isDelisted = listingTab === 'delisted';
  const isListed = listingTab === 'listed';
  const statusTag =
    isDelisted || isListed
      ? ''
      : coin.statusTag ||
        coin.preheatTag ||
        (coin.premarket || refExchange || refPrice
          ? t('calendar.event.preheat', { defaultValue: '预热' })
          : '');
  const countdown =
    isDelisted || isListed
      ? ''
      : formatCountdownFromSec(coin.countdown_sec) || coin.countdown || formatCountdown(listingAt);
  const syncTag = isDelisted || isListed ? '' : coin.syncTag || coin.syncAnnounceTag || '';
  // 下线原因：专用字段优先；否则 title + deteil 并存时用正文作原因
  const delistReason = isDelisted
    ? pickDelistReason(coin) || (titleText && bodyText && bodyText !== titleText ? bodyText : '')
    : '';
  const delistedStatus = isDelisted
    ? t('calendar.event.delistedStatus', { defaultValue: '已下线' })
    : '';
  const listedStatus = isListed
    ? t('calendar.event.listedStatus', { defaultValue: '已上线' })
    : '';

  return {
    id: coin.id || `${exchange}-${symbol}-${coin.ts || index}`,
    exchange,
    iconUrl,
    symbol,
    fullName,
    marketType,
    countdown,
    statusTag,
    listedStatus,
    delistedStatus,
    delistReason,
    isListed,
    isDelisted,
    refExchange,
    refPrice,
    refChange,
    syncTag,
    details,
    link,
    announceText: formatAnnounceTime(announceDate, language),
    relativeText: formatRelativeTime(announceDate, t),
  };
}

/**
 * 新币上线 / 交易所公告事件列表
 */
const NewCoinListing = ({
  showMore = false,
  data = [],
  onMoreClick,
  loading = false,
  isPC = false,
  listingTab = 'upcoming',
  title,
  totalCount,
}) => {
  const { t, i18n } = useTranslation();
  const eventListRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const dragMovedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isThumbDragging, setIsThumbDragging] = useState(false);
  const [scrollMetrics, setScrollMetrics] = useState({
    canScroll: false,
    thumbWidth: 40,
    thumbLeft: 0,
  });

  const coinListings = data || [];
  const displayList = showMore || isPC ? coinListings : coinListings.slice(0, 3);
  const displayTotal = Number.isFinite(Number(totalCount)) ? Number(totalCount) : coinListings.length;

  const syncScrollMetrics = useCallback(() => {
    const el = eventListRef.current;
    const track = scrollTrackRef.current;
    if (!el || !track) return;

    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const trackWidth = track.clientWidth;
    if (maxScroll <= 0 || trackWidth <= 0) {
      setScrollMetrics({ canScroll: false, thumbWidth: Math.max(trackWidth, 40), thumbLeft: 0 });
      return;
    }

    const ratio = el.clientWidth / el.scrollWidth;
    const thumbWidth = Math.max(40, Math.round(trackWidth * ratio));
    const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
    const thumbLeft = Math.round((el.scrollLeft / maxScroll) * maxThumbLeft);
    setScrollMetrics({ canScroll: true, thumbWidth, thumbLeft });
  }, []);

  useLayoutEffect(() => {
    if (!isPC) return undefined;
    syncScrollMetrics();
    const el = eventListRef.current;
    if (!el) return undefined;

    const onScroll = () => syncScrollMetrics();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => syncScrollMetrics()) : null;
    ro?.observe(el);
    if (scrollTrackRef.current) ro?.observe(scrollTrackRef.current);
    window.addEventListener('resize', syncScrollMetrics);

    const timer = window.setTimeout(syncScrollMetrics, 100);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      window.removeEventListener('resize', syncScrollMetrics);
      window.clearTimeout(timer);
    };
  }, [isPC, loading, displayList.length, syncScrollMetrics]);

  const onListPointerDown = useCallback(
    (event) => {
      if (!isPC) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const el = eventListRef.current;
      if (!el) return;

      const startX = event.clientX;
      const startScrollLeft = el.scrollLeft;
      let moved = false;
      dragMovedRef.current = false;
      setIsDragging(true);

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        if (!moved && Math.abs(dx) < 4) return;
        moved = true;
        dragMovedRef.current = true;
        el.scrollLeft = startScrollLeft - dx;
        ev.preventDefault();
      };

      const onUp = () => {
        setIsDragging(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (moved) {
          window.setTimeout(() => {
            dragMovedRef.current = false;
          }, 0);
        }
      };

      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [isPC]
  );

  const onListClickCapture = useCallback((event) => {
    if (!dragMovedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragMovedRef.current = false;
  }, []);

  const onTrackPointerDown = useCallback(
    (event) => {
      if (!isPC) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const el = eventListRef.current;
      const track = scrollTrackRef.current;
      if (!el || !track) return;

      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll <= 0) return;

      event.preventDefault();
      event.stopPropagation();

      const trackWidth = track.clientWidth;
      const ratio = el.clientWidth / el.scrollWidth;
      const thumbWidth = Math.max(40, Math.round(trackWidth * ratio));
      const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
      const trackRect = track.getBoundingClientRect();
      const clickX = event.clientX - trackRect.left;
      const isThumb = Boolean(
        event.target instanceof Element && event.target.closest(`.${styles.scrollThumb}`)
      );

      if (!isThumb && maxThumbLeft > 0) {
        const nextLeft = Math.min(maxThumbLeft, Math.max(0, clickX - thumbWidth / 2));
        el.scrollLeft = (nextLeft / maxThumbLeft) * maxScroll;
      }

      const startX = event.clientX;
      const startScrollLeft = el.scrollLeft;
      setIsThumbDragging(true);

      const onMove = (ev) => {
        if (maxThumbLeft <= 0) return;
        const dx = ev.clientX - startX;
        el.scrollLeft = startScrollLeft + (dx / maxThumbLeft) * maxScroll;
        ev.preventDefault();
      };

      const onUp = () => {
        setIsThumbDragging(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };

      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [isPC]
  );

  const sectionTitle =
    title ||
    t(`calendar.tabs.${listingTab}`, {
      defaultValue:
        listingTab === 'listed' ? '已上线' : listingTab === 'delisted' ? '下线公告' : '即将上线',
    });

  const emptyText =
    listingTab === 'listed'
      ? t('calendar.event.emptyListed', { defaultValue: '暂无已上线公告' })
      : listingTab === 'delisted'
        ? t('calendar.event.emptyDelisted', { defaultValue: '暂无下线公告' })
        : t('calendar.event.emptyUpcoming', { defaultValue: '暂无即将上线公告' });

  const eventCards = useMemo(
    () => displayList.map((coin, index) => normalizeEventCard(coin, index, t, i18n.language, listingTab)),
    [displayList, t, i18n.language, listingTab]
  );

  const openLink = (link) => {
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const renderPcScrollbar = () => (
    <div
      ref={scrollTrackRef}
      className={`${styles.scrollTrack} ${scrollMetrics.canScroll ? '' : styles.scrollTrackIdle} ${
        isThumbDragging ? styles.scrollTrackDragging : ''
      }`}
      role="scrollbar"
      aria-orientation="horizontal"
      onPointerDown={onTrackPointerDown}
    >
      <div
        className={styles.scrollThumb}
        style={{
          width: `${scrollMetrics.thumbWidth}px`,
          transform: `translate3d(${scrollMetrics.thumbLeft}px, 0, 0)`,
        }}
      />
    </div>
  );

  return (
    <div className={`${styles.wrapper} ${isPC ? styles.pcWrapper : ''}`}>
      <div className={styles.header}>
        {isPC ? (
          <>
            <span className={styles.headerTitle}>{sectionTitle}</span>
            <span className={styles.headerCount}>
              {t('calendar.event.totalCount', {
                defaultValue: '共 {{n}} 条',
                n: displayTotal,
              })}
            </span>
          </>
        ) : (
          <>
            <span className={styles.headerTitle}>{t('user.newCoinListing')}</span>
            {showMore ? (
              <span className={styles.viewMore} onClick={onMoreClick}>
                {t('user.viewMore')} {'>'}
              </span>
            ) : null}
          </>
        )}
      </div>

      <div className={styles.container}>
        {loading ? (
          isPC ? (
            <div className={styles.eventScrollShell}>
              <div
                ref={eventListRef}
                className={`${styles.eventList} ${isDragging ? styles.eventListDragging : ''}`}
                onPointerDown={onListPointerDown}
                onClickCapture={onListClickCapture}
              >
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className={`${styles.eventCard} ${styles.loadingEventCard}`} key={`loading-${index}`}>
                    {index === 1 ? <div className={styles.loadingSpinner} /> : null}
                  </div>
                ))}
              </div>
              {renderPcScrollbar()}
            </div>
          ) : (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner} />
            </div>
          )
        ) : coinListings.length === 0 ? (
          isPC ? (
            <div className={styles.eventScrollShell}>
              <div className={`${styles.emptyState} ${styles.emptyStateInShell}`}>
                <p className={styles.emptyText}>{emptyText}</p>
              </div>
              <div className={styles.scrollTrackSpacer} aria-hidden />
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>{t('user.noNewListings') || '暂无新币上线'}</p>
            </div>
          )
        ) : isPC ? (
          <div className={styles.eventScrollShell}>
            <div
              ref={eventListRef}
              className={`${styles.eventList} ${isDragging ? styles.eventListDragging : ''}`}
              onPointerDown={onListPointerDown}
              onClickCapture={onListClickCapture}
            >
              {eventCards.map((item) => {
              const showPreheat =
                !item.isDelisted &&
                !item.isListed &&
                !!(item.statusTag && (item.refExchange || item.refPrice || item.refChange));
              const changeUp = String(item.refChange || '').includes('-') === false && !!item.refChange;
              const reasonLabel = t('calendar.event.delistReason', { defaultValue: '下线原因' });
              const reasonText = item.delistReason
                ? item.delistReason.startsWith(reasonLabel)
                  ? item.delistReason
                  : `${reasonLabel}：${item.delistReason}`
                : '';

              return (
                <article
                  key={item.id}
                  className={`${styles.eventCard} ${item.isDelisted ? styles.eventCardDelisted : ''} ${
                    item.isListed ? styles.eventCardListed : ''
                  }`}
                  onClick={() => openLink(item.link)}
                  role={item.link ? 'link' : undefined}
                  tabIndex={item.link ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (!item.link) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openLink(item.link);
                    }
                  }}
                >
                  <div className={styles.eventHead}>
                    <img
                      className={styles.eventIcon}
                      src={item.iconUrl}
                      alt=""
                      aria-hidden
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_ICON;
                      }}
                    />
                    <div className={styles.eventHeadMain}>
                      <div className={styles.eventSymbolRow}>
                        <span className={styles.eventSymbol}>{item.symbol}</span>
                        {item.fullName ? <span className={styles.eventFullName}>{item.fullName}</span> : null}
                      </div>
                      <div className={styles.eventMeta}>
                        {item.exchange} · {item.marketType}
                      </div>
                    </div>
                    {item.listedStatus ? (
                      <span className={styles.listedPill}>{item.listedStatus}</span>
                    ) : item.delistedStatus ? (
                      <span className={styles.delistedPill}>{item.delistedStatus}</span>
                    ) : item.countdown ? (
                      <span className={styles.countdownPill}>{item.countdown}</span>
                    ) : null}
                  </div>

                  {showPreheat ? (
                    <div className={styles.preheatBar}>
                      <span className={styles.preheatTag}>{item.statusTag}</span>
                      <span className={styles.preheatExchange}>{item.refExchange || '--'}</span>
                      {item.refPrice ? <span className={styles.preheatPrice}>{item.refPrice}</span> : null}
                      {item.refChange ? (
                        <span className={`${styles.preheatChange} ${changeUp ? styles.changeUp : styles.changeDown}`}>
                          {item.refChange}
                        </span>
                      ) : null}
                    </div>
                  ) : item.syncTag ? (
                    <div className={styles.syncTag}>{item.syncTag}</div>
                  ) : null}

                  <div className={styles.eventDescRow}>
                    <p className={styles.eventDesc} title={item.details}>
                      {item.details || '--'}
                    </p>
                    {item.link ? <ExternalLinkIcon className={styles.eventLinkIcon} /> : null}
                  </div>

                  {reasonText ? (
                    <div className={styles.delistReasonBox} title={reasonText}>
                      {reasonText}
                    </div>
                  ) : null}

                  <div className={styles.eventFooter}>
                    {t('calendar.event.announceTime', { defaultValue: '公告时间' })} {item.announceText}
                    {item.relativeText ? ` · ${item.relativeText}` : ''}
                  </div>
                </article>
              );
            })}
            </div>
            {renderPcScrollbar()}
          </div>
        ) : (
          <div className={styles.scroll}>
            {coinListings.map((coin, index) => {
              const isLast = index === coinListings.length - 1;
              const exchangeName = coin.exchanges || coin.exchange || coin.name;
              const exchangeIcon = coin.logoUrl || coin.exchangeIcon || coin.icon;
              const listingTime = coin.ctime || coin.listingTime || coin.time;
              const details = coin.deteil || coin.details || coin.description;
              const cardTitle = coin.title;
              return (
                <div className={`${styles.coinItem} ${isLast ? styles.last : ''}`} key={coin.id || index}>
                  <div className={styles.coinInfo}>
                    <img className={styles.exchangeIcon} src={exchangeIcon} alt={exchangeName} />
                    <span className={styles.exchangeName}>{exchangeName}</span>
                    <span className={styles.listingTime}>{listingTime}</span>
                  </div>
                  {cardTitle && <p className={styles.coinTitle}>{cardTitle}</p>}
                  {details && (
                    <div className={styles.coinLinkContainer}>
                      <span className={styles.coinLink}>
                        {t('user.details')} {details}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewCoinListing;
