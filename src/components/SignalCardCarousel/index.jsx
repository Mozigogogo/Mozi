'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SignalCard from '@/components/SignalCard';
import styles from './index.module.less';

const DRAG_THRESHOLD = 40;

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
function getCardSlotStyle(rel, total, config) {
  const { offsetX, scaleSide, transZSide, rotateSide = 22, centerOffsetX = 0 } = config;
  const anchor = 'translate(-50%, -50%)';

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
      cursor: 'pointer',
    };
  }

  const isRight = rel === 1 || rel === -(total - 1);
  const tx = (isRight ? offsetX : -offsetX) + centerOffsetX;
  const ry = isRight ? -rotateSide : rotateSide;

  return {
    transform: `${anchor} translateX(${tx}px) translateZ(${transZSide}px) rotateY(${ry}deg) scale(${scaleSide})`,
    opacity: config.sideOpacity ?? 0.65,
    filter: config.sideBlur ? `blur(${config.sideBlur}px)` : 'blur(2px)',
    zIndex: 5,
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
  });
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
    (idx) => {
      setCurrent(modIndex(idx, total));
    },
    [total]
  );

  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);
  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);

  const handleSideClick = useCallback(
    (index) => {
      if (dragRef.current.moved) return;
      if (index !== current) goTo(index);
    },
    [current, goTo]
  );

  const handleHitZoneClick = useCallback(
    (direction, event) => {
      if (dragRef.current.moved) {
        event.preventDefault();
        return;
      }
      if (direction === 'prev') goPrev();
      else goNext();
    },
    [goNext, goPrev]
  );

  useEffect(() => {
    if (isSingle) return undefined;

    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    const swipeThreshold = isPC ? DRAG_THRESHOLD : 24;

    const shouldIgnoreTarget = (target) =>
      target.closest('button, a') && !target.closest(`.${styles.hitZone}`);

    const onPointerDown = (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (shouldIgnoreTarget(event.target)) return;

      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        dragging: true,
        moved: false,
        isHorizontal: null,
      };

      try {
        wrap.setPointerCapture(event.pointerId);
      } catch (_) {
        // ignore
      }
    };

    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag.dragging || drag.startX === null) return;

      const dx = event.clientX - drag.startX;
      const dy = event.clientY - (drag.startY ?? event.clientY);

      if (drag.isHorizontal === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        drag.isHorizontal = Math.abs(dx) > Math.abs(dy);
      }

      if (drag.isHorizontal) {
        event.preventDefault();
      }
    };

    const resetDrag = () => {
      dragRef.current = {
        startX: null,
        startY: null,
        dragging: false,
        moved: dragRef.current.moved,
        isHorizontal: null,
      };
    };

    const onPointerUp = (event) => {
      const drag = dragRef.current;
      if (!drag.dragging || drag.startX === null) return;

      const dx = event.clientX - drag.startX;

      try {
        wrap.releasePointerCapture(event.pointerId);
      } catch (_) {
        // ignore
      }

      if (drag.isHorizontal !== false && Math.abs(dx) >= swipeThreshold) {
        drag.moved = true;
        if (dx < -swipeThreshold) goNext();
        else if (dx > swipeThreshold) goPrev();
        window.setTimeout(() => {
          dragRef.current.moved = false;
        }, 50);
      }

      resetDrag();
    };

    const onPointerCancel = (event) => {
      try {
        wrap.releasePointerCapture(event.pointerId);
      } catch (_) {
        // ignore
      }
      resetDrag();
    };

    wrap.addEventListener('pointerdown', onPointerDown, { capture: true });
    wrap.addEventListener('pointermove', onPointerMove, { passive: false, capture: true });
    wrap.addEventListener('pointerup', onPointerUp, { capture: true });
    wrap.addEventListener('pointercancel', onPointerCancel, { capture: true });

    return () => {
      wrap.removeEventListener('pointerdown', onPointerDown, { capture: true });
      wrap.removeEventListener('pointermove', onPointerMove, { capture: true });
      wrap.removeEventListener('pointerup', onPointerUp, { capture: true });
      wrap.removeEventListener('pointercancel', onPointerCancel, { capture: true });
    };
  }, [goNext, goPrev, isPC, isSingle]);

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
      return getCardSlotStyle(rel, total, layoutConfig);
    });
  }, [cards, current, isSingle, layoutConfig, total]);

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

          return (
            <div
              key={`${coin}-${index}`}
              className={`${styles.cardSlot} ${
                index === current ? styles.cardSlotActive : styles.cardSlotSide
              }`}
              style={slotStyle}
              role="listitem"
              aria-hidden={index !== current}
              tabIndex={index === current ? -1 : 0}
              onClick={() => handleSideClick(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSideClick(index);
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
