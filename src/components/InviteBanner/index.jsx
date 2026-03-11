import React from 'react';
import { useTranslation } from 'react-i18next';

const InviteBanner = (props) => {
  const { t } = useTranslation();
  
  return (
    <svg 
      width="100%" 
      height="auto" 
      viewBox="0 0 375 118" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <g filter="url(#filter0_d_2462_4706)">
        <rect x="0" y="16" width="100%" height="78" rx="12" fill="url(#paint0_linear_2462_4706)" shapeRendering="crispEdges"/>
        
        {/* Title */}
        <text 
          x="36" 
          y="48" 
          fill="white" 
          style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'PingFang SC, sans-serif' }}
        >
          {t('pointsDetail.banner.title')}
        </text>

        {/* Subtitle */}
        <text 
          x="36" 
          y="72" 
          fill="white" 
          fillOpacity="0.8" 
          style={{ fontSize: '12px', fontWeight: '400', fontFamily: 'PingFang SC, sans-serif' }}
        >
          {t('pointsDetail.banner.subtitle')}
        </text>

        <mask id="mask0_2462_4706" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="274" y="26" width="100" height="100">
          <path d="M304 106L324 90.75L344 106L336.5 81.25L356.5 67H332L324 41L316 67H291.5L311.5 81.25L304 106ZM324 126C317.083 126 310.583 124.688 304.5 122.062C298.417 119.438 293.125 115.875 288.625 111.375C284.125 106.875 280.562 101.583 277.938 95.5C275.312 89.4167 274 82.9167 274 76C274 69.0833 275.312 62.5833 277.938 56.5C280.562 50.4167 284.125 45.125 288.625 40.625C293.125 36.125 298.417 32.5625 304.5 29.9375C310.583 27.3125 317.083 26 324 26C330.917 26 337.417 27.3125 343.5 29.9375C349.583 32.5625 354.875 36.125 359.375 40.625C363.875 45.125 367.438 50.4167 370.062 56.5C372.688 62.5833 374 69.0833 374 76C374 82.9167 372.688 89.4167 370.062 95.5C367.438 101.583 363.875 106.875 359.375 111.375C354.875 115.875 349.583 119.438 343.5 122.062C337.417 124.688 330.917 126 324 126ZM324 116C335.167 116 344.625 112.125 352.375 104.375C360.125 96.625 364 87.1667 364 76C364 64.8333 360.125 55.375 352.375 47.625C344.625 39.875 335.167 36 324 36C312.833 36 303.375 39.875 295.625 47.625C287.875 55.375 284 64.8333 284 76C284 87.1667 287.875 96.625 295.625 104.375C303.375 112.125 312.833 116 324 116Z" fill="white"/>
        </mask>
        <g mask="url(#mask0_2462_4706)">
          <rect x="0" y="16" width="100%" height="78" rx="12" fill="white" fillOpacity="0.2"/>
        </g>
      </g>
      <defs>
        <filter id="filter0_d_2462_4706" x="-9" y="0" width="390" height="118" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="4"/>
          <feGaussianBlur stdDeviation="10"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2462_4706"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_2462_4706" result="shape"/>
        </filter>
        <linearGradient id="paint0_linear_2462_4706" x1="0" y1="55" x2="100%" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22C55E"/>
          <stop offset="1" stopColor="#A5EE58"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

export default InviteBanner;
