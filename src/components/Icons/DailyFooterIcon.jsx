import React from 'react';

const DailyFooterIcon = ({
  width = 48,
  height = 48,
  style = {},
  className = '',
  ...props
}) => {
  return (
    <div
      className={className}
      style={{
        width: width,
        height: height,
        backgroundColor: '#FFF587',
        border: '4.5px solid #2AFE00',
        borderRadius: '16px',
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    />
  );
};

export default DailyFooterIcon;
