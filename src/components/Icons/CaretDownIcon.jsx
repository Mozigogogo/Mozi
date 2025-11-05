/**
 * 下跌箭头图标组件
 * @param {number} size - 图标大小，默认24
 * @param {string} color - 图标颜色，默认#FA5F5F
 * @param {object} style - 自定义样式
 */
const CaretDownIcon = ({ 
  size = 24, 
  color = '#FA5F5F',
  style = {},
  ...props 
}) => {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      width={size} 
      height={size} 
      style={{ display: 'block', ...style }}
      {...props}
    >
      <path
        d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"
        fill={color}
      />
    </svg>
  );
};

export default CaretDownIcon;

