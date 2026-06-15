'use client';

import { useCallback, useRef, useState } from 'react';
import SignalCard from '@/components/SignalCard';
import styles from './index.module.less';

const DRAG_THRESHOLD = 4;

export default function SignalCardCarousel({ cards = [], isPC = false }) {
  const carouselRef = useRef(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback((event) => {
    const el = carouselRef.current;
    if (!el || event.button !== 0) return;

    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: el.scrollLeft,
    };
    setIsDragging(true);
    el.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    const state = dragRef.current;
    const el = carouselRef.current;
    if (!state.active || !el) return;

    const deltaX = event.clientX - state.startX;
    if (Math.abs(deltaX) > DRAG_THRESHOLD) {
      state.moved = true;
    }
    el.scrollLeft = state.scrollLeft - deltaX;
  }, []);

  const endDrag = useCallback((event) => {
    const state = dragRef.current;
    const el = carouselRef.current;
    if (!state.active) return;

    state.active = false;
    setIsDragging(false);

    if (el?.hasPointerCapture?.(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleClickCapture = useCallback((event) => {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  }, []);

  if (!cards.length) return null;

  return (
    <div
      ref={carouselRef}
      className={`${styles.carousel} ${isDragging ? styles.dragging : ''}`}
      role="list"
      aria-label="信号卡片列表"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={handleClickCapture}
    >
      <div className={styles.track}>
        {cards.map((data, idx) => (
          <div
            key={`${data?.card?.coin || 'signal'}-${idx}`}
            className={styles.cardItem}
            role="listitem"
          >
            <SignalCard data={data} variant="sidebar" embedded isPC={isPC} />
          </div>
        ))}
      </div>
    </div>
  );
}
