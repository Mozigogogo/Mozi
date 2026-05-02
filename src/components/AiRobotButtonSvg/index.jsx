import React from 'react';

/**
 * 封装 `public/images/ai_robot/button.svg`，便于在其它组件里复用。
 *
 * 默认作为装饰图片使用（`alt=""` + `aria-hidden`），如需无障碍可传 `alt`/`ariaLabel`。
 */
export default function AiRobotButtonSvg({
  className,
  width = 188,
  height = 67,
  src = 'https://image-1317406749.cos.ap-shanghai.myqcloud.com/mozi_public/images/ai_robot/button.svg',
  alt = '',
  ariaLabel,
}) {
  const computedAlt = alt ?? '';
  const isDecorative = !ariaLabel && computedAlt === '';

  return (
    <img
      src={src}
      width={width}
      height={height}
      className={className}
      alt={isDecorative ? '' : computedAlt}
      aria-hidden={isDecorative}
      aria-label={!isDecorative ? ariaLabel : undefined}
    />
  );
}

