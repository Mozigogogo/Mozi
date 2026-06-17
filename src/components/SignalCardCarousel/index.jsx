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
  const { offsetX, scaleSide, transZSide } = config;
  const anchor = 'translate(-50%, -50%)';

  if (Math.abs(rel) > 1) {
    return {
      transform: `${anchor} translateX(${rel > 0 ? offsetX * 2 : -offsetX * 2}px) translateZ(-460px) rotateY(${rel > 0 ? -48 : 48}deg) scale(0.4)`,
      opacity: 0,
      filter: 'blur(6px)',
      zIndex: 0,
      pointerEvents: 'none',
      visibility: 'hidden',
    };
  }

  if (rel === 0) {
    return {
      transform: `${anchor} translateX(0px) translateZ(0px) rotateY(0deg) scale(1)`,
      opacity: 1,
      filter: 'none',
      zIndex: 10,
      pointerEvents: 'none',
      visibility: 'visible',
      cursor: 'pointer',
    };
  }

  const isRight = rel === 1 || rel === -(total - 1);
  const tx = isRight ? offsetX : -offsetX;
  const ry = isRight ? -22 : 22;

  return {
    transform: `${anchor} translateX(${tx}px) translateZ(${transZSide}px) rotateY(${ry}deg) scale(${scaleSide})`,
    opacity: 0.65,
    filter: 'blur(2px)',
    zIndex: 5,
    pointerEvents: 'auto',
    visibility: 'visible',
    cursor: 'pointer',
  };
}

function getLayoutConfig(containerWidth) {
  const width = Math.max(280, containerWidth || 900);
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
  };
}

export default function SignalCardCarousel({ cards = [], isPC = false }) {
  const wrapRef = useRef(null);
  const sceneRef = useRef(null);
  const dragRef = useRef({ startX: null, dragging: false, moved: false });
  const [current, setCurrent] = useState(0);
  const [layoutConfig, setLayoutConfig] = useState(() => getLayoutConfig(900));
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

    const update = () => setLayoutConfig(getLayoutConfig(el.clientWidth));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isSingle]);

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

    const onPointerDown = (event) => {
      if (event.button !== 0) return;
      if (
        event.target.closest('button, a') &&
        !event.target.closest(`.${styles.hitZone}`)
      ) {
        return;
      }
      dragRef.current = { startX: event.clientX, dragging: true, moved: false };
    };

    const onPointerUp = (event) => {
      if (!dragRef.current.dragging || dragRef.current.startX === null) return;

      const dx = event.clientX - dragRef.current.startX;
      dragRef.current.dragging = false;
      dragRef.current.startX = null;

      if (Math.abs(dx) >= DRAG_THRESHOLD) {
        dragRef.current.moved = true;
        if (dx < -DRAG_THRESHOLD) goNext();
        else if (dx > DRAG_THRESHOLD) goPrev();
        window.setTimeout(() => {
          dragRef.current.moved = false;
        }, 0);
      }
    };

    const wrap = wrapRef.current;
    wrap?.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      wrap?.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [goNext, goPrev, isSingle]);

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
        className={`${styles.carousel} ${styles.carouselSingle}`}
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
      className={styles.carousel3d}
      style={{
        perspective: `${layoutConfig.perspective}px`,
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
