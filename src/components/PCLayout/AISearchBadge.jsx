'use client';

import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.less';

/* 顶栏装饰；展示尺寸由 index.module.less 中 .aiSearchBadge 控制 */
const RAW_SVG = `<svg width="112" height="36" viewBox="0 0 88 42" preserveAspectRatio="xMidYMid meet" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="2" y="2" width="83.5996" height="38" rx="19" fill="white"/>
<rect x="2" y="2" width="83.5996" height="38" rx="19" fill="#ECFEFF"/>
<rect x="2" y="2" width="83.5996" height="38" rx="19" fill="url(#paint0_radial_305_4147)"/>
<rect x="2" y="2" width="83.5996" height="38" rx="19" fill="url(#paint1_radial_305_4147)"/>
<rect x="2" y="2" width="83.5996" height="38" rx="19" fill="url(#paint2_radial_305_4147)"/>
<rect x="2" y="2" width="83.5996" height="38" rx="19" fill="url(#paint3_radial_305_4147)"/>
<rect x="1" y="1" width="85.5996" height="40" rx="20" stroke="url(#paint4_linear_305_4147)" stroke-opacity="0.24" stroke-width="2"/>
<g filter="url(#filter0_dii_305_4147)" data-figma-bg-blur-radius="1.6">
<path d="M26.2998 14.2002C26.7416 14.2002 27.0996 14.5582 27.0996 15V17.2002H30.7998C32.0701 17.2002 33.0996 18.2297 33.0996 19.5V21.7002H33.7998C34.2416 21.7002 34.5996 22.0582 34.5996 22.5C34.5996 22.9418 34.2416 23.2998 33.7998 23.2998H33.0996V25.5C33.0996 26.7703 32.0701 27.7998 30.7998 27.7998H21.7998C20.5295 27.7998 19.5 26.7703 19.5 25.5V23.2998H18.7998C18.358 23.2998 18 22.9418 18 22.5C18 22.0582 18.358 21.7002 18.7998 21.7002H19.5V19.5C19.5 18.2297 20.5296 17.2002 21.7998 17.2002H25.5V15.7998H23.2998C22.858 15.7998 22.5 15.4418 22.5 15C22.5 14.5582 22.858 14.2002 23.2998 14.2002H26.2998ZM21.7998 18.7998C21.4132 18.7998 21.0996 19.1134 21.0996 19.5V25.5C21.0996 25.8866 21.4132 26.2002 21.7998 26.2002H30.7998C31.1864 26.2002 31.5 25.8866 31.5 25.5V19.5C31.5 19.1134 31.1864 18.7998 30.7998 18.7998H21.7998ZM24.0498 20.9502C24.4916 20.9502 24.8496 21.3082 24.8496 21.75V23.25C24.8496 23.6918 24.4916 24.0498 24.0498 24.0498C23.608 24.0498 23.25 23.6918 23.25 23.25V21.75C23.25 21.3082 23.608 20.9502 24.0498 20.9502ZM28.5498 20.9502C28.9916 20.9502 29.3496 21.3082 29.3496 21.75V23.25C29.3496 23.6918 28.9916 24.0498 28.5498 24.0498C28.108 24.0498 27.75 23.6918 27.75 23.25V21.75C27.75 21.3082 28.108 20.9502 28.5498 20.9502Z" fill="url(#paint5_linear_305_4147)" shape-rendering="crispEdges"/>
<path d="M26.2998 14.2002C26.7416 14.2002 27.0996 14.5582 27.0996 15V17.2002H30.7998C32.0701 17.2002 33.0996 18.2297 33.0996 19.5V21.7002H33.7998C34.2416 21.7002 34.5996 22.0582 34.5996 22.5C34.5996 22.9418 34.2416 23.2998 33.7998 23.2998H33.0996V25.5C33.0996 26.7703 32.0701 27.7998 30.7998 27.7998H21.7998C20.5295 27.7998 19.5 26.7703 19.5 25.5V23.2998H18.7998C18.358 23.2998 18 22.9418 18 22.5C18 22.0582 18.358 21.7002 18.7998 21.7002H19.5V19.5C19.5 18.2297 20.5296 17.2002 21.7998 17.2002H25.5V15.7998H23.2998C22.858 15.7998 22.5 15.4418 22.5 15C22.5 14.5582 22.858 14.2002 23.2998 14.2002H26.2998ZM21.7998 18.7998C21.4132 18.7998 21.0996 19.1134 21.0996 19.5V25.5C21.0996 25.8866 21.4132 26.2002 21.7998 26.2002H30.7998C31.1864 26.2002 31.5 25.8866 31.5 25.5V19.5C31.5 19.1134 31.1864 18.7998 30.7998 18.7998H21.7998ZM24.0498 20.9502C24.4916 20.9502 24.8496 21.3082 24.8496 21.75V23.25C24.8496 23.6918 24.4916 24.0498 24.0498 24.0498C23.608 24.0498 23.25 23.6918 23.25 23.25V21.75C23.25 21.3082 23.608 20.9502 24.0498 20.9502ZM28.5498 20.9502C28.9916 20.9502 29.3496 21.3082 29.3496 21.75V23.25C29.3496 23.6918 28.9916 24.0498 28.5498 24.0498C28.108 24.0498 27.75 23.6918 27.75 23.25V21.75C27.75 21.3082 28.108 20.9502 28.5498 20.9502Z" fill="url(#paint6_linear_305_4147)" fill-opacity="0.3" shape-rendering="crispEdges"/>
<path d="M26.2998 14.2002C26.7416 14.2002 27.0996 14.5582 27.0996 15V17.2002H30.7998C32.0701 17.2002 33.0996 18.2297 33.0996 19.5V21.7002H33.7998C34.2416 21.7002 34.5996 22.0582 34.5996 22.5C34.5996 22.9418 34.2416 23.2998 33.7998 23.2998H33.0996V25.5C33.0996 26.7703 32.0701 27.7998 30.7998 27.7998H21.7998C20.5295 27.7998 19.5 26.7703 19.5 25.5V23.2998H18.7998C18.358 23.2998 18 22.9418 18 22.5C18 22.0582 18.358 21.7002 18.7998 21.7002H19.5V19.5C19.5 18.2297 20.5296 17.2002 21.7998 17.2002H25.5V15.7998H23.2998C22.858 15.7998 22.5 15.4418 22.5 15C22.5 14.5582 22.858 14.2002 23.2998 14.2002H26.2998ZM21.7998 18.7998C21.4132 18.7998 21.0996 19.1134 21.0996 19.5V25.5C21.0996 25.8866 21.4132 26.2002 21.7998 26.2002H30.7998C31.1864 26.2002 31.5 25.8866 31.5 25.5V19.5C31.5 19.1134 31.1864 18.7998 30.7998 18.7998H21.7998ZM24.0498 20.9502C24.4916 20.9502 24.8496 21.3082 24.8496 21.75V23.25C24.8496 23.6918 24.4916 24.0498 24.0498 24.0498C23.608 24.0498 23.25 23.6918 23.25 23.25V21.75C23.25 21.3082 23.608 20.9502 24.0498 20.9502ZM28.5498 20.9502C28.9916 20.9502 29.3496 21.3082 29.3496 21.75V23.25C29.3496 23.6918 28.9916 24.0498 28.5498 24.0498C28.108 24.0498 27.75 23.6918 27.75 23.25V21.75C27.75 21.3082 28.108 20.9502 28.5498 20.9502Z" fill="url(#paint7_linear_305_4147)" fill-opacity="0.3" shape-rendering="crispEdges"/>
</g>
<g filter="url(#filter1_dii_305_4147)" data-figma-bg-blur-radius="1.6">
<text x="59" y="22" dy="0.35em" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" font-size="12" font-weight="700" fill="white" lengthAdjust="spacingAndGlyphs" textLength="42">__AI_BADGE_LABEL__</text>
</g>
<defs>
<filter id="filter0_dii_305_4147" x="8.2" y="8.4002" width="36.1996" height="33.1996" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="4.9"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.0588235 0 0 0 0 0.482353 0 0 0 0 0.611765 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_305_4147"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_305_4147" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="3.1"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect2_innerShadow_305_4147"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="1"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0"/>
<feBlend mode="normal" in2="effect2_innerShadow_305_4147" result="effect3_innerShadow_305_4147"/>
</filter>
<clipPath id="bgblur_0_305_4147_clip_path" transform="translate(-8.2 -8.4002)"><path d="M26.2998 14.2002C26.7416 14.2002 27.0996 14.5582 27.0996 15V17.2002H30.7998C32.0701 17.2002 33.0996 18.2297 33.0996 19.5V21.7002H33.7998C34.2416 21.7002 34.5996 22.0582 34.5996 22.5C34.5996 22.9418 34.2416 23.2998 33.7998 23.2998H33.0996V25.5C33.0996 26.7703 32.0701 27.7998 30.7998 27.7998H21.7998C20.5295 27.7998 19.5 26.7703 19.5 25.5V23.2998H18.7998C18.358 23.2998 18 22.9418 18 22.5C18 22.0582 18.358 21.7002 18.7998 21.7002H19.5V19.5C19.5 18.2297 20.5296 17.2002 21.7998 17.2002H25.5V15.7998H23.2998C22.858 15.7998 22.5 15.4418 22.5 15C22.5 14.5582 22.858 14.2002 23.2998 14.2002H26.2998ZM21.7998 18.7998C21.4132 18.7998 21.0996 19.1134 21.0996 19.5V25.5C21.0996 25.8866 21.4132 26.2002 21.7998 26.2002H30.7998C31.1864 26.2002 31.5 25.8866 31.5 25.5V19.5C31.5 19.1134 31.1864 18.7998 30.7998 18.7998H21.7998ZM24.0498 20.9502C24.4916 20.9502 24.8496 21.3082 24.8496 21.75V23.25C24.8496 23.6918 24.4916 24.0498 24.0498 24.0498C23.608 24.0498 23.25 23.6918 23.25 23.25V21.75C23.25 21.3082 23.608 20.9502 24.0498 20.9502ZM28.5498 20.9502C28.9916 20.9502 29.3496 21.3082 29.3496 21.75V23.25C29.3496 23.6918 28.9916 24.0498 28.5498 24.0498C28.108 24.0498 27.75 23.6918 27.75 23.25V21.75C27.75 21.3082 28.108 20.9502 28.5498 20.9502Z"/>
</clipPath><filter id="filter1_dii_305_4147" x="30.1375" y="8.39824" width="48.0746" height="32.6337" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="4"/>
<feGaussianBlur stdDeviation="4.9"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0.0588235 0 0 0 0 0.482353 0 0 0 0 0.611765 0 0 0 0.2 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_305_4147"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_305_4147" result="shape"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="3.1"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/>
<feBlend mode="normal" in2="shape" result="effect2_innerShadow_305_4147"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="1"/>
<feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
<feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0"/>
<feBlend mode="normal" in2="effect2_innerShadow_305_4147" result="effect3_innerShadow_305_4147"/>
</filter>
<clipPath id="bgblur_1_305_4147_clip_path" transform="translate(-30.1375 -8.39824)"><path d="M39.9374 17.474H41.6034V27.232H39.9374V17.474ZM40.0494 15.01L41.2534 14.198C41.4867 14.4313 41.7387 14.6927 42.0094 14.982C42.28 15.2713 42.5414 15.5513 42.7934 15.822C43.0547 16.0927 43.2647 16.3307 43.4234 16.536L42.1354 17.46C41.986 17.2453 41.79 16.998 41.5474 16.718C41.314 16.438 41.062 16.1487 40.7914 15.85C40.5207 15.542 40.2734 15.262 40.0494 15.01ZM43.7454 14.8H51.3754V16.354H43.7454V14.8ZM50.1994 14.8H51.8654V25.244C51.8654 25.7013 51.8094 26.0513 51.6974 26.294C51.5947 26.546 51.4034 26.7467 51.1234 26.896C50.8434 27.0173 50.4934 27.0967 50.0734 27.134C49.6627 27.1713 49.1587 27.1853 48.5614 27.176C48.5334 26.9427 48.468 26.6627 48.3654 26.336C48.2627 26.0093 48.1554 25.7387 48.0434 25.524C48.2767 25.5333 48.5194 25.5427 48.7714 25.552C49.0234 25.5613 49.2474 25.566 49.4434 25.566C49.6487 25.566 49.7887 25.566 49.8634 25.566C49.994 25.5567 50.0827 25.5287 50.1294 25.482C50.176 25.426 50.1994 25.3373 50.1994 25.216V14.8ZM44.0534 18.426H48.4914V23.76H44.0534V22.262H46.8534V19.924H44.0534V18.426ZM43.2134 18.426H44.7254V24.558H43.2134V18.426ZM56.5413 26H54.2345L57.7494 15.8182H60.5235L64.0335 26H61.7267L59.1762 18.1449H59.0967L56.5413 26ZM56.3971 21.9979H61.846V23.6783H56.3971V21.9979ZM68.4117 15.8182V26H66.259V15.8182H68.4117Z"/>
</clipPath><radialGradient id="paint0_radial_305_4147" cx="0" cy="0" r="1" gradientTransform="matrix(-32.8283 -34.713 92.1663 -20.5069 70.6971 40.6441)" gradientUnits="userSpaceOnUse">
<stop offset="0.634139" stop-color="#16E3FF"/>
<stop offset="1" stop-color="#74B6FF" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint1_radial_305_4147" cx="0" cy="0" r="1" gradientTransform="matrix(-41.0201 -28.6418 90.083 -30.6991 52.3016 23.8737)" gradientUnits="userSpaceOnUse">
<stop offset="0.493539" stop-color="#58B6FF"/>
<stop offset="1" stop-color="#58B6FF" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint2_radial_305_4147" cx="0" cy="0" r="1" gradientTransform="matrix(-39.441 -29.4632 117.165 -47.931 46.6613 33.3309)" gradientUnits="userSpaceOnUse">
<stop stop-color="#59FFC7"/>
<stop offset="1" stop-color="#5EFFCA" stop-opacity="0"/>
</radialGradient>
<radialGradient id="paint3_radial_305_4147" cx="0" cy="0" r="1" gradientTransform="matrix(-62.5556 -23.2377 103.832 -55.973 60.5056 28.7374)" gradientUnits="userSpaceOnUse">
<stop stop-color="#59FFC7"/>
<stop offset="0.690597" stop-color="#5EFFCA" stop-opacity="0"/>
</radialGradient>
<linearGradient id="paint4_linear_305_4147" x1="43.7998" y1="2" x2="43.7998" y2="40" gradientUnits="userSpaceOnUse">
<stop stop-color="#53F6C4"/>
<stop offset="1" stop-color="#94DCF8"/>
</linearGradient>
<linearGradient id="paint5_linear_305_4147" x1="26.2998" y1="17.3672" x2="26.2998" y2="25.0054" gradientUnits="userSpaceOnUse">
<stop stop-color="white" stop-opacity="0.6"/>
<stop offset="0.363814" stop-color="white"/>
<stop offset="0.616518" stop-color="white" stop-opacity="0.8"/>
<stop offset="1" stop-color="white" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint6_linear_305_4147" x1="25.2414" y1="25.4107" x2="25.2414" y2="21.3676" gradientUnits="userSpaceOnUse">
<stop offset="0.000253351" stop-color="#58B6FF" stop-opacity="0"/>
<stop offset="0.4" stop-color="#58B6FF" stop-opacity="0.7"/>
<stop offset="1" stop-color="#58B6FF" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint7_linear_305_4147" x1="25.13" y1="25.4107" x2="25.13" y2="22.4702" gradientUnits="userSpaceOnUse">
<stop stop-color="#59FFC7"/>
<stop offset="1" stop-color="#5EFFCA" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint8_linear_305_4147" x1="54.0996" y1="15.6575" x2="54.0996" y2="26.8904" gradientUnits="userSpaceOnUse">
<stop stop-color="white" stop-opacity="0.6"/>
<stop offset="0.363814" stop-color="white"/>
<stop offset="0.616518" stop-color="white" stop-opacity="0.8"/>
<stop offset="1" stop-color="white" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint9_linear_305_4147" x1="52.1231" y1="27.4865" x2="52.1231" y2="21.5405" gradientUnits="userSpaceOnUse">
<stop offset="0.000253351" stop-color="#58B6FF" stop-opacity="0"/>
<stop offset="0.4" stop-color="#58B6FF" stop-opacity="0.7"/>
<stop offset="1" stop-color="#58B6FF" stop-opacity="0"/>
</linearGradient>
<linearGradient id="paint10_linear_305_4147" x1="51.915" y1="27.4865" x2="51.915" y2="23.1622" gradientUnits="userSpaceOnUse">
<stop stop-color="#59FFC7"/>
<stop offset="1" stop-color="#5EFFCA" stop-opacity="0"/>
</linearGradient>
</defs>
</svg>`;

function prefixSvgIds(svg, prefix) {
  return svg
    .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * AI 搜索入口装饰（Figma 导出 SVG，非 <button>，避免与「搜索」重复交互）。
 */
export default function AISearchBadge() {
  const { t } = useTranslation();
  const uid = useId().replace(/:/g, '');
  const label = t('home.quickActions.ai');
  const svg = useMemo(() => RAW_SVG.replace('__AI_BADGE_LABEL__', escapeXml(label)), [label]);
  const html = useMemo(() => prefixSvgIds(svg, `${uid}-`), [uid, svg]);

  return (
    <span
      className={styles.aiSearchBadge}
      dangerouslySetInnerHTML={{ __html: html }}
      aria-hidden
    />
  );
}
