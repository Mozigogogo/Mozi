'use client';

import { useTranslation } from 'react-i18next';
import { TOOLTIPS } from './data';

/**
 * Hover tip for financial jargon
 * @param {{ tipKey: string }} props
 */
export function Tip({ tipKey }) {
  const { t } = useTranslation();
  const text =
    t(`autoArb.wizard.tooltips.${tipKey}`, { defaultValue: '' }) ||
    t(`autoArb.dashboard.tooltips.${tipKey}`, { defaultValue: '' }) ||
    TOOLTIPS[tipKey] ||
    '';
  if (!text) return null;
  return (
    <span className="tip-wrap">
      <span className="tip-ico">?</span>
      <span className="tip-bubble">{text}</span>
    </span>
  );
}

/**
 * Inline sparkline
 * @param {{ data: number[]; color?: string; w?: number; h?: number }} props
 */
export function Sparkline({ data, color, w = 70, h = 24 }) {
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1 || 1);
  const pts = data
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((v - min) / range) * h * 0.85 - h * 0.05).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');
  const lastUp = data[data.length - 1] >= data[0];
  const stroke = color || (lastUp ? '#059669' : '#DC2626');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Semi-circle risk gauge
 * @param {{ pct: number; color: string; label: string }} props
 */
export function Gauge({ pct, color, label }) {
  const value = Math.max(0, Math.min(1, Number(pct) || 0));
  const r = 30;
  const cx = 48;
  const cy = 40;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const length = Math.PI * r;
  const angle = Math.PI * (1 - value);
  const nx = cx + r * Math.cos(angle);
  const ny = cy - r * Math.sin(angle);

  return (
    <div className="gauge-wrap">
      <svg
        className="gauge-svg"
        width="96"
        height="60"
        viewBox="0 0 96 60"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path d={arc} fill="none" stroke="#E4E9F0" strokeWidth="6" strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={length}
          strokeDasharray={`${value * length} ${length}`}
        />
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#0F172A"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="3.2" fill="#0F172A" />
        <text
          x={cx}
          y="56"
          textAnchor="middle"
          fontSize="10"
          fill="#94A3B8"
          fontFamily="JetBrains Mono, monospace"
        >
          {Math.round(value * 100)}%
        </text>
      </svg>
      <div className="gauge-lbl">{label}</div>
    </div>
  );
}

/**
 * Capital allocation donut
 * @param {{ segments: Array<{ v: number; c: string }>; centerLabel?: string; centerValue?: string }} props
 */
export function Donut({
  segments,
  centerLabel,
  centerValue = '$35K',
}) {
  const total = segments.reduce((s, x) => s + x.v, 0) || 1;
  const r = 36;
  const cx = 50;
  const cy = 50;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }} aria-hidden="true">
      {segments.map((seg, i) => {
        const len = (seg.v / total) * circ;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.c}
            strokeWidth="12"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return el;
      })}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="9"
        fill="#94A3B8"
      >
        {centerLabel}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize="12"
        fontWeight="700"
        fill="#0F172A"
        fontFamily="JetBrains Mono, monospace"
      >
        {centerValue}
      </text>
    </svg>
  );
}

/**
 * Activity feed rich text
 * @param {{ parts: Array<{ t: string; v: string }> }} props
 */
export function ActivityText({ parts }) {
  return (
    <div className="af-text">
      {parts.map((p, i) => {
        if (p.t === 'strong') return <strong key={i}>{p.v}</strong>;
        if (p.t === 'pos')
          return (
            <strong key={i} className="mono" style={{ color: 'var(--pos)' }}>
              {p.v}
            </strong>
          );
        if (p.t === 'blue')
          return (
            <strong key={i} className="mono" style={{ color: 'var(--blue)' }}>
              {p.v}
            </strong>
          );
        if (p.t === 'mono')
          return (
            <strong key={i} className="mono">
              {p.v}
            </strong>
          );
        return <span key={i}>{p.v}</span>;
      })}
    </div>
  );
}

/**
 * Generic modal shell
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   wide?: boolean;
 *   header: React.ReactNode;
 *   footer?: React.ReactNode;
 *   children: React.ReactNode;
 * }} props
 */
export function Modal({ open, onClose, wide, header, footer, children }) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-box${wide ? ' wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-hdr">
          {header}
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('autoArb.dashboard.detail.close')}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
