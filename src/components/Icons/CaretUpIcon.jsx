/**
 * 上涨箭头图标组件
 * @param {number} size - 图标大小，默认24
 * @param {string} color - 图标颜色，默认#11B787
 * @param {object} style - 自定义样式
 */
const CaretUpIcon = ({ 
  size = 24, 
  color = '#11B787',
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
        d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"
        fill={color}
      />
    </svg>
  );
};

export default CaretUpIcon;

