/**
 * 右箭头图标组件
 * @param {number} size - 图标大小，默认20
 * @param {string} color - 图标颜色，默认#fff
 * @param {number} strokeWidth - 线条宽度，默认1.5
 * @param {object} style - 自定义样式
 */
const RightArrowIcon = ({ 
  size = 20, 
  color = '#fff', 
  strokeWidth = 1.5,
  style = {},
  ...props 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      {...props}
    >
      <path 
        d="M9 18L15 12L9 6" 
        stroke={color} 
        strokeWidth={strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default RightArrowIcon;

