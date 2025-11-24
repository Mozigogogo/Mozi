import React from 'react';

export default function ArrowRightIcon({ width = 20, height = 20, color = '#ffffff', style = {} }) {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      width={width}
      height={height}
      style={{ display: 'block', ...style }}
    >
      <path 
        d="M244.363636 556.939636h469.248l-184.762181 170.565819a34.909091 34.909091 0 1 0 47.36 51.29309l250.391272-231.121454a34.955636 34.955636 0 0 0 0-51.293091l-250.391272-231.121455a34.862545 34.862545 0 0 0-49.338182 1.95491 34.909091 34.909091 0 0 0 1.978182 49.338181l184.762181 170.565819H244.363636a34.909091 34.909091 0 1 0 0 69.818181" 
        fill={color}
      />
    </svg>
  );
}
