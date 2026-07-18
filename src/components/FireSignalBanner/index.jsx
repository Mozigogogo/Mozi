'use client';

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

const CANVAS_W = 44;
const CANVAS_H = 52;
const COLORS = [
  [255, 60, 0],
  [255, 120, 0],
  [255, 180, 30],
  [255, 220, 80],
  [255, 255, 160],
];

function spawnParticle() {
  const x = CANVAS_W * (0.2 + Math.random() * 0.6);
  const tier = Math.random();
  const col = COLORS[Math.floor(tier * COLORS.length)];
  return {
    x,
    y: CANVAS_H - 2,
    vx: (Math.random() - 0.5) * 0.7,
    vy: -(1.4 + Math.random() * 2.2),
    life: 1,
    decay: 0.018 + Math.random() * 0.016,
    size: 3 + Math.random() * 5,
    col,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.08 + Math.random() * 0.06,
  };
}

export default function FireSignalBanner({
  count = 0,
  onClick,
  className = '',
  compact = false,
  shortSub = false,
}) {
  const canvasRef = useRef(null);
  const { t } = useTranslation();
  const subKey = shortSub ? 'signalCard.fireBanner.subShort' : 'signalCard.fireBanner.sub';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const particles = [];

    for (let i = 0; i < 28; i += 1) {
      const particle = spawnParticle();
      particle.y = CANVAS_H * (0.2 + Math.random() * 0.8);
      particle.life = Math.random();
      particles.push(particle);
    }

    let frameId = 0;

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.wobble += particle.wobbleSpeed;
        particle.x += particle.vx + Math.sin(particle.wobble) * 0.4;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        particle.size *= 0.992;

        if (particle.life <= 0 || particle.y < -4) {
          particles.splice(i, 1);
          particles.unshift(spawnParticle());
          continue;
        }

        const alpha = particle.life * 0.9;
        const [r, g, b] = particle.col;
        const grad = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size
        );
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(0.5, `rgba(${r},${Math.min(g + 30, 255)},${b},${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <button
      type="button"
      className={`${styles.banner} ${compact ? styles.bannerCompact : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={t('signalCard.fireBanner.ariaLabel')}
    >
      <div className={styles.flameIcon} aria-hidden>
        <canvas ref={canvasRef} className={styles.canvas} width={CANVAS_W} height={CANVAS_H} />
      </div>
      <div className={styles.text}>
        <div className={styles.main}>{t('signalCard.fireBanner.main')}</div>
        <div className={styles.sub}>{t(subKey)}</div>
      </div>
      <div className={styles.badge}>×{count}</div>
      <div className={styles.glow} aria-hidden />
    </button>
  );
}
