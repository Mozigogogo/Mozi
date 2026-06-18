'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SignalCard from '@/components/SignalCard';
import styles from './index.module.less';

const DRAG_THRESHOLD = 40;

function isCarouselDebugEnabled() {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV === 'development') return true;
  try {
    return (
      new URLSearchParams(window.location.search).get('carouselDebug') === '1' ||
      window.localStorage?.getItem('carouselDebug') === '1'
    );
  } catch {
    return false;
  }
}

function logCarousel(label, payload) {
  if (!isCarouselDebugEnabled()) return;
  if (payload !== undefined) {
    console.log(`[SignalCardCarousel] ${label}`, payload);
    return;
  }
  console.log(`[SignalCardCarousel] ${label}`);
}

function describeTarget(target) {
  if (!target || !(target instanceof Element)) return String(target);
  const el = target.closest(`.${styles.cardSlot}`) || target;
  return {
    tag: el.tagName,
    className: el.className,
    coin: el.getAttribute?.('data-coin') ?? null,
    index: el.getAttribute?.('data-index') ?? null,
    pointerEvents: el instanceof HTMLElement ? getComputedStyle(el).pointerEvents : null,
    zIndex: el instanceof HTMLElement ? getComputedStyle(el).zIndex : null,
  };
}

function modIndex(idx, length) {
  if (!length) return 0;
  return ((idx % length) + length) % length;
}

function getWrappedRel(index, current, total) {
  let rel = index - current;
  const half = Math.floor(total / 2);
  if (rel > half) rel -= total;
  if (rel < -half) rel += total;
  return rel;
}

/** 与 signal_card_carousel.html 中 layout() 保持一致，仅展示 rel ∈ {-1,0,1} */
function getCardSlotStyle(rel, total, config, isPC = false) {
  const { offsetX, scaleSide, transZSide, rotateSide = 22, centerOffsetX = 0 } = config;
  const anchor = 'translate(-50%, -50%)';
  const sideZIndex = isPC ? 35 : 5;

  if (Math.abs(rel) > 1) {
    const farX = (rel > 0 ? offsetX * 2 : -offsetX * 2) + centerOffsetX;
    return {
      transform: `${anchor} translateX(${farX}px) translateZ(-460px) rotateY(${rel > 0 ? -48 : 48}deg) scale(0.4)`,
      opacity: 0,
      filter: 'blur(6px)',
      zIndex: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
    };
  }

  if (rel === 0) {
    return {
      transform: `${anchor} translateX(${centerOffsetX}px) translateZ(0px) rotateY(0deg) scale(1)`,
      opacity: 1,
      filter: 'none',
      zIndex: 10,
      pointerEvents: 'none',
      visibility: 'visible',
      cursor: 'default',
    };
  }

  const isRight = rel === 1 || rel === -(total - 1);
  const tx = (isRight ? offsetX : -offsetX) + centerOffsetX;
  const ry = isRight ? -rotateSide : rotateSide;

  return {
    transform: `${anchor} translateX(${tx}px) translateZ(${transZSide}px) rotateY(${ry}deg) scale(${scaleSide})`,
    opacity: config.sideOpacity ?? 0.65,
    filter: config.sideBlur ? `blur(${config.sideBlur}px)` : 'blur(2px)',
    zIndex: sideZIndex,
    pointerEvents: 'auto',
    visibility: 'visible',
    cursor: 'pointer',
  };
}

function getLayoutConfig(containerWidth, isPC = false) {
  const width = Math.max(280, containerWidth || 900);
  const isMobileLayout = !isPC || width < 640;

  if (isMobileLayout) {
    const cardWidth = Math.round(width * 0.84);
    return {
      cardWidth,
      offsetX: Math.round(width * 0.26),
      scaleSide: 0.9,
      transZSide: -32,
      transZFar: -140,
      perspective: Math.max(480, Math.min(680, width * 1.05)),
      sceneHeight: Math.round(Math.max(260, width * 0.7)),
      rotateSide: 8,
      sideOpacity: 0.72,
      sideBlur: 1,
      centerOffsetX: Math.round(-width * 0.03),
    };
  }

  const scale = Math.min(1, Math.max(0.45, width / 900));
  const cardWidth = Math.round(Math.min(340, Math.max(160, width * 0.38)));

  return {
    cardWidth,
    offsetX: Math.round(360 * scale),
    scaleSide: 0.72,
    transZSide: -160 * scale,
    transZFar: -320 * scale,
    perspective: Math.max(560, Math.min(1200, 1200 * scale)),
    sceneHeight: Math.round(Math.min(560, Math.max(340, width * 0.58))),
    rotateSide: 22,
    sideOpacity: 0.65,
    sideBlur: 2,
  };
}

export default function SignalCardCarousel({ cards = [], isPC = false }) {
  const wrapRef = useRef(null);
  const sceneRef = useRef(null);
  const dragRef = useRef({
    startX: null,
    startY: null,
    dragging: false,
    moved: false,
    isHorizontal: null,
    startHitZone: null,
    startSideIndex: null,
  });
  const tapHandledRef = useRef(false);
  const [current, setCurrent] = useState(0);
  const [layoutConfig, setLayoutConfig] = useState(() => getLayoutConfig(900, isPC));
  const [measuredSceneHeight, setMeasuredSceneHeight] = useState(null);
  const [centerCardHeight, setCenterCardHeight] = useState(0);
  const [centerCardWidth, setCenterCardWidth] = useState(0);

  const total = cards.length;
  const isSingle = total <= 1;

  useEffect(() => {
    setCurrent((prev) => modIndex(prev, total));
  }, [total]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || isSingle) return undefined;

    const update = () => setLayoutConfig(getLayoutConfig(el.clientWidth, isPC));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSingle, isPC]);

  useEffect(() => {
    if (isSingle) return undefined;

    const scene = sceneRef.current;
    if (!scene) return undefined;

    const measure = () => {
      const activeSlot = scene.querySelector(`.${styles.cardSlotActive}`);
      const cardHeight = activeSlot?.offsetHeight || 0;
      const cardWidth = activeSlot?.offsetWidth || 0;

      setCenterCardHeight(cardHeight);
      setCenterCardWidth(cardWidth);
      setMeasuredSceneHeight(Math.max(layoutConfig.sceneHeight, cardHeight + 32));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    scene.querySelectorAll(`.${styles.cardSlot}`).forEach((slot) => observer.observe(slot));

    return () => observer.disconnect();
  }, [current, isSingle, layoutConfig, cards.length]);

  const sceneHeight = measuredSceneHeight ?? layoutConfig.sceneHeight;
  const centerHeightVar = centerCardHeight || sceneHeight - 32;
  const centerCardHalf = Math.round((centerCardWidth || layoutConfig.cardWidth || 280) / 2);

  const goTo = useCallback(
    (idx, reason = 'unknown') => {
      const next = modIndex(idx, total);
      logCarousel('goTo', { from: current, to: next, reason, total });
      setCurrent(next);
    },
    [current, total]
  );

  const goPrev = useCallback(
    (reason = 'goPrev') => goTo(current - 1, reason),
    [current, goTo]
  );
  const goNext = useCallback(
    (reason = 'goNext') => goTo(current + 1, reason),
    [current, goTo]
  );

  const handleSideClick = useCallback(
    (index, event) => {
      if (tapHandledRef.current || dragRef.current.moved) {
        logCarousel('handleSideClick blocked', {
          reason: tapHandledRef.current ? 'tap already handled' : 'drag moved',
        });
        return;
      }
      const rel = getWrappedRel(index, current, total);
      logCarousel('handleSideClick', { index, current, total, rel });
      if (index === current) return;
      goTo(index, 'side-click');
    },
    [current, goTo, total]
  );

  const handleHitZoneClick = useCallback(
    (direction, event) => {
      if (tapHandledRef.current || dragRef.current.moved) {
        event.preventDefault();
        logCarousel('handleHitZoneClick blocked', {
          reason: tapHandledRef.current ? 'tap already handled' : 'drag moved',
        });
        return;
      }
      logCarousel('handleHitZoneClick', { direction });
      if (direction === 'prev') goPrev('hit-zone-click');
      else goNext('hit-zone-click');
    },
    [goNext, goPrev]
  );

  useEffect(() => {
    if (isSingle) return undefined;

    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const swipeThreshold = isPC ? DRAG_THRESHOLD : 24;

    const getHitZoneDirection = (target) => {
      if (target.closest(`.${styles.hitZoneLeft}`)) return 'prev';
      if (target.closest(`.${styles.hitZoneRight}`)) return 'next';
      return null;
    };

    const getSideIndexFromTarget = (target) => {
      const slot = target.closest(`.${styles.cardSlotSide}`);
      if (!slot) return null;
      const raw = slot.getAttribute('data-index');
      if (raw == null) return null;
      const index = Number(raw);
      return Number.isFinite(index) ? index : null;
    };

    const shouldSkipDragStart = (target) => {
      if (target.closest(`.${styles.hitZone}`)) return false;
      if (target.closest(`.${styles.cardSlotSide}`)) {
        return Boolean(target.closest('button, a'));
      }
      if (target.closest(`.${styles.cardSlotActive}`) && target.closest('button, a')) {
        return true;
      }
      return Boolean(target.closest('button, a'));
    };

    const cleanupWindowListeners = () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerCancel);
    };

    const finishDrag = (event) => {
      const drag = dragRef.current;
      if (!drag.dragging || drag.startX == null) return;

      cleanupWindowListeners();

      const dx = event.clientX - drag.startX;
      const absDx = Math.abs(dx);

      if (drag.isHorizontal !== false && absDx >= swipeThreshold) {
        drag.moved = true;
        logCarousel('pointerup swipe', {
          dx,
          swipeThreshold,
          direction: dx < 0 ? 'next' : 'prev',
        });
        if (dx < -swipeThreshold) goNext('swipe-left');
        else if (dx > swipeThreshold) goPrev('swipe-right');
        window.setTimeout(() => {
          dragRef.current.moved = false;
        }, 50);
      } else {
        logCarousel('pointerup tap', {
          dx,
          startHitZone: drag.startHitZone,
          startSideIndex: drag.startSideIndex,
        });
        tapHandledRef.current = true;
        window.setTimeout(() => {
          tapHandledRef.current = false;
        }, 0);

        if (drag.startHitZone === 'prev') {
          goPrev('hit-zone-tap');
        } else if (drag.startHitZone === 'next') {
          goNext('hit-zone-tap');
        } else if (drag.startSideIndex != null) {
          goTo(drag.startSideIndex, 'side-tap');
        }
      }

      dragRef.current = {
        startX: null,
        startY: null,
        dragging: false,
        moved: dragRef.current.moved,
        isHorizontal: null,
        startHitZone: null,
        startSideIndex: null,
      };
    };

    const onWindowPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag.dragging || drag.startX == null) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - (drag.startY ?? event.clientY);

      if (drag.isHorizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        drag.isHorizontal = Math.abs(dx) > Math.abs(dy);
      }

      if (drag.isHorizontal) {
        event.preventDefault();
      }
    };

    const onWindowPointerUp = (event) => {
      finishDrag(event);
    };

    const onWindowPointerCancel = () => {
      cleanupWindowListeners();
      dragRef.current = {
        startX: null,
        startY: null,
        dragging: false,
        moved: false,
        isHorizontal: null,
        startHitZone: null,
        startSideIndex: null,
      };
    };

    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (shouldSkipDragStart(event.target)) return;

      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        dragging: true,
        moved: false,
        isHorizontal: null,
        startHitZone: getHitZoneDirection(event.target),
        startSideIndex: getSideIndexFromTarget(event.target),
      };

      logCarousel('pointerdown', {
        pointerType: event.pointerType,
        target: describeTarget(event.target),
        startHitZone: dragRef.current.startHitZone,
        startSideIndex: dragRef.current.startSideIndex,
      });

      window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
      window.addEventListener('pointerup', onWindowPointerUp);
      window.addEventListener('pointercancel', onWindowPointerCancel);
    };

    wrap.addEventListener('pointerdown', onPointerDown, { capture: true });

    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, { capture: true });
      cleanupWindowListeners();
    };
  }, [goNext, goPrev, goTo, isPC, isSingle]);

  useEffect(() => {
    if (isSingle) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, isSingle]);

  const slotStyles = useMemo(() => {
    if (isSingle) return [];
    return cards.map((_, index) => {
      const rel = getWrappedRel(index, current, total);
      return getCardSlotStyle(rel, total, layoutConfig, isPC);
    });
  }, [cards, current, isPC, isSingle, layoutConfig, total]);

  useEffect(() => {
    if (!isCarouselDebugEnabled() || isSingle) return;
    logCarousel('layout', {
      isPC,
      current,
      total,
      layoutConfig,
      centerCardHalf,
      centerCardWidth,
      centerCardHeight,
      slots: cards.map((data, index) => ({
        index,
        coin: data?.card?.coin,
        rel: getWrappedRel(index, current, total),
        style: slotStyles[index],
      })),
    });
  }, [cards, centerCardHalf, centerCardHeight, centerCardWidth, current, isPC, isSingle, layoutConfig, slotStyles, total]);

  if (!total) return null;

  if (isSingle) {
    return (
      <div
        className={`${styles.carousel} ${styles.carouselSingle} ${!isPC ? styles.carouselSingleMobile : ''}`}
        role="list"
        aria-label="信号卡片列表"
      >
        <div className={styles.track}>
          <div className={`${styles.cardItem} ${styles.cardItemSingle}`} role="listitem">
            <SignalCard data={cards[0]} variant="sidebar" embedded hideAmbient isPC={isPC} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`${styles.carousel3d} ${!isPC ? styles.carousel3dMobile : ''}`}
      style={{
        perspective: `${layoutConfig.perspective}px`,
        perspectiveOrigin: !isPC ? '48% 42%' : '50% 50%',
        '--center-card-height': `${centerHeightVar}px`,
        '--center-card-half': `${centerCardHalf}px`,
        '--carousel-card-width': `${layoutConfig.cardWidth}px`,
      }}
      role="region"
      aria-label="信号卡片轮播"
      aria-roledescription="carousel"
    >
      <div
        ref={sceneRef}
        className={styles.scene}
        style={{ minHeight: `${sceneHeight}px` }}
      >
        {cards.map((data, index) => {
          const coin = data?.card?.coin || `signal-${index}`;
          const slotStyle = slotStyles[index];
          const rel = getWrappedRel(index, current, total);

          return (
            <div
              key={`${coin}-${index}`}
              data-index={index}
              data-coin={coin}
              data-rel={rel}
              className={`${styles.cardSlot} ${
                index === current ? styles.cardSlotActive : styles.cardSlotSide
              }`}
              style={slotStyle}
              role="listitem"
              aria-hidden={index !== current}
              tabIndex={index === current ? -1 : 0}
              onClick={(event) => {
                if (tapHandledRef.current) return;
                if (event.target.closest('button, a')) return;
                handleSideClick(index, event);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSideClick(index, event);
                }
              }}
            >
              <div className={styles.cardItem}>
                <SignalCard data={data} variant="sidebar" embedded hideAmbient isPC={isPC} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={`${styles.hitZone} ${styles.hitZoneLeft}`}
        aria-label="上一张信号卡"
        onClick={(event) => handleHitZoneClick('prev', event)}
      />
      <button
        type="button"
        className={`${styles.hitZone} ${styles.hitZoneRight}`}
        aria-label="下一张信号卡"
        onClick={(event) => handleHitZoneClick('next', event)}
      />
    </div>
  );
}
